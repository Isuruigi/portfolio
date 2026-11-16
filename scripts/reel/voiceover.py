"""Add an ElevenLabs voiceover to public/media/reel.mp4.

Each line is generated separately, placed at its scene's start time, nudged faster only if
it would run past its window, then mixed under the reel and loudness-normalised.
Clips are cached in scripts/reel/vo/, so re-running after a wording change only regenerates
the lines that changed.

Setup (once): put these in .env.local at the repo root (git-ignored):
    ELEVENLABS_API_KEY=...
    ELEVENLABS_MODEL=eleven_multilingual_v2   # optional; eleven_v4 also works

Usage:
    python scripts/reel/voiceover.py --check            # validate the key, list TTS models
    python scripts/reel/voiceover.py --voices           # list voices you can narrate with
    python scripts/reel/voiceover.py --clone a.mp3 b.mp3 --name "Isuru"   # make an Instant Voice Clone
    python scripts/reel/voiceover.py --lines            # 1. generate the lines + cues.json (the renderer reads it)
    python scripts/reel/render.py                       # 2. render the video, cut to the cues
    python scripts/reel/voiceover.py                    # 3. mix the voice into the reel
    python scripts/reel/voiceover.py --force            # regenerate every line
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VIDEO = ROOT / "public" / "media" / "reel.mp4"
CACHE = Path(__file__).parent / "vo"
API = "https://api.elevenlabs.io/v1"


def find_ffmpeg() -> str:
    """ffmpeg from the imageio-ffmpeg package if installed, else one on PATH."""
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    found = shutil.which("ffmpeg")
    if found:
        return found
    sys.exit("ffmpeg not found. Install it for this Python with:  python -m pip install imageio-ffmpeg")


class _Ffmpeg:
    # Resolved on first use, so --check and --clone work without ffmpeg installed
    path: str | None = None

    def __str__(self) -> str:
        if self.path is None:
            self.path = find_ffmpeg()
        return self.path

    def __fspath__(self) -> str:
        return str(self)


FFMPEG = _Ffmpeg()

# The narrator, from the ElevenLabs voice library: (voice id, speaking speed; 1.0 = natural)
VOICES = {
    "maya": ("SYVQhjMSUvWA1w0HkidA", 1.12),  # Maya, South Asian female, calm
}

# (start second, latest end second, voice, line), timed to the scenes in reel.html.
# The idea: an engineer who works inside the team and covers a department's worth of work,
# shown rather than claimed. No project, client or employer work is named.
SCRIPT = [
    (0.6, 3.9, "maya", "Most AI stops at the demo."),
    (4.2, 9.3, "maya", "Isuru builds inside your team, and ships what actually runs."),
    (9.8, 12.6, "maya", "The calls get answered."),
    (13.2, 16.6, "maya", "The hard questions get reasoned through."),
    (17.2, 20.8, "maya", "The models stay healthy, long after launch."),
    (21.3, 26.0, "maya", "Support. Research. Operations. Data."),
    (26.5, 29.8, "maya", "One engineer. Isuru Chathuranga."),
]
LIST_LINE = 5  # its pauses are the rhythm the photo cuts follow, so they are kept as spoken
CUES = CACHE / "cues.json"
MAX_SPEEDUP = 1.12  # beyond this the voice starts to sound rushed; shorten the line instead


def load_env() -> None:
    for name in (".env.local", ".env"):
        path = ROOT / name
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                m = re.match(r"\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", line)
                if m and m.group(1) not in os.environ:
                    os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")


def need(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Missing {name}. Add it to .env.local at the repo root (see the top of this file).")
    return value


def request(method: str, path: str, *, body: bytes | None = None, headers: dict | None = None) -> bytes:
    req = urllib.request.Request(f"{API}{path}", data=body, method=method,
                                 headers={"xi-api-key": need("ELEVENLABS_API_KEY"), **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs {method} {path} failed: {e.code} {e.read().decode(errors='replace')[:400]}")


def check() -> None:
    models = json.loads(request("GET", "/models"))
    tts = [m["model_id"] for m in models if m.get("can_do_text_to_speech")]
    print("Key works. Text-to-speech models:", ", ".join(tts))
    voice = os.environ.get("ELEVENLABS_VOICE_ID")
    if voice:
        info = json.loads(request("GET", f"/voices/{voice}"))
        print(f"Voice {voice}: {info.get('name')} ({info.get('category')})")


def voices() -> None:
    """Every voice this account can use, so a narrator can be picked by ID."""
    data = json.loads(request("GET", "/voices"))
    for v in sorted(data.get("voices", []), key=lambda v: (v.get("category") != "cloned", v.get("name", ""))):
        labels = v.get("labels") or {}
        traits = ", ".join(str(labels[k]) for k in ("gender", "age", "accent", "description", "use_case", "use case") if labels.get(k))
        print(f"{v['voice_id']}  {v.get('name', '?'):<28} {v.get('category', ''):<12} {traits}")


def samples(voice_ids: list[str]) -> None:
    """Read the opening lines in each voice, to choose a narrator by ear."""
    out = ROOT / "brand-refs" / "voice-samples"
    out.mkdir(parents=True, exist_ok=True)
    names = {v["voice_id"]: v.get("name", v["voice_id"]).split(" - ")[0] for v in json.loads(request("GET", "/voices"))["voices"]}
    text = " ".join(line for *_, line in SCRIPT[:3])
    for vid in voice_ids:
        body = {"text": text, "model_id": os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
                "voice_settings": {"stability": 0.55, "similarity_boost": 0.85, "style": 0.15, "use_speaker_boost": True}}
        audio = request("POST", f"/text-to-speech/{vid}?output_format=mp3_44100_128",
                        body=json.dumps(body).encode(), headers={"Content-Type": "application/json", "Accept": "audio/mpeg"})
        path = out / f"{names.get(vid, vid)}.mp3"
        path.write_bytes(audio)
        print("wrote", path)


def clone(files: list[str], name: str) -> None:
    boundary = uuid.uuid4().hex
    parts = [f'--{boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n{name}\r\n'.encode()]
    for f in files:
        data = Path(f).read_bytes()
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="files"; filename="{Path(f).name}"\r\n'
            f"Content-Type: audio/mpeg\r\n\r\n".encode() + data + b"\r\n"
        )
    parts.append(f"--{boundary}--\r\n".encode())
    out = json.loads(request("POST", "/voices/add", body=b"".join(parts),
                             headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}))
    print("Created voice:", out["voice_id"])
    if out.get("requires_verification"):
        print("ElevenLabs needs you to verify this voice in the dashboard before it can be used.")
    print("Add to .env.local:  ELEVENLABS_VOICE_ID=" + out["voice_id"])


def duration(path: Path) -> float:
    err = subprocess.run([FFMPEG, "-i", str(path)], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", err).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def synthesize(index: int, narrator: str, text: str, force: bool) -> Path:
    voice, speed = VOICES[narrator]
    model = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")
    lines = [line for *_, line in SCRIPT]
    key = hashlib.sha1(f"{voice}|{model}|{speed}|{text}".encode()).hexdigest()[:10]
    out = CACHE / f"{index:02d}-{key}.mp3"
    if out.exists() and not force:
        return out
    body = {
        "text": text,
        "model_id": model,
        # Calm, steady narration that still sounds like the person
        "voice_settings": {"stability": 0.55, "similarity_boost": 0.85, "style": 0.15, "use_speaker_boost": True,
                           "speed": speed},
        "previous_text": " ".join(lines[:index])[-400:] or None,
        "next_text": " ".join(lines[index + 1:])[:400] or None,
        "seed": 4207,
    }
    audio = request("POST", f"/text-to-speech/{voice}?output_format=mp3_44100_128",
                    body=json.dumps(body).encode(), headers={"Content-Type": "application/json", "Accept": "audio/mpeg"})
    CACHE.mkdir(exist_ok=True)
    for old in CACHE.glob(f"{index:02d}-*.mp3"):
        old.unlink()
    raw = out.with_suffix(".raw.mp3")
    raw.write_bytes(audio)
    # Trim the silence ElevenLabs leaves at both ends, so each line starts exactly on its cue
    trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05"
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(raw),
                    "-af", f"{trim},areverse,{trim},areverse", "-b:a", "128k", str(out)], check=True)
    raw.unlink()
    return out


def prepare(index: int, clip: Path) -> Path:
    """The clip as it goes into the mix: breaths inside a line shortened to ~0.12s."""
    if index == LIST_LINE:
        # Keep the pauses; only drop a breath after the last word (a short sound after a final pause)
        cut = clip.with_name(clip.stem + ".cut.wav")
        err = subprocess.run([FFMPEG, "-i", str(clip), "-af", "silencedetect=noise=-35dB:d=0.25", "-f", "null", "-"],
                             capture_output=True, text=True).stderr
        pauses = [(float(a), float(b)) for a, b in re.findall(r"silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)", err)]
        end = duration(clip)
        if pauses and end - pauses[-1][1] < 0.7:
            end = pauses[-1][0] + 0.1
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(clip),
                        "-af", f"atrim=0:{end:.3f},afade=t=out:st={end - 0.08:.3f}:d=0.08", str(cut)], check=True)
        return cut
    tight = clip.with_name(clip.stem + ".tight.wav")
    tighten = "silenceremove=stop_periods=-1:stop_duration=0.2:stop_threshold=-40dB:stop_silence=0.12"
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(clip), "-af", tighten, str(tight)], check=True)
    return tight


def onsets(clip: Path) -> list[float]:
    """When each spoken phrase starts inside a clip (0 first), found from the pauses between them."""
    err = subprocess.run([FFMPEG, "-i", str(clip), "-af", "silencedetect=noise=-35dB:d=0.15", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    return [0.0] + [e for e in ends if e < duration(clip) - 0.15]


def write_cues(clips: list[tuple[float, float, Path]]) -> None:
    """Tell the renderer when each line and each word of the list line is spoken."""
    lines = []
    for i, (start, end, clip) in enumerate(clips):
        length = duration(prepare(i, clip))
        lines.append({"start": start, "dur": round(length, 2), "window": round(end - start, 2)})
        print(f"  line {i + 1}: {length:.2f}s spoken, {end - start:.1f}s window")
    start, _, clip = clips[LIST_LINE]
    words = [round(start + o, 2) for o in onsets(prepare(LIST_LINE, clip))]
    print("  list words at:", words)
    CUES.write_text(json.dumps({"lines": lines, "list": words}, indent=1), encoding="utf-8")


def mix(clips: list[tuple[float, float, Path]]) -> None:
    inputs, filters, labels = ["-i", str(VIDEO)], [], []
    for i, (start, end, clip) in enumerate(clips, 1):
        clip = prepare(i - 1, clip)
        length = duration(clip)
        tempo = max(1.0, length / (end - start))
        if tempo > MAX_SPEEDUP:
            print(f"  ! line {i} is {length:.1f}s for a {end - start:.1f}s window; shorten it in SCRIPT")
            tempo = MAX_SPEEDUP
        ms = int(start * 1000)
        inputs += ["-i", str(clip)]
        filters.append(f"[{i}:a]atempo={tempo:.3f},adelay={ms}|{ms}[a{i}]")
        labels.append(f"[a{i}]")
        print(f"  line {i}: {length:.1f}s at {start:.1f}s" + (f" (x{tempo:.2f})" if tempo > 1 else ""))
    # Mix to one track, pad/trim it to exactly the video's length, then normalise loudness
    total = duration(VIDEO)
    filters.append(
        f"{''.join(labels)}amix=inputs={len(labels)}:duration=longest:normalize=0,"
        f"apad=whole_dur={total:.3f},atrim=0:{total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[vo]"
    )
    tmp = VIDEO.with_suffix(".vo.mp4")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filters),
                    "-map", "0:v", "-map", "[vo]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
                    "-movflags", "+faststart", str(tmp)], check=True)
    shutil.move(tmp, VIDEO)
    print("wrote", VIDEO, f"{VIDEO.stat().st_size / 1e6:.1f} MB")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--voices", action="store_true", help="list the voices this account can use")
    ap.add_argument("--sample", nargs="+", metavar="VOICE_ID", help="read the opening lines in each voice")
    ap.add_argument("--clone", nargs="+", metavar="AUDIO")
    ap.add_argument("--name", default="Isuru")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--lines", action="store_true", help="generate the lines and cues only; don't touch the video")
    args = ap.parse_args()
    load_env()

    if args.check:
        return check()
    if args.voices:
        return voices()
    if args.sample:
        return samples(args.sample)
    if args.clone:
        return clone(args.clone, args.name)

    print("Generating lines…")
    clips = [(start, end, synthesize(i, narrator, text, args.force)) for i, (start, end, narrator, text) in enumerate(SCRIPT)]
    write_cues(clips)
    if args.lines:
        return
    print("Mixing into the reel…")
    mix(clips)


if __name__ == "__main__":
    main()

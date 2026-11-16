"""Render scripts/reel/reel.html to public/media/reel.mp4 (+ a poster frame).

Steps through the reel with window.seek(t), screenshots every frame in headless Chrome,
and pipes the frames into ffmpeg. Deterministic: the same HTML always gives the same video.

Usage: python scripts/reel/render.py [--fps 30]             (needs playwright + imageio-ffmpeg)
       python scripts/reel/render.py --stills 2.5,11,28   saves those moments as PNGs for a quick look
"""

import argparse
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
HTML = (Path(__file__).parent / "reel.html").as_uri()
OUT_DIR = ROOT / "public" / "media"
CUES = Path(__file__).parent / "vo" / "cues.json"  # written by voiceover.py --lines


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--stills", type=str, default="", help="comma-separated times to save as PNGs instead of a video")
    ap.add_argument("--still-dir", type=str, default=str(ROOT / "brand-refs" / "reel-stills"))
    args = ap.parse_args()

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        if CUES.exists():
            # Let the reel cut its photos on the words of the voiceover
            page.add_init_script(f"window.CUES = {json.dumps(json.loads(CUES.read_text(encoding='utf-8')))}")
        page.goto(HTML, wait_until="networkidle")
        page.evaluate("window.ready")
        page.wait_for_timeout(500)
        duration = page.evaluate("window.DURATION")
        stage = page.locator("#stage")

        if args.stills:
            out = Path(args.still_dir)
            out.mkdir(parents=True, exist_ok=True)
            for t in [float(x) for x in args.stills.split(",")]:
                page.evaluate(f"seek({t})")
                stage.screenshot(path=str(out / f"t{t:05.2f}.png"))
            print("stills ->", out)
            browser.close()
            return

        OUT_DIR.mkdir(parents=True, exist_ok=True)
        mp4 = OUT_DIR / "reel.mp4"
        ffmpeg = [
            imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error",
            "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", str(args.fps), "-i", "-",
            # 1600x900 and crf 27: the photos and grain make full 1080p far too heavy for a web page
            "-vf", "scale=1600:900:flags=lanczos:in_range=full:out_range=tv,format=yuv420p",
            "-c:v", "libx264", "-preset", "slow", "-crf", "27",
            "-movflags", "+faststart", "-an", str(mp4),
        ]
        enc = subprocess.Popen(ffmpeg, stdin=subprocess.PIPE)
        frames = int(duration * args.fps)
        for f in range(frames):
            page.evaluate(f"seek({f / args.fps})")
            enc.stdin.write(stage.screenshot(type="jpeg", quality=93))
            if f % 150 == 0:
                print(f"frame {f}/{frames}")
        enc.stdin.close()
        enc.wait()

        # Poster: the end card, so the page shows something meaningful before playback
        page.evaluate("seek(29.2)")
        stage.screenshot(path=str(OUT_DIR / "reel-poster.jpg"), type="jpeg", quality=88)
        browser.close()
        print("wrote", mp4, f"{mp4.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()

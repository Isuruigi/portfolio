// Records Axon's answer library with ElevenLabs, once, so the voice call keeps Axon's exact voice even
// without an ElevenLabs subscription. Each line in src/lib/data/voice-lines.json becomes
// public/media/voice/<hash>.mp3, named by a hash of voice + model + settings + text, so editing a line
// re-records only that line. src/lib/data/voice-library.json maps each line id to its file; the call
// plays the matching recording (see functions/api/voice/match.js and voicePipeline.ts).
//
// Usage: node scripts/build-voice-library.mjs     (reads ELEVENLABS_API_KEY from .env.local)
// Same voice, model and settings as the tour (scripts/build-tour-voice.mjs), so they sound identical.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };
const envFile = path.join(root, ".env.local");
if (existsSync(envFile)) {
    for (const raw of readFileSync(envFile, "utf8").split(/\r?\n/)) {
        const m = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && m[2] && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
}
const KEY = env.ELEVENLABS_API_KEY;
const VOICE = env.ELEVENLABS_TOUR_VOICE_ID || "g8mugxIm0WCtD9QthCk3";
const MODEL = env.ELEVENLABS_TOUR_MODEL || "eleven_multilingual_v2";
const SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true };
if (!KEY) {
    console.error("ELEVENLABS_API_KEY is missing (.env.local)");
    process.exit(1);
}

const { lines } = JSON.parse(readFileSync(path.join(root, "src/lib/data/voice-lines.json"), "utf8"));
const outDir = path.join(root, "public/media/voice");
mkdirSync(outDir, { recursive: true });

const library = {};
let made = 0;
let chars = 0;
for (const line of lines) {
    const hash = createHash("sha1").update(`${VOICE}|${MODEL}|${JSON.stringify(SETTINGS)}|${line.text}`).digest("hex").slice(0, 12);
    const file = `${hash}.mp3`;
    library[line.id] = { file: `/media/voice/${file}`, text: line.text, action: line.action || null };
    if (existsSync(path.join(outDir, file))) continue;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_64`, {
        method: "POST",
        headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ text: line.text, model_id: MODEL, voice_settings: SETTINGS }),
    });
    if (!res.ok) {
        console.error(`ElevenLabs ${res.status} for "${line.id}":\n${await res.text()}`);
        process.exit(1);
    }
    writeFileSync(path.join(outDir, file), Buffer.from(await res.arrayBuffer()));
    made++;
    chars += line.text.length;
    console.log(`recorded ${line.id.padEnd(12)} ${file}`);
}

// drop recordings no line uses any more
const used = new Set(Object.values(library).map((l) => path.basename(l.file)));
for (const f of readdirSync(outDir)) if (f.endsWith(".mp3") && !used.has(f)) unlinkSync(path.join(outDir, f));

writeFileSync(path.join(root, "src/lib/data/voice-library.json"), JSON.stringify(library, null, 2) + "\n");
console.log(`${lines.length} lines, ${made} recorded now (${chars} characters), voice ${VOICE}, model ${MODEL}`);

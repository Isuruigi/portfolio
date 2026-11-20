// Records Axon's tour lines with ElevenLabs, once, so the tour speaks in a real voice at no cost per
// visitor and with no API key in the browser. Each line becomes public/media/tour/<hash>.mp3, named by a
// hash of voice + model + text, so editing a line re-records only that line; unchanged lines are skipped.
// src/lib/data/tour-voice.json maps each line to its file, and the tour plays it.
//
// Usage: node scripts/build-tour-voice.mjs        (reads ELEVENLABS_API_KEY from .env.local)
// Voice: "Axon - Sri Lankan guide (v3)", designed in ElevenLabs. Override with ELEVENLABS_TOUR_VOICE_ID.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

// tour.ts only has type imports besides plain data, so Node can load it directly
const { TOURS } = await import(pathToFileURL(path.join(root, "src/lib/data/tour.ts")).href);
const lines = [];
for (const tour of Object.values(TOURS)) {
    for (const s of tour.stops) lines.push(s.line);
    lines.push(tour.end.line);
}

const outDir = path.join(root, "public/media/tour");
mkdirSync(outDir, { recursive: true });
const map = {};
let made = 0;
let chars = 0;
for (const text of [...new Set(lines)]) {
    const hash = createHash("sha1").update(`${VOICE}|${MODEL}|${JSON.stringify(SETTINGS)}|${text}`).digest("hex").slice(0, 12);
    const file = `${hash}.mp3`;
    map[text] = `/media/tour/${file}`;
    if (existsSync(path.join(outDir, file))) continue;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_64`, {
        method: "POST",
        headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: MODEL, voice_settings: SETTINGS }),
    });
    if (!res.ok) {
        console.error(`ElevenLabs ${res.status} for: ${text.slice(0, 60)}…\n${await res.text()}`);
        process.exit(1);
    }
    writeFileSync(path.join(outDir, file), Buffer.from(await res.arrayBuffer()));
    made++;
    chars += text.length;
    console.log(`recorded ${file}  ${text.slice(0, 64)}…`);
}

// drop recordings no line uses any more
const used = new Set(Object.values(map).map((p) => path.basename(p)));
for (const f of readdirSync(outDir)) if (f.endsWith(".mp3") && !used.has(f)) unlinkSync(path.join(outDir, f));

writeFileSync(path.join(root, "src/lib/data/tour-voice.json"), JSON.stringify(map, null, 2) + "\n");
console.log(`${Object.keys(map).length} lines, ${made} recorded now (${chars} characters), voice ${VOICE}`);

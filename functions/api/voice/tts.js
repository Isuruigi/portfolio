// POST /api/voice/tts: one sentence of Axon's voice, for answers that aren't in the recorded library.
//
// Most calls never get here: common questions play Axon's recorded answers (public/media/voice, made by
// scripts/build-voice-library.mjs) in its exact ElevenLabs voice. For everything else the call sends
// the live reply here a sentence at a time. Voices, tried in order:
//   1. ElevenLabs: "Axon - Sri Lankan guide (v3)", the designed voice the tour and recordings use
//   2. Deepgram Aura-2 on your Deepgram account, only if BACKUP_TTS_VOICE is set (off by default)
//   3. Cloudflare Workers AI, Deepgram Aura-2 (free daily allowance, through the site's AI binding)
//   4. Gemini text-to-speech on the Google key (free tier, rate-limited)
// A call keeps the voice it started with: the browser sends `prefer` with the voice the first live
// clip came back in (the X-Axon-Voice header), so it only changes if that voice stops working. Keys
// stay on the server; text is capped per request, visitor and day. When nothing can speak, the call
// shows the answer on screen and says so in Axon's recorded voice.

import { checkRate, corsHeaders, spendDailyBudget } from "../../../axon/guard.js";

const MAX_CHARS = 420; // one or two spoken sentences
const ORDER = ["elevenlabs", "backup", "workers-ai", "gemini"];

export function onRequestOptions({ request, env }) {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

/** Each voice: whether it's configured, its daily character allowance, and how to speak */
const VOICES = {
    elevenlabs: {
        ready: (env) => Boolean(env.ELEVENLABS_API_KEY),
        budget: (env) => Number(env.TTS_DAILY_CHARS || 2000),
        async speak(env, text) {
            const voice = env.ELEVENLABS_VOICE_ID || "g8mugxIm0WCtD9QthCk3";
            const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=mp3_44100_64`, {
                method: "POST",
                headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
                body: JSON.stringify({
                    text,
                    model_id: env.ELEVENLABS_MODEL || "eleven_flash_v2_5",
                    voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
                }),
            });
            return res.ok && res.body ? { body: res.body, type: "audio/mpeg" } : fail(res);
        },
    },
    backup: {
        ready: (env) => Boolean(env.DEEPGRAM_API_KEY && env.BACKUP_TTS_VOICE),
        budget: (env) => Number(env.BACKUP_TTS_DAILY_CHARS || 6000),
        async speak(env, text) {
            const res = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(env.BACKUP_TTS_VOICE)}&encoding=mp3`, {
                method: "POST",
                headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            return res.ok && res.body ? { body: res.body, type: "audio/mpeg" } : fail(res);
        },
    },
    "workers-ai": {
        ready: (env) => Boolean(env.AI),
        budget: (env) => Number(env.FREE_TTS_DAILY_CHARS || 20000),
        async speak(env, text) {
            const out = await env.AI.run(env.FREE_TTS_MODEL || "@cf/deepgram/aura-2-en", {
                text,
                speaker: env.FREE_TTS_SPEAKER || "amalthea",
                encoding: "mp3",
            });
            if (out instanceof ReadableStream) return { body: out, type: "audio/mpeg" };
            if (out?.audio) return { body: Uint8Array.from(atob(out.audio), (c) => c.charCodeAt(0)), type: "audio/mpeg" };
            throw new Error("workers-ai returned no audio");
        },
    },
    gemini: {
        ready: (env) => Boolean(env.GOOGLE_API_KEY || env.GEMINI_API_KEY),
        budget: (env) => Number(env.FREE_TTS_DAILY_CHARS || 20000),
        async speak(env, text) {
            const model = env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: "POST",
                headers: { "x-goog-api-key": env.GOOGLE_API_KEY || env.GEMINI_API_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text }] }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_TTS_VOICE || "Leda" } } },
                    },
                }),
            });
            if (!res.ok) return fail(res);
            const part = (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
            if (!part?.data) throw new Error("gemini returned no audio");
            let bytes = Uint8Array.from(atob(part.data), (c) => c.charCodeAt(0));
            // Raw 16-bit PCM gets a WAV header so the browser can decode it
            if (!(bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46)) bytes = wav(bytes, Number(part.mimeType?.match(/rate=(\d+)/)?.[1] || 24000));
            return { body: bytes, type: "audio/wav" };
        },
    },
};

async function fail(res) {
    throw new Error(`${res.status} ${(await res.text().catch(() => "")).slice(0, 160)}`);
}

function wav(pcm, rate) {
    const head = new DataView(new ArrayBuffer(44));
    const w = (o, s) => [...s].forEach((c, i) => head.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF");
    head.setUint32(4, 36 + pcm.length, true);
    w(8, "WAVEfmt ");
    head.setUint32(16, 16, true);
    head.setUint16(20, 1, true);
    head.setUint16(22, 1, true);
    head.setUint32(24, rate, true);
    head.setUint32(28, rate * 2, true);
    head.setUint16(32, 2, true);
    head.setUint16(34, 16, true);
    w(36, "data");
    head.setUint32(40, pcm.length, true);
    const out = new Uint8Array(44 + pcm.length);
    out.set(new Uint8Array(head.buffer), 0);
    out.set(pcm, 44);
    return out;
}

export async function onRequestPost({ request, env }) {
    const headers = { ...corsHeaders(request, env), "Access-Control-Expose-Headers": "X-Axon-Voice" };

    let text = "";
    let prefer = "";
    try {
        const body = await request.json();
        text = String(body.text || "");
        prefer = ORDER.includes(body.prefer) ? body.prefer : "";
    } catch {
        return Response.json({ detail: "Send JSON: {text, prefer?}" }, { status: 400, headers });
    }
    // Speak plain words only: no markup, links, citation markers or page tags
    text = text
        .replace(/\[\[[^\]]*\]\]/g, "")
        .replace(/【\d+】|\[\d+\]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[*_#`>]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_CHARS);
    if (!text) return Response.json({ detail: "Nothing to say." }, { status: 400, headers });

    const ip = request.headers.get("CF-Connecting-IP") || "local";
    if (await checkRate(env, `tts:${ip}`, { perMinute: 40, perDay: 300 })) {
        return Response.json({ detail: "rate" }, { status: 429, headers });
    }

    // The call's voice first, then the rest in order
    const order = prefer ? [prefer, ...ORDER.filter((v) => v !== prefer)] : ORDER;
    let errored = false;
    for (const which of order) {
        const v = VOICES[which];
        if (!v.ready(env)) continue;
        if (await spendDailyBudget(env, `tts-${which}`, text.length, v.budget(env))) continue;
        // A dropped connection gets one retry before moving to the next voice
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const { body, type } = await v.speak(env, text);
                return new Response(body, { headers: { ...headers, "Content-Type": type, "Cache-Control": "no-store", "X-Axon-Voice": which } });
            } catch (err) {
                // A cancelled plan, spent credits or an outage: note it and try the next voice
                console.error(`tts ${which} failed:`, err?.message || err);
                errored = true;
                if (!/connection|network|timed? ?out|\b5\d\d\b/i.test(String(err?.message))) break;
            }
        }
    }
    // "unavailable": a hiccup, worth trying the next sentence; "budget": nothing left today
    return errored
        ? Response.json({ detail: "unavailable" }, { status: 503, headers })
        : Response.json({ detail: "budget" }, { status: 429, headers });
}

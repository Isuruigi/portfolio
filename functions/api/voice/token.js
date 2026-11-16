// POST /api/voice/token: a single-use Gemini Live token for a voice call with Axon.
//
// The browser never sees the API key. The model, voice, system prompt and tools are locked into
// the token here, so a token can only ever run Axon. Port of backend/voice.py, now sharing the
// chat agent's knowledge base and guardrails (axon/knowledge.js).

import { GoogleGenAI } from "@google/genai";
import { checkRate, corsHeaders } from "../../../axon/guard.js";
import { voiceSystemPrompt } from "../../../axon/prompt.js";

// Page targets Axon can scroll to; ids match the portfolio's section and project anchors
const SECTIONS = ["hero", "work", "personaplex", "nexus", "fraud", "career", "teaching", "about", "blog", "news", "contact"];
const DOORS = ["hire", "build", "learn"];

const TOOLS = [
    {
        functionDeclarations: [
            {
                name: "navigate_to_section",
                description: "Scroll the visitor's page to a part of Isuru's portfolio so they can see what you're talking about.",
                parameters: { type: "OBJECT", properties: { section: { type: "STRING", enum: SECTIONS } }, required: ["section"] },
            },
            {
                name: "open_contact",
                description: "Open the contact form with the right subject when the visitor wants to hire Isuru, build something with him, or learn from him.",
                parameters: { type: "OBJECT", properties: { door: { type: "STRING", enum: DOORS } }, required: ["door"] },
            },
            {
                name: "end_call",
                description: "End the call after the visitor says goodbye or clearly wants to stop.",
                parameters: { type: "OBJECT", properties: {} },
            },
        ],
    },
];

function languageRule(languages) {
    if (languages.includes("si")) {
        return "Speak English by default. If the caller speaks Sinhala, reply in natural, everyday spoken Sinhala and keep using it until they switch back.";
    }
    return "Speak English. If the caller uses another language, say briefly, in English, that voice calls are English-only for now and that they can type in Sinhala or Tamil in the chat instead.";
}

// Calls issued today, per isolate (KV makes it global when bound)
const today = { day: "", count: 0 };
async function dailyCapReached(env, cap) {
    const day = new Date().toISOString().slice(0, 10);
    if (env.AXON_KV) {
        const key = `voice:${day}`;
        const n = Number((await env.AXON_KV.get(key)) || 0);
        if (n >= cap) return true;
        await env.AXON_KV.put(key, String(n + 1), { expirationTtl: 90000 });
        return false;
    }
    if (today.day !== day) Object.assign(today, { day, count: 0 });
    if (today.count >= cap) return true;
    today.count++;
    return false;
}

export function onRequestOptions({ request, env }) {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

export async function onRequestPost({ request, env }) {
    const headers = corsHeaders(request, env);
    const key = env.GOOGLE_API_KEY || env.GEMINI_API_KEY;
    if (!key) return Response.json({ detail: "Voice calls aren't set up yet." }, { status: 503, headers });

    const ip = request.headers.get("CF-Connecting-IP") || "local";
    // Voice is the expensive path: 3 calls per 10 minutes per visitor, and a daily cap
    if (await checkRate(env, `voice:${ip}`, { perMinute: 3, perDay: 10 })) {
        return Response.json({ detail: "Too many calls from this connection. Try again in a few minutes." }, { status: 429, headers });
    }
    if (await dailyCapReached(env, Number(env.VOICE_DAILY_CAP || 150))) {
        return Response.json({ detail: "Voice calls are paused for today. Chat still works." }, { status: 429, headers });
    }

    const model = env.VOICE_MODEL || "gemini-3.8-live";
    const voice = env.VOICE_NAME || "Aoede";
    const maxSeconds = Number(env.VOICE_MAX_SECONDS || 180);
    const languages = (env.VOICE_LANGUAGES || "en").split(",").map((s) => s.trim()).filter(Boolean);
    const now = Date.now();

    try {
        const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: "v1alpha" } });
        const token = await ai.authTokens.create({
            config: {
                uses: 1,
                expireTime: new Date(now + (maxSeconds + 120) * 1000).toISOString(),
                newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
                liveConnectConstraints: {
                    model,
                    config: {
                        responseModalities: ["AUDIO"],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
                        systemInstruction: voiceSystemPrompt(languageRule(languages)),
                        tools: TOOLS,
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                    },
                },
            },
        });
        return Response.json({ token: token.name, model, max_seconds: maxSeconds, issued_at: Math.floor(now / 1000) }, { headers });
    } catch (err) {
        console.error("voice token failed:", err?.message || err);
        return Response.json({ detail: "Couldn't start a call just now. Try chat instead." }, { status: 502, headers });
    }
}

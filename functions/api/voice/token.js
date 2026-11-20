// POST /api/voice/token: starts a voice call with Axon.
//
// Two ways to run a call, picked here so the browser never sees an API key:
//   pipeline (default when a Deepgram key is set; ElevenLabs is the voice, Deepgram Aura the backup)
//     the browser streams the microphone to Deepgram (speech to text) with a 30-second token minted
//     here, sends each finished sentence to /api/chat (the same knowledge-grounded agent as the chat,
//     in short spoken style), and plays the reply in Axon's ElevenLabs voice via /api/voice/tts
//   gemini (fallback, or VOICE_PIPELINE=gemini)
//     a single-use Gemini Live token with the model, voice, system prompt and tools locked in

import { GoogleGenAI } from "@google/genai";
import { checkRate, corsHeaders, dailyCapReached } from "../../../axon/guard.js";
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

export function onRequestOptions({ request, env }) {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

export async function onRequestPost({ request, env }) {
    const headers = corsHeaders(request, env);
    const key = env.GOOGLE_API_KEY || env.GEMINI_API_KEY;
    // Deepgram alone is enough: it hears, and its Aura voice speaks if ElevenLabs isn't there
    const canPipeline = Boolean(env.DEEPGRAM_API_KEY);
    if (!key && !canPipeline) return Response.json({ detail: "Voice calls aren't set up yet." }, { status: 503, headers });

    const ip = request.headers.get("CF-Connecting-IP") || "local";
    // Voice is the expensive path: 3 calls per 10 minutes per visitor, and a daily cap
    if (await checkRate(env, `voice:${ip}`, { perMinute: 3, perDay: 10 })) {
        return Response.json({ detail: "Too many calls from this connection. Try again in a few minutes." }, { status: 429, headers });
    }
    if (await dailyCapReached(env, "voice", Number(env.VOICE_DAILY_CAP || 150))) {
        return Response.json({ detail: "Voice calls are paused for today. Chat still works." }, { status: 429, headers });
    }

    const maxSecondsPipeline = Number(env.VOICE_MAX_SECONDS || 180);
    const usePipeline = canPipeline && env.VOICE_PIPELINE !== "gemini";
    if (usePipeline) {
        try {
            const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
                method: "POST",
                headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ ttl_seconds: 30 }),
            });
            const grant = await res.json().catch(() => ({}));
            if (!res.ok || !grant.access_token) throw new Error(`deepgram grant ${res.status}`);
            return Response.json(
                {
                    provider: "pipeline",
                    stt: { token: grant.access_token, model: env.STT_MODEL || "nova-3", language: env.STT_LANGUAGE || "en" },
                    max_seconds: maxSecondsPipeline,
                },
                { headers }
            );
        } catch (err) {
            console.error("deepgram token failed:", err?.message || err);
            // fall through to Gemini Live if it is configured
            if (!key) return Response.json({ detail: "Couldn't start a call just now. Try chat instead." }, { status: 502, headers });
        }
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
        return Response.json({ provider: "gemini", token: token.name, model, max_seconds: maxSeconds, issued_at: Math.floor(now / 1000) }, { headers });
    } catch (err) {
        console.error("voice token failed:", err?.message || err);
        return Response.json({ detail: "Couldn't start a call just now. Try chat instead." }, { status: 502, headers });
    }
}

// GET /api/health: what is configured, without revealing any secret.

import { corsHeaders } from "../../axon/guard.js";
import { CARDS } from "../../axon/knowledge.js";
import { poolStatus } from "../../axon/llm.js";

export async function onRequestGet({ request, env }) {
    const pool = await poolStatus(env);
    return Response.json(
        {
            ok: true,
            agent: "Axon",
            cards: CARDS.length,
            chat: Object.keys(pool.lanes).length > 0,
            models: pool,
            voice: Boolean(env.DEEPGRAM_API_KEY || env.GOOGLE_API_KEY || env.GEMINI_API_KEY),
            voice_pipeline:
                env.DEEPGRAM_API_KEY && env.VOICE_PIPELINE !== "gemini"
                    ? `deepgram -> recorded answers -> live: ${["elevenlabs", env.BACKUP_TTS_VOICE && "aura", env.AI && "workers-ai", (env.GOOGLE_API_KEY || env.GEMINI_API_KEY) && "gemini"]
                          .filter((v, i) => (i === 0 ? env.ELEVENLABS_API_KEY : v))
                          .join(" > ")}`
                    : "gemini-live",
            // On only when switched on: the keys alone don't mean the avatar agent is deployed and answering
            avatar: env.AVATAR_ENABLED === "true" && Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET),
            leads: env.RESEND_API_KEY && env.LEAD_TO ? "email" : "contact-form",
            sharedLimits: Boolean(env.AXON_KV),
        },
        { headers: corsHeaders(request, env) }
    );
}

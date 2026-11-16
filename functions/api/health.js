// GET /api/health: what is configured, without revealing any secret.

import { corsHeaders } from "../../axon/guard.js";
import { CARDS } from "../../axon/knowledge.js";

export function onRequestGet({ request, env }) {
    return Response.json(
        {
            ok: true,
            agent: "Axon",
            cards: CARDS.length,
            chat: Boolean(env.GROQ_API_KEY || env.AI),
            voice: Boolean(env.GOOGLE_API_KEY || env.GEMINI_API_KEY),
            leads: env.RESEND_API_KEY && env.LEAD_TO ? "email" : "contact-form",
            sharedLimits: Boolean(env.AXON_KV),
        },
        { headers: corsHeaders(request, env) }
    );
}

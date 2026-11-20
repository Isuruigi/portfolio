// POST /api/voice/match: which of Axon's recorded answers fits what the caller just said?
//
// The voice call asks here first. A recorded answer (src/lib/data/voice-lines.json, recorded by
// scripts/build-voice-library.mjs) plays instantly in Axon's exact ElevenLabs voice and costs nothing,
// so it works the same with or without an ElevenLabs subscription. Only when nothing fits does the call
// generate a live answer. A small, fast model picks from short descriptions and may say "none".

import { checkMessage, checkRate, corsHeaders } from "../../../axon/guard.js";
import { complete } from "../../../axon/llm.js";
import LINES from "../../../src/lib/data/voice-lines.json";

const CHOICES = LINES.lines.filter((l) => !l.special);
const IDS = new Set(CHOICES.map((l) => l.id));
const MENU = CHOICES.map((l) => `${l.id}: ${l.about}`).join("\n");

export function onRequestOptions({ request, env }) {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

export async function onRequestPost({ request, env }) {
    const headers = corsHeaders(request, env);
    let text = "";
    let previous = "";
    try {
        const body = await request.json();
        text = String(body.text || "").slice(0, 400);
        previous = String(body.previous || "").slice(0, 300);
    } catch {
        return Response.json({ id: null }, { status: 400, headers });
    }
    if (!text.trim()) return Response.json({ id: null }, { headers });

    const ip = request.headers.get("CF-Connecting-IP") || "local";
    // Abuse and rate checks first; a refused message gets the recorded off-topic line
    if (checkMessage(text, false)) return Response.json({ id: "offtopic" }, { headers });
    if (await checkRate(env, `match:${ip}`, { perMinute: 30, perDay: 400 })) return Response.json({ id: null }, { status: 429, headers });

    try {
        const answer = await complete(
            env,
            [
                {
                    role: "system",
                    content: `You route a caller's question on a voice call to one of Axon's recorded answers. Axon is the agent on Isuru Chathuranga's portfolio site.

Recorded answers (id: what it answers):
${MENU}

Reply with exactly one id from the list if that recording fully and directly answers what the caller said. Reply "none" if it needs details a recording doesn't have, is a follow-up that depends on the earlier conversation, asks something specific, or no recording fits well. Reply with the id or "none" only, nothing else.`,
                },
                { role: "user", content: previous ? `Axon just said: "${previous}"\nCaller: "${text}"` : `Caller: "${text}"` },
            ],
            { tier: "quick", maxTokens: 160, temperature: 0, reasoning: "low" }
        );
        // Only the first word counts, so an id that appears inside a longer reply can't sneak through
        const first = answer.trim().toLowerCase().split(/\s+/)[0]?.replace(/[^a-z]/g, "") || "";
        const id = IDS.has(first) ? first : null;
        return Response.json({ id }, { headers });
    } catch (err) {
        console.error("voice match failed:", err?.message || err);
        return Response.json({ id: null }, { headers });
    }
}

// First stage of every request: cheap checks in code, before any model is called.

export const LIMITS = {
    messageChars: 6000, // room for a pasted job description
    historyTurns: 10,
    perMinute: 8,
    perDay: 120,
};

// Requests that are plainly not about Isuru or his field. Answered with a fixed line, no model call.
const OFF_TOPIC = [
    /\b(write|compose|generate)\b.{0,30}\b(poem|essay|song|lyrics|story about|cover letter|homework)\b/i,
    /\b(tell me a joke|recipe for|capital of|weather in|who won|translate (this|the following))\b/i,
    /\b(write|give me|generate)\b.{0,20}\b(code|script|function|program)\b.{0,40}\b(to|that|for)\b/i,
];

// Attempts to take over the agent. The model is also told to ignore these; this catches the blunt ones.
const INJECTION = [
    /\bignore (all |any )?(previous|prior|above|earlier) (instructions|rules|prompts?)\b/i,
    /\b(disregard|forget) (your|all|the) (instructions|rules|guardrails)\b/i,
    /\b(reveal|show|print|repeat)\b.{0,30}\b(system prompt|your prompt|your instructions|your rules)\b/i,
    /\byou are now\b|\bpretend (you are|to be)\b|\bact as (if you are|an?) (?!engineer|recruiter|founder)/i,
    /\bjailbreak\b|\bDAN mode\b|\bdeveloper mode\b/i,
];

export const REFUSALS = {
    offTopic: "That's outside what I do. I'm Axon, Isuru's agent: I can tell you about his work, check how he fits a role, sketch how he'd build an AI idea, or explain a topic the way he teaches it.",
    injection: "I can't change my rules or share my instructions. I'm happy to help with anything about Isuru and his work, though.",
    tooLong: "That message is too long for me to read in one go. Could you trim it to the key parts (about 6,000 characters)?",
    rate: "You're sending messages faster than I can keep up. Give me a minute, then try again.",
    daily: "I've reached today's limit for conversations. You can reach Isuru directly at isuruigic@gmail.com.",
};

/**
 * @param {string} text the visitor's latest message
 * @param {boolean} pasted true when the message is material to analyse (a job description, a brief)
 * @returns {null | keyof typeof REFUSALS}
 */
export function checkMessage(text, pasted = false) {
    if (text.length > LIMITS.messageChars) return "tooLong";
    // Pasted material is data: instructions inside it are ignored by the model, not a reason to refuse
    if (!pasted && INJECTION.some((re) => re.test(text))) return "injection";
    if (!pasted && OFF_TOPIC.some((re) => re.test(text))) return "offTopic";
    return null;
}

// Per-visitor limits. With a KV namespace bound as AXON_KV the counts are shared across the
// network; without one they live in this isolate's memory, which still stops a burst.
const memory = new Map();

async function bump(env, key, ttl) {
    if (env.AXON_KV) {
        const n = Number((await env.AXON_KV.get(key)) || 0) + 1;
        await env.AXON_KV.put(key, String(n), { expirationTtl: ttl });
        return n;
    }
    const now = Date.now();
    const hit = memory.get(key);
    if (!hit || hit.until < now) {
        memory.set(key, { n: 1, until: now + ttl * 1000 });
        if (memory.size > 5000) for (const [k, v] of memory) if (v.until < now) memory.delete(k);
        return 1;
    }
    return ++hit.n;
}

/** @returns {Promise<null | "rate" | "daily">} */
export async function checkRate(env, ip, limits = LIMITS) {
    const minute = Math.floor(Date.now() / 60000);
    const day = new Date().toISOString().slice(0, 10);
    if ((await bump(env, `rl:${ip}:${minute}`, 120)) > limits.perMinute) return "rate";
    if ((await bump(env, `day:${ip}:${day}`, 90000)) > limits.perDay) return "daily";
    return null;
}

// Browsers allowed to call the API: the site itself, plus local development
export function corsHeaders(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "https://isuruig.com,https://www.isuruig.com").split(",").map((s) => s.trim());
    const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const ok = allowed.includes(origin) || local || origin.endsWith(".pages.dev");
    return {
        "Access-Control-Allow-Origin": ok ? origin : allowed[0],
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin",
    };
}

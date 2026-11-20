// Axon's model pool: free tiers from several providers, used as one.
//
// Each "lane" is one provider + model. A request walks its lanes in order:
//   - a lane that isn't configured (no key or binding) is skipped
//   - a lane that is benched (hit its rate limit or daily quota recently) is skipped
//   - a lane that errors, or says nothing within the first-token timeout, is benched
//     for as long as its limit says and the next lane takes over
// Once a lane starts answering it finishes the answer; we never restart mid-sentence.
//
// Two tiers: "quick" (most questions: the fastest lanes first) and "deep" (hiring fit
// checks: the strongest reasoning models first). AXON_LANES_QUICK / AXON_LANES_DEEP
// override the order with a comma-separated list of lane ids.
//
// Benches live in KV when AXON_KV is bound (shared across Cloudflare's network),
// otherwise in this isolate's memory.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// OpenRouter's free models (ids ending in :free cost nothing; 20/min, 50/day per account,
// 1,000/day once $10 of credit has ever been bought). Up to three are tried per request.
const OPENROUTER_FAST = "google/gemma-4-31b-it:free,thinkingmachines/inkling-2-small:free,openrouter/free";
const OPENROUTER_STRONG = "nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-31b-it:free,openrouter/free";

const ORDER = {
    quick: ["groq", "gemini", "openrouter", "workers-ai", "groq-small"],
    deep: ["groq", "openrouter-strong", "gemini", "workers-ai"],
};

/** Every lane this deployment could use, keyed by id. */
function lanes(env) {
    const gemini = env.GOOGLE_API_KEY || env.GEMINI_API_KEY;
    // Reasoning models think before answering: keep it brief, and keep it out of the reply
    const effort = (e) => ({ reasoning_effort: e });
    const groq = (model) => ({ url: GROQ_URL, key: env.GROQ_API_KEY, model, body: (e) => ({ ...effort(e), include_reasoning: false }) });
    const openrouter = (list) => {
        const models = list.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
        return {
            url: OPENROUTER_URL,
            key: env.OPENROUTER_API_KEY,
            model: models[0],
            headers: { "HTTP-Referer": env.SITE_URL || "https://isuruig.com", "X-Title": "Axon (isuruig.com)" },
            body: (e) => ({ models, reasoning: { effort: e, exclude: true } }),
        };
    };
    return {
        groq: env.GROQ_API_KEY && groq(env.GROQ_MODEL || "openai/gpt-oss-120b"),
        "groq-small": env.GROQ_API_KEY && groq(env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b"),
        openrouter: env.OPENROUTER_API_KEY && openrouter(env.OPENROUTER_MODELS || OPENROUTER_FAST),
        "openrouter-strong": env.OPENROUTER_API_KEY && openrouter(env.OPENROUTER_STRONG_MODELS || OPENROUTER_STRONG),
        gemini: gemini && { url: GEMINI_URL, key: gemini, model: env.GEMINI_CHAT_MODEL || "gemini-3.5-flash-lite", body: (e) => effort(e) },
        "workers-ai": env.AI && { workersAi: true, model: env.WORKERS_AI_MODEL || "@cf/openai/gpt-oss-120b" },
    };
}

function order(env, tier) {
    const custom = tier === "deep" ? env.AXON_LANES_DEEP : env.AXON_LANES_QUICK;
    return custom ? custom.split(",").map((s) => s.trim()).filter(Boolean) : ORDER[tier] || ORDER.quick;
}

// ---------------------------------------------------------------- benches

const memoryBench = new Map(); // lane id -> epoch ms it may be used again

async function benchedUntil(env, id) {
    if (env.AXON_KV) {
        const v = await env.AXON_KV.get(`bench:${id}`);
        return v ? Number(v) : 0;
    }
    return memoryBench.get(id) || 0;
}

async function bench(env, id, ms, why) {
    const until = Date.now() + ms;
    console.warn(`axon: benching ${id} for ${Math.round(ms / 1000)}s (${why})`);
    if (env.AXON_KV) await env.AXON_KV.put(`bench:${id}`, String(until), { expirationTtl: Math.max(60, Math.ceil(ms / 1000)) });
    else memoryBench.set(id, until);
}

const untilUtcMidnight = () => {
    const d = new Date();
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - d.getTime();
};

/** How long a lane should rest after this failure. */
function restFor(status, headers, text) {
    if (/per[- ]day|daily|requests per day|quota/i.test(text)) return untilUtcMidnight();
    const retryAfter = Number(headers?.get?.("retry-after"));
    if (retryAfter > 0) return Math.min(retryAfter * 1000, 6 * 3600e3);
    const reset = Number(headers?.get?.("x-ratelimit-reset")); // OpenRouter: epoch ms
    if (reset > Date.now()) return Math.min(reset - Date.now(), 24 * 3600e3);
    if (status === 401 || status === 403) return 3600e3; // bad or revoked key: stop hammering it
    if (status === 429) return 60e3;
    return 20e3; // 5xx, timeouts, empty replies
}

class LaneError extends Error {
    constructor(message, status = 0, headers = null) {
        super(message);
        this.status = status;
        this.headers = headers;
    }
}

// ---------------------------------------------------------------- streaming

// Read an SSE body line by line, yielding each `data:` payload
async function* sseData(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (line.startsWith("data:")) yield line.slice(5).trim();
        }
    }
}

async function* streamOpenAiStyle(lane, messages, opts, signal) {
    const res = await fetch(lane.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${lane.key}`, "Content-Type": "application/json", ...(lane.headers || {}) },
        body: JSON.stringify({
            model: lane.model,
            messages,
            stream: true,
            temperature: opts.temperature ?? 0.3,
            max_tokens: opts.maxTokens ?? 900,
            ...lane.body(opts.reasoning || "low"),
        }),
        signal,
    });
    if (!res.ok || !res.body) {
        const text = (await res.text().catch(() => "")).slice(0, 300);
        throw new LaneError(`${res.status}: ${text}`, res.status, res.headers);
    }
    for await (const data of sseData(res.body)) {
        if (data === "[DONE]") return;
        let json;
        try {
            json = JSON.parse(data);
        } catch {
            continue; // keep-alive or partial line
        }
        if (json.error) throw new LaneError(JSON.stringify(json.error).slice(0, 300), json.error.code || 0);
        if (json.model) yield { served: json.model };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield { text: delta };
    }
}

async function* streamWorkersAi(lane, env, messages, opts) {
    const stream = await env.AI.run(lane.model, {
        messages,
        stream: true,
        max_tokens: opts.maxTokens ?? 900,
        temperature: opts.temperature ?? 0.3,
        reasoning: { effort: opts.reasoning || "low" },
    });
    for await (const data of sseData(stream)) {
        if (data === "[DONE]") return;
        try {
            const json = JSON.parse(data);
            const delta = json.response ?? json.choices?.[0]?.delta?.content;
            if (delta) yield { text: delta };
        } catch {
            // skip
        }
    }
}

/** Drops <think>…</think> blocks some open models put in the visible reply, across chunk boundaries. */
function thinkFilter() {
    let inside = false;
    let carry = "";
    return (chunk) => {
        let s = carry + chunk;
        carry = "";
        let out = "";
        for (;;) {
            if (inside) {
                const end = s.indexOf("</think>");
                if (end < 0) {
                    carry = s.slice(-7); // keep a possible partial closing tag
                    return out;
                }
                s = s.slice(end + 8);
                inside = false;
            } else {
                const start = s.indexOf("<think>");
                if (start < 0) {
                    const partial = s.lastIndexOf("<");
                    if (partial >= 0 && "<think>".startsWith(s.slice(partial))) {
                        carry = s.slice(partial);
                        return out + s.slice(0, partial);
                    }
                    return out + s;
                }
                out += s.slice(0, start);
                s = s.slice(start + 7);
                inside = true;
            }
        }
    };
}

/**
 * Stream a reply from the first lane that answers.
 * Yields {model} once (the lane and, for routers, the model that actually served it), then {text} chunks.
 * @param {{tier?: "quick"|"deep", maxTokens?: number, temperature?: number, reasoning?: "low"|"medium"|"high", firstTokenMs?: number, signal?: AbortSignal}} opts
 */
export async function* streamChat(env, messages, opts = {}) {
    const tier = opts.tier || "quick";
    const all = lanes(env);
    const ids = order(env, tier).filter((id) => all[id]);
    if (ids.length === 0) throw new Error("No model is configured. Set GROQ_API_KEY, OPENROUTER_API_KEY or GOOGLE_API_KEY, or bind AI.");

    // Benched lanes are skipped, unless every lane is benched: then try them anyway, soonest-free first
    const now = Date.now();
    const rest = await Promise.all(ids.map((id) => benchedUntil(env, id)));
    let queue = ids.filter((_, i) => rest[i] <= now);
    if (queue.length === 0) queue = ids.map((id, i) => [id, rest[i]]).sort((a, b) => a[1] - b[1]).map(([id]) => id);

    const firstTokenMs = opts.firstTokenMs ?? (tier === "deep" ? 25000 : 9000);
    let lastError;
    for (const id of queue) {
        const lane = all[id];
        const abort = new AbortController();
        const onOuterAbort = () => abort.abort();
        opts.signal?.addEventListener("abort", onOuterAbort);
        const timer = setTimeout(() => abort.abort(new LaneError(`no first token in ${firstTokenMs / 1000}s`)), firstTokenMs);
        const strip = thinkFilter();
        let started = false;
        let served = "";
        try {
            const stream = lane.workersAi ? streamWorkersAi(lane, env, messages, opts) : streamOpenAiStyle(lane, messages, opts, abort.signal);
            for await (const part of stream) {
                if (part.served) served = part.served;
                const text = part.text ? strip(part.text) : "";
                if (!text) continue;
                if (!started) {
                    started = true;
                    clearTimeout(timer);
                    yield { model: served && served !== lane.model ? `${id}:${served}` : `${id}:${lane.model}` };
                }
                yield { text };
            }
            if (started) return;
            lastError = new LaneError(`${id} returned an empty reply`);
            await bench(env, id, 20e3, "empty reply");
        } catch (err) {
            if (started) throw err; // mid-answer failure: don't restart and repeat ourselves
            if (opts.signal?.aborted) throw err; // the visitor left; nothing to fail over to
            const e = err instanceof LaneError ? err : abort.signal.reason instanceof LaneError ? abort.signal.reason : new LaneError(String(err?.message || err));
            lastError = new Error(`${id}: ${e.message}`);
            await bench(env, id, restFor(e.status, e.headers, e.message), `${e.status || "error"} ${e.message.slice(0, 80)}`);
        } finally {
            clearTimeout(timer);
            opts.signal?.removeEventListener("abort", onOuterAbort);
        }
    }
    throw lastError;
}

/** The whole reply as one string (for short jobs like a lead summary). */
export async function complete(env, messages, opts = {}) {
    let out = "";
    for await (const chunk of streamChat(env, messages, opts)) if (chunk.text) out += chunk.text;
    return out.trim();
}

/** What the pool looks like right now, for /api/health. No secrets, only lane ids. */
export async function poolStatus(env) {
    const all = lanes(env);
    const now = Date.now();
    const status = {};
    for (const id of Object.keys(all)) {
        if (!all[id]) continue;
        const until = await benchedUntil(env, id);
        status[id] = until > now ? `resting ${Math.ceil((until - now) / 1000)}s` : "ready";
    }
    return { quick: order(env, "quick").filter((id) => all[id]), deep: order(env, "deep").filter((id) => all[id]), lanes: status };
}

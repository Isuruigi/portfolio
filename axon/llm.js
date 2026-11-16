// One helper every endpoint uses to reach a model, with a fallback chain:
// Groq (large, then small) -> Gemini (if a key is set) -> Workers AI (if the binding exists).
// A provider is skipped when it isn't configured, and abandoned if it fails before its first token.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

function providers(env) {
    const list = [];
    if (env.GROQ_API_KEY) {
        const models = [env.GROQ_MODEL || "openai/gpt-oss-120b", env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b"];
        for (const model of models) {
            // gpt-oss models reason before answering; keep that short and out of the reply
            list.push({ name: `groq:${model}`, url: GROQ_URL, key: env.GROQ_API_KEY, model, extra: { reasoning_effort: "low", include_reasoning: false } });
        }
    }
    const gemini = env.GOOGLE_API_KEY || env.GEMINI_API_KEY;
    if (gemini && env.GEMINI_CHAT_MODEL) list.push({ name: `gemini:${env.GEMINI_CHAT_MODEL}`, url: GEMINI_URL, key: gemini, model: env.GEMINI_CHAT_MODEL, extra: {} });
    if (env.AI) list.push({ name: "workers-ai", workersAi: true, model: env.WORKERS_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast" });
    return list;
}

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

async function* streamOpenAiStyle(p, messages, opts) {
    const res = await fetch(p.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: p.model, messages, stream: true, temperature: opts.temperature ?? 0.3, max_tokens: opts.maxTokens ?? 900, ...p.extra, ...(opts.reasoning && p.extra?.reasoning_effort ? { reasoning_effort: opts.reasoning } : {}) }),
        signal: opts.signal,
    });
    if (!res.ok || !res.body) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    for await (const data of sseData(res.body)) {
        if (data === "[DONE]") return;
        try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) yield delta;
        } catch {
            // keep-alive or partial line; skip
        }
    }
}

async function* streamWorkersAi(p, env, messages, opts) {
    const stream = await env.AI.run(p.model, { messages, stream: true, max_tokens: opts.maxTokens ?? 900, temperature: opts.temperature ?? 0.3 });
    for await (const data of sseData(stream)) {
        if (data === "[DONE]") return;
        try {
            const delta = JSON.parse(data).response;
            if (delta) yield delta;
        } catch {
            // skip
        }
    }
}

/**
 * Stream a reply, moving down the chain if a provider fails before saying anything.
 * Yields {model} once, then {text} chunks.
 */
export async function* streamChat(env, messages, opts = {}) {
    const chain = providers(env);
    if (chain.length === 0) throw new Error("No model is configured (set GROQ_API_KEY).");
    let lastError;
    for (const p of chain) {
        let started = false;
        try {
            const stream = p.workersAi ? streamWorkersAi(p, env, messages, opts) : streamOpenAiStyle(p, messages, opts);
            for await (const text of stream) {
                if (!started) {
                    started = true;
                    yield { model: p.name };
                }
                yield { text };
            }
            if (started) return;
            lastError = new Error(`${p.name} returned an empty reply`);
        } catch (err) {
            lastError = err;
            if (started) throw err; // mid-answer failure: don't restart and repeat ourselves
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

// Builds public/news-data.json: the daily AI newsroom.
//
// Runs once a day (see .github/workflows/news.yml). Pulls a fixed list of AI news feeds,
// Hugging Face's daily papers and releases from the repos that matter for shipping AI,
// tags each story with topics, and keeps a rolling 7-day history. No LLM and no API keys:
// the page only ever reads the JSON this writes.
//
// Usage: node scripts/build-news.mjs [--out public/news-data.json]

import { readFile, writeFile } from "node:fs/promises";

const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "public/news-data.json";
const DAYS = 7;
const PER_DAY = 12;
const PER_SOURCE_PER_DAY = 3;
const TIME_ZONE = "Asia/Colombo";
const UA = "Mozilla/5.0 (compatible; isuru-portfolio-newsroom/1.0; +https://github.com/isuruig)";

// AI-focused feeds only, so nothing needs a relevance model to filter it
const FEEDS = [
    { source: "The Decoder", url: "https://the-decoder.com/feed/" },
    { source: "The Verge", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
    { source: "TechCrunch", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
    { source: "MIT Technology Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/" },
    { source: "Wired", url: "https://www.wired.com/feed/tag/ai/latest/rss" },
    { source: "Ars Technica", url: "https://arstechnica.com/ai/feed/" },
    { source: "MarkTechPost", url: "https://www.marktechpost.com/feed/" },
    { source: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", limit: 8 },
    { source: "Google AI", url: "https://blog.google/technology/ai/rss/", limit: 8 },
    { source: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", limit: 8 },
    { source: "OpenAI", url: "https://openai.com/news/rss.xml", limit: 8 },
];

// Tools people ship AI with: a new release here is news for the people this site is for
const RELEASE_REPOS = [
    "vllm-project/vllm",
    "huggingface/transformers",
    "langchain-ai/langgraph",
    "ollama/ollama",
    "pipecat-ai/pipecat",
    "livekit/agents",
    "openai/openai-agents-python",
    "anthropics/claude-code",
    "mlflow/mlflow",
    "modelcontextprotocol/python-sdk",
];

// Order matters: the first match is the story's lead topic, so specific topics come first
const TOPICS = [
    ["Voice AI", /(voice|speech|text-to-speech|tts|asr|whisper|audio|elevenlabs|deepgram|speech-to-speech|transcri\w*|dubbing|podcast)/],
    ["Agents", /(agents?|agentic|mcp|model context protocol|tool[- ]use|computer[- ]use|copilot|claude code|codex|coding assistant|workflow automation|assistants?)/],
    ["RAG & search", /(rag|retrieval|vector (database|search|store)|embeddings?|knowledge graph|semantic search|document extraction|structured (fields|output))/],
    ["Robotics", /(robots?|robotics|humanoids?|world models?|embodied)/],
    ["Models", /(gpt[-\w.]*|gemini|claude|llama|mistral|qwen|deepseek|grok|inkling|llms?|(language|reasoning|frontier|small|open) models?|open[- ]weights?|multimodal|moe|mixture of experts|model releases?)/],
    ["Infra & MLOps", /(inference|gpus?|nvidia|amd|chips?|data ?cent(er|re)s?|serving|vllm|kubernetes|latency|fine-?tun\w*|compute|mlops|observability|evals?|quantiz\w*|fp8|attention|kernels?|integration|benchmarks?)/],
    ["Research", /(paper|researchers?|study|arxiv|scientists?|drug discovery|lab work)/],
    ["Business", /(raises?|funding|valuation|ipo|acquires?|acquisition|startups?|spending|revenue|nasdaq|investors?|deal|layoffs?|ceo)/],
    ["Policy & safety", /(regulat\w*|laws?|lawsuits?|copyright|policy|ai act|senate|congress|court|safety|privacy|deepfakes?|cyber\w*|vulnerabilit\w*|terms|loyalty test|schools?|universities)/],
].map(([name, re]) => [name, new RegExp(`\\b(?:${re.source})\\b`)]); // whole words only, so "rag" never matches "storage"

const decode = (s) =>
    s
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&nbsp;/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&apos;|&#039;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");

const stripHtml = (s) =>
    decode(decode(s))
        .replace(/<[^>]+>/g, " ")
        .replace(/The post .* appeared first on .*$/i, "")
        .replace(/\s+/g, " ")
        .trim();

const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n)).replace(/[,;:.\s]+$/, "") + "…");

const tag = (block, name) => {
    const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
    return m ? m[1] : "";
};

const attr = (block, el, name) => {
    const m = block.match(new RegExp(`<${el}\\b[^>]*\\b${name}=["']([^"']+)["']`, "i"));
    return m ? decode(m[1]) : "";
};

function pickImage(block) {
    // media:content can list the video before the image, so prefer anything that looks like a picture
    const media = [...block.matchAll(/<media:(?:content|thumbnail)\b[^>]*\burl=["']([^"']+)["'][^>]*>/gi)]
        .map((m) => ({ url: decode(m[1]), tag: m[0] }))
        .filter((m) => !/medium=["']video|type=["']video/i.test(m.tag));
    if (media.length) return media[0].url;
    const enclosure = block.match(/<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*type=["']image/i);
    if (enclosure) return decode(enclosure[1]);
    const html = decode(tag(block, "content:encoded") || tag(block, "content") || tag(block, "description") || tag(block, "summary"));
    const img = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
    return img ? decode(img[1]) : "";
}

function parseFeed(xml, { source, limit = 20 }) {
    const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]).slice(0, limit);
    return blocks
        .map((b) => {
            const link = decode(tag(b, "link").trim()) || attr(b, "link", "href");
            const published = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date");
            const summary = stripHtml(tag(b, "description") || tag(b, "summary") || tag(b, "content:encoded") || tag(b, "content"));
            return {
                headline: stripHtml(tag(b, "title")),
                summary: clip(summary, 240),
                link: link.trim(),
                source,
                image: pickImage(b),
                published: new Date(decode(published).trim()).toISOString(),
            };
        })
        .filter((it) => it.headline && it.link.startsWith("http") && !Number.isNaN(Date.parse(it.published)));
}

async function get(url, { json = false, headers = {}, timeout = 20000 } = {}) {
    const res = await fetch(url, { headers: { "user-agent": UA, ...headers }, signal: AbortSignal.timeout(timeout), redirect: "follow" });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return json ? res.json() : res.text();
}

// Feeds like TechCrunch ship no image: read the article's own share image instead
async function ogImage(url) {
    try {
        const html = (await get(url, { timeout: 12000 })).slice(0, 200000);
        const m =
            html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        return m ? decode(m[1]) : "";
    } catch {
        return "";
    }
}

function topicsFor(it) {
    // What the headline is about leads; the summary only adds secondary topics
    const match = (text) => TOPICS.filter(([, re]) => re.test(text.toLowerCase())).map(([name]) => name);
    const found = [...new Set([...match(it.headline), ...match(it.summary)])];
    return found.length ? found : ["Industry"];
}

const dayOf = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(iso));
const STOP = new Set("the a an and or of to in on for with from by at is are was be its it this that how what why who new says will can could about into after over just more than your you their they has have".split(" "));
const words = (h) => new Set(h.toLowerCase().replace(/[’']s\b/g, "").replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 2 && !STOP.has(w)));
// Two headlines are the same story when they share most of their meaningful words
function sameStory(a, b) {
    const A = words(a), B = words(b);
    let shared = 0;
    for (const w of A) if (B.has(w)) shared++;
    return shared >= 3 && shared / Math.min(A.size, B.size) >= 0.5;
}
const keyOf = (it) => it.headline.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 70);

async function pool(items, size, fn) {
    const out = [];
    let i = 0;
    await Promise.all(
        Array.from({ length: size }, async () => {
            while (i < items.length) {
                const n = i++;
                out[n] = await fn(items[n]);
            }
        })
    );
    return out;
}

async function loadPrevious() {
    try {
        return JSON.parse(await readFile(OUT, "utf8"));
    } catch {
        return null;
    }
}

async function fetchPapers() {
    const rows = await get("https://huggingface.co/api/daily_papers?limit=40", { json: true });
    return rows
        .map((r) => ({
            title: r.paper.title.replace(/\s+/g, " ").trim(),
            summary: clip((r.paper.ai_summary || r.paper.summary || "").replace(/\s+/g, " ").trim(), 220),
            link: `https://huggingface.co/papers/${r.paper.id}`,
            upvotes: r.paper.upvotes ?? 0,
            image: r.thumbnail || "",
            published: r.paper.submittedOnDailyAt || r.publishedAt,
        }))
        .sort((a, b) => b.upvotes - a.upvotes)
        .slice(0, 8);
}

async function fetchReleases() {
    const headers = { accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const cutoff = Date.now() - 14 * 864e5;
    const rows = await pool(RELEASE_REPOS, 4, async (repo) => {
        try {
            const [r] = await get(`https://api.github.com/repos/${repo}/releases?per_page=1`, { json: true, headers });
            if (!r || Date.parse(r.published_at) < cutoff) return null;
            return { repo, tag: r.tag_name, name: (r.name || r.tag_name).trim(), link: r.html_url, published: r.published_at, prerelease: r.prerelease };
        } catch (e) {
            console.warn("release:", e.message);
            return null;
        }
    });
    return rows.filter(Boolean).sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
}

async function main() {
    const previous = await loadPrevious();
    const status = {};

    const fresh = (
        await pool(FEEDS, 5, async (feed) => {
            try {
                const items = parseFeed(await get(feed.url), feed);
                status[feed.source] = items.length;
                return items;
            } catch (e) {
                status[feed.source] = `failed: ${e.message}`;
                return [];
            }
        })
    ).flat();

    // Merge with what earlier runs collected, so a week of history survives feeds that only keep ten items
    const oldItems = previous?.days?.flatMap((d) => d.items) ?? [];
    const byKey = new Map();
    for (const it of [...oldItems, ...fresh]) {
        const key = keyOf(it);
        const prev = byKey.get(key);
        byKey.set(key, prev ? { ...prev, ...it, image: it.image || prev.image } : it);
    }

    const today = dayOf(new Date().toISOString());
    const keepFrom = dayOf(new Date(Date.now() - (DAYS - 1) * 864e5).toISOString());
    const all = [...byKey.values()]
        .filter((it) => dayOf(it.published) >= keepFrom && dayOf(it.published) <= today)
        .map((it) => ({ ...it, topics: topicsFor(it), also: [] }))
        .sort((a, b) => Date.parse(b.published) - Date.parse(a.published));

    // Pick each day's stories: newest first, but no single outlet takes over the day
    const days = new Map();
    for (const it of all) {
        const d = dayOf(it.published);
        const list = days.get(d) ?? [];
        // Several outlets on one story: keep the first, credit the rest
        const twin = [...days.values()].flat().find((x) => sameStory(x.headline, it.headline));
        if (twin) {
            if (twin.source !== it.source && !twin.also.some((a) => a.source === it.source)) twin.also.push({ source: it.source, link: it.link });
            continue;
        }
        if (list.length >= PER_DAY) continue;
        if (list.filter((x) => x.source === it.source).length >= PER_SOURCE_PER_DAY) continue;
        list.push(it);
        days.set(d, list);
    }

    const chosen = [...days.values()].flat();
    const missing = chosen.filter((it) => !it.image);
    await pool(missing, 6, async (it) => {
        it.image = await ogImage(it.link);
    });

    const [papers, releases] = await Promise.all([
        fetchPapers().catch((e) => (console.warn("papers:", e.message), previous?.papers ?? [])),
        fetchReleases().catch((e) => (console.warn("releases:", e.message), previous?.releases ?? [])),
    ]);

    const generatedAt = new Date().toISOString();
    const data = {
        generated_at: generatedAt,
        time_zone: TIME_ZONE,
        sources: FEEDS.map((f) => f.source),
        days: [...days.entries()]
            .sort(([a], [b]) => (a < b ? 1 : -1))
            .map(([date, items]) => ({
                date,
                items: items.map(({ headline, summary, link, source, image, published, topics, also }) => ({
                    headline,
                    summary,
                    link,
                    source,
                    image,
                    published,
                    topics,
                    also,
                })),
            })),
        papers,
        releases,
    };

    await writeFile(OUT, JSON.stringify(data, null, 1) + "\n");
    console.table(status);
    console.log(
        `wrote ${OUT}: ${data.days.length} days, ${chosen.length} stories (${chosen.filter((i) => i.image).length} with images), ${papers.length} papers, ${releases.length} releases`
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

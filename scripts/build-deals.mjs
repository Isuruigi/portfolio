// Builds public/deals-data.json: "Free for builders", refreshed every morning with the newsroom.
//
// Three live sources, no API keys, no coupon codes, no affiliate links:
//   1. free-for-dev (github.com/ripienaar/free-for-dev): the community list of free developer tiers.
//      Entries ADDED in the last two weeks, in the sections that matter for building with AI.
//      Read from GitHub's compare API, so there is no state to keep between runs.
//   2. Hacker News: popular launches from the last week whose titles say they're free or an
//      open-source alternative (Algolia's public HN search API).
//   3. The newsroom (public/news-data.json): stories that announce a free plan, credits, a price
//      cut or an open-sourced model. Strict on purpose; usually only a few, sometimes none.
// Plus a liveness check on every link in the hand-checked "always free" list (src/lib/data/deals.json).
//
// free-for-dev has no license file, so this never copies it wholesale: each entry is a name, the
// provider's own link, a short excerpt of what's free, and a link back to free-for-dev.
//
// Usage: node scripts/build-deals.mjs [--out public/deals-data.json]
// Each source fails on its own: a failed source keeps its previous results.

import { readFile, writeFile } from "node:fs/promises";

const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "public/deals-data.json";
const UA = "Mozilla/5.0 (compatible; isuru-portfolio-deals/1.0; +https://isuruig.com)";
const FFD = "ripienaar/free-for-dev";
const WINDOW_DAYS = 14;
const GH_HEADERS = { "User-Agent": UA, Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };

// free-for-dev sections worth showing, grouped under labels a visitor understands
const SECTIONS = {
    "Generative AI": "AI & ML",
    "APIs, Data, and ML": "APIs & data",
    "Code Generation": "AI & ML",
    "Major Cloud Providers": "Cloud & hosting",
    "PaaS": "Cloud & hosting",
    "BaaS": "Cloud & hosting",
    "IaaS": "Cloud & hosting",
    "Web Hosting": "Cloud & hosting",
    "Managed Data Services": "Databases & storage",
    "Storage and Media Processing": "Databases & storage",
    "Search": "Databases & storage",
    "Tunneling, WebRTC, Web Socket Servers and Other Routers": "Dev tools",
    "IDE and Code Editing": "Dev tools",
    "CI and CD": "Dev tools",
    "Testing": "Dev tools",
    "Monitoring": "Dev tools",
    "Log Management": "Dev tools",
    "Authentication, Authorization, and User Management": "Dev tools",
    "Email": "Dev tools",
    "Messaging and Streaming": "Dev tools",
    "Education and Career Development": "Learning",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, headers = { "User-Agent": UA }, tries = 2) {
    for (let i = 0; ; i++) {
        try {
            const res = await fetch(url, { headers, signal: AbortSignal.timeout(25000) });
            if (!res.ok) throw new Error(`${res.status} ${url}`);
            return res;
        } catch (err) {
            if (i + 1 >= tries) throw err;
            await sleep(1500);
        }
    }
}

const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1) > n * 0.6 ? s.lastIndexOf(" ", n - 1) : n - 1).replace(/[,;:.\s-]+$/, "") + "…");
const plain = (md) =>
    md
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links -> their text
        .replace(/[*_`]+/g, "")
        .replace(/#opensource/gi, "open source")
        .replace(/\s+/g, " ")
        .trim();

/** One free-for-dev list line -> {name, url, line}, or null if it isn't an entry. */
function parseEntry(raw) {
    const m = raw.match(/^\s*[*-]\s+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*[-–—:]\s*(.+)$/);
    if (!m) return null;
    const [, name, url, rest] = m;
    const text = plain(rest);
    // Lead with the part that says what's free, when the entry has one
    const free = text.split(/(?<=[.!])\s+/).find((s) => /\bfree\b|\bcredits?\b|\bno credit card\b|\bunlimited\b/i.test(s));
    const line = free && free !== text.split(/(?<=[.!])\s+/)[0] ? `${clip(text.split(/(?<=[.!])\s+/)[0], 90)} ${free}` : text;
    return { name: plain(name), url, line: clip(line, 170) };
}

// ---------------------------------------------------------------- 1. free-for-dev additions
/** Every entry in a copy of the README, keyed by lower-case name, with its section */
function entries(readme) {
    const map = new Map();
    let section = "";
    for (const raw of readme.split("\n")) {
        const h = raw.match(/^##\s+(.+?)\s*$/);
        if (h) section = h[1];
        const e = parseEntry(raw);
        if (e && section) map.set(e.name.toLowerCase(), { ...e, section });
    }
    return map;
}

async function freeTiers() {
    const since = new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString();
    // The list as it stood just before the window opened, and as it is today. GitHub's compare API
    // leaves the diff out for a file this size, so the two copies are compared here instead.
    const before = await (await get(`https://api.github.com/repos/${FFD}/commits?path=README.md&until=${since}&per_page=1`, GH_HEADERS)).json();
    if (!before[0]?.sha) throw new Error("no base commit found");
    const [then, now] = await Promise.all([
        get(`https://raw.githubusercontent.com/${FFD}/${before[0].sha}/README.md`).then((r) => r.text()),
        get(`https://raw.githubusercontent.com/${FFD}/HEAD/README.md`).then((r) => r.text()),
    ]);
    const old = entries(then);
    const current = entries(now);
    if (old.size < 500 || current.size < 500) throw new Error(`list looks wrong (${old.size} then, ${current.size} now)`);

    // New = on the list today, not on it two weeks ago (by name, and by link, so a rename isn't "new")
    const link = (u) => u.replace(/\/$/, "").toLowerCase();
    const oldLinks = new Set([...old.values()].map((e) => link(e.url)));
    const items = [...current.entries()]
        .filter(([key, e]) => !old.has(key) && !oldLinks.has(link(e.url)) && SECTIONS[e.section])
        .map(([, e]) => ({ name: e.name, url: e.url, line: e.line, category: SECTIONS[e.section], via: `https://github.com/${FFD}#${e.section.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-")}` }));
    return { items, compared: `${before[0].sha.slice(0, 7)} (${old.size} entries) -> today (${current.size})`, since: since.slice(0, 10) };
}

// ---------------------------------------------------------------- 2. Hacker News launches
async function hackerNews() {
    const since = Math.floor(Date.now() / 1000) - 7 * 86400;
    const queries = ["free", "open source alternative", "open-source alternative", "free tier", "self-hosted"];
    const hits = new Map();
    for (const q of queries) {
        const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&restrictSearchableAttributes=title&numericFilters=created_at_i>${since},points>=40&hitsPerPage=40`;
        const data = await (await get(url)).json();
        for (const h of data.hits || []) hits.set(h.objectID, h);
        await sleep(300);
    }
    return [...hits.values()]
        .filter((h) => h.url && /\b(free|open[- ]source|self-hosted|oss)\b/i.test(h.title))
        // Things you can use, not opinion pieces about free things
        .filter((h) => /^(show hn|launch hn)\b/i.test(h.title) || /\b(free|open[- ]source)\b.*\b(alternative|tool|app|api|tier|library|platform|editor|model)\b/i.test(h.title))
        .sort((a, b) => b.points - a.points)
        .slice(0, 12)
        .map((h) => ({
            title: h.title.replace(/^(Show|Launch) HN:\s*/i, ""),
            url: h.url,
            discussion: `https://news.ycombinator.com/item?id=${h.objectID}`,
            points: h.points,
            date: h.created_at.slice(0, 10),
        }));
}

// ---------------------------------------------------------------- 3. deals in the news
const DEAL_NEWS = /\b(free[- ]tier|free plan|free credits?|free for (developers|students|startups|everyone)|now free|made (it )?free|free of charge|at no cost|price cuts?|cuts? (its |the )?prices?|slashes prices|cheaper (api|plan|tier)|\d+% off|discounts? (for|on)|open[- ]sources (its|the|a)|open[- ]sourced|releases? open[- ]weights?)\b/i;
async function inTheNews() {
    const news = JSON.parse(await readFile("public/news-data.json", "utf8"));
    return news.days
        .flatMap((d) => d.items)
        .filter((s) => DEAL_NEWS.test(s.headline) || DEAL_NEWS.test(s.summary))
        .slice(0, 8)
        .map((s) => ({ headline: s.headline, url: s.link, source: s.source, date: s.published?.slice(0, 10) }));
}

// ---------------------------------------------------------------- always-free list: are the links alive?
async function checkLinks() {
    const list = JSON.parse(await readFile("src/lib/data/deals.json", "utf8"));
    const results = {};
    await Promise.all(
        list.map(async (d) => {
            try {
                // Some sites refuse HEAD; a ranged GET is cheap and widely accepted
                const res = await fetch(d.url, { headers: { "User-Agent": UA, Range: "bytes=0-1024" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
                results[d.url] = res.status < 400 || res.status === 403 || res.status === 429 ? "ok" : `http ${res.status}`;
            } catch {
                results[d.url] = "unreachable";
            }
        })
    );
    return results;
}

// ---------------------------------------------------------------- run
let previous = {};
try {
    previous = JSON.parse(await readFile(OUT, "utf8"));
} catch {
    // first run
}

const run = async (name, fn) => {
    try {
        return { ok: true, value: await fn() };
    } catch (err) {
        console.warn(`deals: ${name} failed, keeping the last results:`, err?.message || err);
        return { ok: false };
    }
};

const [ffd, hn, news, links] = await Promise.all([run("free-for-dev", freeTiers), run("Hacker News", hackerNews), run("news", inTheNews), run("link check", checkLinks)]);
const data = {
    generated_at: new Date().toISOString(),
    window_days: WINDOW_DAYS,
    free_tiers: ffd.ok ? ffd.value.items : previous.free_tiers || [],
    hacker_news: hn.ok ? hn.value : previous.hacker_news || [],
    in_the_news: news.ok ? news.value : previous.in_the_news || [],
    link_check: links.ok ? { checked_at: new Date().toISOString().slice(0, 10), results: links.value } : previous.link_check || null,
    sources: {
        free_for_dev: ffd.ok ? `ok (${ffd.value.compared}, since ${ffd.value.since})` : "failed",
        hacker_news: hn.ok ? "ok" : "failed",
        news: news.ok ? "ok" : "failed",
        links: links.ok ? "ok" : "failed",
    },
};
await writeFile(OUT, JSON.stringify(data, null, 2) + "\n");

const dead = Object.entries(data.link_check?.results || {}).filter(([, v]) => v !== "ok");
console.log(
    `wrote ${OUT}: ${data.free_tiers.length} new free tiers, ${data.hacker_news.length} HN launches, ${data.in_the_news.length} news deals; ` +
        `always-free links: ${Object.keys(data.link_check?.results || {}).length - dead.length} ok${dead.length ? `, ${dead.length} need a look: ${dead.map(([u, v]) => `${u} (${v})`).join(", ")}` : ""}`
);

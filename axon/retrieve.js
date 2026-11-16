// Second and third stages: decide what the visitor wants (the mode), then pick the knowledge
// cards that answer it. The knowledge base is a few dozen cards, so plain keyword scoring
// (BM25-style) is enough: no embeddings, no vector database, nothing to keep warm.

import { CARDS } from "./knowledge.js";

const STOP = new Set(
    "a an and are as at be but by can could did do does for from had has have he her him his how i if in into is it its me my of on or our so than that the their them then there these they this to was we were what when where which who why will with would you your about tell know more some any".split(" ")
);

const tokens = (text) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9+#]+/g, " ")
        .split(" ")
        .filter((w) => w.length > 1 && !STOP.has(w))
        .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w));

// Index once per isolate
const DOCS = CARDS.map((card) => {
    const body = tokens(`${card.title} ${card.text}`);
    const tags = new Set(card.tags.flatMap((t) => tokens(t)));
    const tf = new Map();
    body.forEach((w) => tf.set(w, (tf.get(w) || 0) + 1));
    return { card, tf, tags, length: body.length };
});
const AVG = DOCS.reduce((n, d) => n + d.length, 0) / DOCS.length;
const DF = new Map();
DOCS.forEach((d) => new Set([...d.tf.keys(), ...d.tags]).forEach((w) => DF.set(w, (DF.get(w) || 0) + 1)));
const idf = (w) => Math.log(1 + (DOCS.length - (DF.get(w) || 0) + 0.5) / ((DF.get(w) || 0) + 0.5));

function score(doc, query) {
    let total = 0;
    for (const w of query) {
        const f = doc.tf.get(w) || 0;
        if (f) total += idf(w) * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (doc.length / AVG))));
        if (doc.tags.has(w)) total += idf(w) * 1.6; // tags are the words people actually ask with
    }
    return total;
}

/** @typedef {"ask"|"fit"|"build"|"story"|"learn"} Mode */

/**
 * Work out what the visitor wants when the console didn't say.
 * @param {string} text
 * @returns {Mode}
 */
export function detectMode(text) {
    const t = text.toLowerCase();
    const jd = (t.match(/\b(responsibilit|requirement|qualification|years of experience|we are looking for|job description|must have|nice to have|the role|candidate)\w*/g) || []).length;
    if (jd >= 2 || (t.length > 700 && jd >= 1)) return "fit";
    if (/\b(is he (a )?(good )?fit|fit for (this|the|a) (role|job|position)|match (this|the) (role|job))\b/.test(t)) return "fit";
    if (/\b(how would (he|isuru|you) (build|approach|design|solve)|i (want|need|am trying|'m trying) to build|we (want|need|are trying) to (build|automate)|my (startup|company|business|team) (needs|wants)|i have an idea|can he build)\b/.test(t)) return "build";
    if (/\b(story|stories|tell me about a time|real example|case study|example of (his|a) (work|project)|what has he (built|shipped))\b/.test(t)) return "story";
    if (/^(explain|teach me|what is|what are|what's|how does|how do|why does|why do|difference between|when should (i|you|we))\b/.test(t) && !/\b(isuru|he|his|him)\b/.test(t)) return "learn";
    return "ask";
}

const BOOST = {
    ask: { profile: 1.15 },
    fit: { skill: 1.5, profile: 1.2, work: 1.15, story: 1.1 },
    build: { story: 1.35, service: 1.3 },
    story: { story: 1.8 },
    learn: { teach: 1.9, story: 1.1 },
};
const KEEP = { ask: 6, fit: 14, build: 7, story: 4, learn: 5 };
// Cards every mode should see, so the basics are never missing
const ALWAYS = { ask: ["now"], fit: ["now", "skills", "learning", "availability", "education", "private-work"], build: ["approach"], story: [], learn: [] };

/**
 * @param {string} query the visitor's message (plus the previous one, for follow-ups)
 * @param {Mode} mode
 * @returns {import("./knowledge.js").Card[]} cards in the order they will be numbered
 */
export function pickCards(query, mode) {
    const q = tokens(query);
    const ranked = DOCS.map((d) => ({ card: d.card, s: score(d, q) * (BOOST[mode][d.card.kind] || 1) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s);
    const best = ranked[0]?.s || 0;
    // Drop weak matches so the model isn't handed noise. A job description touches many topics at
    // once (a "nice to have" line scores low next to the main stack), so fit keeps weaker matches.
    const floor = mode === "fit" ? 0.06 : 0.22;
    const picked = ranked.filter((r) => r.s >= best * floor).slice(0, KEEP[mode]).map((r) => r.card);
    for (const id of ALWAYS[mode]) {
        if (!picked.some((c) => c.id === id)) picked.push(CARDS.find((c) => c.id === id));
    }
    // A question that matched nothing still gets the basics, so Axon can say what it does know
    if (picked.length === 0) picked.push(...["now", "approach", "availability"].map((id) => CARDS.find((c) => c.id === id)));
    return picked;
}

// What to offer once the answer is written
export function nextActions(mode, text) {
    const t = text.toLowerCase();
    if (mode === "fit" || /\b(hire|hiring|recruit|role|position|interview)\b/.test(t)) return [{ type: "lead", door: "hire", label: "Send this to Isuru" }];
    if (mode === "build" || /\b(freelance|project|build|quote|proposal|work with)\b/.test(t)) return [{ type: "lead", door: "build", label: "Talk to Isuru about it" }];
    if (mode === "learn" || /\b(bootcamp|mentor|teach|learn)\b/.test(t)) return [{ type: "contact", door: "learn", label: "Ask him directly" }];
    return [];
}

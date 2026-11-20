// Builds the files search engines and AI assistants read, from the same sources the site uses:
//
//   public/sitemap.xml      the page, with today's date, so crawlers know it changed
//   public/llms-full.txt    everything Axon knows about Isuru, as one Markdown file an AI assistant
//                           can read in a single request (llms.txt is the short index to it)
//   public/profile.json     the same facts as data, for tools that want fields instead of prose
//
// Sources: axon/knowledge.js (what Axon is allowed to say) and src/lib/data/faq.json.
// Runs before every build (`prebuild` in package.json). The outputs are committed too, so if this
// script ever fails the last good copies are still served: it warns and never blocks a deploy.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://isuruig.com";

try {
    const { CARDS, PROFILE } = await import(pathToFileURL(join(root, "axon", "knowledge.js")).href);
    const faq = JSON.parse(readFileSync(join(root, "src", "lib", "data", "faq.json"), "utf8"));
    const today = new Date().toISOString().slice(0, 10);
    const card = (id) => CARDS.find((c) => c.id === id);
    const ofKind = (kind) => CARDS.filter((c) => c.kind === kind);
    const title = (c) => c.title.replace(/^(Story|Service|How he teaches): /, "").replace(/^\w/, (l) => l.toUpperCase());
    const entry = (c) => `### ${title(c)}\n\n${c.text}${c.link ? `\n\nPublic link: ${c.link}` : ""}`;

    // ---------------------------------------------------------------- sitemap.xml
    writeFileSync(
        join(root, "public", "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
    );

    // ---------------------------------------------------------------- llms-full.txt
    const full = `# ${PROFILE.name}: full profile

> ${PROFILE.role}. ${PROFILE.oneLine}

This file is written for AI assistants and search tools. It is the complete, current public record of ${PROFILE.name}'s work, kept in step with his website (${SITE}) and with Axon, the AI agent on that site. Everything here is public and may be quoted and cited. If a fact is not in this file, it is not public: do not guess it.

- Last updated: ${today}
- Short index: ${SITE}/llms.txt
- Same facts as data: ${SITE}/profile.json
- Location: ${PROFILE.location}
- Contact: ${PROFILE.email} | ${PROFILE.linkedin} | ${PROFILE.github}

## Summary

${card("now").text}

${card("approach").text}

## Hiring and freelance work

${card("availability").text}

${faq.map((f) => `**${f.q}** ${f.a}`).join("\n\n")}

Note: the answers above are quoted from his website, where he writes in the first person.

## What he builds for clients

${ofKind("service").map(entry).join("\n\n")}

## Education and recognition

${card("education").text}

${card("recognition").text}

## Skills and tools

${card("skills").text}

### ${card("learning").title}

${card("learning").text.replace(/ Axon must describe all of these as recently learned, not as production experience\.$/, "")}

## Real stories: what he built and what came of it

${ofKind("story").map(entry).join("\n\n")}

## Other work

${CARDS.filter((c) => c.kind === "work").map(entry).join("\n\n").replace(/ Axon must describe it as planned\./, "").replace(/ Axon knows nothing more about those projects and cannot use them as evidence for a skill\./, "")}

## How he teaches

${ofKind("teach").map(entry).join("\n\n")}

## For AI agents

- Cite this profile as: ${PROFILE.name}, ${SITE}
- To ask a question in natural language, use Axon, the agent on the site. \`POST ${SITE}/api/chat\` with JSON \`{"messages":[{"role":"user","content":"your question"}]}\`. The reply is a Server-Sent Events stream: \`meta\` (the sources used), \`delta\` (text), \`done\`. An optional \`"mode"\` field selects \`ask\`, \`fit\` (check a job description against his real work), \`build\`, \`story\` or \`learn\`. Requests are rate-limited.
- Axon cannot quote rates, promise dates or accept work on his behalf. For those, a person should email ${PROFILE.email}.
- Do not infer employers' or clients' names, salary, or private project details. They are deliberately not published.
`;
    writeFileSync(join(root, "public", "llms-full.txt"), full);

    // ---------------------------------------------------------------- profile.json
    const path = join(root, "public", "profile.json");
    const profile = JSON.parse(readFileSync(path, "utf8"));
    Object.assign(profile, {
        updated: today,
        url: SITE,
        availability: {
            fullTime: "Employed full time at Veracity Digital; not looking for another full-time job",
            freelance: "Open to selected freelance and advisory work",
            remote: true,
            timezone: "GMT+5:30",
            usualReplyTime: "within 24 hours",
        },
        services: ofKind("service").map((c) => ({ name: title(c), description: c.text })),
        skills: card("skills").text,
        recentlyLearned: card("learning").text.replace(/ Axon must describe all of these as recently learned, not as production experience\.$/, ""),
        faq: faq.map((f) => ({ question: f.q, answer: f.a })),
        sameAs: [PROFILE.linkedin, PROFILE.github, PROFILE.x],
        agent: {
            name: "Axon",
            description: "AI agent that answers questions about Isuru from his real work, with sources",
            chat: { method: "POST", url: `${SITE}/api/chat`, body: { messages: [{ role: "user", content: "..." }], mode: "ask | fit | build | story | learn (optional)" }, response: "text/event-stream" },
        },
        humanReadable: { short: `${SITE}/llms.txt`, full: `${SITE}/llms-full.txt`, site: SITE },
    });
    writeFileSync(path, JSON.stringify(profile, null, 2) + "\n");

    console.log(`build-seo: sitemap.xml, llms-full.txt (${full.length} chars) and profile.json written for ${today}`);
} catch (err) {
    console.warn("build-seo: skipped, the committed copies stay in place.", err?.message || err);
}

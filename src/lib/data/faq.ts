// The questions recruiters and clients actually ask, answered once.
// Shown on the page (sections/Faq.tsx) and published as FAQPage structured data (lib/seo.ts), so
// search engines and AI assistants can quote the answers. Both read this file: the visible text
// and the structured data can never disagree.
// Every answer must stay in step with axon/knowledge.js (the "availability", "skills",
// "education", "recognition" and "private-work" cards). No prices, no promises.

export interface FaqItem {
    q: string;
    a: string;
}

// The entries live in faq.json so scripts/build-seo.mjs can read them too.
import entries from "./faq.json";

export const faq: FaqItem[] = entries;

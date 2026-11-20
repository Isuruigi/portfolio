// Everything search engines and AI assistants read about the site, in one place:
// the page's title and description, and its structured data (schema.org JSON-LD).
//
// Structured data is how a crawler learns, without guessing, that this page is about a person
// who is an AI/ML engineer in Colombo, where he works, what he studied, what he offers and what
// he has built. Facts here must match the page and axon/knowledge.js; nothing new is claimed.
import { certifications, certificationTotal } from "@/lib/data/career";
import { faq } from "@/lib/data/faq";
import { flagships, workIndex } from "@/lib/data/work";
import { socials } from "@/lib/socials";
import { ALL_TOOLS } from "../../axon/stack.js";

export const SITE = {
    url: "https://isuruig.com",
    name: "Isuru Chathuranga",
    // ~55 characters: shown in full in search results
    title: "Isuru Chathuranga | AI/ML Engineer in Colombo, Sri Lanka",
    // ~155 characters: shown in full in search results
    description:
        "AI/ML Engineer at Veracity Digital. I build voice agents, RAG and GraphRAG, multi-agent systems and MLOps that hold up in production. Open to freelance AI work.",
    image: "/og.jpg",
    email: "isuruigic@gmail.com",
};

const KEYWORDS = [
    "Isuru Chathuranga",
    "AI/ML Engineer Sri Lanka",
    "AI Engineer Colombo",
    "Machine Learning Engineer Sri Lanka",
    "freelance AI engineer",
    "voice AI agent developer",
    "RAG developer",
    "GraphRAG",
    "multi-agent systems",
    "agentic AI",
    "LangGraph developer",
    "MLOps engineer",
    "LLM engineer",
    "n8n AI automation",
    "PyTorch",
    "vLLM",
];
export const keywords = KEYWORDS;

// What he works on, as topics a search or answer engine can match a query against
const KNOWS_ABOUT = [
    "Artificial intelligence",
    "Machine learning",
    "Agentic AI",
    "Multi-agent systems",
    "Voice AI agents",
    "Retrieval-augmented generation (RAG)",
    "GraphRAG",
    "Large language models",
    "MLOps",
    "Model serving and monitoring",
    "Workflow automation",
    // every tool from axon/stack.js, so the structured data never falls behind the page
    ...ALL_TOOLS.filter((t) => !["RAG", "GraphRAG", "CI/CD"].includes(t)),
]

// The four things he builds for clients. Same wording as the "svc-*" cards in axon/knowledge.js.
const SERVICES = [
    { name: "AI assistants over your own documents", description: "Assistants that answer on WhatsApp, web chat and email, grounded in a company's private documents with RAG, with human checkpoints where needed." },
    { name: "Voice agents for phone lines", description: "Full-duplex voice agents for bookings, FAQs and call routing in English, Sinhala or Tamil, with sub-second responses." },
    { name: "Workflow automation with human sign-off", description: "Automation pipelines in n8n that connect LLMs to real tools, such as payment verification and ad decisions, with a human approving the risky steps." },
    { name: "Custom ML and knowledge systems", description: "Custom models such as churn prediction or fraud detection, deployed with monitoring, and RAG or GraphRAG engines for querying private data in plain language." },
];

const id = (hash: string) => `${SITE.url}/#${hash}`;

/** The page's structured data: one connected graph, so each fact is stated once. */
export function structuredData() {
    const person = { "@id": id("person") };
    const projects = [...flagships.map((f) => ({ name: f.name, description: f.summary, url: f.link?.href, stack: f.stack })), ...workIndex.map((w) => ({ name: w.name, description: w.line, url: w.href, stack: w.stack }))]
        // Only public code is listed as source code; private and planned work stays on the page as prose
        .filter((p) => p.url && p.url.includes("github.com/Isuruigi/"));

    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": id("website"),
                url: SITE.url,
                name: SITE.name,
                description: SITE.description,
                inLanguage: "en",
                publisher: person,
            },
            {
                "@type": "ProfilePage",
                "@id": id("profile"),
                url: SITE.url,
                name: SITE.title,
                isPartOf: { "@id": id("website") },
                about: person,
                mainEntity: person,
                primaryImageOfPage: `${SITE.url}${SITE.image}`,
                inLanguage: "en",
            },
            {
                "@type": "Person",
                "@id": id("person"),
                name: "Isuru Chathuranga",
                alternateName: ["Isuru (IG) Chathuranga", "IG Chathuranga"],
                url: SITE.url,
                image: `${SITE.url}/assets/portrait-studio.webp`,
                email: `mailto:${SITE.email}`,
                jobTitle: "AI/ML Engineer",
                description:
                    "AI/ML Engineer at Veracity Digital in Colombo, Sri Lanka, and Technical Assistant on Buildr Labs' Agentic AI Bootcamp. Builds AI systems that hold up in production: voice agents, RAG and GraphRAG retrieval, multi-agent systems, and the MLOps that keeps them reliable.",
                address: { "@type": "PostalAddress", addressLocality: "Colombo", addressCountry: "LK" },
                nationality: { "@type": "Country", name: "Sri Lanka" },
                worksFor: { "@type": "Organization", name: "Veracity Digital" },
                affiliation: { "@type": "Organization", name: "Buildr Labs" },
                alumniOf: [
                    { "@type": "CollegeOrUniversity", name: "University of Colombo" },
                    { "@type": "CollegeOrUniversity", name: "University of Colombo School of Computing" },
                ],
                hasOccupation: {
                    "@type": "Occupation",
                    name: "Machine Learning Engineer",
                    occupationLocation: { "@type": "Country", name: "Sri Lanka" },
                    skills: KNOWS_ABOUT.join(", "),
                },
                knowsAbout: KNOWS_ABOUT,
                award: "Top 3 of 290, Zuu Crew AI 'Build Production-Ready Machine Learning Systems' programme (2025)",
                hasCredential: certifications.map((name) => ({ "@type": "EducationalOccupationalCredential", credentialCategory: "certificate", name })),
                // He holds more than the ones named above
                disambiguatingDescription: `AI/ML engineer in Colombo, Sri Lanka, with ${certificationTotal} certifications and open source contributions to LangChain, PyTorch, Hugging Face and MLflow.`,
                sameAs: socials.map((s) => s.href),
                makesOffer: SERVICES.map((s) => ({
                    "@type": "Offer",
                    itemOffered: { "@type": "Service", name: s.name, description: s.description, serviceType: "AI engineering (freelance)", areaServed: "Worldwide", provider: person },
                })),
            },
            {
                "@type": "ItemList",
                "@id": id("projects"),
                name: "Open source projects by Isuru Chathuranga",
                itemListElement: projects.map((p, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    item: { "@type": "SoftwareSourceCode", name: p.name, description: p.description, codeRepository: p.url, keywords: p.stack.join(", "), author: person },
                })),
            },
            {
                "@type": "FAQPage",
                "@id": id("faq"),
                about: person,
                mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
        ],
    };
}

// Isuru's tools, in one place. Add a tool here and it shows up everywhere it should:
//   - the About section's "Stack" and "Recently learned" lists (src/components/sections/About.tsx)
//   - Axon's "Skills and tools" and "Recently learned" knowledge cards (axon/knowledge.js)
//   - the page's structured data for search engines (src/lib/seo.ts)
//   - llms-full.txt and profile.json for AI assistants (scripts/build-seo.mjs, which reads Axon's cards)
//
// STACK is what he has built with. LEARNING is newer: practised in side builds and the bootcamp lab,
// not yet run in production, and always described that way.
// Levels: PROFICIENT and FAMILIAR are marked; every other STACK tool is intermediate.
// Only list what is true. Axon repeats this to recruiters and clients.

/** @type {{ area: string, tools: string[] }[]} */
export const STACK = [
    { area: "Languages", tools: ["Python", "TypeScript", "R"] },
    { area: "LLMs & agents", tools: ["LangGraph", "LangChain", "Groq", "CrewAI", "LlamaIndex", "AutoGen", "DSPy", "Pydantic AI", "MCP", "OpenAI", "Anthropic", "Transformers", "vLLM", "LoRA / PEFT"] },
    { area: "Retrieval", tools: ["Qdrant", "RAG", "GraphRAG", "Neo4j", "Pinecone", "Weaviate", "ChromaDB", "Tavily"] },
    { area: "Voice", tools: ["Twilio", "Deepgram", "LiveKit", "Pipecat", "Vapi", "OpenAI Realtime API", "Gemini Live", "ElevenLabs", "Edge TTS"] },
    { area: "ML", tools: ["PyTorch", "scikit-learn", "Pandas", "NumPy", "Jupyter", "XGBoost", "TensorFlow", "Keras", "OpenCV"] },
    { area: "MLOps", tools: ["FastAPI", "Docker", "Git", "Kubernetes", "MLflow", "LangSmith", "Prometheus", "Grafana", "CI/CD"] },
    { area: "Data", tools: ["PostgreSQL", "Supabase", "MongoDB", "Kafka", "Redpanda", "Airflow", "PySpark", "Redis", "Dragonfly"] },
    { area: "Automation", tools: ["n8n", "Make", "Zapier"] },
    { area: "Cloud", tools: ["GCP / Vertex AI", "AWS / Bedrock", "Azure OpenAI", "Oracle Cloud", "Cloudflare Workers"] },
    { area: "Web & demos", tools: ["Next.js", "React", "Tailwind CSS", "Three.js", "Streamlit", "Gradio", "Playwright"] },
];

export const PROFICIENT = new Set(["Python", "LangGraph", "LangChain", "Groq", "Qdrant", "PyTorch", "scikit-learn", "Pandas", "NumPy", "Jupyter", "FastAPI", "Docker", "Git", "n8n"]);
export const FAMILIAR = new Set(["Azure OpenAI", "Oracle Cloud", "Redis", "Dragonfly", "Make", "Zapier"]);

/** @type {{ area: string, tools: string[] }[]} */
export const LEARNING = [
    { area: "Agent architectures", tools: ["Parallel agents (Grok Heavy-style)", "Orchestrator–workers", "Planner–executor", "Evaluator–optimizer", "Agentic RAG", "Tiered agent memory", "A2A protocol"] },
    { area: "Agent harnesses", tools: ["Claude Agent SDK", "Claude Code", "OpenAI Agents SDK", "Codex", "Google ADK", "Vercel AI SDK"] },
    { area: "Evals & guardrails", tools: ["lm-eval-harness", "promptfoo", "RAGAS", "DeepEval", "Langfuse", "OpenTelemetry", "Llama Guard", "NeMo Guardrails"] },
];

// What a few names mean, for Axon to explain when asked (the site shows the short name only)
const NOTES = {
    "Parallel agents (Grok Heavy-style)": "several agents work the same problem in parallel, then compare answers to reach consensus",
    "LoRA / PEFT": "efficient fine-tuning",
    "GCP / Vertex AI": "Google Cloud, including Vertex AI",
    "AWS / Bedrock": "including Bedrock",
    "vLLM": "high-throughput model serving",
    "MCP": "Model Context Protocol",
    "A2A protocol": "agent-to-agent",
};

const level = (t) => (PROFICIENT.has(t) ? " (proficient)" : FAMILIAR.has(t) ? " (familiar)" : "");
const named = (t) => `${t}${NOTES[t] ? ` (${NOTES[t]})` : ""}`;

/** The text of Axon's "Skills and tools" card */
export function stackCardText() {
    const groups = STACK.map((g) => `${g.area}: ${g.tools.map((t) => named(t) + level(t)).join(", ")}.`).join(" ");
    return `${groups} Tools without a level are intermediate. This card lists tools he has worked with; it shows the skill at that level, but not where each tool was used; production use needs a story or work card. He keeps adding new tools; the newest are on the "Recently learned" card.`;
}

/** The text of Axon's "Recently learned" card */
export function learningCardText() {
    const groups = LEARNING.map((g) => `${g.area}: ${g.tools.map(named).join(", ")}.`).join(" ");
    return `Recent learning, practised in side builds and in the Buildr Labs bootcamp lab rather than run in production. ${groups} Axon must describe all of these as recently learned, not as production experience.`;
}

/** Lower-case words a visitor might use for these tools, for Axon's retrieval tags */
export function stackTags(groups) {
    const words = new Set();
    for (const g of groups) for (const t of g.tools) for (const w of t.toLowerCase().split(/[^a-z0-9.+-]+/)) if (w.length > 1) words.add(w);
    return [...words];
}

/** Every tool name (STACK first), for structured data */
export const ALL_TOOLS = [...new Set(STACK.flatMap((g) => g.tools))];

// Work shown on the site: three flagship systems as "model cards" with a
// replayable pipeline trace, and a compact index of everything else.
// Only facts already stated about each project live here. Add measured
// numbers to `metrics` when you have them; an empty list renders nothing.

export type WorkStatus = "Production" | "Shipped" | "In development" | "Planned" | "Ongoing";

export interface TraceStep {
    label: string;
    detail: string;
}

export interface Flagship {
    id: string;
    name: string;
    status: WorkStatus;
    summary: string;
    task: string;
    results: string[];
    metrics: { label: string; value: string }[];
    trace: TraceStep[];
    stack: string[];
    link?: { href: string; label: string };
}

export const flagships: Flagship[] = [
    {
        id: "personaplex",
        name: "PersonaPlex",
        status: "Shipped",
        summary: "A full-duplex voice agent that answers real phone calls.",
        task: "Hold a natural phone conversation, including interruptions, fast enough that callers don't notice the machine.",
        results: [
            "Sub-second voice responses",
            "End-of-speech detection, so it replies when the caller has finished",
            "Full-duplex: callers can interrupt mid-sentence",
            "Personas are fully configurable",
        ],
        metrics: [],
        trace: [
            { label: "Call connects", detail: "Twilio streams the caller's audio to the agent" },
            { label: "Listen", detail: "Deepgram transcribes live and detects the end of speech" },
            { label: "Think", detail: "The LLM drafts a reply in the configured persona" },
            { label: "Speak", detail: "Edge TTS streams the reply back down the line" },
            { label: "Interrupt", detail: "If the caller cuts in, playback stops and the loop restarts" },
        ],
        stack: ["Python", "FastAPI", "Twilio", "Deepgram", "OpenAI", "Edge TTS"],
        link: { href: "https://github.com/Isuruigi/personaplex-agent", label: "Code on GitHub" },
    },
    {
        id: "nexus",
        name: "NEXUS GraphRAG",
        status: "In development",
        summary: "A knowledge engine that answers multi-hop questions flat vector search can't.",
        task: "Answer questions whose answer is spread across several connected facts, not sitting in one chunk.",
        results: [
            "Hybrid dense + graph retrieval for multi-hop reasoning",
            "Qdrant and Neo4j fused under LangGraph orchestration",
            "Redpanda streaming and Dragonfly cache for low latency",
            "Text and structured data as input",
        ],
        metrics: [],
        trace: [
            { label: "Ingest", detail: "Documents stream in through Redpanda and become chunks and graph entities" },
            { label: "Retrieve", detail: "Dense search in Qdrant finds similar passages" },
            { label: "Traverse", detail: "Neo4j follows relationships to the facts those passages point at" },
            { label: "Fuse", detail: "Both result sets merge into one ranked context" },
            { label: "Reason", detail: "A LangGraph agent chains the hops and writes the answer" },
        ],
        stack: ["LangGraph", "Qdrant", "Neo4j", "Redpanda", "Dragonfly", "FastAPI"],
    },
    {
        id: "fraud",
        name: "Cost-Aware Fraud Detection",
        status: "Shipped",
        summary: "A fraud model tuned for what mistakes actually cost, not raw accuracy.",
        task: "Flag fraudulent transactions while weighing the cost of a false alarm against the cost of a missed fraud.",
        results: [
            "Decision threshold chosen by business cost",
            "End-to-end pipeline from features to production",
            "92% test coverage",
            "Experiments tracked in MLflow, deployed with monitoring",
        ],
        metrics: [],
        trace: [
            { label: "Features", detail: "Transactions are turned into model-ready features" },
            { label: "Score", detail: "An XGBoost model scores each transaction's fraud risk" },
            { label: "Decide", detail: "The threshold minimises expected cost of false alarms vs missed fraud" },
            { label: "Track", detail: "Every run and metric is logged in MLflow" },
            { label: "Ship", detail: "CI/CD deploys it, and monitoring watches it in production" },
        ],
        stack: ["Python", "XGBoost", "MLflow", "CI/CD"],
        link: { href: "https://github.com/Isuruigi/fraud-detection-system", label: "Code on GitHub" },
    },
];

export interface IndexEntry {
    name: string;
    line: string;
    status: WorkStatus;
    stack: string[];
    href?: string;
}

export const workIndex: IndexEntry[] = [
    { name: "Axon", line: "This site's agent: guarded RAG chat with citations, a voice line and lead handoff", status: "Shipped", stack: ["Cloudflare Workers", "Groq", "Deepgram", "ElevenLabs"] },
    { name: "ITM Exam Portal", line: "Exam platform used by the University of Colombo faculty cohort", status: "Production", stack: ["Next.js", "PostgreSQL", "FastAPI"] },
    { name: "n8n AI Automations", line: "Payment verification and Meta Ads decisions with human sign-off", status: "Production", stack: ["n8n", "LangChain", "Slack API"] },
    { name: "AI Research Agent", line: "Searches the web and cites every source it uses", status: "Shipped", stack: ["LangGraph", "RAG", "FastAPI"], href: "https://github.com/Isuruigi/ai-research-agent" },
    { name: "Market Intelligence Agent", line: "Multi-agent analysis of Sri Lankan economic indicators on GCP", status: "Shipped", stack: ["LangChain", "RAG", "GCP"], href: "https://github.com/Isuruigi/sl-market-agent" },
    { name: "Adaptive Multi-Adapter LLM", line: "LoRA adapters picked by a learned router, with self-evaluation", status: "Shipped", stack: ["PyTorch", "LoRA", "Transformers"], href: "https://github.com/Isuruigi/adaptive-lora-framework" },
    { name: "Drift Monitoring System", line: "Detects data drift and alerts before models degrade", status: "Shipped", stack: ["Python", "AIOps", "Docker"], href: "https://github.com/Isuruigi/ml-monitoring-system" },
    { name: "Crypto Intelligence System", line: "Multi-agent trading signals with sub-2s latency", status: "Shipped", stack: ["Multi-Agent", "FastAPI", "WebSocket"], href: "https://github.com/Isuruigi/crypto-intelligence-system" },
    { name: "Telco Churn Pipeline", line: "Churn predictions validated against business decisions", status: "Shipped", stack: ["PyTorch", "MLOps", "CI/CD"], href: "https://github.com/Isuruigi/telco-churn-production" },
    { name: "Open source", line: "Contributions to LangChain, PyTorch, Hugging Face and MLflow", status: "Ongoing", stack: ["Python", "PyTorch", "LangChain"], href: "https://github.com/Isuruigi" },
    { name: "MediAgent SL", line: "Trilingual healthcare triage in Sinhala, Tamil and English", status: "Planned", stack: ["LangGraph", "MCP", "PostgreSQL"] },
];

// Systems actually in use or released (excludes ongoing and planned work)
export const shippedCount =
    flagships.filter((f) => f.status === "Shipped" || f.status === "Production").length +
    workIndex.filter((w) => w.status === "Shipped" || w.status === "Production").length;

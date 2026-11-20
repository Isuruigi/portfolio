// The field guide: every layer of an AI system as a chapter. Each chapter pairs the tools I work with
// (from axon/stack.js) with real architectures: patterns from frontier teams' talks and my own builds.
// The diagram ids point into src/lib/data/diagrams; the first one is shown when the chapter opens.

export interface Chapter {
    id: string;
    title: string;
    kicker: string;
    intro: string;
    /** Tool names as written in axon/stack.js */
    stack: string[];
    diagrams: string[];
}

export const CHAPTERS: Chapter[] = [
    {
        id: "retrieval",
        title: "Retrieval",
        kicker: "Give the model the right context, not more context",
        intro: "Vector search finds what sounds similar; a knowledge graph follows how facts connect; keyword search still wins on exact names. Production RAG uses all three, then cites what it used.",
        stack: ["Qdrant", "Neo4j", "GraphRAG", "Pinecone", "Weaviate", "ChromaDB", "LlamaIndex", "Redis"],
        diagrams: ["rag", "nexus"],
    },
    {
        id: "agents",
        title: "Agents & workflows",
        kicker: "Plan, delegate, check, and know when to ask a human",
        intro: "An agent is a loop: decide, call a tool, look at the result, decide again. Teams of agents split the work, workflows pin down the steps that must not change, and people stay in the loop where mistakes are costly.",
        stack: ["LangGraph", "LangChain", "CrewAI", "AutoGen", "Pydantic AI", "DSPy", "n8n", "Tavily"],
        diagrams: ["gemini-deep-research", "agentic", "care-workflow-hitl", "research", "crypto"],
    },
    {
        id: "harness",
        title: "Harness, tools & context",
        kicker: "Everything around the model that makes it reliable",
        intro: "The same model can fail or finish the job depending on its harness: what goes into its context, which tools it can reach through MCP, where its code runs, and what it remembers between steps.",
        stack: ["MCP", "Anthropic", "OpenAI", "Playwright", "Docker", "LangSmith"],
        diagrams: ["codex-harness", "harness", "mcp", "memory-harness", "sandbox-cloud"],
    },
    {
        id: "voice",
        title: "Voice AI",
        kicker: "Answer like a person, in under a second",
        intro: "People notice a pause past half a second. Voice agents either chain speech to text, an LLM and text to speech, or skip the text entirely with a speech-to-speech model, and both need to handle being interrupted.",
        stack: ["Twilio", "Deepgram", "LiveKit", "Pipecat", "Vapi", "OpenAI Realtime API", "Gemini Live", "ElevenLabs"],
        diagrams: ["voice", "realtime-s2s", "phone-at-scale", "avatar-video", "axon-voice", "personaplex"],
    },
    {
        id: "serving",
        title: "Serving & fine-tuning",
        kicker: "Make it fast, cheap and yours",
        intro: "Serving is a scheduling problem: route requests to GPUs that already hold their cache, split prefill from decode. Fine-tuning turns a small model into a specialist, and adapters let one GPU serve many of them.",
        stack: ["vLLM", "LoRA / PEFT", "Transformers", "PyTorch", "Kubernetes", "FastAPI", "GCP / Vertex AI"],
        diagrams: ["serving", "finetune", "lora"],
    },
    {
        id: "quality",
        title: "Evals & MLOps",
        kicker: "Prove it works, then keep proving it",
        intro: "An eval that gates nothing is decoration. Tie judges and golden sets to launch decisions, trace production, and watch for drift, so a model that worked last month still works today.",
        stack: ["LangSmith", "MLflow", "Prometheus", "Grafana", "XGBoost", "scikit-learn", "CI/CD", "Airflow"],
        diagrams: ["evals", "fraud"],
    },
];

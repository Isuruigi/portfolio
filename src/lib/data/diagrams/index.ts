// Architecture diagrams, in two groups. "pattern": one per domain, distilled from AI Engineer talks;
// every claim comes from the talk it cites (mm:ss), and `src` says which source a cite belongs to.
// "built": my own projects (projects/), drawn from their code; cites are file paths in the repo.
import agentic from "./agentic.json";
import realtimeS2s from "./atlas/realtime-s2s.json";
import phoneAtScale from "./atlas/phone-at-scale.json";
import avatarVideo from "./atlas/avatar-video.json";
import deepResearch from "./atlas/gemini-deep-research.json";
import careWorkflow from "./atlas/care-workflow-hitl.json";
import codexHarness from "./atlas/codex-harness.json";
import memoryHarness from "./atlas/memory-harness.json";
import sandboxCloud from "./atlas/sandbox-cloud.json";
import evals from "./evals.json";
import finetune from "./finetune.json";
import mcp from "./mcp.json";
import axonVoice from "./projects/axon-voice.json";
import crypto from "./projects/crypto.json";
import fraud from "./projects/fraud.json";
import lora from "./projects/lora.json";
import nexus from "./projects/nexus.json";
import personaplex from "./projects/personaplex.json";
import research from "./projects/research.json";
import harness from "./harness.json";
import rag from "./rag.json";
import serving from "./serving.json";
import voice from "./voice.json";

/** The physical object a node is drawn as in the 3D view */
export type NodeKind = "person" | "service" | "model" | "store" | "queue" | "gpu" | "cluster" | "tool" | "monitor" | "gateway" | "cache" | "eval";

export interface DiagramNode {
    id: string;
    label: string;
    role: string;
    kind?: NodeKind;
    tool?: string | null;
    toolFromTalk?: boolean;
    col: number;
    row: number;
    detail: string;
    tradeoff?: string;
    cite?: string;
    /** Which source the cite belongs to (index into sources); 0 when absent */
    src?: number;
}

export interface DiagramSpec {
    domain: string;
    title: string;
    subtitle: string;
    /** Whose system it is (atlas entries) */
    org?: string;
    /** One line on why it is worth a look (atlas entries) */
    hook?: string;
    metric: { label: string; unit: string } | null;
    /** talk: an AI Engineer talk (cites are mm:ss); repo: the project's code (cites are file paths);
     *  project: notes on a private or unreleased project (no links) */
    sources: { kind?: "talk" | "repo" | "project"; title: string; speaker: string; org: string; videoId?: string; url: string; branch?: string }[];
    nodes: DiagramNode[];
    edges: { from: string; to: string; label?: string }[];
    flow: { node: string; text: string; ms?: number }[];
    takeaways: { text: string; cite?: string; src?: number }[];
}

/** "built": my own projects, drawn from their code. "pattern": how frontier teams build it, from talks */
export type DiagramGroup = "built" | "pattern";

/** The atlas's shelves */
export type AtlasCategory = "voice" | "agents" | "harness" | "rag" | "infra" | "quality";
export const ATLAS_CATEGORIES: { id: AtlasCategory; label: string }[] = [
    { id: "voice", label: "Voice AI" },
    { id: "agents", label: "Agents & workflows" },
    { id: "harness", label: "Harness & context" },
    { id: "rag", label: "Retrieval" },
    { id: "infra", label: "Serving & training" },
    { id: "quality", label: "Evals" },
];

export interface DiagramEntry {
    id: string;
    tab: string;
    group: DiagramGroup;
    category?: AtlasCategory;
    spec: DiagramSpec;
}

/** Tab order, with the short names the tabs show */
export const DIAGRAMS: DiagramEntry[] = [
    { id: "personaplex", tab: "PersonaPlex", group: "built", spec: personaplex as DiagramSpec },
    { id: "axon-voice", tab: "Axon's voice line", group: "built", spec: axonVoice as DiagramSpec },
    { id: "nexus", tab: "NEXUS GraphRAG", group: "built", spec: nexus as DiagramSpec },
    { id: "fraud", tab: "Fraud detection", group: "built", spec: fraud as DiagramSpec },
    { id: "research", tab: "Research agent", group: "built", spec: research as DiagramSpec },
    { id: "lora", tab: "Multi-LoRA", group: "built", spec: lora as DiagramSpec },
    { id: "crypto", tab: "Crypto signals", group: "built", spec: crypto as DiagramSpec },
    { id: "voice", tab: "Voice pipeline", group: "pattern", category: "voice", spec: voice as DiagramSpec },
    { id: "agentic", tab: "Agent mission", group: "pattern", category: "agents", spec: agentic as DiagramSpec },
    { id: "harness", tab: "Harness", group: "pattern", category: "harness", spec: harness as DiagramSpec },
    { id: "realtime-s2s", tab: "Realtime speech-to-speech", group: "pattern", category: "voice", spec: realtimeS2s as DiagramSpec },
    { id: "phone-at-scale", tab: "Phone calls at scale", group: "pattern", category: "voice", spec: phoneAtScale as DiagramSpec },
    { id: "avatar-video", tab: "Real-time avatar", group: "pattern", category: "voice", spec: avatarVideo as DiagramSpec },
    { id: "gemini-deep-research", tab: "Deep research agent", group: "pattern", category: "agents", spec: deepResearch as DiagramSpec },
    { id: "care-workflow-hitl", tab: "Human-in-the-loop workflow", group: "pattern", category: "agents", spec: careWorkflow as DiagramSpec },
    { id: "codex-harness", tab: "Codex harness", group: "pattern", category: "harness", spec: codexHarness as DiagramSpec },
    { id: "memory-harness", tab: "Memory harness", group: "pattern", category: "harness", spec: memoryHarness as DiagramSpec },
    { id: "sandbox-cloud", tab: "Agent sandboxes", group: "pattern", category: "harness", spec: sandboxCloud as DiagramSpec },
    { id: "mcp", tab: "MCP tools", group: "pattern", category: "harness", spec: mcp as DiagramSpec },
    { id: "rag", tab: "GraphRAG", group: "pattern", category: "rag", spec: rag as DiagramSpec },
    { id: "serving", tab: "Serving on K8s", group: "pattern", category: "infra", spec: serving as DiagramSpec },
    { id: "finetune", tab: "Fine-tune to serve", group: "pattern", category: "infra", spec: finetune as DiagramSpec },
    { id: "evals", tab: "Evals loop", group: "pattern", category: "quality", spec: evals as DiagramSpec },
];

export const BUILT = DIAGRAMS.filter((d) => d.group === "built");
export const ATLAS = DIAGRAMS.filter((d) => d.group === "pattern");

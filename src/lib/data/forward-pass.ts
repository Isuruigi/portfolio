// Data behind the hero's "Forward Pass" network.
// Input neurons are domains, hidden neurons are real projects, and the single
// output neuron sits at the portrait. Edges come from which domains a project uses.

export type DomainId = "voice" | "agents" | "rag" | "mlops" | "classic";

export interface Domain {
    id: DomainId;
    label: string;
}

export interface ProjectNeuron {
    name: string;
    // One real result, shown when the neuron is hovered
    result: string;
    domains: DomainId[];
}

export const domains: Domain[] = [
    { id: "voice", label: "Voice AI" },
    { id: "agents", label: "Agents" },
    { id: "rag", label: "RAG & graphs" },
    { id: "mlops", label: "MLOps" },
    { id: "classic", label: "Classical ML" },
];

export const projectNeurons: ProjectNeuron[] = [
    { name: "PersonaPlex", result: "Answers real phone calls with sub-second voice responses", domains: ["voice", "agents"] },
    { name: "NEXUS GraphRAG", result: "Hybrid dense + graph retrieval for multi-hop questions", domains: ["rag", "agents"] },
    { name: "AI Research Agent", result: "Searches the web and cites every source it uses", domains: ["agents", "rag"] },
    { name: "MediAgent SL", result: "Trilingual triage in Sinhala, Tamil and English", domains: ["agents", "rag"] },
    { name: "Market Intelligence Agent", result: "Multi-agent analysis deployed on GCP with failover", domains: ["agents", "rag", "mlops"] },
    { name: "n8n Automations", result: "Payment checks and ad decisions with human sign-off", domains: ["agents"] },
    { name: "Fraud Detection", result: "Tuned for the cost of mistakes, 92% test coverage", domains: ["classic", "mlops"] },
    { name: "Drift Monitoring", result: "Catches data drift and alerts before models degrade", domains: ["mlops"] },
    { name: "Telco Churn", result: "Validated churn predictions driving business decisions", domains: ["classic", "mlops"] },
];

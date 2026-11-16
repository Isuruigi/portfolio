// Career checkpoints, plotted as points along a training curve.
// `start` is a fraction of the way along the timeline (May 2023 to May 2027).

export interface Checkpoint {
    role: string;
    org: string;
    period: string;
    line: string;
    start: number;
    now?: boolean;
    future?: boolean;
}

export const timeline = { from: "May 2023", to: "May 2027" };

// Months since May 2023, divided by the 48-month span
const at = (months: number) => months / 48;

export const checkpoints: Checkpoint[] = [
    {
        role: "BSc IT & Management",
        org: "University of Colombo",
        period: "May 2023 to May 2027",
        line: "Specialising in AI, machine learning and data science.",
        start: at(0),
    },
    {
        role: "Freelance AI Engineer",
        org: "Self-employed",
        period: "Jun 2024 to Aug 2026",
        line: "Shipped market intelligence, churn and multi-agent systems on AWS, GCP and Azure.",
        start: at(13),
    },
    {
        role: "Open source contributor",
        org: "LangChain, PyTorch, Hugging Face, MLflow",
        period: "Sep 2024 to now",
        line: "Examples, tests and docs for the tools production ML runs on.",
        start: at(16),
    },
    {
        role: "Machine Learning Finalist",
        org: "Zuu Crew AI",
        period: "Sep to Dec 2025",
        line: "Top 3 of 290 in a 13-week production ML systems bootcamp.",
        start: at(28),
    },
    {
        role: "Technical Assistant, Agentic AI Bootcamp",
        org: "Buildr Labs",
        period: "May 2026 to now",
        line: "Saturday labs and weekday support for engineers building agents, RAG and MCP servers.",
        start: at(36),
        now: true,
    },
    {
        role: "AI/ML Engineer",
        org: "Veracity Digital",
        period: "Aug 2026 to now",
        line: "Production AI with PyTorch and vLLM, multi-agent workflows, and the monitoring behind them.",
        start: at(39),
        now: true,
    },
    {
        role: "Graduation",
        org: "University of Colombo",
        period: "May 2027",
        line: "BSc (Hons) IT & Management.",
        start: at(48),
        future: true,
    },
];

// The strongest vendor certifications; the full list (28) lives on LinkedIn
export const certifications = [
    "Oracle OCI 2025 AI Foundations Associate",
    "Databricks Generative AI Fundamentals",
    "Databricks AI Agent Fundamentals",
    "Azure AI Foundry Agent Fundamentals",
    "Astronomer Airflow 3 Fundamentals",
    "Astronomer Airflow 3 DAG Authoring",
    "Qdrant Essentials",
    "AI Engineer for Data Scientists Associate",
];

export const certificationTotal = 28;

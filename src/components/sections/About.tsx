import { ArrowUpRight } from "lucide-react";

const facts = [
    { term: "Now", detail: "AI/ML Engineer at Veracity Digital", highlight: true },
    { term: "Teaching", detail: "Technical Assistant, Buildr Labs Agentic AI Bootcamp" },
    { term: "Focus", detail: "Voice agents, RAG and GraphRAG, multi-agent systems, MLOps" },
    { term: "Based in", detail: "Colombo, Sri Lanka. Works remotely across time zones." },
];

// Systems running for real users, each linked to where the page covers it
const inProduction = [
    { name: "ITM Exam Portal", line: "Live exam platform used by the University of Colombo faculty cohort", href: "#work" },
    { name: "n8n AI automations", line: "Payment verification and ad decisions, with a human signing off", href: "#work" },
    { name: "PersonaPlex", line: "Answers real phone calls with sub-second voice responses", href: "#personaplex" },
    { name: "Cost-Aware Fraud Detection", line: "Deployed with monitoring and 92% test coverage", href: "#fraud" },
];

// The toolbox, grouped by what it's for. Proficient tools come first in each group.
const stack = [
    { area: "Languages", tools: ["Python", "TypeScript", "R"] },
    { area: "LLMs & agents", tools: ["LangGraph", "LangChain", "Groq", "CrewAI", "MCP", "OpenAI", "Anthropic", "Transformers", "vLLM", "LoRA / PEFT"] },
    { area: "Retrieval", tools: ["Qdrant", "RAG", "GraphRAG", "Neo4j", "ChromaDB", "Tavily"] },
    { area: "Voice", tools: ["Twilio", "Deepgram", "Edge TTS", "Gemini Live", "ElevenLabs"] },
    { area: "ML", tools: ["PyTorch", "scikit-learn", "Pandas", "NumPy", "XGBoost", "TensorFlow", "Keras", "OpenCV"] },
    { area: "MLOps", tools: ["FastAPI", "Docker", "Kubernetes", "MLflow", "LangSmith", "Prometheus", "Grafana", "CI/CD"] },
    { area: "Data", tools: ["PostgreSQL", "Kafka", "Redpanda", "Airflow", "PySpark", "Redis", "Dragonfly"] },
    { area: "Automation", tools: ["n8n", "Make", "Zapier"] },
    { area: "Cloud", tools: ["GCP / Vertex AI", "AWS / Bedrock", "Azure OpenAI", "Oracle Cloud"] },
    { area: "Web", tools: ["Next.js", "Cloudflare Workers", "Playwright"] },
];

// Learned recently and practised in side builds and the bootcamp lab, not yet run in production
const learning = [
    {
        area: "Agent architectures",
        tools: ["Parallel agents (Grok Heavy-style)", "Orchestrator–workers", "Planner–executor", "Evaluator–optimizer", "Agentic RAG", "Tiered agent memory", "A2A protocol"],
    },
    { area: "Agent harnesses", tools: ["Claude Agent SDK", "Claude Code", "OpenAI Agents SDK", "Codex", "Google ADK", "Vercel AI SDK"] },
    { area: "Evals & guardrails", tools: ["lm-eval-harness", "promptfoo", "RAGAS", "DeepEval", "Langfuse", "OpenTelemetry", "Llama Guard", "NeMo Guardrails"] },
];

const links = [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/isuruig" },
    { label: "GitHub", href: "https://github.com/Isuruigi" },
    { label: "Résumé (PDF)", href: "/resume.pdf" },
];

export default function About() {
    return (
        <section id="about" className="scroll-mt-16 bg-void py-28 text-ink">
            <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-14 px-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20 lg:px-10">
                <figure className="lg:sticky lg:top-28 lg:self-start">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export serves images unoptimized */}
                    <img
                        src="/assets/sofa-laptop.webp"
                        alt="Isuru working on a laptop on a leather sofa"
                        width={1200}
                        height={1600}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/5] w-full rounded-2xl object-cover"
                    />
                    <figcaption className="mt-3 text-sm text-ash">Most of the work happens like this.</figcaption>
                </figure>

                <div>
                    <h2 className="text-balance font-display text-[clamp(2.4rem,5vw,4rem)] font-light leading-[1] tracking-[-0.04em]">
                        Built for production, not for the demo
                    </h2>

                    <div className="mt-8 max-w-[38rem] space-y-5 text-lg leading-relaxed text-ink/85">
                        <p>
                            I&apos;m an AI/ML engineer at Veracity Digital in Colombo. The part I care about comes after the demo:
                            serving models with vLLM, wiring multi-agent workflows into real business processes, and the monitoring
                            that tells you when something starts to drift.
                        </p>
                        <p>
                            On Saturdays I teach that same discipline in the lab at Buildr Labs&apos; Agentic AI Bootcamp, and I
                            contribute to the tools production ML runs on: LangChain, PyTorch, Hugging Face and MLflow.
                        </p>
                    </div>

                    <div className="mt-12">
                        <h3 className="text-sm text-ash">In production</h3>
                        <ul className="mt-3 border-t border-white/10">
                            {inProduction.map((p) => (
                                <li key={p.name}>
                                    <a
                                        href={p.href}
                                        className="group grid grid-cols-1 gap-1 border-b border-white/10 py-4 transition-colors hover:bg-white/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_1rem] sm:items-baseline sm:gap-6"
                                    >
                                        <span className="flex items-center gap-2.5 font-medium group-hover:text-ember">
                                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" aria-hidden="true" />
                                            {p.name}
                                        </span>
                                        <span className="text-sm leading-relaxed text-ash">{p.line}</span>
                                        <ArrowUpRight className="hidden h-4 w-4 text-ash group-hover:text-ember sm:block" aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <dl className="mt-12 border-t border-white/10">
                        {facts.map((f) => (
                            <div key={f.term} className="grid grid-cols-1 gap-1 border-b border-white/10 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                                <dt className="text-sm text-ash">{f.term}</dt>
                                <dd className={`flex items-center gap-2.5 text-[15px] ${f.highlight ? "font-medium text-ink" : ""}`}>
                                    {f.highlight && (
                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember shadow-[0_0_10px_rgba(252,165,10,0.8)]" aria-hidden="true" />
                                    )}
                                    {f.detail}
                                </dd>
                            </div>
                        ))}
                    </dl>

                    <div className="mt-12">
                        <h3 className="text-sm text-ash">Stack</h3>
                        <dl className="mt-3 border-t border-white/10">
                            {stack.map((s) => (
                                <div key={s.area} className="grid grid-cols-1 gap-2 border-b border-white/10 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                                    <dt className="text-sm text-ash">{s.area}</dt>
                                    <dd className="flex flex-wrap gap-1.5">
                                        {s.tools.map((t) => (
                                            <span key={t} className="rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[11px] text-ink/85">
                                                {t}
                                            </span>
                                        ))}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    <div className="mt-10">
                        <h3 className="text-sm text-ash">
                            Recently learned <span className="text-ash/70">· side builds and the bootcamp lab, not yet in production</span>
                        </h3>
                        <dl className="mt-3 border-t border-white/10">
                            {learning.map((s) => (
                                <div key={s.area} className="grid grid-cols-1 gap-2 border-b border-white/10 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                                    <dt className="text-sm text-ash">{s.area}</dt>
                                    <dd className="flex flex-wrap gap-1.5">
                                        {s.tools.map((t) => (
                                            <span key={t} className="rounded-full border border-dashed border-ember/35 px-2.5 py-0.5 font-mono text-[11px] text-ink/80">
                                                {t}
                                            </span>
                                        ))}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
                        {links.map((l) => (
                            <li key={l.label}>
                                <a
                                    href={l.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 font-medium underline decoration-inferno-3 underline-offset-[6px] transition-colors hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
                                >
                                    {l.label}
                                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, ExternalLink, Clock, ChevronRight, Lock } from "lucide-react";

type ProjectStatus = "Production" | "In Development" | "Completed" | "Coming Soon" | "Future Project" | "Active";
type ProjectCategory = "Production" | "In Development" | "Open Source" | "Coming Soon";

interface Project {
    id: number;
    status: ProjectStatus;
    statusColor: string;
    title: string;
    impact: string;
    challenge: string;
    solution: string;
    results: string[];
    tech: string[];
    github: string;
    demo: string;
    demoUrl?: string;
    category: ProjectCategory;
    image?: string; // GitHub repo screenshot or project image
}

const projects: Project[] = [
    // Production/Completed Projects First
    {
        id: 1,
        status: "Completed",
        statusColor: "bg-green-500",
        title: "Sri Lankan Market Intelligence Agent",
        impact: "AI-powered market intelligence system analyzing Sri Lankan economic indicators",
        challenge: "Needed real-time market intelligence system to analyze complex economic data from multiple sources with automated insights.",
        solution: "Built multi-agent LangChain system with custom RAG architecture, safe calculator tools, and intelligent market analysis capabilities.",
        results: [
            "Production-ready LangChain agent implementation",
            "Real-time processing of economic indicators",
            "Safe AST-based calculator integration",
            "Intelligent query handling with RAG",
        ],
        tech: ["LangChain", "Groq", "RAG", "Python", "SentenceTransformers", "FastAPI"],
        github: "https://github.com/Isuruigi/sl-market-agent",
        demo: "",
        category: "Production",
        image: "https://opengraph.githubassets.com/1/Isuruigi/sl-market-agent",
    },
    {
        id: 2,
        status: "Completed",
        statusColor: "bg-green-500",
        title: "Multi-Modal Crypto Intelligence System",
        impact: "AI-powered trading signal generator with multi-agent architecture",
        challenge: "Crypto markets require real-time sentiment analysis from multiple sources with sub-second latency for actionable trading signals.",
        solution: "Developed multi-agent system with Whale Tracker, Orderbook Analyzer, Sentiment Analyzer, and LLM Coordinator for comprehensive market analysis.",
        results: [
            "Multi-agent architecture with 4 specialized agents",
            "Real-time trading signal generation",
            "WebSocket support for live updates",
            "Docker-ready deployment with Redis caching",
        ],
        tech: ["LangChain", "Multi-Agent", "FinBERT", "FastAPI", "Redis", "Docker", "WebSocket"],
        github: "https://github.com/Isuruigi/crypto-intelligence-system",
        demo: "",
        category: "Production",
        image: "https://opengraph.githubassets.com/1/Isuruigi/crypto-intelligence-system",
    },
    {
        id: 3,
        status: "Completed",
        statusColor: "bg-green-500",
        title: "ML Monitoring System",
        impact: "Production-ready ML monitoring with automated drift detection and real-time dashboard",
        challenge: "Production ML systems need automated drift detection, intelligent alerting, and self-healing capabilities.",
        solution: "Built comprehensive MLOps pipeline with model drift detection, automated retraining triggers, real-time dashboard, and performance monitoring.",
        results: [
            "Automated model drift detection",
            "Real-time monitoring dashboard",
            "Self-healing pipelines with alerts",
            "Docker-ready with CI/CD integration",
        ],
        tech: ["Docker", "FastAPI", "MLflow", "Drift Detection", "Prometheus", "Grafana", "CI/CD"],
        github: "https://github.com/Isuruigi/ml-monitoring-system",
        demo: "",
        category: "Production",
        image: "https://opengraph.githubassets.com/1/Isuruigi/ml-monitoring-system",
    },
    {
        id: 4,
        status: "Completed",
        statusColor: "bg-green-500",
        title: "Fraud Detection System",
        impact: "End-to-end ML system predicting fraudulent transactions with production deployment",
        challenge: "Built complete ML pipeline from feature engineering to production deployment with automated drift detection.",
        solution: "Developed end-to-end system with feature engineering, model training, deployment, and continuous monitoring.",
        results: [
            "End-to-end ML pipeline from features to production",
            "Drift detection and automated retraining",
            "Business-validated predictions",
            "Production deployment with monitoring",
        ],
        tech: ["PyTorch", "scikit-learn", "FastAPI", "Docker", "Drift Detection", "MLOps", "Statistics"],
        github: "https://github.com/Isuruigi/fraud-detection-system",
        demo: "",
        category: "Production",
        image: "https://opengraph.githubassets.com/1/Isuruigi/fraud-detection-system",
    },
    // Open Source
    {
        id: 5,
        status: "Active",
        statusColor: "bg-green-500",
        title: "Open Source Contributions",
        impact: "Contributing to leading AI/ML frameworks used by thousands worldwide",
        challenge: "Improving production ML tools and frameworks for the broader ML community.",
        solution: "Active contributions to LangChain, PyTorch, Hugging Face Transformers, and MLflow. Focus on production-ready implementations and documentation.",
        results: [
            "Contributions to LangChain, PyTorch, Hugging Face, MLflow",
            "Production-ready examples and tutorials",
            "Code quality and documentation improvements",
            "Supporting thousands of ML engineers",
        ],
        tech: ["Python", "PyTorch", "LangChain", "Transformers", "MLflow", "Git", "CI/CD"],
        github: "https://github.com/Isuruigi",
        demo: "",
        category: "Open Source",
        image: "https://opengraph.githubassets.com/1/Isuruigi/Isuruigi",
    },
    // Coming Soon / Future Projects
    {
        id: 6,
        status: "Completed",
        statusColor: "bg-green-500",
        title: "Adaptive Multi-Adapter LLM Framework",
        impact: "Production-ready LoRA/QLoRA fine-tuning with intelligent routing and self-evaluation",
        challenge: "Need scalable framework for fine-tuning LLMs on domain-specific tasks with intelligent adapter selection and automated quality assessment.",
        solution: "Built multi-adapter system with BERT-based router network for dynamic adapter selection, multi-metric self-evaluation, and uncertainty quantification using MC Dropout.",
        results: [
            "Learned router network with Gumbel-Softmax selection",
            "4 specialized adapters: Reasoning, Code, Creative, Analysis",
            "Multi-metric self-evaluation (relevance, coherence, factuality)",
            "Uncertainty quantification with MC Dropout",
        ],
        tech: ["PyTorch", "Transformers", "LoRA", "QLoRA", "BERT", "HuggingFace", "MLOps"],
        github: "https://github.com/Isuruigi/adaptive-lora-framework",
        demo: "",
        category: "Production",
        image: "https://opengraph.githubassets.com/1/Isuruigi/adaptive-lora-framework",
    },
    {
        id: 7,
        status: "Future Project",
        statusColor: "bg-blue-500",
        title: "Physics-Informed Neural Networks",
        impact: "Extreme weather prediction using PyTorch with meteorological constraints",
        challenge: "Developing PINN models that incorporate physical laws for accurate extreme weather forecasting in Sri Lankan context.",
        solution: "Building PyTorch-based PINN system integrating meteorological physics constraints for improved weather prediction accuracy.",
        results: [
            "Integration of physics constraints in neural networks",
            "Focus on extreme weather events",
            "Sri Lankan meteorological context",
            "Research-backed approach",
        ],
        tech: ["PyTorch", "PINN", "Scientific ML", "Statistical Modeling"],
        github: "future",
        demo: "Research Phase",
        category: "Coming Soon",
    },
];

const categories: (ProjectCategory | "All Projects")[] = [
    "All Projects",
    "Production",
    "In Development",
    "Open Source",
    "Coming Soon",
];

export default function Projects() {
    const [activeCategory, setActiveCategory] = useState<ProjectCategory | "All Projects">("All Projects");

    const filteredProjects = activeCategory === "All Projects"
        ? projects
        : projects.filter((p) => p.category === activeCategory);

    return (
        <section id="projects" className="py-24 px-5">
            <div className="max-w-[1200px] mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <p className="text-sm uppercase tracking-wider text-muted mb-2">
                        Portfolio
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        Production ML Systems
                    </h2>
                    <p className="text-lg text-muted max-w-[600px] mx-auto">
                        AI systems deployed at scale with real business impact
                    </p>
                </motion.div>

                {/* Filter Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex flex-wrap justify-center gap-2 mb-12"
                >
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer
                ${activeCategory === category
                                    ? "bg-primary text-white"
                                    : "bg-card border border-border text-muted hover:text-foreground hover:border-primary/50"
                                }
              `}
                        >
                            {category}
                        </button>
                    ))}
                </motion.div>

                {/* Projects List */}
                <div className="space-y-16">
                    <AnimatePresence mode="popLayout">
                        {filteredProjects.map((project, index) => (
                            <motion.div
                                key={project.id}
                                layout
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className={`
                  grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center
                  ${index % 2 === 1 ? "lg:direction-rtl" : ""}
                `}
                            >
                                {/* Image Side - Dark Background */}
                                <div className={`${index % 2 === 1 ? "lg:order-2" : ""}`}>
                                    <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                                        {project.image ? (
                                            <img
                                                src={project.image}
                                                alt={project.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className="text-zinc-600 text-7xl font-bold mb-2">
                                                        {project.id.toString().padStart(2, "0")}
                                                    </div>
                                                    <p className="text-zinc-500 text-sm">
                                                        {project.github === "private" ? "Private Repository" : "Preview Coming Soon"}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {/* Status Badge on Image */}
                                        <div className="absolute top-4 left-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/60 backdrop-blur-sm text-white">
                                                <span className={`w-2 h-2 rounded-full ${project.statusColor}`} />
                                                {project.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Side */}
                                <div className={`${index % 2 === 1 ? "lg:order-1" : ""}`}>
                                    <h3 className="text-2xl font-bold text-foreground mb-3">
                                        {project.title}
                                    </h3>

                                    <p className="text-primary font-medium mb-4">
                                        {project.impact}
                                    </p>

                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <p className="text-sm font-medium text-foreground mb-1">Challenge</p>
                                            <p className="text-sm text-muted">{project.challenge}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground mb-1">Solution</p>
                                            <p className="text-sm text-muted">{project.solution}</p>
                                        </div>
                                    </div>

                                    {/* Results */}
                                    <div className="mb-6">
                                        <p className="text-sm font-medium text-foreground mb-2">Key Results</p>
                                        <ul className="space-y-1">
                                            {project.results.map((result, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-muted">
                                                    <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                                    {result}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Tech Stack Pills */}
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {project.tech.slice(0, 8).map((tech) => (
                                            <span
                                                key={tech}
                                                className="px-2.5 py-1 text-xs rounded-full border border-border text-muted bg-card"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                        {project.tech.length > 8 && (
                                            <span className="px-2.5 py-1 text-xs rounded-full border border-border text-muted bg-card">
                                                +{project.tech.length - 8} more
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-3">
                                        {project.github !== "private" && project.github !== "coming-soon" && project.github !== "future" && (
                                            <motion.a
                                                href={project.github}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                whileHover={{ y: -2 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-secondary transition-all duration-200"
                                            >
                                                <Github className="w-4 h-4" />
                                                View Code
                                            </motion.a>
                                        )}
                                        {project.github === "private" && (
                                            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg text-muted">
                                                <Lock className="w-4 h-4" />
                                                Private Repo
                                            </span>
                                        )}
                                        {(project.github === "coming-soon" || project.github === "future") && (
                                            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg text-muted">
                                                <Clock className="w-4 h-4" />
                                                Coming Soon
                                            </span>
                                        )}
                                        {project.demo && project.demo !== "In Development" && project.demo !== "Research Phase" && (
                                            project.demoUrl ? (
                                                <motion.a
                                                    href={project.demoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    whileHover={{ y: -2 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 transition-all duration-200"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    {project.demo}
                                                </motion.a>
                                            ) : (
                                                <motion.span
                                                    whileHover={{ y: -2 }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    {project.demo}
                                                </motion.span>
                                            )
                                        )}
                                        {(project.demo === "In Development" || project.demo === "Research Phase") && (
                                            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg text-muted">
                                                <Clock className="w-4 h-4" />
                                                {project.demo}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}

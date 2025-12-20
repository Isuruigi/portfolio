"use client";

import { motion } from "framer-motion";
import { Code, Briefcase, GraduationCap, Trophy } from "lucide-react";

interface Experience {
    id: number;
    title: string;
    company: string;
    location: string;
    period: string;
    current: boolean;
    description: string;
    highlights: string[];
    skills: string[];
    icon: typeof Code;
    type: "opensource" | "freelance" | "academic";
}

const experiences: Experience[] = [
    {
        id: 1,
        title: "Open Source Contributor",
        company: "Open Source Community",
        location: "Remote",
        period: "September 2024 - Present",
        current: true,
        description: "Contributing to leading AI/ML open-source projects to advance production machine learning tools and frameworks. Focus on improving code quality, documentation, and real-world implementations across the LLM and MLOps ecosystem.",
        highlights: [
            "LangChain - Enhancing multi-agent system implementations, improving RAG architecture examples, and fixing bugs in core chain orchestration modules",
            "PyTorch - Contributing to deep learning tutorials, test coverage improvements, and documentation clarity for production deployment patterns",
            "Hugging Face Transformers - Adding model integration examples, improving tokenizer documentation, and optimizing inference code paths",
            "MLflow & MLOps Tools - Enhancing production ML tracking capabilities, adding deployment examples, and improving monitoring integrations",
        ],
        skills: ["Python", "PyTorch", "LangChain", "Hugging Face", "MLflow", "Git", "CI/CD", "Docker", "Testing", "FastAPI"],
        icon: Code,
        type: "opensource",
    },
    {
        id: 2,
        title: "ML Systems Finalist",
        company: "Zuu Crew AI",
        location: "Remote",
        period: "October 2025 - December 2025",
        current: false,
        description: "Selected as Top 10 Finalist out of 290 participants in the intensive 13-week 'Build Production-Ready Machine Learning Systems' program. Completed comprehensive training in production ML engineering with hands-on projects.",
        highlights: [
            "Built end-to-end ML pipelines with MLflow integration for experiment tracking and model versioning",
            "Implemented scalable data processing workflows using Apache PySpark and Airflow orchestration",
            "Developed real-time streaming prediction pipelines with Apache Kafka",
            "Deployed production-grade ML systems with monitoring, CI/CD, and automated workflows",
            "Capstone: End-to-end streaming-to-prediction pipeline with production deployment",
        ],
        skills: ["Python", "MLflow", "Apache Spark", "Apache Airflow", "Apache Kafka", "ML Pipelines", "CI/CD", "Production ML"],
        icon: Trophy,
        type: "freelance",
    },
    {
        id: 3,
        title: "Freelance AI Engineer",
        company: "Self Employed",
        location: "Remote",
        period: "June 2024 - Present",
        current: true,
        description: "Building production-ready AI/ML systems for diverse applications including market intelligence, predictive analytics, and multi-agent architectures. Specializing in LangChain-based systems, PyTorch deep learning, and end-to-end MLOps pipelines deployed on cloud infrastructure.",
        highlights: [
            "AI-Powered Sri Lankan Market Intelligence Agent - Multi-agent RAG system analyzing economic indicators with automated monitoring on GCP",
            "Telco Churn Prediction Pipeline - End-to-end ML system from feature engineering to production deployment with drift detection",
            "Multi-Agent Crypto Market Analyzer - Real-time sentiment orchestration with sub-2s latency and AIOps integration",
            "Deployed production ML systems on AWS, GCP, and Azure with monitoring and self-healing capabilities",
        ],
        skills: ["PyTorch", "LangChain", "FastAPI", "Docker", "Kubernetes", "AWS", "GCP", "MLOps", "Multi-Agent", "RAG"],
        icon: Briefcase,
        type: "freelance",
    },
    {
        id: 4,
        title: "BSc IT & Management Student",
        company: "University of Colombo",
        location: "Colombo, Sri Lanka",
        period: "May 2023 - May 2027",
        current: true,
        description: "Third-year student specializing in Applied Statistics & Data Science, with focus on production ML systems. Building AI systems where statistical rigor meets MLOps and AIOps. Also pursuing BIT at University of Colombo School of Computing (Oct 2023 - Oct 2026).",
        highlights: [
            "Specialization: Applied Statistics & Data Science",
            "Focus: Machine Learning Engineering & Production ML Systems",
            "Research: Statistical Programming & ML Theory",
            "Additional: BIT at UCSC (2023-2026)",
        ],
        skills: ["Statistical Modeling", "Research", "Data Analysis", "ML Theory", "Python", "R"],
        icon: GraduationCap,
        type: "academic",
    },
];

export default function Experience() {
    return (
        <section id="experience" className="py-24 px-5 bg-card">
            <div className="max-w-[900px] mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <p className="text-sm uppercase tracking-wider text-muted mb-2">
                        Experience
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                        Production AI/ML Journey
                    </h2>
                </motion.div>

                {/* Timeline */}
                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                    {/* Experience Cards */}
                    <div className="space-y-12">
                        {experiences.map((exp, index) => (
                            <motion.div
                                key={exp.id}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.15 }}
                                className="relative pl-16"
                            >
                                {/* Timeline Dot */}
                                <div className="absolute left-6 top-8 -translate-x-1/2">
                                    <div className={`
                    w-3 h-3 rounded-full bg-primary
                    ${exp.current ? "animate-pulse" : ""}
                  `} />
                                </div>

                                {/* Card */}
                                <div className="p-6 rounded-xl border border-border bg-background">
                                    {/* Period Badge */}
                                    <span className="inline-block px-3 py-1 text-xs rounded-full bg-primary/10 text-primary mb-4">
                                        {exp.period}
                                    </span>

                                    {/* Title Row */}
                                    <div className="flex items-start gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <exp.icon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-foreground">
                                                {exp.title}
                                            </h3>
                                            <p className="text-sm text-muted">
                                                {exp.company} • {exp.location}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-muted mb-4 leading-relaxed">
                                        {exp.description}
                                    </p>

                                    {/* Highlights */}
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-foreground mb-2">
                                            {exp.type === "opensource" ? "Key Contributions:" :
                                                exp.type === "freelance" ? "Key Projects:" : "Academic Focus:"}
                                        </p>
                                        <ul className="space-y-2">
                                            {exp.highlights.map((highlight, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-muted">
                                                    <span className="text-primary mt-1">•</span>
                                                    {highlight}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Skills */}
                                    <div className="flex flex-wrap gap-2">
                                        {exp.skills.map((skill) => (
                                            <span
                                                key={skill}
                                                className="px-2.5 py-1 text-xs rounded-full border border-border text-muted"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

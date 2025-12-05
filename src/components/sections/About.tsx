"use client";

import { motion } from "framer-motion";
import {
    GraduationCap,
    MapPin,
    Briefcase,
    Zap,
    Linkedin,
    Github
} from "lucide-react";

const infoCards = [
    {
        icon: GraduationCap,
        title: "Education",
        text: "BSc IT & Management (Hons)",
        subtext: "University of Colombo",
        badge: "3rd Year • 2023-2027",
        additional: "BIT, UCSC (2023-2026)",
    },
    {
        icon: MapPin,
        title: "Location",
        text: "Colombo, Sri Lanka",
        subtext: "Remote Ready",
    },
    {
        icon: Briefcase,
        title: "Availability",
        text: "Open to Remote Opportunities",
        subtext: "Full-time • Freelance • Collaborations",
    },
    {
        icon: Zap,
        title: "Focus Areas",
        text: "LLM Engineering • Multi-Agent Systems",
        subtext: "MLOps/AIOps • Production ML",
    },
];

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
};

export default function About() {
    return (
        <section id="about" className="py-24 px-5">
            <div className="max-w-[1000px] mx-auto">
                {/* Header */}
                <motion.div
                    {...fadeInUp}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                >
                    <p className="text-sm uppercase tracking-wider text-muted mb-2">
                        About Me
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                        Shipping AI That Works in Production
                    </h2>
                </motion.div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                    {/* Left Column - Content */}
                    <motion.div
                        {...fadeInUp}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="lg:col-span-3 space-y-6"
                    >
                        <p className="text-lg text-muted leading-relaxed">
                            <span className="text-foreground font-medium">
                                Most AI engineers can train models. I deploy them at scale, monitor performance, and fix them when they break.
                            </span>{" "}
                            That&apos;s the difference.
                        </p>

                        <p className="text-lg text-muted leading-relaxed">
                            Third year at University of Colombo (IT & Management Hons | Applied Statistics & Data Science),
                            building production AI systems where statistical rigor meets MLOps and AIOps.
                        </p>

                        <p className="text-lg text-muted leading-relaxed">
                            I focus on AI systems that actually work in production—not just notebook demos.
                            From multi-agent LangChain architectures to automated MLOps pipelines with drift detection,
                            I build systems that handle real traffic and self-heal when things break.
                        </p>

                        <p className="text-lg text-muted leading-relaxed">
                            <span className="text-foreground font-medium">Open source contributor</span> to LangChain,
                            PyTorch, Hugging Face Transformers, and MLflow—helping thousands of ML engineers deploy
                            reliable systems at scale.
                        </p>
                    </motion.div>

                    {/* Right Column - Info Cards */}
                    <div className="lg:col-span-2 space-y-4">
                        {infoCards.map((card, index) => (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.1 * index }}
                                whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                                className="p-5 rounded-xl border border-border bg-card transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <card.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs uppercase tracking-wider text-muted mb-1">
                                            {card.title}
                                        </p>
                                        <p className="text-foreground font-medium">
                                            {card.text}
                                        </p>
                                        <p className="text-sm text-muted">
                                            {card.subtext}
                                        </p>
                                        {card.badge && (
                                            <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                                                {card.badge}
                                            </span>
                                        )}
                                        {card.additional && (
                                            <p className="text-xs text-muted mt-2">
                                                {card.additional}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Quick Links */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            className="flex flex-wrap gap-2 pt-2"
                        >
                            <motion.a
                                href="https://www.linkedin.com/in/isuruig"
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-secondary transition-all duration-200"
                            >
                                <Linkedin className="w-4 h-4" />
                                LinkedIn
                            </motion.a>

                            <motion.a
                                href="https://github.com/Isuruigi"
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-secondary transition-all duration-200"
                            >
                                <Github className="w-4 h-4" />
                                GitHub
                            </motion.a>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}

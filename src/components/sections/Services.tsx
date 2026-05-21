"use client";

import { motion } from "framer-motion";
import { Bot, PhoneCall, GitBranch, Brain, ArrowRight } from "lucide-react";

const services = [
    {
        icon: Bot,
        title: "Agentic AI Assistants",
        subhead: "MULTI-CHANNEL CHATBOTS",
        body: "AI assistants that handle WhatsApp, web chat, and email 24/7. Custom RAG over your private docs, human-in-the-loop checkpoints, and analytics built in.",
        anchor: "#projects",
    },
    {
        icon: PhoneCall,
        title: "Voice AI Agents",
        subhead: "24/7 CALL HANDLING",
        body: "Full-duplex voice agents on Twilio + Deepgram + OpenAI with sub-second latency. Handle bookings, FAQs, and routing in English, Sinhala, or Tamil.",
        anchor: "#projects",
    },
    {
        icon: GitBranch,
        title: "Workflow Automation",
        subhead: "n8n • MAKE • ZAPIER",
        body: "Production automation pipelines that connect LLMs to real-world tools. Payment verification with bank reconciliation, Meta Ads decisioning agents, and multi-step approvals with human checkpoints.",
        anchor: "#projects",
    },
    {
        icon: Brain,
        title: "Custom ML & Knowledge Systems",
        subhead: "RAG • GRAPHRAG • DEEP LEARNING",
        body: "Custom models trained on your data: churn prediction, fraud detection, medical imaging. Plus RAG/GraphRAG knowledge engines that let your team query private data in plain language.",
        anchor: "#projects",
    },
];

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
};

export default function Services() {
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id.slice(1));
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <section id="services" className="py-24 px-5">
            <div className="max-w-[1200px] mx-auto">
                {/* Header */}
                <motion.div
                    {...fadeInUp}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                >
                    <p className="text-sm uppercase tracking-wider text-muted mb-2">
                        Services
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                        What I Build for Clients
                    </h2>
                </motion.div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {services.map((service, index) => (
                        <motion.div
                            key={service.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
                            className="flex flex-col p-6 rounded-xl border border-border bg-card transition-all duration-200"
                        >
                            {/* Icon */}
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <service.icon className="w-5 h-5 text-primary" />
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-bold text-foreground mb-1">
                                {service.title}
                            </h3>

                            {/* Subhead */}
                            <p className="text-xs font-semibold tracking-wider text-primary uppercase mb-3">
                                {service.subhead}
                            </p>

                            {/* Body */}
                            <p className="text-sm text-muted leading-relaxed flex-1">
                                {service.body}
                            </p>

                            {/* Learn More */}
                            <button
                                onClick={() => scrollToSection(service.anchor)}
                                className="inline-flex items-center gap-1 mt-5 text-sm font-medium text-primary hover:gap-2 transition-all duration-200 cursor-pointer"
                            >
                                See Projects
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

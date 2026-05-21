"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Github,
    ArrowDown,
    Mail,
    Code,
    Briefcase,
    GraduationCap
} from "lucide-react";
import TechIcon from "@/components/ui/TechIcon";

const titles = [
    "AI/ML Engineer",
    "AI Automation Engineer",
    "MLOps Specialist",
    "Multi-Agent Systems Developer",
    "Production ML Engineer",
];

const metrics = [
    { icon: Code, text: "Open Source Contributor" },
    { icon: Briefcase, text: "TA @ Buildr Labs" },
    { icon: GraduationCap, text: "BSc IT & Management" },
];

const techStack = [
    { name: "pytorch", displayName: "PyTorch" },
    { name: "python", displayName: "Python" },
    { name: "langchain", displayName: "LangChain" },
    { name: "fastapi", displayName: "FastAPI" },
    { name: "docker", displayName: "Docker" },
    { name: "kubernetes", displayName: "Kubernetes" },
    { name: "amazonaws", displayName: "AWS" },
    { name: "googlecloud", displayName: "GCP" },
    { name: "postgresql", displayName: "PostgreSQL" },
];

type AgentEvent = {
    icon: string;
    service: string;
    serviceColor: string;
    action: string;
    meta: string;
};

const allEvents: AgentEvent[] = [
    { icon: "🎙", service: "PersonaPlex", serviceColor: "text-emerald-400", action: "handled inbound call", meta: "1.2s · full-duplex · ok" },
    { icon: "⚙", service: "n8n / payments", serviceColor: "text-amber-300", action: "auto-confirmed Rs 18,500", meta: "conf 0.94 · no human touch" },
    { icon: "🔗", service: "NEXUS GraphRAG", serviceColor: "text-sky-400", action: "resolved multi-hop query", meta: "5 sources · 230ms" },
    { icon: "🧠", service: "fraud_v3", serviceColor: "text-rose-300", action: "scored 1,204 transactions", meta: "99.7% recall · drift ok" },
    { icon: "🎙", service: "PersonaPlex", serviceColor: "text-emerald-400", action: "recovered from caller barge-in", meta: "0.8s recovery · 2 turns" },
    { icon: "⚙", service: "n8n / meta-ads", serviceColor: "text-amber-300", action: "auto-paused 3 underperforming ads", meta: "ROAS < 1.2 trigger" },
    { icon: "🔗", service: "NEXUS GraphRAG", serviceColor: "text-sky-400", action: "traversed 14 graph edges", meta: "Company → Region → Pricing" },
    { icon: "🧠", service: "churn_v2", serviceColor: "text-rose-300", action: "flagged 47 high-risk accounts", meta: "auto-routed to CS team" },
    { icon: "🎙", service: "PersonaPlex", serviceColor: "text-emerald-400", action: "trilingual routing: SI → EN", meta: "1.4s · seamless handoff" },
    { icon: "⚙", service: "n8n / whatsapp", serviceColor: "text-amber-300", action: "OCR'd receipt · queued for review", meta: "ref ambiguous · human in loop" },
    { icon: "🔗", service: "NEXUS GraphRAG", serviceColor: "text-sky-400", action: "synthesized 8 sources", meta: "0.91 confidence · cited" },
    { icon: "📊", service: "drift_monitor", serviceColor: "text-violet-300", action: "no significant drift in 24h", meta: "all 6 models healthy" },
];

const TIMESTAMPS = ["just now", "12s ago", "28s ago", "47s ago"];

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
};

export default function Hero() {
    const [titleIndex, setTitleIndex] = useState(0);
    const newUid = () => `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const [visibleEvents, setVisibleEvents] = useState<(AgentEvent & { uid: string })[]>(() =>
        allEvents.slice(0, 4).map((ev) => ({ ...ev, uid: newUid() }))
    );
    const cursorRef = useRef(4);

    useEffect(() => {
        const interval = setInterval(() => {
            setTitleIndex((prev) => (prev + 1) % titles.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisibleEvents((prev) => [
                { ...allEvents[cursorRef.current % allEvents.length], uid: newUid() },
                ...prev.slice(0, 3),
            ]);
            cursorRef.current++;
        }, 2800);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <section
            id="hero"
            className="min-h-screen flex items-center py-20 px-5"
        >
            <div className="max-w-[1200px] mx-auto w-full">
                <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-8">

                    {/* Left Side - Content */}
                    <motion.div
                        className="flex-1 lg:pr-8 text-center lg:text-left"
                        initial="initial"
                        animate="animate"
                        variants={{
                            animate: {
                                transition: { staggerChildren: 0.1 },
                            },
                        }}
                    >
                        {/* Availability Badge */}
                        <motion.div
                            variants={fadeInUp}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6"
                        >
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                Open to Remote Opportunities
                            </span>
                        </motion.div>

                        {/* Tagline */}
                        <motion.p
                            variants={fadeInUp}
                            transition={{ duration: 0.5, delay: 0.08 }}
                            className="text-base md:text-lg italic text-primary/90 mb-3 font-medium"
                        >
                            AI that ships.
                        </motion.p>

                        {/* Name */}
                        <motion.h1
                            variants={fadeInUp}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-5xl md:text-6xl lg:text-[64px] font-bold text-foreground mb-4 leading-[1.05] tracking-tight"
                        >
                            Isuru <span className="text-primary">(IG)</span> Chathuranga
                        </motion.h1>

                        {/* Animated Title */}
                        <motion.div
                            variants={fadeInUp}
                            transition={{ duration: 0.5, delay: 0.15 }}
                            className="h-10 mb-6"
                        >
                            <AnimatePresence mode="wait">
                                <motion.h2
                                    key={titleIndex}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-[22px] md:text-[28px] font-semibold text-primary"
                                >
                                    {titles[titleIndex]}
                                </motion.h2>
                            </AnimatePresence>
                        </motion.div>

                        {/* Value Proposition */}
                        <motion.p
                            variants={fadeInUp}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-lg text-muted max-w-[600px] mb-8 mx-auto lg:mx-0 leading-relaxed"
                        >
                            <span className="text-foreground font-medium">I Ship AI Systems That Actually Work in Production.</span>{" "}
                            Building production-first AI systems, agentic workflows, and automation pipelines. Not just models, but deployed systems that scale and self-heal.
                        </motion.p>

                        {/* Key Metrics */}
                        <motion.div
                            variants={fadeInUp}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-wrap justify-center lg:justify-start gap-6 md:gap-8 mb-8"
                        >
                            {metrics.map((metric) => (
                                <div key={metric.text} className="flex items-center gap-2">
                                    <metric.icon className="w-5 h-5 text-primary" />
                                    <span className="text-sm text-muted">{metric.text}</span>
                                </div>
                            ))}
                        </motion.div>

                        {/* CTA Buttons */}
                        <motion.div
                            variants={fadeInUp}
                            transition={{ duration: 0.5, delay: 0.35 }}
                            className="flex flex-wrap justify-center lg:justify-start gap-3"
                        >
                            {/* Primary - GitHub Profile */}
                            <motion.a
                                href="https://github.com/Isuruigi"
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center gap-2 h-11 px-6 bg-primary text-white rounded-lg font-medium transition-all duration-200"
                            >
                                <Github className="w-4 h-4" />
                                GitHub Profile
                            </motion.a>

                            {/* Secondary - View Projects */}
                            <motion.button
                                onClick={() => scrollToSection("projects")}
                                whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center gap-2 h-11 px-6 border border-border rounded-lg font-medium text-foreground hover:bg-secondary transition-all duration-200 cursor-pointer"
                            >
                                <ArrowDown className="w-4 h-4" />
                                View Projects
                            </motion.button>

                            {/* Tertiary - Contact */}
                            <motion.button
                                onClick={() => scrollToSection("contact")}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center gap-2 h-11 px-6 font-medium text-muted hover:text-foreground transition-all duration-200 cursor-pointer"
                            >
                                <Mail className="w-4 h-4" />
                                Contact Me
                            </motion.button>
                        </motion.div>
                    </motion.div>

                    {/* Right Side - Profile Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex-shrink-0"
                    >
                        <div
                            className="w-[200px] h-[200px] lg:w-[300px] lg:h-[300px] rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-4 border-primary/30 overflow-hidden shadow-xl"
                        >
                            <img
                                src="/assets/profile.jpg"
                                alt="Isuru (IG) Chathuranga - AI/ML Engineer"
                                className="w-full h-full object-cover object-top"
                            />
                        </div>
                    </motion.div>

                </div>

                {/* Live Agent Activity Feed */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.45 }}
                    className="mt-14 lg:mt-20"
                >
                    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/60 border-b border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                </span>
                                <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">Live</span>
                                <span className="text-xs text-slate-600">/</span>
                                <span className="text-xs text-slate-400">agentic ops</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">stream · last 60s</span>
                        </div>

                        {/* Event Stream */}
                        <div className="px-5 py-4 min-h-[280px]">
                            <AnimatePresence initial={false}>
                                {visibleEvents.map((ev, i) => (
                                    <motion.div
                                        key={ev.uid}
                                        layout
                                        initial={{ opacity: 0, y: -16, scale: 0.98 }}
                                        animate={{ opacity: i === 0 ? 1 : 0.55 + (3 - i) * 0.15, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        transition={{ duration: 0.45, ease: "easeOut" }}
                                        className="flex items-start gap-3 py-2.5 border-b border-slate-800/40 last:border-b-0"
                                    >
                                        <div className={`text-base leading-none mt-1 ${ev.serviceColor}`}>
                                            {ev.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between gap-3">
                                                <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                                                    <span className={`text-sm font-semibold ${ev.serviceColor}`}>
                                                        {ev.service}
                                                    </span>
                                                    <span className="text-sm text-slate-200">
                                                        {ev.action}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap tabular-nums">
                                                    {TIMESTAMPS[i]}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                                                ↳ {ev.meta}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Footer status bar */}
                        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900/40 border-t border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    <span className="text-[11px] text-slate-400">4 services online</span>
                                </div>
                                <div className="hidden sm:flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                                    <span className="text-[11px] text-slate-400">12 events/min</span>
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">24/7 · monitored</span>
                        </div>
                    </div>
                </motion.div>

                {/* Tech Stack Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="mt-16 lg:mt-24"
                >
                    <p className="text-xs uppercase tracking-wider text-muted mb-6 text-center">
                        Core Tech Stack
                    </p>

                    <div className="flex gap-6 overflow-x-auto pb-4 justify-center scrollbar-hide">
                        {techStack.map((tech, index) => (
                            <motion.div
                                key={tech.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                                className="flex-shrink-0 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
                            >
                                <TechIcon name={tech.name} size={32} />
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

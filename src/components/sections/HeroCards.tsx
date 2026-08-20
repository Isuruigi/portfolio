"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * A shuffling card stack in the hero: real roles and shipped projects,
 * cycling one at a time. Deck advances on its own, pauses on hover,
 * and can be driven by click or keyboard.
 */

interface Card {
    kind: string;
    title: string;
    line: string;
    tech: string[];
    accent?: boolean; // highlight the current role / active build
}

const CARDS: Card[] = [
    {
        kind: "Now",
        title: "AI/ML Engineer @ Veracity Digital",
        line: "Building and shipping production AI systems.",
        tech: ["PyTorch", "vLLM", "Multi-Agent"],
        accent: true,
    },
    {
        kind: "Teaching",
        title: "Technical Assistant @ Buildr Labs",
        line: "Supporting engineers through a 16-week agentic AI bootcamp, from RAG pipelines to Kubernetes.",
        tech: ["LangGraph", "MCP", "Kubernetes"],
    },
    {
        kind: "Shipped",
        title: "PersonaPlex",
        line: "Full-duplex voice agent that answers real phone calls with sub-second latency.",
        tech: ["FastAPI", "GPT-4o", "Deepgram"],
    },
    {
        kind: "Building",
        title: "NEXUS",
        line: "Fuses vector retrieval with graph traversal for multi-hop reasoning flat search can't handle.",
        tech: ["Qdrant", "Neo4j", "LangGraph"],
        accent: true,
    },
    {
        kind: "Shipped",
        title: "Payment Verification Automation",
        line: "WhatsApp intake, document processing, bank reconciliation, Slack confirmation. Humans only on ambiguity.",
        tech: ["n8n", "LangChain", "Slack API"],
    },
    {
        kind: "Shipped",
        title: "Cost-Aware Fraud Detection",
        line: "Bakes business cost into the loss function, so it optimises what the business actually pays for.",
        tech: ["XGBoost", "MLflow", "CI/CD"],
    },
];

const ROTATE_MS = 4000;

export default function HeroCards() {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    const next = useCallback(() => setIndex((i) => (i + 1) % CARDS.length), []);

    useEffect(() => {
        if (paused) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const id = setInterval(next, ROTATE_MS);
        return () => clearInterval(id);
    }, [paused, next]);

    return (
        <div className="mt-14 lg:mt-20 max-w-[560px] mx-auto">
            <p className="text-xs uppercase tracking-wider text-muted mb-4 text-center">
                Roles &amp; work, one at a time
            </p>

            <div
                className="relative h-[248px] sm:h-[226px]"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
            >
                {CARDS.map((card, i) => {
                    // Position of this card relative to the front of the deck
                    const pos = (i - index + CARDS.length) % CARDS.length;
                    const visible = pos < 3;

                    return (
                        <motion.div
                            key={card.title}
                            className={`absolute inset-x-0 top-0 h-[200px] sm:h-[182px] overflow-hidden rounded-xl border bg-card p-5 sm:p-6 ${
                                card.accent ? "border-primary/40" : "border-border"
                            }`}
                            animate={{
                                y: pos * 13,
                                scale: 1 - pos * 0.04,
                                opacity: visible ? [1, 0.55, 0.28][pos] : 0,
                            }}
                            transition={{ type: "spring", stiffness: 260, damping: 30 }}
                            style={{ zIndex: CARDS.length - pos, pointerEvents: pos === 0 ? "auto" : "none" }}
                            aria-hidden={pos !== 0}
                        >
                            {/* Only the front card shows content; the rest are clean edges */}
                            {pos === 0 && (
                            <button
                                type="button"
                                onClick={next}
                                className="w-full text-left cursor-pointer"
                                aria-label={`${card.title}. Show next card.`}
                            >
                                <span
                                    className={`inline-block px-2.5 py-1 text-[11px] rounded-full mb-3 ${
                                        card.accent
                                            ? "bg-primary/10 text-primary"
                                            : "bg-secondary text-muted"
                                    }`}
                                >
                                    {card.kind}
                                </span>

                                <h3 className="text-lg font-bold text-foreground mb-1.5">
                                    {card.title}
                                </h3>
                                <p className="text-sm text-muted leading-relaxed mb-4">
                                    {card.line}
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    {card.tech.map((t) => (
                                        <span
                                            key={t}
                                            className="px-2 py-0.5 text-[11px] rounded-full border border-border text-muted"
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </button>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Deck position */}
            <div className="flex items-center justify-center gap-2 mt-5">
                {CARDS.map((card, i) => (
                    <button
                        key={card.title}
                        type="button"
                        onClick={() => setIndex(i)}
                        aria-label={`Show ${card.title}`}
                        aria-current={i === index}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            i === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}

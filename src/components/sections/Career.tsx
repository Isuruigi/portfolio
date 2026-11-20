"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { checkpoints, timeline, certifications, certificationTotal } from "@/lib/data/career";

// Chart geometry (SVG units)
const W = 640;
const H = 380;
const PAD = { left: 44, right: 16, top: 24, bottom: 40 };
const NOW = 42 / 48; // November 2026 on the May 2023 to May 2027 timeline

// A believable training-loss curve: fast early drop, small noise, slow tail
function loss(t: number) {
    return 0.1 + 0.8 * Math.exp(-3 * t) + 0.025 * Math.sin(37 * t) * Math.exp(-t) + 0.01 * Math.sin(91 * t);
}

const x = (t: number) => PAD.left + t * (W - PAD.left - PAD.right);
const y = (v: number) => PAD.top + (1 - v) * (H - PAD.top - PAD.bottom);

function curve(from: number, to: number) {
    const pts: string[] = [];
    for (let t = from; t <= to + 1e-9; t += 0.004) {
        pts.push(`${pts.length ? "L" : "M"}${x(t).toFixed(1)},${y(loss(t)).toFixed(1)}`);
    }
    return pts.join(" ");
}

const SOLID = curve(0, NOW);
const AHEAD = curve(NOW, 1);
// Year labels at January of each year (May 2023 sits at the origin)
const YEARS: [string, number][] = [
    ["2023", 0],
    ["2024", 8 / 48],
    ["2025", 20 / 48],
    ["2026", 32 / 48],
    ["2027", 44 / 48],
];

export default function Career() {
    const sectionRef = useRef<HTMLElement>(null);
    const reduceMotion = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start 0.75", "end 0.85"] });
    const [progress, setProgress] = useState(0);

    useMotionValueEvent(scrollYProgress, "change", (v) => setProgress(v));
    const p = reduceMotion ? 1 : progress;
    // The solid curve covers the timeline up to now; scale progress onto it
    const drawn = Math.min(1, p / NOW);

    return (
        <section id="career" ref={sectionRef} className="scroll-mt-16 bg-void py-28 text-ink">
            <div className="mx-auto max-w-[1280px] px-5 lg:px-10">
                <h2 className="font-display text-[clamp(2.4rem,5vw,4rem)] font-light leading-[1] tracking-[-0.04em]">
                    A training curve, not a CV
                </h2>
                <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-ash">
                    Each role is a checkpoint, and each one brought the loss down. Scroll to train.
                </p>

                <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
                    <div className="lg:sticky lg:top-28 lg:self-start">
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Career timeline from ${timeline.from} to ${timeline.to}, drawn as a falling training loss curve with a checkpoint for each role`}>
                            {/* Axes */}
                            <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.12)" />
                            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.12)" />
                            <text x={PAD.left - 10} y={PAD.top + 6} textAnchor="end" className="fill-ash font-mono text-[11px]">loss</text>
                            {YEARS.map(([yr, t], i) => (
                                <text
                                    key={yr}
                                    x={x(t)}
                                    y={H - PAD.bottom + 22}
                                    textAnchor={i === 0 ? "start" : "middle"}
                                    className="fill-ash font-mono text-[11px]"
                                >
                                    {yr}
                                </text>
                            ))}

                            {/* The road ahead, faint and dashed */}
                            <path d={AHEAD} fill="none" stroke="rgba(163,160,176,0.35)" strokeWidth={1.5} strokeDasharray="4 6" />
                            {/* Faint guide under the live curve */}
                            <path d={SOLID} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2} />
                            <motion.path
                                d={SOLID}
                                fill="none"
                                stroke="url(#loss-gradient)"
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                style={{ pathLength: drawn }}
                            />
                            <defs>
                                <linearGradient id="loss-gradient" x1="0" x2="1" y1="0" y2="0">
                                    <stop offset="0%" stopColor="#420a68" />
                                    <stop offset="45%" stopColor="#932667" />
                                    <stop offset="75%" stopColor="#dd513a" />
                                    <stop offset="100%" stopColor="#fca50a" />
                                </linearGradient>
                            </defs>

                            {/* Checkpoints */}
                            {checkpoints.map((c) => {
                                const reached = c.future ? false : c.start <= p * 1.0001;
                                return (
                                    <g key={c.role}>
                                        {c.now && reached && (
                                            <circle cx={x(c.start)} cy={y(loss(c.start))} r={11} fill="none" stroke="#fca50a" strokeOpacity={0.35} />
                                        )}
                                        <circle
                                            cx={x(c.start)}
                                            cy={y(loss(c.start))}
                                            r={c.future ? 4 : 5}
                                            fill={reached ? "#fca50a" : "#000004"}
                                            stroke={c.future ? "rgba(163,160,176,0.6)" : reached ? "#fcffa4" : "rgba(255,255,255,0.3)"}
                                            strokeDasharray={c.future ? "2 2" : undefined}
                                            style={{ transition: "fill 400ms ease" }}
                                        />
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    <ol className="space-y-3">
                        {checkpoints.map((c) => {
                            const reached = c.future ? false : c.start <= p * 1.0001;
                            return (
                                <li
                                    key={c.role}
                                    className={`rounded-xl border p-5 transition-all duration-500 ${
                                        reached ? "border-fg/15 bg-fg/[0.03] opacity-100" : "border-fg/5 opacity-45"
                                    }`}
                                >
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                        <p className="font-medium">{c.role}</p>
                                        <p className="font-mono text-[11px] text-ash">{c.period}</p>
                                    </div>
                                    <p className="mt-0.5 text-sm text-ink/80">
                                        {c.org}
                                        {c.now && <span className="ml-2 text-xs text-ember">now</span>}
                                    </p>
                                    <p className="mt-2 text-sm leading-relaxed text-ash">{c.line}</p>
                                </li>
                            );
                        })}
                    </ol>
                </div>

                <div className="mt-20 border-t border-fg/10 pt-8">
                    <p className="text-sm text-ash">Certified by Oracle, Databricks, Microsoft Azure, Astronomer, Qdrant and others</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                        {certifications.map((c) => (
                            <li key={c} className="rounded-full border border-fg/10 px-3 py-1.5 text-xs text-ink/80">
                                {c}
                            </li>
                        ))}
                        <li>
                            <a
                                href="https://linkedin.com/in/isuruig"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block rounded-full border border-ember/40 px-3 py-1.5 text-xs text-ember hover:bg-ember hover:text-on-ember"
                            >
                                +{certificationTotal - certifications.length} more on LinkedIn
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}

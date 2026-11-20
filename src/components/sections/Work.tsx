"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Lock, RotateCcw } from "lucide-react";
import SystemsPanel from "@/components/diagrams/SystemsPanel";
import { flagships, workIndex, type Flagship, type TraceStep, type WorkStatus } from "@/lib/data/work";

const STEP_MS = 1100;

const statusColor: Record<WorkStatus, string> = {
    Production: "text-ember border-ember/40",
    Shipped: "text-ember border-ember/40",
    "In development": "text-inferno-3 border-inferno-3/40",
    Ongoing: "text-inferno-5 border-inferno-5/30",
    Planned: "text-ash border-fg/15",
};

function StatusTag({ status }: { status: WorkStatus }) {
    return (
        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${statusColor[status]}`}>{status}</span>
    );
}

// Steps light up one after another, like a request moving through the system
function TraceReplay({ id, steps, name }: { id: string; steps: TraceStep[]; name: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.5 });
    const reduceMotion = useReducedMotion();
    const [tick, setTick] = useState(0);
    const done = tick >= steps.length;

    useEffect(() => {
        if (!inView || reduceMotion || done) return;
        const timer = setInterval(() => setTick((t) => Math.min(t + 1, steps.length)), STEP_MS);
        return () => clearInterval(timer);
    }, [inView, reduceMotion, done, steps.length]);

    // Reduced motion shows the whole trace at once
    const active = reduceMotion ? steps.length : inView ? tick : -1;

    // Tell the 3D lab which part of the system is working right now
    useEffect(() => {
        if (active < 0) return;
        window.dispatchEvent(new CustomEvent("trace-step", { detail: { id, step: active >= steps.length ? 4 : active } }));
    }, [active, id, steps.length]);

    return (
        <div ref={ref} className="rounded-2xl border border-fg/10 bg-fg/[0.02] p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-ash">How a request flows through {name}</p>
                <button
                    type="button"
                    onClick={() => setTick(0)}
                    disabled={active < steps.length}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs text-ash transition-colors hover:text-ember disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ember"
                >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Replay
                </button>
            </div>

            <ol className="relative">
                {steps.map((s, i) => {
                    const done = i < active;
                    const current = i === active;
                    return (
                        <li key={s.label} className="relative flex gap-4 pb-6 last:pb-0">
                            {i < steps.length - 1 && (
                                <span
                                    aria-hidden="true"
                                    className={`absolute left-[7px] top-5 h-[calc(100%-12px)] w-px transition-colors duration-500 ${done ? "bg-ember/60" : "bg-fg/10"}`}
                                />
                            )}
                            <span
                                aria-hidden="true"
                                className={`relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border transition-all duration-500 ${
                                    done
                                        ? "border-ember bg-ember"
                                        : current
                                          ? "border-ember bg-ember/30 shadow-[0_0_14px_rgba(252,165,10,0.7)]"
                                          : "border-fg/20 bg-transparent"
                                }`}
                            />
                            <div className={`transition-opacity duration-500 ${done || current ? "opacity-100" : "opacity-40"}`}>
                                <p className="font-medium">
                                    <span className="mr-2 font-mono text-xs text-ash">{String(i + 1).padStart(2, "0")}</span>
                                    {s.label}
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-ash">{s.detail}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

function ModelCard({ f }: { f: Flagship }) {
    return (
        <article id={f.id} className="grid scroll-mt-24 grid-cols-1 gap-10 border-t border-fg/10 pt-12">
            <div>
                <StatusTag status={f.status} />
                <h3 className="mt-4 font-display text-[clamp(1.9rem,3vw,2.6rem)] font-light leading-tight tracking-[-0.03em]">
                    {f.name}
                </h3>
                <p className="mt-3 text-lg leading-relaxed text-ink/90">{f.summary}</p>

                <dl className="mt-8 space-y-6 text-[15px]">
                    <div>
                        <dt className="text-sm text-ash">The job</dt>
                        <dd className="mt-1.5 leading-relaxed">{f.task}</dd>
                    </div>
                    <div>
                        <dt className="text-sm text-ash">What it does well</dt>
                        <dd className="mt-1.5">
                            <ul className="space-y-1.5">
                                {f.results.map((r) => (
                                    <li key={r} className="flex gap-3 leading-relaxed">
                                        <span aria-hidden="true" className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ember" />
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </dd>
                    </div>
                    {f.metrics.length > 0 && (
                        <div>
                            <dt className="text-sm text-ash">Measured</dt>
                            <dd className="mt-2 grid grid-cols-2 gap-4">
                                {f.metrics.map((m) => (
                                    <div key={m.label}>
                                        <p className="font-mono text-xl">{m.value}</p>
                                        <p className="text-xs text-ash">{m.label}</p>
                                    </div>
                                ))}
                            </dd>
                        </div>
                    )}
                    <div>
                        <dt className="text-sm text-ash">Built with</dt>
                        <dd className="mt-2 flex flex-wrap gap-2">
                            {f.stack.map((t) => (
                                <span key={t} className="rounded-md bg-fg/[0.05] px-2 py-1 font-mono text-[11px] text-ink/80">
                                    {t}
                                </span>
                            ))}
                        </dd>
                    </div>
                </dl>

                {f.link && (
                    <a
                        href={f.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-8 inline-flex items-center gap-1.5 font-medium text-ink underline decoration-inferno-3 underline-offset-[6px] hover:text-ember"
                    >
                        {f.link.label}
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                )}
            </div>

            <TraceReplay id={f.id} steps={f.trace} name={f.name} />
        </article>
    );
}

export default function Work() {
    const columnRef = useRef<HTMLDivElement>(null);

    return (
        <section id="work" className="scroll-mt-16 bg-void py-28 text-ink">
            <div className="mx-auto max-w-[1280px] px-5 lg:px-10">
                <h2 className="font-display text-[clamp(2.4rem,5vw,4rem)] font-light leading-[1] tracking-[-0.04em]">
                    Three systems, opened up
                </h2>
                <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-ash">
                    What each one is for, what it does well, and a replay of a request moving through it.
                </p>

                {/* Desktop: the system diagrams stay pinned while the project cards scroll past, following
                    the card in view. Phones: the same panel, after the cards. */}
                <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
                    <div ref={columnRef} className="space-y-24">
                        {flagships.map((f) => (
                            <ModelCard key={f.id} f={f} />
                        ))}
                    </div>
                    <div>
                        <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:[scrollbar-width:thin]">
                            <SystemsPanel columnRef={columnRef} />
                        </div>
                    </div>
                </div>

                <div className="mt-28">
                    <h3 id="work-index" className="scroll-mt-24 font-display text-2xl font-light tracking-[-0.02em]">Everything else</h3>
                    <ul className="mt-6 border-t border-fg/10">
                        {workIndex.map((w) => {
                            const row = (
                                <>
                                    <div className="min-w-0">
                                        <p className="font-medium">{w.name}</p>
                                        <p className="mt-0.5 text-sm text-ash">{w.line}</p>
                                    </div>
                                    <div className="flex items-center gap-4 md:contents">
                                        <StatusTag status={w.status} />
                                        <p className="hidden font-mono text-[11px] text-ash md:block">{w.stack.join(", ")}</p>
                                    </div>
                                    {w.href ? (
                                        <ArrowUpRight className="hidden h-4 w-4 text-ash transition-colors group-hover:text-ember md:block" aria-hidden="true" />
                                    ) : (
                                        <span className="hidden md:block" />
                                    )}
                                </>
                            );
                            const rowClass =
                                "grid grid-cols-1 gap-3 border-b border-fg/10 py-5 md:grid-cols-[minmax(0,1fr)_8.5rem_14rem_1.5rem] md:items-center md:gap-6";
                            return (
                                <li key={w.name}>
                                    {w.href ? (
                                        <a
                                            href={w.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`group ${rowClass} transition-colors hover:bg-fg/[0.02]`}
                                        >
                                            {row}
                                        </a>
                                    ) : (
                                        <div className={rowClass}>{row}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-fg/10 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="max-w-[40rem]">
                            <p className="flex items-center gap-2.5 font-medium">
                                <Lock className="h-4 w-4 text-ember" aria-hidden="true" />
                                Plus work I can&apos;t show here
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-ash">
                                Production systems for my employer and for clients are private or under confidentiality agreements.
                                I&apos;m happy to walk through the problem, the approach and the stack in a conversation, without names.
                            </p>
                        </div>
                        <a
                            href="#contact"
                            className="inline-flex shrink-0 items-center gap-1.5 font-medium underline decoration-inferno-3 underline-offset-[6px] transition-colors hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
                        >
                            Ask about it
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

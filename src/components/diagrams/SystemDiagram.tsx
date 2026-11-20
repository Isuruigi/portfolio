"use client";

// One architecture diagram: real-logo nodes on a 5×3 grid, a request packet that travels the flow
// step by step (with a running latency/cost counter when the talk gives numbers), and every node
// explorable on hover or tap: what it does, its trade-off, and the moment in the talk that says so.
// Narrow screens get the same flow as a vertical list.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { Logo } from "@/components/diagrams/logos";
import type { DiagramSpec, DiagramNode } from "@/lib/data/diagrams";

const W = 1000;
const H = 600;
const ROW_Y = [108, 300, 492];
const colX = (col: number) => ((col + 0.5) / 5) * W;
const pos = (n: DiagramNode) => ({ x: colX(n.col), y: ROW_Y[n.row] ?? 300 });

// The visitor's reduced-motion setting, read without a render/effect round trip
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb: () => void) => {
    const mq = matchMedia(MOTION_QUERY);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
};

// The 3D stage (three.js) loads only when a diagram is first shown in 3D
const ArchStage3D = dynamic(() => import("@/components/diagrams/arch3d/ArchStage3D"), {
    ssr: false,
    loading: () => <div className="absolute inset-0 animate-pulse rounded-2xl bg-fg/[0.03]" />,
});

const STEP_MS = 1900; // time on each step, packet travel included
const TRAVEL_MS = 750;
const LOOP_PAUSE_MS = 2600;

/** YouTube link that opens the talk at a "mm:ss" (or "h:mm:ss") timestamp */
export function talkAt(url: string, cite?: string) {
    if (!cite) return url;
    const secs = cite.split(":").reduce((acc, p) => acc * 60 + Number(p || 0), 0);
    return `${url}${url.includes("?") ? "&" : "?"}t=${secs}s`;
}

type Source = DiagramSpec["sources"][number];

/** Where a node's or takeaway's citation points: the moment in the talk, or the file in the repo */
function citeHref(src: Source | undefined, cite?: string) {
    if (!src || !cite || !src.url) return null;
    if (src.kind === "repo") return `${src.url.replace(/\/$/, "")}/blob/${src.branch ?? "HEAD"}/${cite.replace(/^\//, "")}`;
    if (src.kind === "project") return null;
    return talkAt(src.url, cite);
}

/** A gentle curve between two points: horizontal-ish tangents for the same row, vertical for column hops */
function curve(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
        const k = dx * 0.45;
        return `M ${a.x} ${a.y} C ${a.x + k} ${a.y}, ${b.x - k} ${b.y}, ${b.x} ${b.y}`;
    }
    const k = dy * 0.45;
    return `M ${a.x} ${a.y} C ${a.x} ${a.y + k}, ${b.x} ${b.y - k}, ${b.x} ${b.y}`;
}

interface Props {
    spec: DiagramSpec;
    /** Animate only while on screen */
    playing: boolean;
    /** "flat": the light SVG diagram (default); "city" / "holo": the optional 3D stage (loads three.js) */
    view?: "city" | "holo" | "flat";
    /** Drive the walk from outside (a scroll story) instead of the built-in timer */
    step?: number;
    /** Just the stage: no title, status bar, takeaways or source line */
    compact?: boolean;
}

export default function SystemDiagram({ spec, playing, view = "flat", step: controlledStep, compact = false }: Props) {
    const [ownStep, setStep] = useState(0);
    const controlled = controlledStep !== undefined;
    const [focus, setFocus] = useState<string | null>(null); // a node being explored
    const [pinned, setPinned] = useState(false); // explored by tap/click: stays until dismissed
    const [userPaused, setUserPaused] = useState<boolean | null>(null); // null: not chosen yet
    const [narrow, setNarrow] = useState(false);
    const [glFailed, setGlFailed] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const reducedMotion = useSyncExternalStore(subscribeMotion, () => matchMedia(MOTION_QUERY).matches, () => false);

    const byId = useMemo(() => new Map(spec.nodes.map((n) => [n.id, n])), [spec]);
    const flow = useMemo(() => spec.flow.filter((s) => byId.has(s.node)), [spec, byId]);
    const step = controlled ? Math.max(0, Math.min(flow.length - 1, controlledStep)) : ownStep;
    const current = flow[step];

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 560));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // The walk: one step at a time, a longer rest at the end, then round again
    // Reduced motion: nothing moves until the visitor presses play
    const paused = userPaused ?? reducedMotion;
    const running = controlled ? playing && !reducedMotion : playing && !paused && !focus;
    useEffect(() => {
        if (controlled || !running || flow.length === 0) return;
        const last = step >= flow.length - 1;
        const t = setTimeout(() => setStep((s) => (s + 1) % flow.length), last ? STEP_MS + LOOP_PAUSE_MS : STEP_MS);
        return () => clearTimeout(t);
    }, [controlled, running, step, flow.length]);

    // Running total of the metric up to this step (latency budget, cost…)
    const total = useMemo(() => flow.slice(0, step + 1).reduce((acc, s) => acc + (s.ms ?? 0), 0), [flow, step]);
    const hasNumbers = Boolean(spec.metric) && flow.filter((s) => typeof s.ms === "number").length >= 2;

    const visited = new Set(flow.slice(0, step + 1).map((s) => s.node));
    const segment = step > 0 ? { from: flow[step - 1].node, to: flow[step].node } : null;
    const explored = focus ? byId.get(focus) : null;
    const source = spec.sources[0];
    const srcOf = (i?: number) => spec.sources[i ?? 0] ?? source;

    const explore = (id: string, pin: boolean) => {
        setFocus(id);
        if (pin) setPinned(true);
    };
    const leave = () => !pinned && setFocus(null);
    const close = () => {
        setPinned(false);
        setFocus(null);
    };

    const isTalk = !source?.kind || source.kind === "talk";
    const flowIds = useMemo(() => flow.map((s) => s.node), [flow]);
    const use3d = view !== "flat" && !glFailed;

    const segPath = segment && byId.get(segment.from) && byId.get(segment.to) ? curve(pos(byId.get(segment.from)!), pos(byId.get(segment.to)!)) : null;

    return (
        <div ref={boxRef} className="flex h-full min-h-0 flex-col">
            {!compact && (
                <div>
                    <h3 className="font-display text-[1.35rem] font-light leading-tight tracking-[-0.02em] text-ink">{spec.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ash">{spec.subtitle}</p>
                </div>
            )}

            {!narrow ? (
                /* ---------------- the diagram ---------------- */
                <div className={`relative mt-4 w-full select-none ${use3d ? "aspect-[1000/590]" : "aspect-[1000/600]"}`} onPointerLeave={leave}>
                    {use3d ? (
                        <ArchStage3D
                            spec={spec}
                            style={view === "holo" ? "holo" : "city"}
                            flowIds={flowIds}
                            step={step}
                            animate={running}
                            playing={playing}
                            reducedMotion={reducedMotion}
                            focus={focus}
                            current={current?.node ?? null}
                            visited={visited}
                            onEnter={(id) => explore(id, false)}
                            onLeave={leave}
                            onClickNode={(id) => (pinned && focus === id ? close() : explore(id, true))}
                            onBackground={close}
                            onFail={() => setGlFailed(true)}
                        />
                    ) : (
                    <>
                    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full text-ink" aria-hidden="true">
                        <defs>
                            <radialGradient id={`pk-${spec.domain}`}>
                                <stop offset="0%" stopColor="#fcffa4" />
                                <stop offset="45%" stopColor="#fca50a" />
                                <stop offset="100%" stopColor="#fca50a" stopOpacity="0" />
                            </radialGradient>
                        </defs>
                        {/* faint grid, like graph paper */}
                        {[0, 1, 2, 3, 4].map((c) => (
                            <line key={`c${c}`} x1={colX(c)} y1={30} x2={colX(c)} y2={H - 30} stroke="currentColor" strokeOpacity={0.05} />
                        ))}
                        {spec.edges.map((e, i) => {
                            const a = byId.get(e.from);
                            const b = byId.get(e.to);
                            if (!a || !b) return null;
                            const lit = visited.has(e.from) && visited.has(e.to);
                            const near = focus && (e.from === focus || e.to === focus);
                            const d = curve(pos(a), pos(b));
                            const pa = pos(a);
                            const pb = pos(b);
                            return (
                                <g key={i}>
                                    <path d={d} fill="none" stroke={near ? "#fca50a" : lit ? "rgba(252,165,10,0.35)" : "currentColor"} strokeOpacity={near || lit ? 1 : 0.16} strokeWidth={near ? 2 : 1.5} strokeDasharray={lit || near ? undefined : "4 6"} className="transition-[stroke] duration-500" />
                                    {/* the travelled path carries a slow-moving ember current */}
                                    {lit && !reducedMotion && <path d={d} fill="none" stroke="#fca50a" strokeWidth={1.6} strokeLinecap="round" className="diagram-current" />}
                                    {e.label && near && (
                                        <text x={(pa.x + pb.x) / 2} y={(pa.y + pb.y) / 2 - 8} textAnchor="middle" className="fill-ash font-mono" fontSize="13">
                                            {e.label}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                        {/* the request packet, travelling this step's segment */}
                        {segPath && running && !reducedMotion && (
                            <circle key={`${spec.domain}-${step}`} r="13" fill={`url(#pk-${spec.domain})`}>
                                <animateMotion dur={`${TRAVEL_MS}ms`} path={segPath} fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
                            </circle>
                        )}
                    </svg>

                    {spec.nodes.map((n) => {
                        const p = pos(n);
                        const isCurrent = current?.node === n.id;
                        const isFocus = focus === n.id;
                        return (
                            <button
                                key={n.id}
                                type="button"
                                onPointerEnter={(e) => e.pointerType === "mouse" && explore(n.id, false)}
                                onFocus={() => explore(n.id, false)}
                                onBlur={leave}
                                onClick={() => (pinned && focus === n.id ? close() : explore(n.id, true))}
                                aria-label={`${n.label}${n.tool ? `, ${n.tool}` : ""}: ${n.role}`}
                                aria-pressed={isFocus}
                                style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
                                className={`absolute flex w-[16.5%] -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center backdrop-blur-sm transition-[border-color,background-color,box-shadow,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                                    isFocus
                                        ? "z-20 scale-[1.04] border-ember bg-ember-tint shadow-[0_0_0_4px_rgba(252,165,10,0.12),0_12px_40px_-10px_rgba(252,165,10,0.45)]"
                                        : isCurrent
                                          ? "z-10 border-ember/80 bg-ember-tint shadow-[0_0_28px_-6px_rgba(252,165,10,0.55)]"
                                          : visited.has(n.id)
                                            ? "border-ember/30 bg-surface"
                                            : "border-fg/10 bg-surface hover:border-fg/25"
                                }`}
                            >
                                <Logo name={n.tool} size={24} />
                                <span className="text-[12px] font-medium leading-tight text-ink">{n.label}</span>
                                {n.tool && <span className="font-mono text-[9.5px] leading-none text-ash">{n.tool}</span>}
                            </button>
                        );
                    })}
                    </>
                    )}

                    {/* What the hovered or tapped node does */}
                    {explored && (
                        <div
                            role="dialog"
                            aria-label={`${explored.label} details`}
                            className={`absolute z-30 w-[46%] rounded-2xl border border-ember/40 bg-surface/95 p-4 text-left shadow-2xl backdrop-blur-md ${
                                explored.row === 2 ? "bottom-[30%]" : "top-[30%]"
                            } ${explored.col >= 3 ? "left-[2%]" : "right-[2%]"}`}
                            onPointerEnter={() => setFocus(explored.id)}
                        >
                            <div className="flex items-start gap-3">
                                <Logo name={explored.tool} size={28} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-medium leading-tight text-ink">{explored.label}</p>
                                    <p className="mt-0.5 font-mono text-[11px] text-ash">
                                        {explored.tool ? `${explored.tool} · ` : ""}
                                        {explored.role}
                                    </p>
                                </div>
                                {pinned && (
                                    <button type="button" onClick={close} className="-mr-1 -mt-1 cursor-pointer rounded-full px-2 text-ash hover:text-ink" aria-label="Close">
                                        ×
                                    </button>
                                )}
                            </div>
                            <p className="mt-3 text-[13px] leading-relaxed text-ink/90">{explored.detail}</p>
                            {explored.tradeoff && (
                                <p className="mt-2 border-l-2 border-ember/60 pl-3 text-[13px] leading-relaxed text-ash">{explored.tradeoff}</p>
                            )}
                            {citeHref(srcOf(explored.src), explored.cite) && (
                                <a href={citeHref(srcOf(explored.src), explored.cite)!} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1 font-mono text-[11px] text-ember hover:underline">
                                    <span className="truncate">
                                        {srcOf(explored.src).kind === "repo"
                                            ? `See it in the code: ${explored.cite}`
                                            : `Hear it in the talk at ${explored.cite}${spec.sources.length > 1 ? ` (${srcOf(explored.src).org})` : ""}`}
                                    </span>
                                    <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                                </a>
                            )}
                            {isTalk && explored.toolFromTalk === false && explored.tool && (
                                <p className="mt-2 font-mono text-[10px] text-ash/70">{explored.tool} is a common choice here, not named in the talk.</p>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* ---------------- narrow screens: the same flow, top to bottom ---------------- */
                <ol className="relative mt-4 space-y-2 border-l border-fg/10 pl-4">
                    {flow.map((s, i) => {
                        const n = byId.get(s.node)!;
                        const isCurrent = i === step;
                        const open = focus === n.id && pinned;
                        return (
                            <li key={`${s.node}-${i}`}>
                                <button
                                    type="button"
                                    onClick={() => (open ? close() : (setStep(i), explore(n.id, true)))}
                                    aria-expanded={open}
                                    className={`relative w-full cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors ${
                                        isCurrent ? "border-ember/70 bg-ember-tint" : i < step ? "border-ember/20 bg-surface" : "border-fg/10 bg-surface"
                                    }`}
                                >
                                    <span className={`absolute -left-[22px] top-4 h-2.5 w-2.5 rounded-full ${isCurrent ? "bg-ember shadow-[0_0_10px_rgba(252,165,10,0.9)]" : i < step ? "bg-ember/50" : "bg-fg/20"}`} aria-hidden="true" />
                                    <span className="flex items-center gap-2.5">
                                        <Logo name={n.tool} size={20} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[13px] font-medium text-ink">{n.label}</span>
                                            <span className="block text-[12px] leading-snug text-ash">{s.text}</span>
                                        </span>
                                        {typeof s.ms === "number" && <span className="shrink-0 font-mono text-[11px] text-ember">{s.ms} ms</span>}
                                    </span>
                                    {open && (
                                        <span className="mt-2 block border-t border-fg/10 pt-2 text-[12.5px] leading-relaxed text-ink/85">
                                            {n.detail}
                                            {n.tradeoff && <span className="mt-1.5 block border-l-2 border-ember/60 pl-2.5 text-ash">{n.tradeoff}</span>}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ol>
            )}

            {!compact && (
                <>
            {/* The step being shown, and the running total */}
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-fg/10 bg-fg/[0.02] px-3 py-2.5" aria-live="polite">
                <button
                    type="button"
                    onClick={() => setUserPaused(!paused)}
                    aria-label={paused ? "Play the flow" : "Pause the flow"}
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-fg/15 text-ash hover:border-ember hover:text-ember"
                >
                    {paused || focus ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
                <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink/90">
                    <span className="mr-2 font-mono text-[11px] text-ash">
                        {String(step + 1).padStart(2, "0")}/{String(flow.length).padStart(2, "0")}
                    </span>
                    {current?.text}
                </p>
                {hasNumbers && (
                    <p className="shrink-0 text-right font-mono text-[11px] leading-tight text-ash">
                        <span className="block text-[15px] text-ember">
                            {total > 0 ? `${total.toLocaleString()} ${spec.metric!.unit}` : "–"}
                        </span>
                        {spec.metric!.label}
                    </p>
                )}
            </div>

            {/* What the talk teaches, and where it came from */}
            <ul className="mt-3 space-y-1.5">
                {spec.takeaways.map((t) => (
                    <li key={t.text} className="flex gap-2 text-[12.5px] leading-relaxed text-ash">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ember" aria-hidden="true" />
                        <span>
                            {t.text}{" "}
                            {citeHref(srcOf(t.src), t.cite) && (
                                <a href={citeHref(srcOf(t.src), t.cite)!} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-[10.5px] text-ember/80 hover:text-ember">
                                    {t.cite}
                                </a>
                            )}
                        </span>
                    </li>
                ))}
            </ul>
            <p className="mt-auto pt-3 text-[11px] leading-relaxed text-ash/80">
                {source?.kind === "repo" ? (
                    <>
                        My own project, drawn from its code:{" "}
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-ash underline decoration-fg/20 underline-offset-2 hover:text-ember">
                            {source.title}
                        </a>{" "}
                        on GitHub.
                    </>
                ) : source?.kind === "project" ? (
                    <>My own project, drawn from my notes: {source.title} is {source.org.toLowerCase()}.</>
                ) : (
                    <>
                        From{" "}
                        {spec.sources.map((s, i) => (
                            <span key={s.url}>
                                {i > 0 && " and "}
                                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-ash underline decoration-fg/20 underline-offset-2 hover:text-ember">
                                    {s.title}
                                </a>{" "}
                                ({s.speaker}, {s.org})
                            </span>
                        ))}{" "}
                        at AI Engineer. A general picture of this kind of system, not a diagram of a client project.
                    </>
                )}
            </p>
                </>
            )}
        </div>
    );
}

"use client";

// The field guide: every layer of an AI system, one chapter at a time, told as a scroll story.
// Each chapter has a sticky diagram that advances as you scroll through the steps beside it: the
// request moves to the next part, the path lights up, and the step explains what happens there and
// what it costs. Architectures come from frontier teams' talks and from my own builds. Pure SVG and
// CSS, so it loads instantly; the optional 3D city lives in the Work panel.
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import SystemDiagram, { talkAt } from "@/components/diagrams/SystemDiagram";
import { Logo } from "@/components/diagrams/logos";
import FieldClip from "@/components/sections/FieldClip";
import FieldEmblem from "@/components/sections/FieldEmblem";
import { FIELD_CLIPS } from "@/lib/data/fieldClips";
import { DIAGRAMS } from "@/lib/data/diagrams";
import { CHAPTERS, type Chapter } from "@/lib/data/story";

const byId = new Map(DIAGRAMS.map((d) => [d.id, d]));

/** Motion runs only while an element is on screen (.fg-live); the first sighting marks it seen (.fg-seen) */
function useLive<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => {
            el.classList.toggle("fg-live", e.isIntersecting);
            if (e.isIntersecting) el.classList.add("fg-seen");
        }, { threshold: 0.05 });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return ref;
}

function sourceLine(d: (typeof DIAGRAMS)[number]) {
    const s = d.spec.sources[0];
    if (!s) return null;
    if (s.kind === "repo") return { text: `My build · code on GitHub`, href: s.url };
    if (s.kind === "project") return { text: `My build · ${s.org.toLowerCase()}`, href: null };
    const who = d.spec.sources.map((x) => `${x.speaker} (${x.org})`).join(" and ");
    return { text: `From the AI Engineer talk by ${who}`, href: s.url };
}

function ChapterStory({ chapter, index }: { chapter: Chapter; index: number }) {
    const entries = chapter.diagrams.map((id) => byId.get(id)).filter((d): d is NonNullable<typeof d> => Boolean(d));
    const [pick, setPick] = useState(entries[0]?.id);
    const [step, setStep] = useState(0);
    const [onScreen, setOnScreen] = useState(false);
    const stageRef = useRef<HTMLDivElement>(null);
    const stepsRef = useRef<HTMLOListElement>(null);
    const liveRef = useLive<HTMLElement>();
    const clip = FIELD_CLIPS[chapter.id];
    const current = entries.find((d) => d.id === pick) ?? entries[0];
    const spec = current?.spec;
    const nodes = new Map(spec?.nodes.map((n) => [n.id, n]) ?? []);
    const flow = spec?.flow.filter((f) => nodes.has(f.node)) ?? [];

    // The step in the middle of the screen drives the diagram
    useEffect(() => {
        const list = stepsRef.current;
        if (!list) return;
        const io = new IntersectionObserver(
            (es) => {
                for (const e of es) if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.step));
            },
            { rootMargin: "-45% 0px -45% 0px" }
        );
        list.querySelectorAll("[data-step]").forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [pick]);

    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.1 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    if (!current || !spec) return null;
    const src = sourceLine(current);
    const total = flow.slice(0, step + 1).reduce((a, f) => a + (f.ms ?? 0), 0);
    const hasNumbers = flow.filter((f) => typeof f.ms === "number").length >= 2 && spec.metric;

    const choose = (id: string) => {
        setPick(id);
        setStep(0);
        document.getElementById(`chapter-${chapter.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <article ref={liveRef} id={`chapter-${chapter.id}`} className="scroll-mt-20 border-t border-fg/10 pt-14">
            {/* chapter opening */}
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
                <div>
                {clip && (
                    <div className="relative mb-7">
                        <FieldClip base={`/media/field-guide/${chapter.id}`} webm={clip.webm} className="aspect-video rounded-3xl border border-fg/10" />
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_0_80px_rgba(0,0,0,0.35)]" />
                    </div>
                )}
                <div className="flex items-end gap-6">
                    <FieldEmblem id={chapter.id} size={104} />
                    <div className="min-w-0">
                        <p className="font-mono text-[12px] text-ember">
                            {String(index + 1).padStart(2, "0")} <span className="text-ash">/ {String(CHAPTERS.length).padStart(2, "0")}</span>
                        </p>
                        <h3 className="fg-title mt-3 font-display text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.02] tracking-[-0.035em]">{chapter.title}</h3>
                        <p className="mt-2 text-lg text-ink/85">{chapter.kicker}</p>
                    </div>
                </div>
                </div>
                <div>
                    <p className="text-[15px] leading-relaxed text-ash">{chapter.intro}</p>
                    <p className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ash">In my stack</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                        {chapter.stack.map((t) => (
                            <li key={t} className="flex items-center gap-1.5 rounded-full border border-fg/10 bg-surface px-2.5 py-1 text-[12px] text-ink/90">
                                <Logo name={t} size={13} />
                                {t}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* which system tells this chapter's story */}
            <div role="group" aria-label={`${chapter.title} systems`} className="-mx-1 mt-8 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                {entries.map((d) => {
                    const on = d.id === current.id;
                    const mine = d.group === "built";
                    return (
                        <button
                            key={d.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => choose(d.id)}
                            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                                on ? "bg-ember font-medium text-on-ember" : "border border-fg/10 text-ash hover:border-fg/25 hover:text-ink"
                            }`}
                        >
                            {d.tab}
                            <span className={`font-mono text-[10px] uppercase tracking-[0.08em] ${on ? "text-on-ember/75" : mine ? "text-ember" : "text-ash/70"}`}>
                                {mine ? "my build" : d.spec.org ?? d.spec.sources[0]?.org}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* the scroll story */}
            <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14">
                <div ref={stageRef} className="hidden lg:block">
                    <div className="sticky top-24 rounded-3xl border border-fg/10 bg-[radial-gradient(ellipse_at_top,rgba(66,10,104,0.12),transparent_60%)] p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-display text-[1.25rem] font-light leading-tight tracking-[-0.02em] text-ink">{spec.title}</p>
                                {spec.hook && <p className="mt-1 text-[13px] leading-relaxed text-ash">{spec.hook}</p>}
                            </div>
                            {hasNumbers && (
                                <p className="shrink-0 text-right font-mono text-[11px] leading-tight text-ash">
                                    <span className="block text-[17px] text-ember">{total > 0 ? `${total.toLocaleString()} ${spec.metric!.unit}` : "–"}</span>
                                    {spec.metric!.label}
                                </p>
                            )}
                        </div>
                        <SystemDiagram key={current.id} spec={spec} playing={onScreen} view="flat" step={step} compact />
                        {/* progress through the story */}
                        <div className="mt-3 flex gap-1" aria-hidden="true">
                            {flow.map((_, i) => (
                                <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-ember" : "bg-fg/10"}`} />
                            ))}
                        </div>
                    </div>
                </div>

                <ol ref={stepsRef} key={current.id} className="relative">
                    {flow.map((f, i) => {
                        const n = nodes.get(f.node)!;
                        const on = i === step;
                        return (
                            <li key={`${f.node}-${i}`} data-step={i} className="flex min-h-[46vh] items-center py-6 first:pt-0 lg:min-h-[62vh]">
                                <div className={`w-full rounded-2xl border p-5 transition-all duration-500 ${on ? "border-ember/60 bg-ember-tint shadow-[0_20px_60px_-30px_rgba(252,165,10,0.45)]" : "border-fg/10 bg-surface lg:opacity-55"}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-[11px] text-ash">
                                            {String(i + 1).padStart(2, "0")}/{String(flow.length).padStart(2, "0")}
                                        </span>
                                        <Logo name={n.tool} size={20} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[15px] font-medium leading-tight text-ink">{n.label}</span>
                                            <span className="block font-mono text-[10.5px] text-ash">{[n.tool, n.role].filter(Boolean).join(" · ")}</span>
                                        </span>
                                        {typeof f.ms === "number" && <span className="shrink-0 rounded-full bg-ember/15 px-2 py-0.5 font-mono text-[11px] text-ember">{f.ms} ms</span>}
                                    </div>
                                    <p className="mt-4 text-[17px] leading-snug text-ink">{f.text}</p>
                                    <p className="mt-3 text-[14px] leading-relaxed text-ash">{n.detail}</p>
                                    {n.tradeoff && <p className="mt-3 border-l-2 border-ember/60 pl-3 text-[13.5px] leading-relaxed text-ink/80">{n.tradeoff}</p>}
                                </div>
                            </li>
                        );
                    })}
                    {/* what the chapter leaves you with */}
                    <li className="pb-4 pt-2">
                        <div className="rounded-2xl border border-fg/10 p-5">
                            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ember">What this teaches</p>
                            <ul className="mt-3 space-y-2.5">
                                {spec.takeaways.map((t) => (
                                    <li key={t.text} className="flex gap-2.5 text-[14px] leading-relaxed text-ink/90">
                                        <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ember" aria-hidden="true" />
                                        <span>
                                            {t.text}
                                            {t.cite && current.spec.sources[t.src ?? 0]?.kind !== "repo" && current.spec.sources[t.src ?? 0]?.url && (
                                                <a
                                                    href={talkAt(current.spec.sources[t.src ?? 0].url, t.cite)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-1.5 whitespace-nowrap font-mono text-[11px] text-ember/80 hover:text-ember"
                                                >
                                                    {t.cite}
                                                </a>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {src && (
                                <p className="mt-4 text-[12px] text-ash">
                                    {src.href ? (
                                        <a href={src.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-fg/20 underline-offset-2 hover:text-ember">
                                            {src.text}
                                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                                        </a>
                                    ) : (
                                        src.text
                                    )}
                                </p>
                            )}
                        </div>
                    </li>
                </ol>
            </div>
        </article>
    );
}

export default function Atlas() {
    const navRef = useLive<HTMLElement>();
    const systems = CHAPTERS.reduce((a, c) => a + c.diagrams.filter((id) => byId.has(id)).length, 0);
    const teams = new Set(
        CHAPTERS.flatMap((c) => c.diagrams.map((id) => byId.get(id)).filter((d) => d && d.group === "pattern").flatMap((d) => d!.spec.sources.map((s) => s.org)))
    ).size;

    return (
        <section id="atlas" className="scroll-mt-16 bg-void py-28 text-ink" aria-labelledby="atlas-title">
            <div className="mx-auto max-w-[1280px] px-5 lg:px-10">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ember">The field guide</p>
                        <h2 id="atlas-title" className="mt-4 max-w-[48rem] font-display text-[clamp(2.4rem,5vw,4rem)] font-light leading-[1] tracking-[-0.04em]">
                            Every layer of an AI system, one scroll at a time
                        </h2>
                        <p className="mt-5 max-w-[42rem] text-lg leading-relaxed text-ash">
                            Six chapters, from retrieval to evals. Each one follows a real request through a real system as you scroll: patterns from the
                            teams at the frontier, told from their AI Engineer talks, next to the ones I built.
                        </p>
                    </div>
                    <dl className="flex gap-8 font-mono">
                        {[
                            [CHAPTERS.length, "chapters"],
                            [systems, "systems"],
                            [teams, "teams"],
                        ].map(([n, l]) => (
                            <div key={l}>
                                <dt className="sr-only">{l}</dt>
                                <dd>
                                    <span className="block text-3xl text-ink">{n}</span>
                                    <span className="text-[11px] uppercase tracking-[0.12em] text-ash">{l}</span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* chapter index */}
                <nav ref={navRef} aria-label="Chapters" className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {CHAPTERS.map((c, i) => (
                        <a
                            key={c.id}
                            href={`#chapter-${c.id}`}
                            className="group rounded-2xl border border-fg/10 bg-surface p-3.5 transition-colors hover:border-ember/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
                        >
                            <span className="flex items-start justify-between">
                                <span className="font-mono text-[11px] text-ember">{String(i + 1).padStart(2, "0")}</span>
                                <FieldEmblem id={c.id} size={40} />
                            </span>
                            <span className="mt-1 block text-[14px] font-medium leading-tight text-ink">{c.title}</span>
                            <span className="mt-1 block text-[11.5px] leading-snug text-ash">{c.diagrams.filter((id) => byId.has(id)).length} systems</span>
                        </a>
                    ))}
                </nav>

                <div className="mt-16 space-y-24">
                    {CHAPTERS.map((c, i) => (
                        <ChapterStory key={c.id} chapter={c} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}

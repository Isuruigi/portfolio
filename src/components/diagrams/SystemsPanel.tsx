"use client";

// The panel beside the Work cards: the architecture of each of my own projects, drawn from its code.
// On desktop it follows the reader: scrolling to a project card shows that project. How frontier
// teams build these kinds of systems lives in its own section, the architecture atlas (Atlas.tsx).
import { type RefObject, useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import SystemDiagram from "@/components/diagrams/SystemDiagram";
import ViewSwitch, { useArchView } from "@/components/diagrams/ViewSwitch";
import { ATLAS, BUILT } from "@/lib/data/diagrams";

const forCard = (card: string) => BUILT.find((d) => d.id === card)?.id;

interface Props {
    /** The column holding the project cards (articles with ids), to follow while scrolling */
    columnRef?: RefObject<HTMLElement | null>;
}

export default function SystemsPanel({ columnRef }: Props) {
    const [active, setActive] = useState(BUILT[0].id);
    const [onScreen, setOnScreen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const lastCard = useRef<string | null>(null);
    const view = useArchView();

    // Follow the card in the middle of the screen
    useEffect(() => {
        const column = columnRef?.current;
        if (!column) return;
        const cards = [...column.querySelectorAll<HTMLElement>("article[id]")].filter((c) => forCard(c.id));
        const io = new IntersectionObserver(
            (entries) => {
                const seen = entries.filter((e) => e.isIntersecting).map((e) => e.target.id);
                const id = seen[seen.length - 1];
                if (id && id !== lastCard.current) {
                    lastCard.current = id;
                    setActive(forCard(id)!);
                }
            },
            { rootMargin: "-45% 0px -45% 0px" }
        );
        cards.forEach((c) => io.observe(c));
        return () => io.disconnect();
    }, [columnRef]);

    // Animate only while the panel is visible
    useEffect(() => {
        const el = panelRef.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.2 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const current = BUILT.find((d) => d.id === active) ?? BUILT[0];

    return (
        <div ref={panelRef} className="flex h-full flex-col rounded-3xl border border-fg/10 bg-[radial-gradient(ellipse_at_top,rgba(66,10,104,0.14),transparent_60%)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ash">What I built · from the code</p>
                <ViewSwitch />
            </div>
            <div role="tablist" aria-label="System diagrams" className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                {BUILT.map((d) => (
                    <button
                        key={d.id}
                        type="button"
                        role="tab"
                        aria-selected={active === d.id}
                        onClick={() => setActive(d.id)}
                        className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                            active === d.id ? "bg-ember font-medium text-on-ember" : "border border-fg/10 text-ash hover:border-fg/25 hover:text-ink"
                        }`}
                    >
                        {d.tab}
                    </button>
                ))}
            </div>
            <div role="tabpanel" className="mt-4 min-h-0 flex-1">
                <SystemDiagram key={current.id} spec={current.spec} playing={onScreen} view={view} />
            </div>
            <a
                href="#atlas"
                className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-ember/30 bg-ember-tint px-4 py-3 text-[13px] text-ink transition-colors hover:border-ember/70"
            >
                <span>
                    <span className="font-medium">The field guide:</span> every layer of an AI system, with {ATLAS.length} architectures from frontier teams
                </span>
                <ArrowDown className="h-4 w-4 shrink-0 text-ember" aria-hidden="true" />
            </a>
        </div>
    );
}

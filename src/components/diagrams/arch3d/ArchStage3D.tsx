"use client";

// The 3D stage for one architecture: a WebGL canvas (engine.ts) with an HTML label per node on top.
// Labels are real buttons, so the diagram stays usable with a keyboard and a screen reader; the
// engine moves them every frame to sit under their object. Loaded only when the Work section needs it.
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Clapperboard, Map as MapIcon } from "lucide-react";
import { Logo } from "@/components/diagrams/logos";
import type { DiagramSpec } from "@/lib/data/diagrams";
import { createArchEngine, type ArchEngine, type ArchStyle, type CamMode } from "./engine";

interface Props {
    spec: DiagramSpec;
    /** city: a miniature city (night on the dark theme, day on the light one); holo: a hologram table */
    style: ArchStyle;
    flowIds: string[];
    step: number;
    /** The walk is advancing (so the packet should travel) */
    animate: boolean;
    /** The stage is on screen: render frames */
    playing: boolean;
    reducedMotion: boolean;
    focus: string | null;
    current: string | null;
    visited: Set<string>;
    onEnter: (id: string) => void;
    onLeave: () => void;
    onClickNode: (id: string) => void;
    onBackground: () => void;
    onFail: () => void;
}

export default function ArchStage3D(p: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const labels = useRef(new Map<string, HTMLElement>());
    const engine = useRef<ArchEngine | null>(null);
    const latest = useRef({ step: p.step, animate: p.animate, focus: p.focus, playing: p.playing, flowIds: p.flowIds });
    const handlers = useRef({ enter: p.onEnter, leave: p.onLeave, click: p.onClickNode, bg: p.onBackground, fail: p.onFail });
    const [cam, setCam] = useState<CamMode>(p.reducedMotion ? "overview" : "follow");
    const camRef = useRef(cam);
    const { resolvedTheme } = useTheme();
    const dark = resolvedTheme !== "light";
    const themeKnown = resolvedTheme !== undefined;

    useEffect(() => {
        handlers.current = { enter: p.onEnter, leave: p.onLeave, click: p.onClickNode, bg: p.onBackground, fail: p.onFail };
    });

    // Build the scene (again when the spec or the theme changes)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !themeKnown) return;
        let e: ArchEngine;
        try {
            e = createArchEngine(canvas, {
                spec: p.spec,
                dark,
                style: p.style,
                reducedMotion: p.reducedMotion,
                labels: labels.current,
                onHover: (id) => (id ? handlers.current.enter(id) : handlers.current.leave()),
                onSelect: (id) => (id ? handlers.current.click(id) : handlers.current.bg()),
            });
        } catch {
            handlers.current.fail();
            return;
        }
        engine.current = e;
        const l = latest.current;
        e.setStep(l.flowIds, l.step, false);
        e.setFocus(l.focus);
        e.setCamMode(camRef.current);
        e.play(l.playing);
        if (!l.playing) e.renderOnce();
        return () => {
            e.dispose();
            engine.current = null;
        };
    }, [p.spec, dark, themeKnown, p.reducedMotion, p.style]);

    useEffect(() => {
        camRef.current = cam;
        engine.current?.setCamMode(cam);
    }, [cam]);

    useEffect(() => {
        latest.current = { ...latest.current, step: p.step, animate: p.animate, flowIds: p.flowIds };
        engine.current?.setStep(p.flowIds, p.step, p.animate);
        if (!latest.current.playing) engine.current?.renderOnce();
    }, [p.step, p.animate, p.flowIds]);

    useEffect(() => {
        latest.current = { ...latest.current, focus: p.focus };
        engine.current?.setFocus(p.focus);
        if (!latest.current.playing) engine.current?.renderOnce();
    }, [p.focus]);

    useEffect(() => {
        latest.current = { ...latest.current, playing: p.playing };
        engine.current?.play(p.playing);
    }, [p.playing]);

    return (
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
            {p.spec.nodes.map((n) => {
                const isCur = p.current === n.id;
                const isFocus = p.focus === n.id;
                return (
                    <button
                        key={n.id}
                        ref={(el) => {
                            if (el) labels.current.set(n.id, el);
                            else labels.current.delete(n.id);
                        }}
                        type="button"
                        onPointerEnter={(e) => e.pointerType === "mouse" && p.onEnter(n.id)}
                        onFocus={() => p.onEnter(n.id)}
                        onBlur={p.onLeave}
                        onClick={() => p.onClickNode(n.id)}
                        aria-label={`${n.label}${n.tool ? `, ${n.tool}` : ""}: ${n.role}`}
                        aria-pressed={isFocus}
                        style={{ opacity: 0 }}
                        className={`absolute left-0 top-0 flex max-w-[150px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border py-1 pl-1.5 pr-2.5 text-left shadow-lg backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-300 will-change-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                            isFocus
                                ? "border-ember bg-ember-tint/95 shadow-[0_0_0_3px_rgba(252,165,10,0.15)]"
                                : isCur
                                  ? "border-ember/80 bg-surface/90 shadow-[0_0_22px_-6px_rgba(252,165,10,0.6)]"
                                  : p.visited.has(n.id)
                                    ? "border-ember/30 bg-surface/80"
                                    : "border-fg/15 bg-surface/75"
                        }`}
                    >
                        <Logo name={n.tool} size={15} />
                        <span className="min-w-0">
                            <span className="block truncate text-[11px] font-medium leading-tight text-ink">{n.label}</span>
                            {n.tool && <span className="block truncate font-mono text-[8.5px] leading-tight text-ash">{n.tool}</span>}
                        </span>
                    </button>
                );
            })}
            {/* Camera: follow the request like a film, or see the whole system */}
            {!p.reducedMotion && (
                <button
                    type="button"
                    onClick={() => setCam(cam === "follow" ? "overview" : "follow")}
                    className="absolute bottom-2.5 left-2.5 z-[2000] flex cursor-pointer items-center gap-1.5 rounded-full border border-fg/15 bg-surface/80 px-2.5 py-1 font-mono text-[10px] text-ink backdrop-blur-md transition-colors hover:border-ember/60 hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
                    aria-label={cam === "follow" ? "Show the whole system" : "Follow the request"}
                >
                    {cam === "follow" ? <MapIcon className="h-3 w-3" aria-hidden="true" /> : <Clapperboard className="h-3 w-3" aria-hidden="true" />}
                    {cam === "follow" ? "Whole system" : "Follow the request"}
                </button>
            )}
        </div>
    );
}

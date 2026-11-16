"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Layers } from "lucide-react";
import type { LabScene } from "./labScene";

export interface LabStation {
    id: string;
    name: string;
}

interface Props {
    // The column of model cards the camera follows as it scrolls
    columnRef: RefObject<HTMLElement | null>;
    stations: LabStation[];
}

type Status = "idle" | "loading" | "ready" | "unsupported";

export default function AxonLab({ columnRef, stations }: Props) {
    const stageRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<LabScene | null>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [exploded, setExploded] = useState(false);
    const [active, setActive] = useState(0);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        // Phones never load it: the lab is display:none below lg, so it never comes into
        // view. Relying on visibility (not a one-off width check) also covers a window
        // that opens narrow and is widened later.

        let cancelled = false;
        let cleanup = () => {};

        const load = async () => {
            setStatus("loading");
            const probe = document.createElement("canvas");
            if (!probe.getContext("webgl2") && !probe.getContext("webgl")) {
                setStatus("unsupported");
                return;
            }
            const { createLabScene } = await import("./labScene");
            if (cancelled) return;
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const lab = createLabScene(stage, reduced);
            sceneRef.current = lab;
            lab.resize();
            setStatus("ready");

            // Scroll position through the cards drives the camera
            const onScroll = () => {
                const column = columnRef.current;
                if (!column) return;
                const rect = column.getBoundingClientRect();
                const mid = window.innerHeight * 0.5;
                const p = Math.min(1, Math.max(0, (mid - rect.top) / rect.height));
                const cards = stations.map((s) => document.getElementById(s.id));
                const stops = cards.map((card) =>
                    card ? (card.offsetTop - column.offsetTop + card.offsetHeight * 0.4) / column.offsetHeight : 0
                );
                lab.setProgress(p, stops);
                let nearest = 0;
                stops.forEach((s, i) => Math.abs(p - s) < Math.abs(p - stops[nearest]) && (nearest = i));
                setActive(nearest);
            };
            const onTrace = (e: Event) => {
                const { id, step } = (e as CustomEvent<{ id: string; step: number }>).detail;
                lab.setTraceStep(id, step);
            };
            const onPointer = (e: PointerEvent) => {
                const r = stage.getBoundingClientRect();
                lab.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
            };
            const resizer = new ResizeObserver(() => lab.resize());
            resizer.observe(stage);
            const visibility = new IntersectionObserver(([entry]) => lab.setRunning(entry.isIntersecting && !document.hidden));
            visibility.observe(stage);
            const onHidden = () => lab.setRunning(!document.hidden);

            window.addEventListener("scroll", onScroll, { passive: true });
            window.addEventListener("trace-step", onTrace);
            stage.addEventListener("pointermove", onPointer);
            document.addEventListener("visibilitychange", onHidden);
            onScroll();

            cleanup = () => {
                window.removeEventListener("scroll", onScroll);
                window.removeEventListener("trace-step", onTrace);
                stage.removeEventListener("pointermove", onPointer);
                document.removeEventListener("visibilitychange", onHidden);
                resizer.disconnect();
                visibility.disconnect();
                lab.dispose();
                sceneRef.current = null;
            };
        };

        // Start loading three.js a little before the lab scrolls into view
        const nearby = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    nearby.disconnect();
                    load();
                }
            },
            { rootMargin: "600px 0px" }
        );
        nearby.observe(stage);

        return () => {
            cancelled = true;
            nearby.disconnect();
            cleanup();
        };
    }, [columnRef, stations]);

    const toggle = () => {
        const next = !exploded;
        setExploded(next);
        sceneRef.current?.setExploded(next);
    };

    return (
        <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_30%,rgba(66,10,104,0.25),transparent_70%)]">
            <div ref={stageRef} className="absolute inset-0" aria-hidden="true" />

            {/* Which station the camera is at */}
            <ol className="pointer-events-none absolute left-5 top-5 flex gap-4 text-xs" aria-label="Lab stations">
                {stations.map((s, i) => (
                    <li key={s.id} className={`flex items-center gap-2 transition-colors ${i === active ? "text-ink" : "text-ash/60"}`}>
                        <span className="font-mono text-[10px]">{String(i + 1).padStart(2, "0")}</span>
                        {s.name}
                    </li>
                ))}
            </ol>

            {status === "loading" && (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-ash">Building the lab…</p>
            )}
            {status === "unsupported" && (
                <p className="absolute inset-0 flex items-center justify-center px-10 text-center text-sm text-ash">
                    This browser can&apos;t draw the 3D lab. The model cards beside it have everything.
                </p>
            )}

            <p className="pointer-events-none absolute right-5 top-5 text-xs text-ash/70">Scroll to walk through</p>

            <div className="absolute bottom-5 left-5">
                <button
                    type="button"
                    onClick={toggle}
                    aria-pressed={exploded}
                    disabled={status !== "ready"}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-ember/50 bg-void/70 px-4 py-2 text-sm text-ink backdrop-blur transition-colors hover:border-ember hover:text-ember focus-visible:outline-2 focus-visible:outline-ember disabled:cursor-default disabled:opacity-40"
                >
                    <Layers className="h-4 w-4" aria-hidden="true" />
                    {exploded ? "Put it back together" : "Take it apart"}
                </button>
            </div>
        </div>
    );
}

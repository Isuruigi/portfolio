"use client";

// Axon's guided tour. Started with startTour() (console starter, Hero link). Axon asks who is
// visiting, then walks the page: scrolls each stop into view, rings it with a highlight, and says
// its line (typed out, and spoken in Axon's ElevenLabs voice if the visitor turns sound on).
// It moves on by itself; hovering the card, scrolling the page yourself, or Pause stops that.
// The last stop hands over to the console in the mode that fits the visitor.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import AxonFace, { type FaceState } from "@/components/chat/AxonFace";
import { AGENT_NAME, openAgentMode, TOUR_EVENT } from "@/lib/agent";
import { TOURS, type Persona } from "@/lib/data/tour";
import TOUR_VOICE from "@/lib/data/tour-voice.json";

const CHARS_PER_SECOND = 42;
const HOLD_MS = 4200; // after a line finishes, before moving on

export default function AxonTour() {
    const [active, setActive] = useState(false);
    const [persona, setPersona] = useState<Persona | null>(null);
    const [index, setIndex] = useState(0); // stops.length = the closing card
    const [shown, setShown] = useState(0); // characters of the line revealed so far
    const [paused, setPaused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [sound, setSound] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [progress, setProgress] = useState(0);
    const ringRef = useRef<HTMLDivElement>(null);
    const targetRef = useRef<Element | null>(null);
    const autoScroll = useRef(false);
    const reduced = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const tour = persona ? TOURS[persona] : null;
    const atEnd = tour ? index >= tour.stops.length : false;
    const line = tour ? (atEnd ? tour.end.line : tour.stops[index].line) : "";
    const typing = shown < line.length;

    const stop = useCallback(() => {
        setActive(false);
        setPersona(null);
        setIndex(0);
        audioRef.current?.pause();
        delete document.documentElement.dataset.tour;
    }, []);

    // Start from anywhere: window event
    useEffect(() => {
        reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const onStart = (e: Event) => {
            const p = (e as CustomEvent<Persona | undefined>).detail;
            setActive(true);
            setPersona(p && TOURS[p] ? p : null);
            setIndex(0);
            setPaused(false);
            document.documentElement.dataset.tour = "on";
        };
        addEventListener(TOUR_EVENT, onStart);
        return () => removeEventListener(TOUR_EVENT, onStart);
    }, []);

    // Each stop: scroll to it and start typing its line
    useEffect(() => {
        if (!active || !tour) return;
        setShown(reduced.current ? line.length : 0);
        setProgress(0);
        const el = atEnd ? null : document.querySelector(tour.stops[index].target);
        targetRef.current = el;
        if (el) {
            autoScroll.current = true;
            const tall = el.getBoundingClientRect().height > innerHeight * 0.6;
            el.scrollIntoView({ behavior: reduced.current ? "auto" : "smooth", block: tall ? "start" : "center" });
            setTimeout(() => (autoScroll.current = false), 1200);
        }
    }, [active, tour, index, atEnd, line.length]);

    // Type the line out
    useEffect(() => {
        if (!active || !typing) return;
        const t = setTimeout(() => setShown((n) => Math.min(line.length, n + 2)), 2000 / CHARS_PER_SECOND);
        return () => clearTimeout(t);
    }, [active, typing, shown, line.length]);

    // Say it, if sound is on: Axon's ElevenLabs voice, recorded ahead of time (scripts/build-tour-voice.mjs).
    // A line without a recording is simply not spoken; there is no robotic fallback.
    useEffect(() => {
        if (!active || !tour || !sound) return;
        const src = (TOUR_VOICE as Record<string, string>)[line];
        if (!src) return;
        const a = audioRef.current ?? new Audio();
        audioRef.current = a;
        a.src = src;
        a.onplaying = () => setSpeaking(true);
        a.onended = a.onerror = a.onpause = () => setSpeaking(false);
        a.play().catch(() => setSpeaking(false));
        // warm the next line so it starts without a gap
        const next = atEnd ? null : index + 1 < tour.stops.length ? tour.stops[index + 1].line : tour.end.line;
        const nextSrc = next ? (TOUR_VOICE as Record<string, string>)[next] : null;
        if (nextSrc) {
            const pre = new Audio();
            pre.preload = "auto";
            pre.src = nextSrc;
        }
        return () => {
            a.pause();
            setSpeaking(false);
        };
    }, [active, tour, index, sound, line, atEnd]);

    // Move on by itself once the line (and the voice) is done
    const holding = active && !!tour && !atEnd && !typing && !speaking && !paused && !hovered;
    useEffect(() => {
        if (!holding) return;
        const started = performance.now() - progress * HOLD_MS;
        let raf = 0;
        const tick = () => {
            const p = Math.min(1, (performance.now() - started) / HOLD_MS);
            setProgress(p);
            if (p >= 1) setIndex((i) => i + 1);
            else raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- progress is read once to resume where it paused
    }, [holding, index]);

    // The highlight ring follows its target while the page scrolls
    useEffect(() => {
        if (!active) return;
        let raf = 0;
        const follow = () => {
            const ring = ringRef.current;
            const el = targetRef.current;
            if (ring) {
                if (el) {
                    const r = el.getBoundingClientRect();
                    const pad = 12;
                    const top = Math.max(r.top - pad, 8);
                    const bottom = Math.min(r.bottom + pad, innerHeight - 8);
                    ring.style.opacity = bottom - top > 24 ? "1" : "0";
                    ring.style.transform = `translate(${r.left - pad}px, ${top}px)`;
                    ring.style.width = `${r.width + pad * 2}px`;
                    ring.style.height = `${Math.max(0, bottom - top)}px`;
                } else ring.style.opacity = "0";
            }
            raf = requestAnimationFrame(follow);
        };
        raf = requestAnimationFrame(follow);
        return () => cancelAnimationFrame(raf);
    }, [active]);

    // Scrolling the page yourself pauses the tour; it doesn't fight you
    useEffect(() => {
        if (!active) return;
        const onWheel = () => !autoScroll.current && setPaused(true);
        addEventListener("wheel", onWheel, { passive: true });
        addEventListener("touchmove", onWheel, { passive: true });
        return () => {
            removeEventListener("wheel", onWheel);
            removeEventListener("touchmove", onWheel);
        };
    }, [active]);

    // Keys: arrows to step, space to pause, Escape to leave
    useEffect(() => {
        if (!active || !tour) return;
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement;
            if (el?.closest("input, textarea, select, [contenteditable]")) return;
            if (e.key === "Escape") stop();
            else if (e.key === "ArrowRight") setIndex((i) => Math.min(tour.stops.length, i + 1));
            else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
            else return;
            e.preventDefault();
        };
        addEventListener("keydown", onKey);
        return () => removeEventListener("keydown", onKey);
    }, [active, tour, stop]);

    const finish = () => {
        if (!tour) return;
        const mode = tour.end.mode;
        stop();
        openAgentMode(mode);
    };

    const face: FaceState = !tour ? "listening" : atEnd && !typing && !speaking ? "happy" : typing || speaking ? "speaking" : "idle";

    return (
        <AnimatePresence>
            {active && (
                <>
                    <div
                        ref={ringRef}
                        aria-hidden="true"
                        className="pointer-events-none fixed left-0 top-0 z-[55] rounded-2xl border border-ember/70 opacity-0 shadow-[0_0_0_9999px_rgba(0,0,4,0.35),0_0_40px_rgba(252,165,10,0.25)] transition-[opacity,transform,width,height] duration-500 ease-out"
                    />
                    <motion.div
                        role="dialog"
                        aria-label={`${AGENT_NAME}'s tour`}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ type: "spring", stiffness: 380, damping: 34 }}
                        onPointerEnter={() => setHovered(true)}
                        onPointerLeave={() => setHovered(false)}
                        onFocus={() => setHovered(true)}
                        onBlur={() => setHovered(false)}
                        className="fixed inset-x-3 bottom-3 z-[58] mx-auto max-w-[460px] rounded-3xl border border-fg/10 bg-surface/95 p-4 text-ink shadow-[0_30px_80px_-20px_rgba(221,81,58,0.35)] backdrop-blur-xl sm:bottom-6"
                    >
                        <div className="flex items-start gap-3">
                            <AxonFace size={44} state={face} />
                            <div className="min-w-0 flex-1">
                                {!tour ? (
                                    <>
                                        <p className="text-[15px] leading-relaxed">Hi, I&apos;m {AGENT_NAME}. Who&apos;s visiting? I&apos;ll show you the parts that matter to you.</p>
                                        <div className="mt-3 grid gap-2">
                                            {(Object.keys(TOURS) as Persona[]).map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setPersona(p)}
                                                    className="cursor-pointer rounded-2xl border border-fg/10 px-3.5 py-2.5 text-left transition-colors hover:border-ember/60 hover:bg-fg/[0.04] focus-visible:outline-2 focus-visible:outline-ember"
                                                >
                                                    <span className="block text-sm font-medium">{TOURS[p].label}</span>
                                                    <span className="block text-xs text-ash">{TOURS[p].hint}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="min-h-[4.5rem] text-[15px] leading-relaxed" aria-live="polite">
                                            {line.slice(0, shown)}
                                            {typing && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-ember motion-safe:animate-pulse" aria-hidden="true" />}
                                        </p>
                                        {atEnd && !typing && (
                                            <button
                                                type="button"
                                                onClick={finish}
                                                className="mt-3 cursor-pointer rounded-full bg-ember px-4 py-2 text-sm font-medium text-on-ember transition-colors hover:bg-inferno-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
                                            >
                                                {tour.end.cta}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                            <button type="button" onClick={stop} aria-label="End the tour" className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ash hover:bg-fg/10 hover:text-ink">
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>

                        {tour && (
                            <div className="mt-3 flex items-center gap-2 border-t border-fg/10 pt-3">
                                <div className="flex flex-1 items-center gap-1.5" aria-label={`Stop ${Math.min(index + 1, tour.stops.length + 1)} of ${tour.stops.length + 1}`}>
                                    {[...tour.stops, null].map((_, i) => (
                                        <span key={i} className="relative h-1 flex-1 overflow-hidden rounded-full bg-fg/10">
                                            <span
                                                className="absolute inset-y-0 left-0 rounded-full bg-ember"
                                                style={{ width: i < index ? "100%" : i === index ? `${(atEnd ? 1 : progress) * 100}%` : "0%" }}
                                            />
                                        </span>
                                    ))}
                                </div>
                                <TourButton label="Previous stop" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
                                    <ArrowLeft className="h-4 w-4" />
                                </TourButton>
                                <TourButton label={paused ? "Resume" : "Pause"} onClick={() => setPaused((p) => !p)} disabled={atEnd}>
                                    {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                                </TourButton>
                                <TourButton label={sound ? "Mute narration" : "Read it aloud"} onClick={() => setSound((s) => !s)} pressed={sound}>
                                    {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                </TourButton>
                                <TourButton label="Next stop" onClick={() => setIndex((i) => Math.min(tour.stops.length, i + 1))} disabled={atEnd}>
                                    <ArrowRight className="h-4 w-4" />
                                </TourButton>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function TourButton({ label, onClick, disabled, pressed, children }: { label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={pressed}
            title={label}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ash transition-colors hover:bg-fg/10 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent aria-pressed:text-ember"
        >
            {children}
        </button>
    );
}

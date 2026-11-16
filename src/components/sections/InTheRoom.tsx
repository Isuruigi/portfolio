"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ScanFace } from "lucide-react";
import detections from "@/lib/data/detections.json";

// The three strongest photos from teaching and events: sharp, well lit, and Isuru clearly in frame.
// Captions describe only what the photo shows; event names come from the album and the banners in shot.

interface Photo {
    id: keyof typeof detections;
    src: string;
    alt: string;
    caption: string;
    date: string;
}

interface Detection {
    label: string;
    score: number;
    box: number[];
}

const feature: Photo = {
    id: "lab-helping",
    src: "/assets/room/lab-helping.webp",
    alt: "Isuru standing beside learners at their laptops during a lab session",
    caption: "Unblocking learners at their laptops, Agentic AI Bootcamp",
    date: "31 Oct 2026",
};

const side: Photo[] = [
    {
        id: "lab-wide",
        src: "/assets/room/lab-wide.webp",
        alt: "Isuru presenting at a standing table to a room of learners working on laptops, code projected on the wall",
        caption: "Saturday lab, Buildr Labs",
        date: "31 Oct 2026",
    },
    {
        id: "build-with-ai-2026",
        src: "/assets/room/build-with-ai-2026.webp",
        alt: "Group photo of attendees beside a large Google logo and a Buildr Labs banner",
        caption: "Build with AI 2026, Colombo",
        date: "25 Jul 2026",
    },
];

const EASE = [0.22, 1, 0.36, 1] as const;

function summary(boxes: Detection[]) {
    const counts = new Map<string, number>();
    boxes.forEach((b) => counts.set(b.label, (counts.get(b.label) ?? 0) + 1));
    return [...counts].map(([label, n]) => `${n} ${label}${n > 1 ? "s" : ""}`).join(" · ");
}

// Boxes come from scripts/detect-photos.py (OpenCV HOG people + Haar faces), drawn in the
// photo's own pixel space. "slice" scaling matches the img's object-cover crop exactly.
function DetectionLayer({ photoId, on }: { photoId: Photo["id"]; on: boolean }) {
    const { width, height, boxes } = detections[photoId] as { width: number; height: number; boxes: Detection[] };
    const stroke = Math.max(width, height) / 400;
    const font = Math.max(width, height) / 55;
    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid slice"
            className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`}
            aria-hidden="true"
        >
            {boxes.map((b, i) => {
                const [x, y, w, h] = b.box;
                const color = b.label === "person" ? "#fca50a" : "#fcffa4";
                const delay = `${Math.min(i * 45, 900)}ms`;
                const tag = b.label;
                return (
                    <g key={i}>
                        <rect
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            rx={stroke * 2}
                            fill={b.label === "person" ? "rgba(252,165,10,0.06)" : "none"}
                            stroke={color}
                            strokeWidth={stroke}
                            pathLength={1}
                            strokeDasharray={1}
                            style={{ strokeDashoffset: on ? 0 : 1, transition: `stroke-dashoffset 700ms cubic-bezier(.22,1,.36,1) ${delay}` }}
                        />
                        {(b.label === "person" || boxes.length < 6) && (
                            <g style={{ opacity: on ? 1 : 0, transition: `opacity 300ms ease ${delay}` }}>
                                <rect x={x} y={y - font * 1.5} width={font * (tag.length * 0.62 + 1)} height={font * 1.4} rx={stroke * 2} fill={color} />
                                <text x={x + font * 0.5} y={y - font * 0.45} fontSize={font} fontFamily="ui-monospace, monospace" fill="#000004">
                                    {tag}
                                </text>
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

// Each photo opens like a shutter as it scrolls in, then settles from a slight zoom.
// Hover (or the chip, on touch screens) runs the vision model's boxes over it.
function Figure({ photo, className, delay = 0 }: { photo: Photo; className: string; delay?: number }) {
    const reduce = useReducedMotion();
    const [pinned, setPinned] = useState(false);
    const [hover, setHover] = useState(false);
    const on = pinned || hover;
    const boxes = detections[photo.id].boxes as Detection[];

    return (
        <figure className="group flex flex-col" onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)} onPointerLeave={() => setHover(false)}>
            <motion.div
                className="relative overflow-hidden rounded-2xl"
                initial={reduce ? false : { clipPath: "inset(12% 8% 12% 8% round 24px)", opacity: 0.4 }}
                whileInView={{ clipPath: "inset(0% 0% 0% 0% round 16px)", opacity: 1 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 1.1, delay, ease: EASE }}
            >
                <motion.div
                    className="relative"
                    initial={reduce ? false : { scale: 1.12 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 1.6, delay, ease: EASE }}
                >
                    <div className="relative transition-transform duration-700 group-hover:scale-[1.03]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- static export serves images unoptimized */}
                        <img
                            src={photo.src}
                            alt={photo.alt}
                            width={detections[photo.id].width}
                            height={detections[photo.id].height}
                            loading="lazy"
                            decoding="async"
                            className={`w-full object-cover ${className}`}
                        />
                        <DetectionLayer photoId={photo.id} on={on} />
                    </div>
                </motion.div>

                <button
                    type="button"
                    onClick={() => setPinned((p) => !p)}
                    aria-pressed={on}
                    className={`absolute left-3 top-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-void/60 px-2.5 py-1 font-mono text-[10px] text-ink backdrop-blur transition-opacity duration-300 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ember group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${on ? "opacity-100" : "opacity-0"}`}
                >
                    <ScanFace className="h-3 w-3 text-ember" aria-hidden="true" />
                    {on ? summary(boxes) : "Detect"}
                </button>
            </motion.div>
            <figcaption className="mt-3 flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink/90">{photo.caption}</span>
                <span className="shrink-0 font-mono text-[11px] text-ash">{photo.date}</span>
            </figcaption>
        </figure>
    );
}

export default function InTheRoom() {
    return (
        <section id="teaching" className="scroll-mt-16 bg-void py-28 text-ink">
            <div className="mx-auto max-w-[1280px] px-5 lg:px-10">
                <h2 className="font-display text-[clamp(2.4rem,5vw,4rem)] font-light leading-[1] tracking-[-0.04em]">In the room</h2>
                <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-ash">
                    Saturdays in the lab with the Buildr Labs Agentic AI Bootcamp, and the events in between.
                </p>

                <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
                    <Figure photo={feature} className="h-[30rem] md:h-[41rem]" />
                    <div className="grid grid-cols-1 gap-6">
                        {side.map((p, i) => (
                            <Figure key={p.src} photo={p} className="h-64 md:h-[18.5rem]" delay={0.12 * (i + 1)} />
                        ))}
                    </div>
                </div>

                <p className="mt-6 text-xs leading-relaxed text-ash/80">
                    The boxes are real output from classic OpenCV detectors (HOG people, Haar faces) run on these photos, confident detections only.
                </p>
            </div>
        </section>
    );
}

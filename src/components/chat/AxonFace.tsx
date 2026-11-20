"use client";

// Axon's face: the inferno orb with two eyes and a mouth that react to what Axon is doing.
//   idle      blinks now and then; the whole head turns toward the pointer, eyes leading
//   near      the pointer comes close: it perks up and leans in a little
//   curious   the pointer is over something clickable anywhere on the page: head tilts, eyes widen
//   listening eyes open a little wider, a soft ring breathes
//   thinking  eyes drift up and scan side to side
//   speaking  the mouth moves: with the real audio level on calls (--level), or a chatter loop in chat
//   happy     eyes turn to ^ ^ for a moment (a lead sent, a tour finished)
// Everything is CSS and one pointer listener; nothing re-renders per frame.
import { useEffect, useId, useRef } from "react";

export type FaceState = "idle" | "listening" | "thinking" | "speaking" | "happy";

interface Props {
    state?: FaceState;
    size?: number;
    /** Head and eyes follow the pointer. Off for tiny or decorative faces if it gets distracting. */
    track?: boolean;
    /** On a call: the mouth follows the --level audio variable set by a parent instead of chattering. */
    voice?: boolean;
    className?: string;
}

export default function AxonFace({ state = "idle", size = 32, track = true, voice = false, className = "" }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);
    const eyesRef = useRef<SVGGElement>(null);
    // Each face needs its own gradient id: a shared one vanishes from every face when the
    // first face on the page is hidden (display:none takes its <defs> with it)
    const fill = `axon-face-fill-${useId().replace(/:/g, "")}`;

    // Blink at irregular intervals, like a person, never in a rhythm
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let timer: ReturnType<typeof setTimeout>;
        const blink = () => {
            svg.dataset.blink = "1";
            setTimeout(() => svg && delete svg.dataset.blink, 130);
            // now and then a double blink
            timer = setTimeout(blink, Math.random() < 0.15 ? 260 : 2400 + Math.random() * 4200);
        };
        timer = setTimeout(blink, 1200 + Math.random() * 2500);
        return () => clearTimeout(timer);
    }, []);

    // The head turns toward the pointer and the eyes lead, with less movement the further away it is.
    // A 3D turn of the whole face (perspective rotate) plus a larger shift of the eyes and mouth than
    // of the orb reads as a head turning, not a flat sticker sliding.
    useEffect(() => {
        const svg = svgRef.current;
        const eyes = eyesRef.current;
        if (!track || !svg || !eyes || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let raf = 0;
        let px = 0;
        let py = 0;
        const apply = () => {
            raf = 0;
            const r = svg.getBoundingClientRect();
            if (!r.width) return;
            const dx = px - (r.left + r.width / 2);
            const dy = py - (r.top + r.height / 2);
            const dist = Math.hypot(dx, dy) || 1;
            const pull = Math.min(1, dist / 260); // close: full glance, far: settles
            const ux = (dx / dist) * pull;
            const uy = (dy / dist) * pull;
            const max = 7; // in viewBox units (of 100)
            eyes.style.setProperty("--gx", `${(ux * max).toFixed(2)}px`);
            eyes.style.setProperty("--gy", `${(uy * max * 0.8).toFixed(2)}px`);
            svg.style.setProperty("--ry", `${(ux * 24).toFixed(1)}deg`);
            svg.style.setProperty("--rx", `${(-uy * 18).toFixed(1)}deg`);
            svg.style.setProperty("--fx", `${(ux * 6).toFixed(2)}px`);
            svg.style.setProperty("--fy", `${(uy * 5).toFixed(2)}px`);
            // Close enough to notice: about three faces away, never less than 140px
            if (dist < Math.max(140, r.width * 3)) svg.dataset.near = "1";
            else delete svg.dataset.near;
        };
        const onMove = (e: PointerEvent) => {
            px = e.clientX;
            py = e.clientY;
            const target = e.target as Element | null;
            // Curious about anything clickable, except itself (and whatever button it sits in)
            const over = target?.closest?.("a[href], button, summary, [role=tab], [role=button], video");
            if (over && !over.contains(svg)) svg.dataset.curious = "1";
            else delete svg.dataset.curious;
            if (!raf) raf = requestAnimationFrame(apply);
        };
        // The pointer left the window: look back to the front
        const onLeave = () => {
            ["--gx", "--gy"].forEach((v) => eyes.style.removeProperty(v));
            ["--rx", "--ry", "--fx", "--fy"].forEach((v) => svg.style.removeProperty(v));
            delete svg.dataset.near;
            delete svg.dataset.curious;
        };
        addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("mouseleave", onLeave);
        return () => {
            removeEventListener("pointermove", onMove);
            document.documentElement.removeEventListener("mouseleave", onLeave);
            cancelAnimationFrame(raf);
        };
    }, [track]);

    return (
        <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            width={size}
            height={size}
            data-state={state}
            data-voice={voice || undefined}
            aria-hidden="true"
            className={`axon-face shrink-0 overflow-visible ${className}`}
        >
            <defs>
                <radialGradient id={fill} cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor="#fcffa4" />
                    <stop offset="22%" stopColor="#fca50a" />
                    <stop offset="48%" stopColor="#dd513a" />
                    <stop offset="72%" stopColor="#932667" />
                    <stop offset="100%" stopColor="#420a68" />
                </radialGradient>
            </defs>
            <circle className="axon-face-ring" cx="50" cy="50" r="49" fill="none" />
            <circle className="axon-face-orb" cx="50" cy="50" r="46" fill={`url(#${fill})`} />
            <g className="axon-face-features">
            <g ref={eyesRef} className="axon-face-eyes">
                <g className="axon-face-open">
                    <rect className="axon-face-eye" x="29" y="33" width="12" height="21" rx="6" />
                    <rect className="axon-face-eye" x="59" y="33" width="12" height="21" rx="6" />
                </g>
                <g className="axon-face-smile">
                    <path d="M28 46 Q35 36 42 46" />
                    <path d="M58 46 Q65 36 72 46" />
                </g>
            </g>
            <rect className="axon-face-mouth" x="42" y="65" width="16" height="6" rx="3" />
            </g>
        </svg>
    );
}

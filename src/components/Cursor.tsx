"use client";

// A soft ember glow that follows the pointer, like a torch held over the page. The pointer itself is
// the normal system cursor: nothing wraps, covers or relabels what you're aiming at.
// Mouse only: touch screens and anyone who asks for reduced motion get no glow.
// Nothing here re-renders: one pointer listener and one animation-frame loop move one element.
import { useEffect, useRef } from "react";

export default function Cursor() {
    const glowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const glow = glowRef.current;
        if (!glow) return;
        if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        let x = -500;
        let y = -500;
        let gx = x;
        let gy = y;
        let raf = 0;
        let seen = false;

        const frame = () => {
            // The glow trails the pointer a little, which is what makes it feel soft
            gx += (x - gx) * 0.12;
            gy += (y - gy) * 0.12;
            glow.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
            raf = Math.abs(x - gx) + Math.abs(y - gy) > 0.3 ? requestAnimationFrame(frame) : 0;
        };
        const kick = () => {
            if (!raf) raf = requestAnimationFrame(frame);
        };
        const onMove = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") return;
            x = e.clientX;
            y = e.clientY;
            if (!seen) {
                seen = true;
                gx = x;
                gy = y;
                glow.dataset.on = "1";
            }
            kick();
        };
        const onLeave = () => delete glow.dataset.on;
        const onEnter = () => seen && (glow.dataset.on = "1");

        addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("mouseleave", onLeave);
        document.documentElement.addEventListener("mouseenter", onEnter);
        return () => {
            removeEventListener("pointermove", onMove);
            document.documentElement.removeEventListener("mouseleave", onLeave);
            document.documentElement.removeEventListener("mouseenter", onEnter);
            cancelAnimationFrame(raf);
        };
    }, []);

    return <div ref={glowRef} className="pointer-glow" aria-hidden="true" />;
}

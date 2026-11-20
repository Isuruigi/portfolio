"use client";

// A silent looping clip that costs nothing until it is needed: the element (and its poster) only
// mounts when it nears the viewport, the video itself is preload="none", it plays only while on
// screen, and reduced-motion or Save-Data visitors get the poster alone.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

interface Props {
    /** Path without extension, e.g. /media/field-guide/retrieval */
    base: string;
    webm?: boolean;
    className?: string;
    /** Decorative by default; pass a label to expose it to assistive tech */
    label?: string;
}

function subscribeMotion(onChange: () => void) {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
}

function stillOnly() {
    if (typeof window === "undefined") return true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    return reduced || saveData;
}

export default function FieldClip({ base, webm = false, className = "", label }: Props) {
    const boxRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [near, setNear] = useState(false);
    // Poster only on the server and for reduced-motion / Save-Data visitors
    const still = useSyncExternalStore(subscribeMotion, stillOnly, () => true);

    // Mount the poster a little before it scrolls into view
    useEffect(() => {
        const el = boxRef.current;
        if (!el || near) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "600px 0px" });
        io.observe(el);
        return () => io.disconnect();
    }, [near]);

    // Play only while visible
    useEffect(() => {
        const v = videoRef.current;
        if (!v || still) return;
        const io = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) v.play().catch(() => {});
                else v.pause();
            },
            { threshold: 0.25 }
        );
        io.observe(v);
        return () => {
            io.disconnect();
            v.pause();
        };
    }, [near, still]);

    return (
        <div ref={boxRef} className={`relative overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(66,10,104,0.35),transparent_70%)] ${className}`}>
            {near &&
                (still ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static export serves images unoptimized
                    <img src={`${base}.jpg`} alt={label ?? ""} aria-hidden={label ? undefined : true} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                    <video
                        ref={videoRef}
                        poster={`${base}.jpg`}
                        preload="none"
                        muted
                        loop
                        playsInline
                        disablePictureInPicture
                        aria-label={label}
                        aria-hidden={label ? undefined : true}
                        className="h-full w-full object-cover"
                    >
                        {webm && <source src={`${base}.webm`} type="video/webm" />}
                        <source src={`${base}.mp4`} type="video/mp4" />
                    </video>
                ))}
        </div>
    );
}

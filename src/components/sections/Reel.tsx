"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// 30-second reel rendered from scripts/reel/reel.html (python scripts/reel/render.py),
// voiced by scripts/reel/voiceover.py. Browsers only autoplay muted video, so it starts
// silent while on screen and the button turns the voiceover on (restarting from the top).
// Visitors who prefer reduced motion get native controls instead of autoplay.
export default function Reel() {
    const ref = useRef<HTMLVideoElement>(null);
    const [reduce, setReduce] = useState(false);
    const [muted, setMuted] = useState(true);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setReduce(media.matches);
        update();
        media.addEventListener("change", update);

        const seen = new IntersectionObserver(
            ([entry]) => {
                if (media.matches) return;
                if (entry.isIntersecting) video.play().catch(() => {});
                else video.pause();
            },
            { threshold: 0.35 }
        );
        seen.observe(video);
        return () => {
            seen.disconnect();
            media.removeEventListener("change", update);
        };
    }, []);

    const toggleSound = () => {
        const video = ref.current;
        if (!video) return;
        const next = !muted;
        video.muted = next;
        // Turning sound on starts the story from the beginning so the voiceover makes sense
        if (!next) {
            video.currentTime = 0;
            video.play().catch(() => {});
        }
        setMuted(next);
    };

    return (
        <section aria-label="Reel" className="bg-void pb-8 pt-4 text-ink">
            <div className="relative mx-auto max-w-[1280px] px-5 lg:px-10">
                <video
                    ref={ref}
                    src="/media/reel.mp4"
                    poster="/media/reel-poster.jpg"
                    muted={muted}
                    loop
                    playsInline
                    preload="none"
                    controls={reduce}
                    aria-label="30-second reel with voiceover: voice agents, multi-agent systems and MLOps, ending on Isuru Chathuranga, AI engineer at Veracity Digital"
                    className="aspect-video w-full rounded-3xl border border-white/10 bg-void object-cover"
                />
                {!reduce && (
                    <button
                        type="button"
                        onClick={toggleSound}
                        aria-pressed={!muted}
                        aria-label={muted ? "Play the reel with sound" : "Mute the reel"}
                        className="absolute bottom-4 right-9 flex cursor-pointer items-center gap-2 rounded-full bg-void/70 px-3.5 py-2 text-xs text-ink backdrop-blur transition-colors hover:text-ember focus-visible:outline-2 focus-visible:outline-ember lg:right-14"
                    >
                        {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
                        {muted ? "Sound on" : "Mute"}
                    </button>
                )}
            </div>
        </section>
    );
}

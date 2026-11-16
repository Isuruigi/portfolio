"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import ForwardPass from "@/components/hero/ForwardPass";
import { openAgent } from "@/lib/agent";
import { socials } from "@/lib/socials";

const PORTRAIT_SRC = "/assets/portrait-studio.webp";
const PORTRAIT_ALT = "Isuru Chathuranga in a navy suit, seated on a studio stool";

export default function Hero() {
    // The network's output neuron is anchored to this portrait
    const portraitRef = useRef<HTMLImageElement>(null);


    return (
        <section id="hero" className="relative isolate min-h-[100svh] overflow-hidden bg-void text-ink">
            <ForwardPass anchorRef={portraitRef} />

            <motion.img
                ref={portraitRef}
                src={PORTRAIT_SRC}
                alt={PORTRAIT_ALT}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.1, delay: 0.25, ease: "easeOut" }}
                className="pointer-events-none absolute bottom-0 right-[3%] hidden h-[88%] w-auto select-none lg:block"
            />

            <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1280px] flex-col justify-center px-5 pb-16 pt-28 lg:px-10">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-[34rem] lg:max-w-[36%]"
                >
                    <p className="text-[15px] text-ash">AI/ML Engineer at Veracity Digital, Colombo</p>

                    <h1 className="mt-5 font-display text-[clamp(3.25rem,6vw,5.75rem)] font-light leading-[0.92] tracking-[-0.045em]">
                        Isuru
                        <br />
                        Chathuranga
                    </h1>

                    <p className="mt-7 font-display text-[clamp(1.25rem,1.8vw,1.6rem)] font-normal leading-snug tracking-[-0.01em]">
                        I build AI systems that hold up in production.
                    </p>
                    <p className="mt-3 max-w-[30rem] text-base leading-relaxed text-ash">
                        Voice agents, retrieval and multi-agent systems, shipped with the monitoring to prove they keep working.
                    </p>

                    <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                        <a
                            href="#work"
                            className="rounded-full bg-ember px-6 py-3 font-medium text-void transition-colors hover:bg-inferno-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
                        >
                            See the work
                        </a>
                        <button
                            type="button"
                            onClick={() => openAgent()}
                            className="cursor-pointer py-3 font-medium text-ink underline decoration-inferno-3 decoration-1 underline-offset-[6px] transition-colors hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
                        >
                            Ask my agent
                        </button>
                    </div>

                    <ul className="mt-8 flex items-center gap-2" aria-label="Profiles">
                        {socials.map(({ label, href, icon: Icon }) => (
                            <li key={label}>
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    title={label}
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-ash transition-colors hover:border-ember/60 hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
                                >
                                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </motion.div>

                {/* eslint-disable-next-line @next/next/no-img-element -- static export serves images unoptimized */}
                <img
                    src={PORTRAIT_SRC}
                    alt={PORTRAIT_ALT}
                    className="mx-auto mt-12 h-[26rem] w-auto select-none lg:hidden"
                />
            </div>

            <p className="pointer-events-none absolute bottom-8 left-[47%] z-10 hidden text-sm text-ash lg:block">
                Hover a neuron to trace a project
            </p>
        </section>
    );
}

"use client";

import { useEffect, useState } from "react";
import { shippedCount } from "@/lib/data/work";

const GITHUB_USER = "Isuruigi";
const CACHE_KEY = "proof-github-v1";
const CACHE_MS = 30 * 60 * 1000;

interface GithubActivity {
    commits: number;
    lastRepo: string;
    lastPushAt: string;
}

interface PushEvent {
    type: string;
    created_at: string;
    repo: { name: string };
    payload: { size?: number; commits?: unknown[] };
}

async function loadActivity(): Promise<GithubActivity | null> {
    try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
            const { at, data } = JSON.parse(cached);
            if (Date.now() - at < CACHE_MS) return data;
        }
    } catch {
        // storage can be unavailable (private mode); fetch instead
    }

    const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/events/public?per_page=100`);
    if (!res.ok) return null;
    const events: PushEvent[] = await res.json();
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const pushes = events.filter((e) => e.type === "PushEvent" && Date.parse(e.created_at) >= since);
    if (pushes.length === 0) return null;

    const data: GithubActivity = {
        commits: pushes.reduce((n, e) => n + (e.payload.size ?? e.payload.commits?.length ?? 1), 0),
        lastRepo: pushes[0].repo.name.split("/")[1],
        lastPushAt: pushes[0].created_at,
    };
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
    } catch {
        // caching is optional
    }
    return data;
}

function timeAgo(iso: string) {
    const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    return `${days} days ago`;
}

export default function ProofStrip() {
    const [activity, setActivity] = useState<GithubActivity | null | undefined>(undefined);

    useEffect(() => {
        loadActivity().then(setActivity).catch(() => setActivity(null));
    }, []);

    const facts = [
        { value: String(shippedCount), label: "systems shipped and in use", href: "#work" },
        { value: "Top 3", label: "of 290 in Zuu Crew's production ML bootcamp", href: "#career" },
        { value: "Saturdays", label: "in the lab teaching agentic AI at Buildr Labs", href: "#teaching" },
    ];

    return (
        <section aria-label="Proof" className="bg-void text-ink">
            <div className="mx-auto grid max-w-[1280px] grid-cols-1 border-y border-white/10 sm:grid-cols-2 lg:grid-cols-4">
                {facts.map((f) => (
                    <a
                        key={f.label}
                        href={f.href}
                        className="group border-white/10 px-5 py-8 transition-colors hover:bg-white/[0.03] sm:[&:nth-child(odd)]:border-r lg:border-r lg:px-8"
                    >
                        <p className="font-display text-4xl font-light tracking-[-0.03em] group-hover:text-ember">{f.value}</p>
                        <p className="mt-2 text-sm leading-snug text-ash">{f.label}</p>
                    </a>
                ))}

                <a
                    href={`https://github.com/${GITHUB_USER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group px-5 py-8 transition-colors hover:bg-white/[0.03] lg:px-8"
                >
                    {activity ? (
                        <>
                            <p className="font-display text-4xl font-light tracking-[-0.03em] group-hover:text-ember">
                                {activity.commits}
                            </p>
                            <p className="mt-2 text-sm leading-snug text-ash">
                                commits pushed in the last 30 days
                            </p>
                            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-ash/80">
                                <span className="h-1.5 w-1.5 rounded-full bg-ember motion-safe:animate-pulse" aria-hidden="true" />
                                Live from GitHub: {activity.lastRepo}, {timeAgo(activity.lastPushAt)}
                            </p>
                        </>
                    ) : activity === undefined ? (
                        <>
                            <p className="font-display text-4xl font-light tracking-[-0.03em] text-ash/40">…</p>
                            <p className="mt-2 text-sm leading-snug text-ash">Checking GitHub…</p>
                        </>
                    ) : (
                        <>
                            <p className="font-display text-4xl font-light tracking-[-0.03em] group-hover:text-ember">4</p>
                            <p className="mt-2 text-sm leading-snug text-ash">
                                open-source projects contributed to: LangChain, PyTorch, Hugging Face, MLflow
                            </p>
                        </>
                    )}
                </a>
            </div>
        </section>
    );
}

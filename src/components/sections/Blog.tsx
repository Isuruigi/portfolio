"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

const MEDIUM_PROFILE = "https://medium.com/@isuruig";
const FEED_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent("https://medium.com/feed/@isuruig")}`;
const WORDS_PER_MINUTE = 220;

interface Post {
    title: string;
    link: string;
    date: string;
    excerpt: string;
    minutes: number;
}

interface FeedItem {
    title: string;
    link: string;
    pubDate: string;
    description?: string;
    content?: string;
}

const stripHtml = (html = "") => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function Blog() {
    const [posts, setPosts] = useState<Post[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        fetch(FEED_URL)
            .then((res) => res.json())
            .then((data) => {
                if (data.status !== "ok" || !Array.isArray(data.items)) throw new Error("feed unavailable");
                setPosts(
                    (data.items as FeedItem[]).slice(0, 6).map((item) => {
                        const text = stripHtml(item.content || item.description);
                        const words = text ? text.split(" ").length : 0;
                        return {
                            title: item.title,
                            link: item.link,
                            date: item.pubDate,
                            excerpt: stripHtml(item.description).slice(0, 220),
                            minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
                        };
                    })
                );
            })
            .catch(() => setFailed(true));
    }, []);

    return (
        <section id="blog" className="scroll-mt-16 bg-void py-28 text-ink">
            <div className="mx-auto max-w-[1280px] px-5 lg:px-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-balance font-display text-[clamp(2.4rem,5vw,4rem)] font-light leading-[1] tracking-[-0.04em]">
                            Writing
                        </h2>
                        <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-ash">
                            Notes on building, shipping and teaching AI systems, published on Medium.
                        </p>
                    </div>
                    <a
                        href={MEDIUM_PROFILE}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 font-medium underline decoration-inferno-3 underline-offset-[6px] transition-colors hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
                    >
                        All posts on Medium
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                </div>

                <ul className="mt-12 border-t border-white/10" aria-busy={posts === null && !failed}>
                    {posts === null && !failed &&
                        [0, 1, 2].map((i) => (
                            <li key={i} className="grid animate-pulse grid-cols-1 gap-3 border-b border-white/10 py-6 md:grid-cols-[8rem_minmax(0,1fr)]">
                                <span className="h-3 w-20 rounded bg-white/10" />
                                <span className="space-y-2">
                                    <span className="block h-4 w-2/3 rounded bg-white/10" />
                                    <span className="block h-3 w-full rounded bg-white/5" />
                                </span>
                            </li>
                        ))}

                    {(failed || posts?.length === 0) && (
                        <li className="border-b border-white/10 py-6 text-ash">
                            {failed ? "The Medium feed didn't load. " : "No posts yet. "}
                            <a href={MEDIUM_PROFILE} target="_blank" rel="noopener noreferrer" className="text-ink underline decoration-inferno-3 underline-offset-4 hover:text-ember">
                                Read on Medium instead
                            </a>
                        </li>
                    )}

                    {posts?.map((p) => (
                        <li key={p.link}>
                            <a
                                href={p.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group grid grid-cols-1 gap-2 border-b border-white/10 py-6 transition-colors hover:bg-white/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember md:grid-cols-[8rem_minmax(0,1fr)_5rem_1.5rem] md:items-baseline md:gap-6"
                            >
                                <time dateTime={p.date} className="font-mono text-[11px] text-ash">
                                    {dateFormat.format(new Date(p.date.replace(" ", "T")))}
                                </time>
                                <span className="min-w-0">
                                    <span className="block text-pretty text-lg font-medium leading-snug group-hover:text-ember">{p.title}</span>
                                    {p.excerpt && <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-ash">{p.excerpt}</span>}
                                </span>
                                <span className="font-mono text-[11px] tabular-nums text-ash">{p.minutes} min read</span>
                                <ArrowUpRight className="hidden h-4 w-4 text-ash transition-colors group-hover:text-ember md:block" aria-hidden="true" />
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

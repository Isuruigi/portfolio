"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronUp } from "lucide-react";

// Built every morning by scripts/build-news.mjs
interface Story {
    headline: string;
    summary: string;
    link: string;
    source: string;
    image: string;
    published: string;
    topics: string[];
    also: { source: string; link: string }[];
}
interface Paper {
    title: string;
    link: string;
    upvotes: number;
}
interface Release {
    repo: string;
    tag: string;
    link: string;
    published: string;
    prerelease: boolean;
}
interface NewsData {
    generated_at: string;
    time_zone: string;
    sources: string[];
    days: { date: string; items: Story[] }[];
    papers: Paper[];
    releases: Release[];
}

const LATEST = "latest";
const ALL = "All";
const PAGE = 12;
const TOPIC_ORDER = ["Voice AI", "Agents", "Models", "Infra & MLOps", "RAG & search", "Robotics", "Research", "Policy & safety", "Business", "Industry"];

function ago(iso: string, now: number) {
    const mins = Math.max(1, Math.round((now - Date.parse(iso)) / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? "yesterday" : `${days}d ago`;
}

// Publisher images are hotlinked; if one is missing or blocked, draw a tile instead
function StoryImage({ src, source, className = "" }: { src: string; source: string; className?: string }) {
    const [broken, setBroken] = useState(!src);
    if (broken) {
        return (
            <div
                aria-hidden="true"
                className={`flex h-full w-full items-end bg-[radial-gradient(120%_90%_at_15%_10%,#932667_0%,#420a68_45%,#000004_100%)] p-4 ${className}`}
            >
                <span className="font-display text-xl font-light tracking-[-0.02em] text-ink/80">{source}</span>
            </div>
        );
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element -- remote publisher images in a static export
        <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] ${className}`}
        />
    );
}

function Byline({ story, now }: { story: Story; now: number }) {
    return (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-ash">
            <span className="text-ember">{story.topics[0]}</span>
            <span aria-hidden="true">·</span>
            <span>{story.source}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={story.published}>{ago(story.published, now)}</time>
        </p>
    );
}

function AlsoOn({ story }: { story: Story }) {
    if (!story.also.length) return null;
    return <p className="mt-auto pt-4 text-xs text-ash">Also covered by {story.also.map((a) => a.source).join(", ")}</p>;
}

function LeadStory({ story, now }: { story: Story; now: number }) {
    return (
        <a
            href={story.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group grid grid-cols-1 overflow-hidden rounded-3xl border border-fg/10 bg-fg/[0.02] transition-colors hover:border-ember/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]"
        >
            <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-[22rem]">
                <StoryImage src={story.image} source={story.source} className="absolute inset-0" />
            </div>
            <div className="flex flex-col p-6 lg:p-8">
                <Byline story={story} now={now} />
                <h3 className="mt-4 text-pretty font-display text-[clamp(1.6rem,2.6vw,2.2rem)] font-light leading-[1.1] tracking-[-0.03em] transition-colors group-hover:text-ember">
                    {story.headline}
                </h3>
                {story.summary && <p className="mt-4 line-clamp-4 leading-relaxed text-ash">{story.summary}</p>}
                <AlsoOn story={story} />
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium">
                    Read on {story.source}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
            </div>
        </a>
    );
}

function StoryCard({ story, now }: { story: Story; now: number }) {
    return (
        <a
            href={story.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-fg/10 bg-fg/[0.02] transition-colors hover:border-ember/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
        >
            <div className="relative aspect-[16/9] overflow-hidden">
                <StoryImage src={story.image} source={story.source} className="absolute inset-0" />
            </div>
            <div className="flex flex-1 flex-col p-5">
                <Byline story={story} now={now} />
                <h3 className="mt-3 line-clamp-3 text-pretty text-[17px] font-medium leading-snug transition-colors group-hover:text-ember">
                    {story.headline}
                </h3>
                {story.summary && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ash">{story.summary}</p>}
                <AlsoOn story={story} />
            </div>
        </a>
    );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                active ? "border-ember bg-ember/10 text-ink" : "border-fg/10 text-ash hover:border-fg/25 hover:text-ink"
            }`}
        >
            {children}
        </button>
    );
}

export default function Newsroom() {
    const [data, setData] = useState<NewsData | null>(null);
    const [failed, setFailed] = useState(false);
    const [day, setDay] = useState(LATEST);
    const [topic, setTopic] = useState(ALL);
    const [shown, setShown] = useState(PAGE);
    const [now] = useState(() => Date.now());

    useEffect(() => {
        fetch("/news-data.json")
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
            .then((json: NewsData) => setData(json))
            .catch(() => setFailed(true));
    }, []);

    const dayLabels = useMemo(() => {
        if (!data) return new Map<string, string>();
        const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: data.time_zone });
        const today = fmt.format(new Date(now));
        const yesterday = fmt.format(new Date(now - 864e5));
        const short = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });
        return new Map(
            data.days.map((d) => [d.date, d.date === today ? "Today" : d.date === yesterday ? "Yesterday" : short.format(new Date(`${d.date}T12:00:00Z`))])
        );
    }, [data, now]);

    const pool = useMemo(() => {
        if (!data) return [];
        return day === LATEST ? data.days.flatMap((d) => d.items) : (data.days.find((d) => d.date === day)?.items ?? []);
    }, [data, day]);

    const topics = useMemo(() => {
        const counts = new Map<string, number>();
        pool.forEach((s) => s.topics.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
        return TOPIC_ORDER.filter((t) => counts.has(t)).map((t) => ({ name: t, count: counts.get(t)! }));
    }, [pool]);

    const stories = topic === ALL ? pool : pool.filter((s) => s.topics.includes(topic));
    const leadIndex = Math.max(0, stories.findIndex((s) => s.image));
    const lead = stories[leadIndex];
    const rest = stories.filter((_, i) => i !== leadIndex);

    const pickDay = (d: string) => {
        setDay(d);
        setTopic(ALL);
        setShown(PAGE);
    };
    const pickTopic = (t: string) => {
        setTopic(t);
        setShown(PAGE);
    };

    const updated = data
        ? new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(data.generated_at))
        : null;

    return (
        <section id="news" className="scroll-mt-16 bg-void py-28 text-ink" aria-labelledby="news-title">
            <div className="mx-auto max-w-[1280px] px-5 lg:px-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ash">
                            <span className="relative flex h-2 w-2" aria-hidden="true">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember/60 motion-reduce:animate-none" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-ember" />
                            </span>
                            Newsroom{updated && ` · updated ${updated}`}
                        </p>
                        <h2 id="news-title" className="mt-4 text-balance font-display text-[clamp(2.4rem,5vw,4rem)] font-light leading-[1] tracking-[-0.04em]">
                            What moved in AI this week
                        </h2>
                        <p className="mt-5 max-w-[38rem] text-lg leading-relaxed text-ash">
                            Voice AI, agents, models and the infrastructure under them. Gathered every morning from{" "}
                            {data ? `${data.sources.length} newsrooms` : "the AI press"}, Hugging Face papers and the releases I build with.
                        </p>
                    </div>
                </div>

                {failed && <p className="mt-12 border-t border-fg/10 pt-6 text-ash">Today&apos;s news didn&apos;t load. Try again in a moment.</p>}

                {!data && !failed && (
                    <div className="mt-12 grid animate-pulse grid-cols-1 gap-5 md:grid-cols-2" aria-busy="true" aria-label="Loading news">
                        <div className="h-80 rounded-3xl bg-fg/[0.04] md:col-span-2" />
                        <div className="h-64 rounded-2xl bg-fg/[0.03]" />
                        <div className="h-64 rounded-2xl bg-fg/[0.03]" />
                    </div>
                )}

                {data && (
                    <>
                        <div className="mt-12 space-y-4">
                            <div className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Day">
                                <Chip active={day === LATEST} onClick={() => pickDay(LATEST)}>
                                    This week
                                </Chip>
                                {data.days.map((d) => (
                                    <Chip key={d.date} active={day === d.date} onClick={() => pickDay(d.date)}>
                                        {dayLabels.get(d.date)}
                                        <span className="ml-1.5 font-mono text-[11px] text-ash">{d.items.length}</span>
                                    </Chip>
                                ))}
                            </div>
                            <div className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Topic">
                                <Chip active={topic === ALL} onClick={() => pickTopic(ALL)}>
                                    All topics
                                </Chip>
                                {topics.map((t) => (
                                    <Chip key={t.name} active={topic === t.name} onClick={() => pickTopic(t.name)}>
                                        {t.name}
                                        <span className="ml-1.5 font-mono text-[11px] text-ash">{t.count}</span>
                                    </Chip>
                                ))}
                            </div>
                        </div>

                        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
                            <div aria-live="polite">
                                {stories.length === 0 ? (
                                    <p className="border-t border-fg/10 pt-6 text-ash">Nothing on {topic} for this day yet.</p>
                                ) : (
                                    <>
                                        {lead && <LeadStory story={lead} now={now} />}
                                        <ul className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                            {rest.slice(0, shown).map((s) => (
                                                <li key={s.link}>
                                                    <StoryCard story={s} now={now} />
                                                </li>
                                            ))}
                                        </ul>
                                        {rest.length > shown && (
                                            <button
                                                type="button"
                                                onClick={() => setShown((n) => n + PAGE)}
                                                className="mt-8 w-full cursor-pointer rounded-full border border-fg/15 py-3 text-sm text-ash transition-colors hover:border-ember hover:text-ember focus-visible:outline-2 focus-visible:outline-ember"
                                            >
                                                Show {Math.min(PAGE, rest.length - shown)} more of {rest.length - shown}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            <aside className="space-y-10 lg:sticky lg:top-24 lg:self-start">
                                {data.papers.length > 0 && (
                                    <div>
                                        <h3 className="text-sm text-ash">Top papers on Hugging Face</h3>
                                        <ol className="mt-3 border-t border-fg/10">
                                            {data.papers.slice(0, 5).map((p) => (
                                                <li key={p.link}>
                                                    <a
                                                        href={p.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group flex gap-3 border-b border-fg/10 py-3.5 focus-visible:outline-2 focus-visible:outline-ember"
                                                    >
                                                        <span className="flex w-9 shrink-0 flex-col items-center font-mono text-[11px] tabular-nums text-ember">
                                                            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                                                            <span className="sr-only">Upvotes: </span>
                                                            {p.upvotes}
                                                        </span>
                                                        <span className="line-clamp-3 text-sm leading-snug transition-colors group-hover:text-ember">{p.title}</span>
                                                    </a>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {data.releases.length > 0 && (
                                    <div>
                                        <h3 className="text-sm text-ash">Shipped in the tools I use</h3>
                                        <ul className="mt-3 border-t border-fg/10">
                                            {data.releases.map((r) => (
                                                <li key={r.repo}>
                                                    <a
                                                        href={r.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group flex items-baseline justify-between gap-3 border-b border-fg/10 py-3 focus-visible:outline-2 focus-visible:outline-ember"
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="block text-sm transition-colors group-hover:text-ember">{r.repo.split("/")[1]}</span>
                                                            <span className="block truncate font-mono text-[11px] text-ash">
                                                                {r.tag}
                                                                {r.prerelease && " · pre-release"}
                                                            </span>
                                                        </span>
                                                        <time dateTime={r.published} className="shrink-0 font-mono text-[11px] text-ash">
                                                            {ago(r.published, now)}
                                                        </time>
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <p className="text-xs leading-relaxed text-ash/80">
                                    Headlines and images belong to their publishers and link straight to them. A script collects them each morning; nothing is
                                    rewritten by AI.
                                </p>
                            </aside>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

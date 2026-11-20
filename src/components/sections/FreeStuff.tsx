"use client";

// "Free for builders": free tiers, credits and open-source finds, for anyone building with AI.
//   New             free tiers added to free-for-dev in the last two weeks (scripts/build-deals.mjs)
//   Always free     a hand-checked list (src/lib/data/deals.json); in the page HTML, so search can read it
//   Launches        popular free or open-source launches on Hacker News this week
//   In the news     newsroom stories announcing a free plan, credits or a price cut (only when there are some)
// No coupon codes and no affiliate links: every link goes straight to the provider.
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import alwaysFree from "@/lib/data/deals.json";

interface FreeTier {
    name: string;
    url: string;
    line: string;
    category: string;
    via: string;
}
interface Launch {
    title: string;
    url: string;
    discussion: string;
    points: number;
    date: string;
}
interface NewsDeal {
    headline: string;
    url: string;
    source: string;
    date: string;
}
interface DealsData {
    generated_at: string;
    window_days: number;
    free_tiers: FreeTier[];
    hacker_news: Launch[];
    in_the_news: NewsDeal[];
    link_check: { checked_at: string; results: Record<string, string> } | null;
}

type Tab = "new" | "always" | "launches" | "news";
const ALL = "All";
const PAGE = 10;
const NEW_ORDER = ["AI & ML", "APIs & data", "Cloud & hosting", "Databases & storage", "Dev tools", "Learning"];
const ALWAYS_ORDER = ["AI APIs", "Build & host", "Students", "Startups", "Learn"];

const host = (url: string) => {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
};
const shortDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

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

/** One row: the name links to the provider, the details sit underneath */
function Row({ href, title, meta, children }: { href: string; title: string; meta: React.ReactNode; children?: React.ReactNode }) {
    return (
        <li className="border-b border-fg/10 py-4">
            <div className="flex items-baseline justify-between gap-4">
                <a href={href} target="_blank" rel="noopener noreferrer" className="group inline-flex min-w-0 items-baseline gap-1.5 font-medium transition-colors hover:text-ember">
                    <span className="min-w-0 break-words">{title}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-ash transition-colors group-hover:text-ember" aria-hidden="true" />
                </a>
                <span className="shrink-0 text-right font-mono text-[11px] text-ash">{meta}</span>
            </div>
            {children && <div className="mt-1 text-sm leading-relaxed text-ash">{children}</div>}
        </li>
    );
}

export default function FreeStuff() {
    const [data, setData] = useState<DealsData | null>(null);
    const [failed, setFailed] = useState(false);
    const [tab, setTab] = useState<Tab>("new");
    const [category, setCategory] = useState(ALL);
    const [shown, setShown] = useState(PAGE);

    useEffect(() => {
        fetch("/deals-data.json")
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
            .then((json: DealsData) => setData(json))
            .catch(() => setFailed(true));
    }, []);

    // The daily link check hides anything that has stopped answering, until someone looks at it
    const always = useMemo(
        () => alwaysFree.filter((d) => !data?.link_check || (data.link_check.results[d.url] ?? "ok") === "ok"),
        [data]
    );
    const freeTiers = useMemo(() => data?.free_tiers ?? [], [data]);
    const launches = data?.hacker_news ?? [];
    const news = data?.in_the_news ?? [];

    // Without the live data (it failed to load), the hand-checked list is still worth showing
    const active: Tab = !data && tab !== "always" ? "always" : tab;

    const categories = useMemo(() => {
        const items = active === "new" ? freeTiers : active === "always" ? always : [];
        const order = active === "new" ? NEW_ORDER : ALWAYS_ORDER;
        const counts = new Map<string, number>();
        items.forEach((d) => counts.set(d.category, (counts.get(d.category) ?? 0) + 1));
        return order.filter((c) => counts.has(c)).map((c) => ({ name: c, count: counts.get(c)! }));
    }, [active, freeTiers, always]);

    const pick = (t: Tab) => {
        setTab(t);
        setCategory(ALL);
        setShown(PAGE);
    };

    const tabs: { id: Tab; label: string; count: number }[] = [
        { id: "new", label: `New this fortnight`, count: freeTiers.length },
        { id: "always", label: "Always free", count: always.length },
        { id: "launches", label: "Launches", count: launches.length },
        { id: "news", label: "In the news", count: news.length },
    ];
    // A tab with nothing in it today isn't shown (the news one is often empty)
    const visibleTabs = tabs.filter((t) => t.id === "always" || (data && t.count > 0));

    const newItems = category === ALL ? freeTiers : freeTiers.filter((d) => d.category === category);
    const alwaysItems = category === ALL ? always : always.filter((d) => d.category === category);

    return (
        <section id="free" className="scroll-mt-16 bg-void pb-28 pt-8 text-ink" aria-labelledby="free-title">
            <div className="mx-auto max-w-[1280px] px-5 lg:px-10">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
                    <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ash">
                            Free for builders{data ? ` · checked ${shortDate(data.generated_at)}` : ""}
                        </p>
                        <h2 id="free-title" className="mt-4 text-balance font-display text-[clamp(2.2rem,4.5vw,3.5rem)] font-light leading-[1.02] tracking-[-0.04em]">
                            Build it without a bill
                        </h2>
                        <p className="mt-5 max-w-[30rem] text-lg leading-relaxed text-ash">
                            Free tiers, credits and open-source finds for anyone building with AI, whether you&apos;re a student, between jobs or starting up.
                            New finds every morning.
                        </p>
                        <p className="mt-5 max-w-[30rem] text-sm leading-relaxed text-ash/80">
                            No coupon codes and no affiliate links: every link goes straight to the provider. Free plans change, so check the terms before you build on one.
                        </p>
                    </div>

                    <div className="min-w-0">
                        <div role="tablist" aria-label="Free for builders" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
                            {visibleTabs.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active === t.id}
                                    onClick={() => pick(t.id)}
                                    className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                                        active === t.id ? "bg-ember font-medium text-on-ember" : "border border-fg/10 text-ash hover:border-fg/25 hover:text-ink"
                                    }`}
                                >
                                    {t.label}
                                    <span className={`ml-1.5 font-mono text-[11px] ${active === t.id ? "text-on-ember/70" : "text-ash"}`}>{t.count}</span>
                                </button>
                            ))}
                        </div>

                        {categories.length > 1 && (
                            <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
                                <Chip active={category === ALL} onClick={() => (setCategory(ALL), setShown(PAGE))}>
                                    All
                                </Chip>
                                {categories.map((c) => (
                                    <Chip key={c.name} active={category === c.name} onClick={() => (setCategory(c.name), setShown(PAGE))}>
                                        {c.name}
                                        <span className="ml-1.5 font-mono text-[11px] text-ash">{c.count}</span>
                                    </Chip>
                                ))}
                            </div>
                        )}

                        <div role="tabpanel" className="mt-4">
                            {active === "new" && (
                                <>
                                    <p className="text-sm text-ash">
                                        Free tiers added to{" "}
                                        <a href="https://github.com/ripienaar/free-for-dev" target="_blank" rel="noopener noreferrer" className="underline decoration-fg/25 underline-offset-4 hover:text-ember">
                                            free-for-dev
                                        </a>
                                        , the community list, in the last {data?.window_days ?? 14} days.
                                    </p>
                                    <ul className="mt-2 border-t border-fg/10">
                                        {newItems.slice(0, shown).map((d) => (
                                            <Row key={d.url} href={d.url} title={d.name} meta={d.category}>
                                                {d.line}{" "}
                                                <a href={d.via} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-ash/70 underline decoration-fg/15 underline-offset-4 hover:text-ember">
                                                    via free-for-dev
                                                </a>
                                            </Row>
                                        ))}
                                    </ul>
                                    {newItems.length > shown && (
                                        <button
                                            type="button"
                                            onClick={() => setShown((n) => n + PAGE)}
                                            className="mt-6 w-full cursor-pointer rounded-full border border-fg/15 py-3 text-sm text-ash transition-colors hover:border-ember hover:text-ember focus-visible:outline-2 focus-visible:outline-ember"
                                        >
                                            Show {Math.min(PAGE, newItems.length - shown)} more of {newItems.length}
                                        </button>
                                    )}
                                </>
                            )}

                            {active === "always" && (
                                <>
                                    <p className="text-sm text-ash">Hand-checked against each provider&apos;s own page, and re-checked every morning.</p>
                                    <ul className="mt-2 border-t border-fg/10">
                                        {alwaysItems.map((d) => (
                                            <Row key={d.url} href={d.url} title={d.name} meta={d.for === "Everyone" ? d.category : `For ${d.for.toLowerCase()}`}>
                                                {d.what} <span className="whitespace-nowrap text-ash/70">{d.by}, checked {shortDate(d.checked)}</span>
                                            </Row>
                                        ))}
                                    </ul>
                                </>
                            )}

                            {active === "launches" && (
                                <>
                                    <p className="text-sm text-ash">Free and open-source launches people upvoted on Hacker News this week.</p>
                                    <ul className="mt-2 border-t border-fg/10">
                                        {launches.map((l) => (
                                            <Row key={l.url} href={l.url} title={l.title} meta={`▲ ${l.points}`}>
                                                {host(l.url)} · {shortDate(l.date)} ·{" "}
                                                <a href={l.discussion} target="_blank" rel="noopener noreferrer" className="underline decoration-fg/15 underline-offset-4 hover:text-ember">
                                                    discussion
                                                </a>
                                            </Row>
                                        ))}
                                    </ul>
                                </>
                            )}

                            {active === "news" && (
                                <>
                                    <p className="text-sm text-ash">Stories from the newsroom about free plans, credits and price cuts.</p>
                                    <ul className="mt-2 border-t border-fg/10">
                                        {news.map((n) => (
                                            <Row key={n.url} href={n.url} title={n.headline} meta={n.source}>
                                                {shortDate(n.date)}
                                            </Row>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>

                        {failed && <p className="mt-4 text-sm text-ash">Today&apos;s new finds didn&apos;t load. The always-free list is still here.</p>}
                    </div>
                </div>
            </div>
        </section>
    );
}

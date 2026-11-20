import { socials } from "@/lib/socials";

const sections = [
    { label: "Work", href: "#work" },
    { label: "Career", href: "#career" },
    { label: "Teaching", href: "#teaching" },
    { label: "About", href: "#about" },
    { label: "Writing", href: "#blog" },
    { label: "News", href: "#news" },
    { label: "Contact", href: "#contact" },
];

const elsewhere = [...socials, { label: "Email", href: "mailto:isuruigic@gmail.com" }];

const forAgents = [
    { label: "llms.txt", href: "/llms.txt" },
    { label: "profile.json", href: "/profile.json" },
];

const linkClass =
    "text-sm text-ink/80 transition-colors hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

export default function Footer() {
    return (
        <footer className="border-t border-fg/10 bg-void text-ink">
            <div className="mx-auto max-w-[1280px] px-5 py-16 lg:px-10">
                <div className="grid grid-cols-2 gap-10 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr]">
                    <div className="col-span-2 md:col-span-1">
                        <p className="font-display text-2xl font-light tracking-[-0.02em]">Isuru (IG) Chathuranga</p>
                        <p className="mt-2 max-w-xs text-sm leading-relaxed text-ash">
                            AI/ML engineer in Colombo, building AI systems that hold up in production.
                        </p>
                    </div>

                    <nav aria-label="Sections">
                        <p className="text-sm text-ash">On this page</p>
                        <ul className="mt-4 space-y-2.5">
                            {sections.map((l) => (
                                <li key={l.label}>
                                    <a href={l.href} className={linkClass}>
                                        {l.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div>
                        <p className="text-sm text-ash">Elsewhere</p>
                        <ul className="mt-4 space-y-2.5">
                            {elsewhere.map((l) => (
                                <li key={l.label}>
                                    <a
                                        href={l.href}
                                        target={l.href.startsWith("mailto") ? undefined : "_blank"}
                                        rel="noopener noreferrer"
                                        className={linkClass}
                                    >
                                        {l.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="text-sm text-ash">For AI agents</p>
                        <ul className="mt-4 space-y-2.5">
                            {forAgents.map((l) => (
                                <li key={l.label}>
                                    <a href={l.href} className={`${linkClass} font-mono text-xs`} translate="no">
                                        {l.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-14 flex flex-col gap-2 border-t border-fg/10 pt-6 text-xs text-ash sm:flex-row sm:justify-between">
                    <p>© {new Date().getFullYear()} Isuru Chathuranga</p>
                    <p>Some studio portraits on this site are AI-generated from real photos.</p>
                </div>
            </div>
        </footer>
    );
}

import { Plus } from "lucide-react";
import { faq } from "@/lib/data/faq";

// The questions people ask before they get in touch. Plain <details>, so every answer is in the
// page's HTML for search engines and AI assistants to read, and it works without JavaScript.
export default function Faq() {
    return (
        <section id="faq" className="scroll-mt-16 bg-void py-24 text-ink">
            <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20 lg:px-10">
                <div>
                    <h2 className="text-balance font-display text-[clamp(2.4rem,5vw,4rem)] font-light leading-[1] tracking-[-0.04em]">Working with me</h2>
                    <p className="mt-5 max-w-[26rem] text-lg leading-relaxed text-ash">What recruiters and clients usually ask first.</p>
                </div>
                <div className="border-t border-fg/10">
                    {faq.map((f) => (
                        <details key={f.q} className="group border-b border-fg/10">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-medium transition-colors hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember [&::-webkit-details-marker]:hidden">
                                <h3 className="text-[17px]">{f.q}</h3>
                                <Plus className="h-4 w-4 shrink-0 text-ash transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
                            </summary>
                            <p className="max-w-[40rem] pb-6 leading-relaxed text-ink/80">{f.a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}

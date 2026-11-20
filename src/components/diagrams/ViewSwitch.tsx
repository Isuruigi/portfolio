"use client";

// Diagram, 3D city or hologram: how architecture diagrams are drawn. The light SVG diagram is the
// default; the 3D views load three.js only when a visitor asks for them. Remembered for this visitor
// (a convenience only: it falls back to the diagram).
import { useSyncExternalStore } from "react";
import { Building2, Network, ScanLine } from "lucide-react";

export type ArchView = "city" | "holo" | "flat";

const KEY = "arch-view";
const EVENT = "arch-view-change";

function read(): ArchView {
    try {
        const v = localStorage.getItem(KEY);
        return v === "city" || v === "holo" ? v : "flat";
    } catch {
        return "flat";
    }
}
function subscribe(cb: () => void) {
    window.addEventListener(EVENT, cb);
    return () => window.removeEventListener(EVENT, cb);
}
function save(v: ArchView) {
    try {
        localStorage.setItem(KEY, v);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
}

export function useArchView() {
    return useSyncExternalStore(subscribe, read, (): ArchView => "flat");
}

const OPTIONS = [
    ["flat", "Diagram", Network],
    ["city", "3D city", Building2],
    ["holo", "Hologram", ScanLine],
] as const;

export default function ViewSwitch({ className = "" }: { className?: string }) {
    const view = useArchView();
    return (
        <div className={`flex items-center rounded-full border border-fg/10 p-0.5 ${className}`} role="group" aria-label="Diagram view">
            {OPTIONS.map(([v, label, Icon]) => (
                <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => save(v)}
                    className={`flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                        view === v ? "bg-ember text-on-ember" : "text-ash hover:text-ink"
                    }`}
                >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {label}
                </button>
            ))}
        </div>
    );
}

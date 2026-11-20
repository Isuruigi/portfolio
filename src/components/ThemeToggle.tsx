"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const noop = () => () => {};

/** Sun/moon switch between the light and dark stage. Renders a same-size placeholder until mounted. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme();
    const mounted = useSyncExternalStore(noop, () => true, () => false);
    const base = `flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-fg/15 text-ink transition-colors hover:border-ember/60 hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${className}`;

    if (!mounted) return <span className={base} aria-hidden="true" />;

    const dark = resolvedTheme !== "light";
    return (
        <button
            type="button"
            onClick={() => setTheme(dark ? "light" : "dark")}
            className={`${base} cursor-pointer`}
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            title={dark ? "Light theme" : "Dark theme"}
        >
            {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </button>
    );
}

"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="w-10 h-10 rounded-full border border-border bg-transparent" />
        );
    }

    const isDark = theme === "dark";

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-10 h-10 rounded-full border border-border bg-transparent flex items-center justify-center hover:bg-secondary transition-all duration-200 ease-out cursor-pointer"
            aria-label="Toggle theme"
            title="Toggle theme"
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={isDark ? "moon" : "sun"}
                    initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {isDark ? (
                        <Moon className="w-5 h-5 text-foreground" />
                    ) : (
                        <Sun className="w-5 h-5 text-foreground" />
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.button>
    );
}

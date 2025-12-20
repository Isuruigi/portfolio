"use client";

import { useEffect, useState } from "react";

interface Snowflake {
    id: number;
    left: number;
    size: number;
    duration: number;
    delay: number;
    opacity: number;
}

export default function Snowflakes() {
    const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

    useEffect(() => {
        // Generate snowflakes only on client
        const flakes: Snowflake[] = Array.from({ length: 30 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            size: Math.random() * 8 + 4,
            duration: Math.random() * 10 + 10,
            delay: Math.random() * 10,
            opacity: Math.random() * 0.4 + 0.1,
        }));
        setSnowflakes(flakes);
    }, []);

    if (snowflakes.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {snowflakes.map((flake) => (
                <div
                    key={flake.id}
                    className="absolute text-white dark:text-white/80 animate-fall"
                    style={{
                        left: `${flake.left}%`,
                        fontSize: `${flake.size}px`,
                        opacity: flake.opacity,
                        animation: `fall ${flake.duration}s linear ${flake.delay}s infinite`,
                    }}
                >
                    ❄
                </div>
            ))}

            <style jsx>{`
                @keyframes fall {
                    0% {
                        transform: translateY(-20px) rotate(0deg);
                    }
                    100% {
                        transform: translateY(100vh) rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
}

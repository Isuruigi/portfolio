"use client";

import { useEffect, useState } from "react";

interface ConfettiPiece {
    id: number;
    left: number;
    size: number;
    duration: number;
    delay: number;
    opacity: number;
    color: string;
    rotation: number;
}

const colors = [
    "#FFD700", // Gold
    "#FFA500", // Orange
    "#FF69B4", // Pink
    "#00CED1", // Cyan
    "#9370DB", // Purple
    "#32CD32", // Lime Green
    "#FF6347", // Tomato Red
    "#87CEEB", // Sky Blue
];

export default function Confetti() {
    const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

    useEffect(() => {
        // Generate confetti only on client
        const pieces: ConfettiPiece[] = Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            size: Math.random() * 10 + 6,
            duration: Math.random() * 8 + 6,
            delay: Math.random() * 8,
            opacity: Math.random() * 0.6 + 0.3,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
        }));
        setConfetti(pieces);
    }, []);

    if (confetti.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {confetti.map((piece) => (
                <div
                    key={piece.id}
                    className="absolute animate-confetti"
                    style={{
                        left: `${piece.left}%`,
                        width: `${piece.size}px`,
                        height: `${piece.size * 0.6}px`,
                        opacity: piece.opacity,
                        backgroundColor: piece.color,
                        borderRadius: "2px",
                        animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s infinite`,
                        transform: `rotate(${piece.rotation}deg)`,
                    }}
                />
            ))}

            {/* Sparkle stars */}
            {confetti.slice(0, 15).map((piece) => (
                <div
                    key={`star-${piece.id}`}
                    className="absolute"
                    style={{
                        left: `${(piece.left + 50) % 100}%`,
                        fontSize: `${piece.size * 1.5}px`,
                        opacity: piece.opacity * 0.8,
                        animation: `sparkle ${piece.duration * 0.8}s ease-in-out ${piece.delay}s infinite`,
                    }}
                >
                    ✨
                </div>
            ))}

            <style jsx>{`
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(-20px) rotate(0deg);
                    }
                    25% {
                        transform: translateY(25vh) rotate(90deg) translateX(20px);
                    }
                    50% {
                        transform: translateY(50vh) rotate(180deg) translateX(-20px);
                    }
                    75% {
                        transform: translateY(75vh) rotate(270deg) translateX(20px);
                    }
                    100% {
                        transform: translateY(100vh) rotate(360deg);
                    }
                }
                @keyframes sparkle {
                    0%, 100% {
                        transform: translateY(-10px) scale(0.8);
                        opacity: 0.3;
                    }
                    50% {
                        transform: translateY(50vh) scale(1.2);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}

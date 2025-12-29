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
    "#C0C0C0", // Silver
    "#87CEEB", // Sky Blue
    "#9370DB", // Purple
];

export default function Confetti() {
    const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

    useEffect(() => {
        // Generate minimal confetti
        const pieces: ConfettiPiece[] = Array.from({ length: 12 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            size: Math.random() * 6 + 4,
            duration: Math.random() * 12 + 15,
            delay: Math.random() * 15,
            opacity: Math.random() * 0.25 + 0.1,
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
                    className="absolute"
                    style={{
                        left: `${piece.left}%`,
                        width: `${piece.size}px`,
                        height: `${piece.size * 0.5}px`,
                        opacity: piece.opacity,
                        backgroundColor: piece.color,
                        borderRadius: "1px",
                        animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s infinite`,
                        transform: `rotate(${piece.rotation}deg)`,
                    }}
                />
            ))}

            <style jsx>{`
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(-20px) rotate(0deg);
                    }
                    100% {
                        transform: translateY(100vh) rotate(180deg);
                    }
                }
            `}</style>
        </div>
    );
}

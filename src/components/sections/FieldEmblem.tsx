// A small moving emblem for each field-guide chapter: pure SVG and CSS, a few hundred bytes each.
// The motion runs only while the chapter is on screen (the parent adds .fg-live) and stops for
// visitors who ask for reduced motion. Each one says what the chapter is about in a single loop:
//   retrieval   documents orbit a question and light up as they're pulled in
//   agents      an orchestrator sends work to three workers and gets it back
//   harness     scaffolding rings steady a wobbling core
//   voice       a live waveform
//   serving     GPUs fill up while tokens stream out
//   quality     a gauge needle swings into the pass zone and a check mark draws
const STROKE = "var(--color-ember)";
const INK = "var(--color-ink)";

export default function FieldEmblem({ id, size = 96 }: { id: string; size?: number }) {
    return (
        <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" className="fg-emblem shrink-0 overflow-visible">
            <circle cx="60" cy="60" r="56" fill="none" stroke={INK} strokeOpacity="0.08" />
            {id === "retrieval" && (
                <>
                    <g className="fg-anim fg-spin" style={{ transformOrigin: "60px 60px" }}>
                        {Array.from({ length: 6 }, (_, i) => {
                            const a = (i / 6) * Math.PI * 2;
                            const x = 60 + Math.cos(a) * 40;
                            const y = 60 + Math.sin(a) * 40;
                            return (
                                <g key={i}>
                                    <line x1="60" y1="60" x2={x} y2={y} stroke={STROKE} strokeOpacity="0.35" strokeDasharray="2 4" className="fg-anim fg-dash" />
                                    <rect x={x - 6} y={y - 8} width="12" height="16" rx="2" fill="none" stroke={INK} strokeOpacity="0.55" />
                                    <rect x={x - 6} y={y - 8} width="12" height="16" rx="2" fill={STROKE} className="fg-anim fg-blink" style={{ animationDelay: `${i * 0.45}s` }} />
                                </g>
                            );
                        })}
                    </g>
                    <circle cx="60" cy="60" r="7" fill={STROKE} className="fg-anim fg-pulse" style={{ transformOrigin: "60px 60px" }} />
                </>
            )}
            {id === "agents" && (
                <>
                    {[
                        [25, 92],
                        [60, 98],
                        [95, 92],
                    ].map(([x, y], i) => (
                        <g key={i}>
                            <line x1="60" y1="32" x2={x} y2={y} stroke={INK} strokeOpacity="0.2" />
                            <rect x={x - 9} y={y - 9} width="18" height="18" rx="4" fill="none" stroke={INK} strokeOpacity="0.6" />
                            <circle r="3.5" fill={STROKE} className="fg-anim fg-travel" style={{ offsetPath: `path('M60 32 L${x} ${y}')`, animationDelay: `${i * 0.5}s` }} />
                        </g>
                    ))}
                    <rect x="47" y="19" width="26" height="26" rx="6" fill={STROKE} className="fg-anim fg-pulse" style={{ transformOrigin: "60px 32px" }} />
                </>
            )}
            {id === "harness" && (
                <>
                    <rect x="22" y="22" width="76" height="76" rx="14" fill="none" stroke={INK} strokeOpacity="0.25" strokeDasharray="6 5" className="fg-anim fg-spin" style={{ transformOrigin: "60px 60px" }} />
                    <rect x="34" y="34" width="52" height="52" rx="10" fill="none" stroke={STROKE} strokeOpacity="0.7" className="fg-anim fg-spin-rev" style={{ transformOrigin: "60px 60px" }} />
                    <circle cx="60" cy="60" r="10" fill={STROKE} className="fg-anim fg-wobble" style={{ transformOrigin: "60px 60px" }} />
                </>
            )}
            {id === "voice" && (
                <g>
                    {Array.from({ length: 11 }, (_, i) => (
                        <rect
                            key={i}
                            x={17 + i * 8}
                            y="34"
                            width="4.5"
                            height="52"
                            rx="2.25"
                            fill={i % 3 === 1 ? STROKE : INK}
                            fillOpacity={i % 3 === 1 ? 1 : 0.55}
                            className="fg-anim fg-bar"
                            style={{ transformOrigin: `${19 + i * 8}px 60px`, animationDelay: `${(i * 0.13) % 0.9}s`, animationDuration: `${0.8 + (i % 4) * 0.18}s` }}
                        />
                    ))}
                </g>
            )}
            {id === "serving" && (
                <>
                    <line x1="18" y1="26" x2="102" y2="26" stroke={INK} strokeOpacity="0.15" />
                    {[0, 1, 2].map((i) => (
                        <circle key={i} r="2.5" cy="26" fill={STROKE} className="fg-anim fg-stream" style={{ animationDelay: `${i * 0.6}s` }} />
                    ))}
                    {[0, 1, 2, 3].map((i) => (
                        <g key={i}>
                            <rect x={22 + i * 20} y="38" width="14" height="54" rx="3" fill="none" stroke={INK} strokeOpacity="0.5" />
                            <rect x={24 + i * 20} y="40" width="10" height="50" rx="2" fill={STROKE} className="fg-anim fg-fill" style={{ transformOrigin: `0 90px`, animationDelay: `${i * 0.35}s` }} />
                        </g>
                    ))}
                </>
            )}
            {id === "quality" && (
                <>
                    <path d="M22 78 A38 38 0 0 1 98 78" fill="none" stroke={INK} strokeOpacity="0.2" strokeWidth="6" strokeLinecap="round" />
                    <path d="M76 44 A38 38 0 0 1 98 78" fill="none" stroke={STROKE} strokeWidth="6" strokeLinecap="round" />
                    <line x1="60" y1="78" x2="60" y2="46" stroke={INK} strokeWidth="3" strokeLinecap="round" className="fg-anim fg-needle" style={{ transformOrigin: "60px 78px" }} />
                    <circle cx="60" cy="78" r="5" fill={INK} />
                    <path d="M48 98 l8 7 l16 -16" fill="none" stroke={STROKE} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" className="fg-anim fg-check" />
                </>
            )}
        </svg>
    );
}

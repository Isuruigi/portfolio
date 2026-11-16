"use client";

import { useEffect, useRef, type RefObject } from "react";
import { domains, projectNeurons } from "@/lib/data/forward-pass";
import { inferno } from "@/lib/inferno";

type Kind = "in" | "hidden" | "out";

interface Neuron {
    kind: Kind;
    x: number;
    y: number;
    a: number; // activation, decays towards 0
    restUntil: number; // refractory period after firing onward
}

interface Edge {
    from: number;
    to: number;
}

interface Pulse {
    edge: number;
    t: number; // 0..1 along the edge
    strength: number;
}

interface Ripple {
    born: number;
}

// Where the output neuron sits on the portrait, as a fraction of its box
const ANCHOR = { x: 0.25, y: 0.25 };
const PULSE_SPEED = 0.42; // px per ms
const DECAY_MS = 520;

interface Props {
    // The portrait element; the output neuron is placed at its shoulder
    anchorRef: RefObject<HTMLElement | null>;
}

export default function ForwardPass({ anchorRef }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const fontFamily =
            getComputedStyle(document.body).getPropertyValue("--font-host-grotesk").trim() || "sans-serif";

        let width = 0;
        let height = 0;
        let compact = false;
        let neurons: Neuron[] = [];
        let edges: Edge[] = [];
        let pulses: Pulse[] = [];
        let ripples: Ripple[] = [];
        let hovered = -1;
        let lastPointer = -Infinity;
        let nextAuto = 0;
        const inputCooldown: number[] = domains.map(() => 0);
        let running = false;
        let visible = true;
        let raf = 0;

        const inputStart = 0;
        const hiddenStart = domains.length;
        const outputIndex = domains.length + projectNeurons.length;

        function layout() {
            const rect = canvas!.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas!.width = Math.round(width * dpr);
            canvas!.height = Math.round(height * dpr);
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Output neuron at the portrait's shoulder, when the portrait is visible beside the text
            let outX = width * 0.82;
            let outY = height * 0.5;
            const anchor = anchorRef.current?.getBoundingClientRect();
            if (anchor && anchor.width > 0) {
                outX = anchor.left - rect.left + anchor.width * ANCHOR.x;
                outY = anchor.top - rect.top + anchor.height * ANCHOR.y;
            }

            compact = width < 1024;
            const inX = compact ? width * 0.08 : width * 0.53;
            const hidX = compact ? width * 0.45 : inX + (outX - inX) * 0.52;
            if (compact) {
                outX = width * 0.88;
                outY = height * 0.5;
            }

            const top = compact ? 0.18 : 0.24;
            const span = compact ? 0.64 : 0.52;
            const prev = neurons;
            neurons = [];
            domains.forEach((_, i) => {
                neurons.push({
                    kind: "in",
                    x: inX,
                    y: height * (top + (span * i) / (domains.length - 1)),
                    a: prev[inputStart + i]?.a ?? 0,
                    restUntil: 0,
                });
            });
            projectNeurons.forEach((_, i) => {
                const jitter = (i % 2 === 0 ? -1 : 1) * width * (compact ? 0.03 : 0.014);
                neurons.push({
                    kind: "hidden",
                    x: hidX + jitter,
                    y: height * ((compact ? 0.12 : 0.17) + ((compact ? 0.78 : 0.7) * i) / (projectNeurons.length - 1)),
                    a: prev[hiddenStart + i]?.a ?? 0,
                    restUntil: 0,
                });
            });
            neurons.push({ kind: "out", x: outX, y: outY, a: prev[outputIndex]?.a ?? 0, restUntil: 0 });

            edges = [];
            projectNeurons.forEach((p, j) => {
                p.domains.forEach((d) => {
                    const i = domains.findIndex((x) => x.id === d);
                    edges.push({ from: inputStart + i, to: hiddenStart + j });
                });
                edges.push({ from: hiddenStart + j, to: outputIndex });
            });
            pulses = [];
        }

        function edgeLength(e: Edge) {
            const a = neurons[e.from];
            const b = neurons[e.to];
            return Math.hypot(b.x - a.x, b.y - a.y);
        }

        function fireInput(i: number, now: number) {
            const n = neurons[inputStart + i];
            n.a = 1;
            inputCooldown[i] = now + 650;
            edges.forEach((e, k) => {
                if (e.from === inputStart + i) pulses.push({ edge: k, t: 0, strength: 1 });
            });
        }

        function arrive(index: number, strength: number, now: number) {
            const n = neurons[index];
            n.a = Math.min(1, n.a + 0.6 * strength);
            if (n.kind === "hidden" && now > n.restUntil) {
                n.restUntil = now + 450;
                edges.forEach((e, k) => {
                    if (e.from === index) pulses.push({ edge: k, t: 0, strength: strength * 0.9 });
                });
            } else if (n.kind === "out") {
                ripples.push({ born: now });
            }
        }

        function onPath(e: Edge) {
            return hovered >= 0 && (e.from === hovered || e.to === hovered);
        }

        function draw(now: number) {
            ctx!.clearRect(0, 0, width, height);
            // On narrow screens the network sits behind the text, so keep it faint
            ctx!.globalAlpha = compact ? 0.35 : 1;

            // Edges
            edges.forEach((e) => {
                const a = neurons[e.from];
                const b = neurons[e.to];
                const lit = onPath(e);
                ctx!.strokeStyle = lit ? inferno(0.62, 0.6) : "rgba(163,160,176,0.08)";
                ctx!.lineWidth = lit ? 1.4 : 1;
                ctx!.beginPath();
                ctx!.moveTo(a.x, a.y);
                ctx!.lineTo(b.x, b.y);
                ctx!.stroke();
            });

            // Signals travelling along edges
            pulses.forEach((p) => {
                const e = edges[p.edge];
                const a = neurons[e.from];
                const b = neurons[e.to];
                const x = a.x + (b.x - a.x) * p.t;
                const y = a.y + (b.y - a.y) * p.t;
                const tail = Math.max(0, p.t - 0.18);
                ctx!.strokeStyle = inferno(0.55, 0.35 * p.strength);
                ctx!.lineWidth = 1.6;
                ctx!.beginPath();
                ctx!.moveTo(a.x + (b.x - a.x) * tail, a.y + (b.y - a.y) * tail);
                ctx!.lineTo(x, y);
                ctx!.stroke();
                ctx!.fillStyle = inferno(0.86, p.strength);
                ctx!.shadowColor = inferno(0.8, 0.9);
                ctx!.shadowBlur = 12;
                ctx!.beginPath();
                ctx!.arc(x, y, 2.2, 0, Math.PI * 2);
                ctx!.fill();
                ctx!.shadowBlur = 0;
            });

            // Ripples where signals reach the portrait
            ripples = ripples.filter((r) => now - r.born < 1400);
            const out = neurons[outputIndex];
            ripples.forEach((r) => {
                const k = (now - r.born) / 1400;
                ctx!.strokeStyle = inferno(0.82, 0.5 * (1 - k));
                ctx!.lineWidth = 1.2;
                ctx!.beginPath();
                ctx!.arc(out.x, out.y, 7 + k * 46, 0, Math.PI * 2);
                ctx!.stroke();
            });

            // Neurons
            neurons.forEach((n, i) => {
                const r = n.kind === "out" ? 6 : n.kind === "hidden" ? 4.2 : 3.6;
                const heat = i === hovered ? Math.max(n.a, 0.75) : n.a;
                ctx!.fillStyle = heat > 0.03 ? inferno(0.3 + 0.7 * heat) : "#2a2140";
                ctx!.shadowColor = inferno(0.8, 0.9);
                ctx!.shadowBlur = 20 * heat;
                ctx!.beginPath();
                ctx!.arc(n.x, n.y, r + heat * 2.4, 0, Math.PI * 2);
                ctx!.fill();
                ctx!.shadowBlur = 0;
                ctx!.strokeStyle = "rgba(236,233,241,0.16)";
                ctx!.lineWidth = 1;
                ctx!.stroke();
            });

            // Input labels, to the left of each input neuron
            if (!compact) {
                ctx!.font = `400 13px ${fontFamily}`;
                ctx!.textAlign = "right";
                ctx!.textBaseline = "middle";
                domains.forEach((d, i) => {
                    const n = neurons[inputStart + i];
                    ctx!.fillStyle = n.a > 0.3 ? inferno(0.5 + 0.5 * n.a) : "rgba(163,160,176,0.85)";
                    ctx!.fillText(d.label, n.x - 14, n.y);
                });
            }

            // Hovered project: name and one real result
            if (!compact && hovered >= hiddenStart && hovered < outputIndex) {
                const p = projectNeurons[hovered - hiddenStart];
                const n = neurons[hovered];
                ctx!.textAlign = "left";
                ctx!.textBaseline = "alphabetic";
                ctx!.font = `500 15px ${fontFamily}`;
                const nameW = ctx!.measureText(p.name).width;
                ctx!.font = `400 12.5px ${fontFamily}`;
                const resW = ctx!.measureText(p.result).width;
                const boxW = Math.max(nameW, resW) + 24;
                const boxH = 52;
                let bx = n.x + 16;
                if (bx + boxW > width - 12) bx = n.x - 16 - boxW;
                const by = Math.min(Math.max(n.y - boxH / 2, 8), height - boxH - 8);
                ctx!.fillStyle = "rgba(8,6,16,0.92)";
                ctx!.strokeStyle = inferno(0.6, 0.6);
                ctx!.beginPath();
                ctx!.roundRect(bx, by, boxW, boxH, 8);
                ctx!.fill();
                ctx!.stroke();
                ctx!.fillStyle = "#ece9f1";
                ctx!.font = `500 15px ${fontFamily}`;
                ctx!.fillText(p.name, bx + 12, by + 22);
                ctx!.fillStyle = "rgba(163,160,176,1)";
                ctx!.font = `400 12.5px ${fontFamily}`;
                ctx!.fillText(p.result, bx + 12, by + 40);
            }
            ctx!.globalAlpha = 1;
        }

        let last = performance.now();
        function frame(now: number) {
            const dt = Math.min(50, now - last);
            last = now;

            // Idle: the network keeps firing on its own
            if (now - lastPointer > 2600 && now > nextAuto) {
                fireInput(Math.floor(Math.random() * domains.length), now);
                nextAuto = now + 1100 + Math.random() * 900;
            }

            pulses.forEach((p) => {
                p.t += (dt * PULSE_SPEED) / Math.max(40, edgeLength(edges[p.edge]));
            });
            const arrived = pulses.filter((p) => p.t >= 1);
            pulses = pulses.filter((p) => p.t < 1);
            arrived.forEach((p) => arrive(edges[p.edge].to, p.strength, now));

            const decay = Math.exp(-dt / DECAY_MS);
            neurons.forEach((n) => {
                n.a *= decay;
            });

            draw(now);
            if (running) raf = requestAnimationFrame(frame);
        }

        function start() {
            if (reduceMotion || running || !visible || document.hidden) return;
            running = true;
            last = performance.now();
            raf = requestAnimationFrame(frame);
        }

        function stop() {
            running = false;
            cancelAnimationFrame(raf);
        }

        // A still frame for reduced motion: one project's path lit
        function drawStill() {
            neurons.forEach((n) => (n.a = 0));
            const j = hiddenStart;
            neurons[j].a = 0.9;
            neurons[outputIndex].a = 0.7;
            projectNeurons[0].domains.forEach((d) => {
                neurons[domains.findIndex((x) => x.id === d)].a = 0.8;
            });
            draw(performance.now());
        }

        function onPointerMove(ev: PointerEvent) {
            const rect = canvas!.getBoundingClientRect();
            const x = ev.clientX - rect.left;
            const y = ev.clientY - rect.top;
            if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
                if (hovered !== -1) {
                    hovered = -1;
                    if (reduceMotion) drawStill();
                }
                return;
            }
            const now = performance.now();
            lastPointer = now;

            let nearest = -1;
            let best = Infinity;
            neurons.forEach((n, i) => {
                const d = Math.hypot(n.x - x, n.y - y);
                if (d < best) {
                    best = d;
                    nearest = i;
                }
            });
            const n = neurons[nearest];
            if (n.kind === "in" && best < 36 && !reduceMotion) {
                const i = nearest - inputStart;
                if (now > inputCooldown[i]) fireInput(i, now);
            }
            const nextHover = n.kind === "hidden" && best < 26 ? nearest : -1;
            if (nextHover !== hovered) {
                hovered = nextHover;
                if (reduceMotion) drawStill();
            }
        }

        layout();
        if (reduceMotion) drawStill();

        const resize = new ResizeObserver(() => {
            layout();
            if (reduceMotion) drawStill();
        });
        resize.observe(canvas);
        if (anchorRef.current) resize.observe(anchorRef.current);

        const io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) start();
            else stop();
        });
        io.observe(canvas);

        const onVisibility = () => (document.hidden ? stop() : start());
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        start();

        return () => {
            stop();
            resize.disconnect();
            io.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pointermove", onPointerMove);
        };
    }, [anchorRef]);

    return (
        <>
            <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full pointer-events-none" />
            <p className="sr-only">
                A neural network animation connects five domains, {domains.map((d) => d.label).join(", ")}, through{" "}
                {projectNeurons.length} projects to Isuru&apos;s portrait.
            </p>
        </>
    );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import type { FunctionCall, LiveServerMessage, Session } from "@google/genai";
import { AGENT_API, AGENT_NAME } from "@/lib/agent";

export interface CallTurn {
    role: "user" | "assistant";
    text: string;
}

type CallState = "idle" | "connecting" | "live" | "error";

const OUTPUT_RATE = 24000;
const CALL_OPENER = "(The visitor just joined the call.)";

function toBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

function pcmFromBase64(data: string) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Int16Array(bytes.buffer);
}

function rms(analyser: AnalyserNode | undefined, scratch: Float32Array<ArrayBuffer>) {
    if (!analyser) return 0;
    analyser.getFloatTimeDomainData(scratch);
    let sum = 0;
    for (let i = 0; i < scratch.length; i++) sum += scratch[i] * scratch[i];
    return Math.sqrt(sum / scratch.length);
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

interface Live {
    session?: Session;
    mic?: MediaStream;
    inCtx?: AudioContext;
    outCtx?: AudioContext;
    node?: AudioWorkletNode;
    inAnalyser?: AnalyserNode;
    outAnalyser?: AnalyserNode;
    sources: Set<AudioBufferSourceNode>;
    nextTime: number;
    turns: CallTurn[];
    started: number;
    timer?: number;
    raf?: number;
    muted: boolean;
    ending: boolean;
}

interface Props {
    // Called with the transcript when a call ends, so the chat can keep it
    onEnd: (turns: CallTurn[], seconds: number) => void;
}

export default function VoiceCall({ onEnd }: Props) {
    const [state, setState] = useState<CallState>("idle");
    const [error, setError] = useState("");
    const [muted, setMuted] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [captions, setCaptions] = useState<CallTurn[]>([]);
    const [elapsed, setElapsed] = useState(0);
    const [limit, setLimit] = useState(180);
    const orbRef = useRef<HTMLDivElement>(null);
    const onEndRef = useRef(onEnd);
    const live = useRef<Live>({ sources: new Set(), nextTime: 0, turns: [], started: 0, muted: false, ending: false });

    useEffect(() => {
        onEndRef.current = onEnd;
    }, [onEnd]);

    function stopPlayback() {
        const l = live.current;
        l.sources.forEach((s) => {
            try {
                s.stop();
            } catch {
                // already stopped
            }
        });
        l.sources.clear();
        l.nextTime = 0;
        setSpeaking(false);
    }

    function teardown() {
        const l = live.current;
        try {
            l.session?.close();
        } catch {
            // already closed
        }
        l.mic?.getTracks().forEach((t) => t.stop());
        l.node?.port.close();
        stopPlayback();
        l.inCtx?.close().catch(() => {});
        l.outCtx?.close().catch(() => {});
        if (l.timer) clearInterval(l.timer);
        if (l.raf) cancelAnimationFrame(l.raf);
        live.current = { sources: new Set(), nextTime: 0, turns: l.turns, started: l.started, muted: false, ending: true };
    }

    function endCall(notify = true) {
        const l = live.current;
        if (l.ending) return;
        l.ending = true;
        const seconds = l.started ? Math.round((Date.now() - l.started) / 1000) : 0;
        const turns = l.turns.filter((t) => t.text.trim());
        teardown();
        setState("idle");
        setMuted(false);
        if (notify && turns.length) onEndRef.current(turns, seconds);
    }

    // End the call if the panel closes mid-call
    useEffect(() => () => endCall(false), []); // eslint-disable-line react-hooks/exhaustive-deps

    function addCaption(role: CallTurn["role"], text: string) {
        const turns = live.current.turns;
        const last = turns[turns.length - 1];
        if (last && last.role === role) last.text += text;
        else turns.push({ role, text });
        setCaptions(turns.slice(-3).map((t) => ({ ...t })));
    }

    function play(data: string) {
        const l = live.current;
        if (!l.outCtx || !l.outAnalyser) return;
        const pcm = pcmFromBase64(data);
        const buffer = l.outCtx.createBuffer(1, pcm.length, OUTPUT_RATE);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 0x8000;
        const source = l.outCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(l.outAnalyser);
        const at = Math.max(l.outCtx.currentTime, l.nextTime);
        source.start(at);
        l.nextTime = at + buffer.duration;
        l.sources.add(source);
        setSpeaking(true);
        source.onended = () => {
            l.sources.delete(source);
            if (l.sources.size === 0) setSpeaking(false);
        };
    }

    // The agent's actions on the page
    function runTools(calls: FunctionCall[]) {
        const l = live.current;
        const responses = calls.map((fc) => {
            const args = (fc.args ?? {}) as Record<string, string>;
            let result = "ok";
            if (fc.name === "navigate_to_section") {
                const el = document.getElementById(args.section);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                else result = "That section isn't on this page.";
            } else if (fc.name === "open_contact") {
                window.dispatchEvent(new CustomEvent("contact-door", { detail: args.door }));
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
            } else if (fc.name === "end_call") {
                // Let the goodbye finish playing first
                const remaining = l.outCtx ? Math.max(0, l.nextTime - l.outCtx.currentTime) : 0;
                setTimeout(() => endCall(), remaining * 1000 + 600);
            }
            return { id: fc.id, name: fc.name, response: { result } };
        });
        l.session?.sendToolResponse({ functionResponses: responses });
    }

    function onMessage(m: LiveServerMessage) {
        const sc = m.serverContent;
        if (sc?.interrupted) stopPlayback();
        sc?.modelTurn?.parts?.forEach((p) => {
            if (p.inlineData?.data) play(p.inlineData.data);
        });
        if (sc?.inputTranscription?.text) addCaption("user", sc.inputTranscription.text);
        if (sc?.outputTranscription?.text) addCaption("assistant", sc.outputTranscription.text);
        if (m.toolCall?.functionCalls?.length) runTools(m.toolCall.functionCalls);
        if (m.goAway) endCall();
    }

    // The orb follows whoever is talking
    function animate() {
        const l = live.current;
        const scratch = new Float32Array(512);
        const tick = () => {
            const level = Math.min(1, Math.max(rms(l.inAnalyser, scratch) * 4, rms(l.outAnalyser, scratch) * 5));
            orbRef.current?.style.setProperty("--level", level.toFixed(3));
            l.raf = requestAnimationFrame(tick);
        };
        l.raf = requestAnimationFrame(tick);
    }

    async function startCall() {
        setError("");
        setCaptions([]);
        setElapsed(0);
        setState("connecting");
        live.current = { sources: new Set(), nextTime: 0, turns: [], started: 0, muted: false, ending: false };
        const l = live.current;

        try {
            const res = await fetch(`${AGENT_API}/voice/token`, { method: "POST" });
            const issued = await res.json().catch(() => ({}));
            if (!res.ok || !issued.token) throw new Error(issued.detail || "Couldn't start a call right now. Chat still works.");
            setLimit(issued.max_seconds ?? 180);

            l.mic = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
            });

            // Capture at 16 kHz where the browser allows it; otherwise send the native rate
            let inCtx = new AudioContext({ sampleRate: 16000 });
            let source: MediaStreamAudioSourceNode;
            try {
                source = inCtx.createMediaStreamSource(l.mic);
            } catch {
                await inCtx.close();
                inCtx = new AudioContext();
                source = inCtx.createMediaStreamSource(l.mic);
            }
            l.inCtx = inCtx;
            await inCtx.audioWorklet.addModule("/worklets/pcm-capture.js");
            l.node = new AudioWorkletNode(inCtx, "pcm-capture");
            l.inAnalyser = inCtx.createAnalyser();
            const silent = inCtx.createGain();
            silent.gain.value = 0;
            source.connect(l.inAnalyser);
            source.connect(l.node);
            l.node.connect(silent).connect(inCtx.destination);

            l.outCtx = new AudioContext({ sampleRate: OUTPUT_RATE });
            l.outAnalyser = l.outCtx.createAnalyser();
            l.outAnalyser.connect(l.outCtx.destination);

            // The SDK only loads when someone actually calls
            const { GoogleGenAI, Modality } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey: issued.token, httpOptions: { apiVersion: "v1alpha" } });
            l.session = await ai.live.connect({
                model: issued.model,
                config: { responseModalities: [Modality.AUDIO] },
                callbacks: {
                    onmessage: onMessage,
                    onerror: () => {
                        setError("The call dropped. You can try again or keep chatting.");
                        endCall();
                    },
                    onclose: () => endCall(),
                },
            });

            const rate = inCtx.sampleRate;
            l.node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
                if (l.muted || l.ending || !l.session) return;
                l.session.sendRealtimeInput({ audio: { data: toBase64(e.data), mimeType: `audio/pcm;rate=${rate}` } });
            };

            l.session.sendClientContent({ turns: [{ role: "user", parts: [{ text: CALL_OPENER }] }], turnComplete: true });

            l.started = Date.now();
            const max = issued.max_seconds ?? 180;
            l.timer = window.setInterval(() => {
                const s = Math.round((Date.now() - l.started) / 1000);
                setElapsed(s);
                if (s >= max) endCall();
            }, 1000);
            animate();
            setState("live");
        } catch (e) {
            const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
            teardown();
            setError(
                denied
                    ? "Microphone access is blocked. Allow it in your browser to call, or type in the chat."
                    : e instanceof Error
                      ? e.message
                      : "Couldn't start a call right now. Chat still works."
            );
            setState("error");
        }
    }

    function toggleMute() {
        const next = !live.current.muted;
        live.current.muted = next;
        live.current.mic?.getAudioTracks().forEach((t) => (t.enabled = !next));
        if (next) live.current.session?.sendRealtimeInput({ audioStreamEnd: true });
        setMuted(next);
    }

    const isLive = state === "live";
    const status =
        state === "connecting"
            ? `Connecting to ${AGENT_NAME}…`
            : isLive
              ? speaking
                  ? `${AGENT_NAME} is speaking`
                  : muted
                    ? "You're muted"
                    : "Listening"
              : `Talk to ${AGENT_NAME}`;

    return (
        <div className="flex flex-1 flex-col items-center px-5 pb-5 pt-8">
            <div
                ref={orbRef}
                data-speaking={speaking}
                data-live={isLive}
                aria-hidden="true"
                className="agent-orb relative h-40 w-40 shrink-0"
            >
                <span className="agent-orb-ring absolute inset-0 rounded-full" />
                <span className="agent-orb-core absolute inset-5 rounded-full" />
            </div>

            <p className="mt-6 font-display text-xl font-light tracking-[-0.01em] text-ink" aria-live="polite">
                {status}
            </p>
            {isLive && (
                <p className="mt-1 font-mono text-[11px] text-ash">
                    {formatTime(elapsed)} / {formatTime(limit)}
                </p>
            )}

            <div className="mt-5 min-h-[5.5rem] w-full space-y-1.5 text-center text-sm leading-relaxed" aria-live="polite">
                {captions.map((c, i) => (
                    <p key={i} className={c.role === "assistant" ? "text-ink/90" : "text-ash"}>
                        {c.role === "user" ? "You: " : ""}
                        {c.text}
                    </p>
                ))}
                {!isLive && state !== "connecting" && !error && (
                    <p className="text-ash">
                        Ask about Isuru&apos;s projects, how he works, or say &ldquo;show me PersonaPlex&rdquo; and {AGENT_NAME} will take you there.
                    </p>
                )}
                {error && <p className="text-inferno-3">{error}</p>}
            </div>

            <div className="mt-auto flex w-full flex-col items-center gap-3 pt-4">
                {isLive ? (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={toggleMute}
                            aria-pressed={muted}
                            className="flex h-12 cursor-pointer items-center gap-2 rounded-full border border-white/15 px-5 text-sm text-ink transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-ember"
                        >
                            {muted ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                            {muted ? "Unmute" : "Mute"}
                        </button>
                        <button
                            type="button"
                            onClick={() => endCall()}
                            className="flex h-12 cursor-pointer items-center gap-2 rounded-full bg-inferno-3 px-5 text-sm font-medium text-void transition-colors hover:bg-ember focus-visible:outline-2 focus-visible:outline-ember"
                        >
                            <PhoneOff className="h-4 w-4" aria-hidden="true" />
                            End call
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={startCall}
                        disabled={state === "connecting"}
                        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ember text-sm font-medium text-void transition-colors hover:bg-inferno-5 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
                    >
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        {state === "connecting" ? "Connecting…" : "Start a voice call"}
                    </button>
                )}
                <p className="text-center text-[11px] leading-snug text-ash/80">
                    English for now. Uses your microphone; audio goes to Google&apos;s Gemini Live API. Calls end after {formatTime(limit)}.
                </p>
            </div>
        </div>
    );
}

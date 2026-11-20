"use client";

// Face to face with Axon: a video avatar made from Isuru's portrait, in a private LiveKit room.
//
// The site hands out a room token (functions/api/avatar/token.js); joining that room summons the
// avatar agent (avatar-agent/), whose face is rendered by Anam. The avatar's video and voice arrive as ordinary media tracks, its
// words as a text stream, and it acts on this page through three RPC methods registered below.
// The video library (~600 KB) is loaded only when someone starts a call, so nobody else pays for it.
import { useEffect, useRef, useState } from "react";
import type { Room } from "livekit-client";
import { Mic, MicOff, PhoneOff, Video } from "lucide-react";
import AxonFace from "@/components/chat/AxonFace";
import type { CallTurn } from "@/components/chat/VoiceCall";
import { AGENT_API } from "@/lib/agent";

type CallState = "idle" | "connecting" | "waking" | "live" | "error";

// The avatar takes a few seconds to appear. A line that moves along reads as someone getting
// ready; a bare spinner reads as a fault.
const WAKING = ["Connecting you…", "Setting up the camera…", "Nearly there, the avatar is joining…", "Still getting ready, thanks for waiting…"];

// An error whose message was written for visitors (it came from our own token endpoint).
// Anything else (a LiveKit connection error, a network failure) gets plain wording instead.
class FriendlyError extends Error {}
const GENERIC = "Couldn't start a face-to-face call right now. Voice and chat still work.";

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

interface Props {
    // Called with the transcript when a call ends, so the chat can keep it
    onEnd: (turns: CallTurn[], seconds: number) => void;
}

export default function AvatarCall({ onEnd }: Props) {
    const [state, setState] = useState<CallState>("idle");
    const [error, setError] = useState("");
    const [muted, setMuted] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [limit, setLimit] = useState(150);
    const [wake, setWake] = useState(0);
    const [caption, setCaption] = useState<CallTurn | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLDivElement>(null);
    const call = useRef<{ room?: Room; turns: Map<string, CallTurn>; started: number; ending: boolean }>({ turns: new Map(), started: 0, ending: false });

    function endCall(notify = true) {
        const c = call.current;
        if (c.ending) return;
        c.ending = true;
        c.room?.disconnect().catch(() => {});
        audioRef.current?.replaceChildren();
        const seconds = c.started ? Math.round((Date.now() - c.started) / 1000) : 0;
        const turns = [...c.turns.values()].filter((t) => t.text.trim());
        call.current = { turns: new Map(), started: 0, ending: false };
        setState("idle");
        setCaption(null);
        setElapsed(0);
        setMuted(false);
        if (notify && turns.length) onEnd(turns, seconds);
    }

    // Leaving the tab or closing the console ends the call: never leave a paid video running
    useEffect(() => () => endCall(false), []); // eslint-disable-line react-hooks/exhaustive-deps

    // Clock, and the hard stop at the call limit
    useEffect(() => {
        if (state !== "live") return;
        const t = setInterval(() => {
            const s = Math.round((Date.now() - call.current.started) / 1000);
            setElapsed(s);
            if (s >= limit) endCall();
        }, 500);
        return () => clearInterval(t);
    }, [state, limit]); // eslint-disable-line react-hooks/exhaustive-deps

    // Waiting lines while the avatar boots
    useEffect(() => {
        if (state !== "connecting" && state !== "waking") return;
        const t = setInterval(() => setWake((w) => Math.min(WAKING.length - 1, w + 1)), 3500);
        return () => clearInterval(t);
    }, [state]);

    async function startCall() {
        setError("");
        setWake(0);
        setState("connecting");
        const c = call.current;
        try {
            const res = await fetch(`${AGENT_API}/avatar/token`, { method: "POST" });
            const issued = await res.json().catch(() => ({}));
            if (!res.ok || !issued.token) throw new FriendlyError(issued.detail || GENERIC);
            setLimit(issued.max_seconds ?? 150);

            const { Room, RoomEvent, Track } = await import("livekit-client");
            const room = new Room({ adaptiveStream: true });
            c.room = room;

            room.on(RoomEvent.TrackSubscribed, (track) => {
                if (track.kind === Track.Kind.Video && videoRef.current) {
                    track.attach(videoRef.current);
                    if (!c.started) c.started = Date.now();
                    setState("live");
                } else if (track.kind === Track.Kind.Audio) {
                    audioRef.current?.appendChild(track.attach());
                }
            });
            room.on(RoomEvent.Disconnected, () => endCall());

            // What was said, by whom, streamed as it is spoken
            room.registerTextStreamHandler("lk.transcription", async (reader, from) => {
                const id = reader.info.attributes?.["lk.segment_id"] || reader.info.id;
                const turn: CallTurn = { role: from.identity === room.localParticipant.identity ? "user" : "assistant", text: "" };
                c.turns.set(id, turn);
                try {
                    for await (const chunk of reader) {
                        turn.text += chunk;
                        setCaption({ ...turn });
                    }
                } catch {
                    // a stream cut short by a disconnect: keep what arrived
                }
            });

            // The avatar's hands on this page
            room.registerRpcMethod("axon.navigate", async ({ payload }) => {
                const { section } = JSON.parse(payload || "{}");
                const el = typeof section === "string" ? document.getElementById(section) : null;
                if (!el) return "That section isn't on this page.";
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                return "Scrolled there. The call window is still open on top of the page.";
            });
            room.registerRpcMethod("axon.contact", async ({ payload }) => {
                const { door } = JSON.parse(payload || "{}");
                window.dispatchEvent(new CustomEvent("contact-door", { detail: door }));
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
                return "The contact form is open with the right subject. They will see it when the call ends.";
            });
            room.registerRpcMethod("axon.end", async () => {
                setTimeout(() => endCall(), 3500); // let the goodbye finish
                return "Ending the call.";
            });

            await room.connect(issued.url, issued.token);
            if (c.ending || c.room !== room) return void room.disconnect();
            await room.startAudio().catch(() => {});
            await room.localParticipant.setMicrophoneEnabled(true);
            setState((s) => (s === "connecting" ? "waking" : s));

            // The avatar should be on screen within seconds; if it never arrives, don't hold the visitor
            setTimeout(() => {
                if (call.current.room === room && !call.current.started) {
                    endCall(false);
                    setError("The avatar didn't join in time. You can try again, or use voice or chat.");
                    setState("error");
                }
            }, 30000);
        } catch (e) {
            c.room?.disconnect().catch(() => {});
            call.current = { turns: new Map(), started: 0, ending: false };
            const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "NotFoundError");
            setError(denied ? "Axon needs your microphone for a face-to-face call. Allow it in your browser and try again." : e instanceof FriendlyError ? e.message : GENERIC);
            setState("error");
        }
    }

    async function toggleMute() {
        const next = !muted;
        await call.current.room?.localParticipant.setMicrophoneEnabled(!next).catch(() => {});
        setMuted(next);
    }

    const isLive = state === "live";
    const busy = state === "connecting" || state === "waking";

    return (
        <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 pb-5 pt-4">
            {/* 368x560 is the avatar's native frame */}
            <div className="relative aspect-[368/560] w-full max-w-[250px] shrink-0 overflow-hidden rounded-3xl border border-fg/10 bg-surface sm:max-w-[280px]">
                <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover transition-opacity duration-700 ${isLive ? "opacity-100" : "opacity-0"}`} />
                {!isLive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                        <AxonFace size={84} state={busy ? "thinking" : "idle"} />
                        {busy && (
                            <p key={wake} className="text-sm text-ash motion-safe:animate-[fadein_300ms_ease]" aria-live="polite">
                                {WAKING[wake]}
                            </p>
                        )}
                    </div>
                )}
                {isLive && (
                    <>
                        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] text-ink backdrop-blur">AI avatar · not live video</span>
                        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] text-ink backdrop-blur">
                            {formatTime(elapsed)} / {formatTime(limit)}
                        </span>
                    </>
                )}
            </div>
            <div ref={audioRef} className="hidden" />

            <div className="mt-4 min-h-[4.5rem] w-full max-w-md text-center text-sm leading-relaxed" aria-live="polite">
                {isLive && caption && (
                    <p className={caption.role === "assistant" ? "text-ink/90" : "text-ash"}>
                        {caption.role === "user" ? "You: " : ""}
                        {caption.text}
                    </p>
                )}
                {state === "idle" && <p className="text-ash">Talk face to face with an AI avatar of Isuru. It answers from the same real work as the chat, and tells you it&apos;s an AI.</p>}
                {error && <p className="text-inferno-3">{error}</p>}
            </div>

            <div className="mt-auto flex w-full flex-col items-center gap-3 pt-3">
                {isLive || busy ? (
                    <div className="flex gap-3">
                        {isLive && (
                            <button
                                type="button"
                                onClick={toggleMute}
                                aria-pressed={muted}
                                className="flex h-12 cursor-pointer items-center gap-2 rounded-full border border-fg/15 px-5 text-sm text-ink transition-colors hover:bg-fg/5 focus-visible:outline-2 focus-visible:outline-ember"
                            >
                                {muted ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                                {muted ? "Unmute" : "Mute"}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => endCall()}
                            className="flex h-12 cursor-pointer items-center gap-2 rounded-full bg-inferno-3 px-5 text-sm font-medium text-white transition-colors hover:bg-inferno-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
                        >
                            <PhoneOff className="h-4 w-4" aria-hidden="true" />
                            {isLive ? "End call" : "Cancel"}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={startCall}
                        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ember text-sm font-medium text-on-ember transition-colors hover:bg-inferno-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
                    >
                        <Video className="h-4 w-4" aria-hidden="true" />
                        Start a face-to-face call
                    </button>
                )}
                <p className="text-center text-[11px] leading-relaxed text-ash">
                    English for now. Uses your microphone, not your camera. Video by Anam on LiveKit; Deepgram hears you and ElevenLabs gives Axon its voice. Calls end after {formatTime(limit)}.
                </p>
            </div>
        </div>
    );
}

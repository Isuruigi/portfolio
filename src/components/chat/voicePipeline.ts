// The voice call's pipeline: ears, brain and voice as three separate services.
//   ears   the microphone streams to Deepgram (nova-3) over a WebSocket opened with a 30-second
//          token from /api/voice/token; Deepgram's endpointing says when the caller has finished
//   brain  the finished sentence goes to /api/chat, the same knowledge-grounded agent as the chat,
//          asked for a short spoken reply (with page actions as [[tags]])
//   voice  first, /api/voice/match picks one of Axon's recorded answers (voice-library.json), which
//          plays at once in Axon's exact ElevenLabs voice, free, with or without a subscription.
//          Otherwise the agent answers live: the reply is cut into sentences as it streams and each
//          one is spoken via /api/voice/tts while the next is fetched. If live speech isn't available
//          (no ElevenLabs plan, or today's allowance is spent), the answer shows as text and Axon says,
//          in its recorded voice, that it's on screen. The caller only ever hears Axon's voice
// The caller can cut in: as soon as Deepgram hears words while Axon is talking, playback stops and
// the pending reply is dropped. If the voice allowance runs out, the browser's own voice takes over.
import type { CallTurn } from "@/components/chat/VoiceCall";
import LIBRARY from "@/lib/data/voice-library.json";

type LineId = keyof typeof LIBRARY;

export type PipelineAction = { type: "go" | "contact"; value: string } | { type: "end" };

export interface PipelineHooks {
    /** Show a caption; `replace` updates the current line instead of adding to it */
    caption: (role: CallTurn["role"], text: string, replace?: boolean) => void;
    speaking: (on: boolean) => void;
    thinking: (on: boolean) => void;
    action: (a: PipelineAction) => void;
    fail: (message: string) => void;
}

interface Options {
    api: string;
    stt: { token: string; model: string; language: string };
    node: AudioWorkletNode;
    sampleRate: number;
    outCtx: AudioContext;
    out: AudioNode;
    hooks: PipelineHooks;
    greeting: string;
}

const TAG = /\[\[(go|contact):([a-z]+)\]\]|\[\[end\]\]/g;

export function startPipeline(o: Options) {
    const { hooks } = o;
    const history: { role: CallTurn["role"]; content: string }[] = [];
    let ws: WebSocket | null = null;
    let muted = false;
    let closed = false;
    let heard = ""; // final words of the caller's current turn
    let reply: AbortController | null = null;
    let sources = new Set<AudioBufferSourceNode>();
    let nextTime = 0;
    let chain: Promise<void> = Promise.resolve();
    let noLive = false; // live speech isn't available today: lean on the recordings
    let voicePin = ""; // the live voice this call started with ("elevenlabs" or "backup")
    let pointedAtScreen = false; // this answer already played the "it's on your screen" line
    let pendingEnd = false;
    let keepAlive = 0;

    // ---------- voice ----------
    const setSpeaking = () => hooks.speaking(sources.size > 0);

    function schedule(buffer: AudioBuffer) {
        const src = o.outCtx.createBufferSource();
        src.buffer = buffer;
        src.connect(o.out);
        const at = Math.max(o.outCtx.currentTime + 0.02, nextTime);
        src.start(at);
        nextTime = at + buffer.duration;
        sources.add(src);
        setSpeaking();
        src.onended = () => {
            sources.delete(src);
            setSpeaking();
            if (sources.size === 0 && pendingEnd) hooks.action({ type: "end" });
        };
    }

    /** Queue one of Axon's recordings (fetched now, played after anything queued before it) */
    function playRecording(id: LineId, signal: AbortSignal) {
        const audio = fetch(LIBRARY[id].file, { signal })
            .then(async (r) => (r.ok ? o.outCtx.decodeAudioData(await r.arrayBuffer()) : null))
            .catch(() => null);
        chain = chain.then(async () => {
            if (signal.aborted) return;
            const buffer = await audio;
            if (!signal.aborted && buffer) schedule(buffer);
        });
    }

    /** Live speech failed for this answer: say once, in Axon's recorded voice, that it's on screen */
    function pointAtScreen(signal: AbortSignal) {
        if (pointedAtScreen) return;
        pointedAtScreen = true;
        playRecording("onscreen", signal);
    }

    /** Queue one sentence: fetch its audio now, play it after everything queued before it */
    function say(text: string, signal: AbortSignal) {
        const clean = text.replace(TAG, "").trim();
        if (!clean) return;
        if (noLive) return pointAtScreen(signal);
        const audio = noLive
            ? Promise.resolve(null)
            : fetch(`${o.api}/voice/tts`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text: clean, prefer: voicePin || undefined }),
                  signal,
              })
                  .then(async (r) => {
                      // A spent allowance or no plan: the rest of the call leans on the recordings
                      if (r.status === 429) noLive = true;
                      if (!r.ok) return null;
                      voicePin = r.headers.get("X-Axon-Voice") || voicePin;
                      return o.outCtx.decodeAudioData(await r.arrayBuffer());
                  })
                  .catch(() => null);
        chain = chain.then(async () => {
            if (signal.aborted) return;
            const buffer = await audio;
            if (signal.aborted) return;
            if (buffer) schedule(buffer);
            else pointAtScreen(signal);
        });
    }

    function stopTalking() {
        reply?.abort();
        reply = null;
        sources.forEach((s) => {
            try {
                s.stop();
            } catch {
                // already stopped
            }
        });
        sources = new Set();
        nextTime = 0;
        chain = Promise.resolve();
        hooks.speaking(false);
        hooks.thinking(false);
    }

    // ---------- brain ----------
    async function answer(text: string) {
        stopTalking();
        history.push({ role: "user", content: text });
        const ctrl = new AbortController();
        reply = ctrl;
        pointedAtScreen = false;
        hooks.thinking(true);
        let said = ""; // text already queued for speech
        let full = "";
        try {
            // A recorded answer first: instant, free, and always in Axon's own voice
            const previous = history.slice(0, -1).filter((m) => m.role === "assistant").at(-1)?.content || "";
            const match = await fetch(`${o.api}/voice/match`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, previous }),
                signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(4000)]),
            })
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null);
            if (ctrl.signal.aborted) return;
            const id = match?.id as LineId | undefined;
            if (id && LIBRARY[id]) {
                const line = LIBRARY[id];
                hooks.thinking(false);
                hooks.caption("assistant", line.text, true);
                history.push({ role: "assistant", content: line.text });
                playRecording(id, ctrl.signal);
                const action = line.action;
                if (action === "end") {
                    pendingEnd = true;
                } else if (action) {
                    const [type, value] = action.split(":");
                    if (type === "go" || type === "contact") hooks.action({ type, value });
                }
                return;
            }

            const res = await fetch(`${o.api}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: history.slice(-10), voice: true }),
                signal: ctrl.signal,
            });
            if (!res.ok || !res.body) throw new Error("chat");
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            let event = "";
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                let nl: number;
                while ((nl = buf.indexOf("\n")) >= 0) {
                    const line = buf.slice(0, nl).trim();
                    buf = buf.slice(nl + 1);
                    if (line.startsWith("event:")) event = line.slice(6).trim();
                    else if (line.startsWith("data:") && event === "delta") {
                        const t = JSON.parse(line.slice(5)).t as string;
                        full += t;
                        hooks.thinking(false);
                        hooks.caption("assistant", full.replace(TAG, "").replace(/【\d+】|\[\d+\]/g, "").replace(/\[\[[^\]]*$/, "").trim(), true);
                        // Speak each finished sentence as soon as it's complete (not inside a tag)
                        const pending = full.slice(said.length);
                        const m = pending.match(/^[\s\S]*?[.!?](?=\s|$)(?![^[]*\]\])/);
                        if (m && m[0].trim().length >= 8) {
                            said += m[0];
                            say(m[0], ctrl.signal);
                        }
                    }
                }
            }
            const rest = full.slice(said.length);
            if (rest.replace(TAG, "").trim()) say(rest, ctrl.signal);
            history.push({ role: "assistant", content: full.replace(TAG, "").trim() });
            // Page actions the reply asked for
            for (const m of full.matchAll(TAG)) {
                if (m[0] === "[[end]]") {
                    pendingEnd = true;
                    chain.then(() => {
                        if (sources.size === 0) hooks.action({ type: "end" });
                    });
                } else hooks.action({ type: m[1] as "go" | "contact", value: m[2] });
            }
        } catch (e) {
            if ((e as Error).name !== "AbortError") hooks.caption("assistant", "Sorry, I lost my train of thought. Could you say that again?", true);
        } finally {
            if (reply === ctrl) hooks.thinking(false);
        }
    }

    // ---------- ears ----------
    function turnDone() {
        const text = heard.trim();
        heard = "";
        if (text) answer(text);
    }

    const params = new URLSearchParams({
        model: o.stt.model,
        language: o.stt.language,
        encoding: "linear16",
        sample_rate: String(o.sampleRate),
        channels: "1",
        interim_results: "true",
        smart_format: "true",
        endpointing: "400",
        utterance_end_ms: "1200",
        vad_events: "true",
    });
    ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ["bearer", o.stt.token]);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
        o.node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
            if (!muted && ws?.readyState === WebSocket.OPEN) ws.send(e.data);
        };
        keepAlive = window.setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "KeepAlive" })), 8000);
        const greet = new AbortController();
        reply = greet;
        hooks.caption("assistant", LIBRARY.greeting.text, true);
        history.push({ role: "assistant", content: LIBRARY.greeting.text });
        playRecording("greeting", greet.signal);
    };
    ws.onmessage = (e) => {
        let m: { type?: string; is_final?: boolean; speech_final?: boolean; channel?: { alternatives?: { transcript?: string }[] } };
        try {
            m = JSON.parse(e.data as string);
        } catch {
            return;
        }
        if (m.type === "Results") {
            const t = m.channel?.alternatives?.[0]?.transcript?.trim() || "";
            if (!t) return;
            // The caller is talking over Axon: stop and listen
            if (sources.size || reply) stopTalking();
            if (m.is_final) heard += ` ${t}`;
            hooks.caption("user", `${heard} ${m.is_final ? "" : t}`.trim(), true);
            if (m.speech_final) turnDone();
        } else if (m.type === "UtteranceEnd") {
            turnDone();
        }
    };
    ws.onerror = () => !closed && hooks.fail("Couldn't reach the speech service. You can keep chatting.");
    ws.onclose = (e) => {
        if (!closed && e.code !== 1000) hooks.fail("The call dropped. You can try again or keep chatting.");
    };

    return {
        mute(on: boolean) {
            muted = on;
        },
        stop() {
            closed = true;
            clearInterval(keepAlive);
            stopTalking();
            o.node.port.onmessage = null;
            try {
                if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "CloseStream" }));
                ws?.close(1000);
            } catch {
                // already closed
            }
            ws = null;
        },
        /** Seconds of audio still queued to play (for a graceful goodbye) */
        remaining() {
            return Math.max(0, nextTime - o.outCtx.currentTime);
        },
    };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, AudioLines, BookOpen, Briefcase, Hammer, MessageCircleQuestion, MessageSquareText, Compass, ScrollText, Video, X, type LucideIcon } from "lucide-react";
import VoiceCall, { type CallTurn } from "@/components/chat/VoiceCall";
import AxonFace, { type FaceState } from "@/components/chat/AxonFace";
import AvatarCall from "@/components/chat/AvatarCall";
import { AGENTS } from "@/lib/pipeline";
import { AGENT_NAME, OPEN_AGENT_EVENT, OPEN_MODE_EVENT, AGENT_API, startTour } from "@/lib/agent";
import { sendLead, streamAxon, type AxonAction, type AxonCard, type AxonMode, type ChatTurn } from "@/lib/axonClient";

interface Message {
    role: "user" | "assistant";
    content: string;
    cards?: AxonCard[]; // the knowledge cards the answer could cite, numbered
    actions?: AxonAction[];
    mode?: AxonMode;
    pending?: boolean; // still streaming
    note?: string; // small label above a message, e.g. a call transcript header
}

type Mode = "chat" | "voice" | "face";

const STORAGE_KEY = "axon-console-v2";

// The five things Axon does. Some send straight away; the rest ask the visitor to paste or describe first.
const STARTERS: { mode: AxonMode; title: string; hint: string; icon: LucideIcon; prompt?: string; placeholder?: string }[] = [
    { mode: "ask", title: "Ask about Isuru", hint: "What he's working on and what he has shipped", icon: MessageCircleQuestion, prompt: "What is Isuru working on right now?" },
    { mode: "fit", title: "Hiring fit check", hint: "Paste a job description. Get an honest match, gaps included", icon: Briefcase, placeholder: "Paste the job description here…" },
    { mode: "build", title: "How would he build it?", hint: "Describe an AI idea. Get his approach and the hard part", icon: Hammer, placeholder: "Describe what you want to build, and for whom…" },
    { mode: "story", title: "A real story", hint: "Voice agents, automations, MLOps, teaching", icon: ScrollText, prompt: "Tell me a real story about something he shipped." },
    { mode: "learn", title: "Learn it his way", hint: "Agents, RAG and keeping models working, as he teaches them", icon: BookOpen, placeholder: "What would you like explained?" },
];
const MODE_LABEL: Record<AxonMode, string> = { ask: "Answer", fit: "Hiring fit check", build: "How he'd build it", story: "Real story", learn: "Learn it his way" };

// What actually happens while a question is answered
// While an answer is on its way, show each agent in the pipeline taking its turn
const STEPS = AGENTS;

// Spring for the shell as it morphs pill -> orb -> console: firm, barely any overshoot
const SHELL_SPRING = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;

// Card numbers an answer actually cites, as [2] (some models write 【2】)
const CITE = /\[(\d{1,2})\]|【(\d{1,2})】/g;
function citedCards(text: string, cards: AxonCard[] = []) {
    const used = new Set([...text.matchAll(CITE)].map((m) => Number(m[1] || m[2])));
    return cards.filter((c) => used.has(c.n));
}

// Minimal formatting for answers: paragraphs, bullet lists, **bold** and [n] citations
function Rich({ text, cards = [], onCite }: { text: string; cards?: AxonCard[]; onCite?: (card: AxonCard) => void }) {
    // Empty citation brackets ("[]") carry nothing, so drop them
    const blocks = text.replace(/\s*\[\s*\]/g, "").trim().split(/\n{2,}/);
    const inline = (line: string, key: number) => (
        <span key={key}>
            {line.split(/(\*\*[^*]+\*\*|\[\d{1,2}\]|【\d{1,2}】)/g).map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                        <strong key={i} className="font-semibold text-ink">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                const cite = part.match(/^(?:\[(\d{1,2})\]|【(\d{1,2})】)$/);
                if (cite) {
                    const card = cards.find((c) => c.n === Number(cite[1] || cite[2]));
                    if (!card) return null; // a number the model made up: drop it
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onCite?.(card)}
                            title={card.title}
                            className="mx-0.5 inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded-full bg-fg/10 px-1 align-[2px] font-mono text-[10px] text-ink/80 transition-colors hover:bg-ember hover:text-on-ember"
                        >
                            {card.n}
                        </button>
                    );
                }
                return part;
            })}
        </span>
    );
    return (
        <div className="space-y-3">
            {blocks.map((block, b) => {
                const lines = block.split("\n");
                if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
                    return (
                        <ul key={b} className="space-y-1.5">
                            {lines.map((l, i) => (
                                <li key={i} className="flex gap-2.5">
                                    <span aria-hidden="true" className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-ember" />
                                    {inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""), i)}
                                </li>
                            ))}
                        </ul>
                    );
                }
                return <p key={b}>{lines.map((l, i) => (i ? [<br key={`b${i}`} />, inline(l, i)] : inline(l, i)))}</p>;
            })}
        </div>
    );
}

// "Send this to Isuru": email (and name) plus the conversation, summarised for him
function LeadForm({ door, transcript, onSent }: { door: AxonAction["door"]; transcript: ChatTurn[]; onSent: () => void }) {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [website, setWebsite] = useState(""); // honeypot: hidden from people, filled by bots
    const [state, setState] = useState<"idle" | "sending" | "error">("idle");
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setState("sending");
        try {
            await sendLead({ email, name, door, transcript, website });
            onSent();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't send that just now.");
            setState("error");
        }
    };

    const field = "w-full rounded-xl border border-fg/10 bg-fg/[0.03] px-3 py-2 text-sm text-ink placeholder:text-ash/60 focus:border-ember/60 focus:outline-none";
    return (
        <form onSubmit={submit} className="mt-4 rounded-2xl border border-ember/30 bg-ember/[0.04] p-4">
            <p className="text-sm text-ink">Isuru gets a short summary of this conversation and your email. He usually replies within 24 hours.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="sr-only" htmlFor="lead-email">Your email</label>
                <input id="lead-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className={field} />
                <label className="sr-only" htmlFor="lead-name">Your name (optional)</label>
                <input id="lead-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className={field} />
            </div>
            <input tabIndex={-1} aria-hidden="true" autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" />
            <div className="mt-3 flex items-center gap-3">
                <button
                    type="submit"
                    disabled={state === "sending"}
                    className="cursor-pointer rounded-full bg-ember px-4 py-2 text-sm font-medium text-on-ember transition-colors hover:bg-inferno-5 disabled:cursor-wait disabled:opacity-60"
                >
                    {state === "sending" ? "Sending…" : "Send to Isuru"}
                </button>
                {state === "error" && (
                    <p className="text-xs text-inferno-3" role="alert">
                        {error}
                    </p>
                )}
            </div>
        </form>
    );
}

export default function Chatbot() {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>("chat");
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0);
    const [composerMode, setComposerMode] = useState<AxonMode | null>(null);
    const [leadFor, setLeadFor] = useState<number | null>(null);
    const [happy, setHappy] = useState(false);
    // Face-to-face calls appear only once the avatar is set up on the server
    const [hasAvatar, setHasAvatar] = useState(false);
    const askedHealth = useRef(false);
    const messagesRef = useRef<Message[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const pendingPrompt = useRef<string | undefined>(undefined);
    const countRef = useRef(0);
    // The pill and the console are one shape (layoutId), so opening is a single morph
    const openRef = useRef(false);
    const firstShow = useRef(true);
    const ready = open;
    // Full-screen on phones, a rounded card from sm up
    const shellRadius = typeof window !== "undefined" && window.innerWidth >= 640 ? 24 : 0;

    useEffect(() => {
        countRef.current = messages.length;
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        openRef.current = open;
        if (open) firstShow.current = false;
    }, [open]);

    const openConsole = useCallback(() => {
        if (openRef.current) return;
        setOpen(true);
        if (!askedHealth.current) {
            askedHealth.current = true;
            fetch(`${AGENT_API}/health`)
                .then((r) => r.json())
                .then((h) => setHasAvatar(Boolean(h?.avatar)))
                .catch(() => {});
        }
    }, []);

    const closeConsole = useCallback(() => {
        setOpen(false);
    }, []);

    // Restore this tab's conversation
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) {
                const { messages: m } = JSON.parse(saved);
                if (Array.isArray(m)) setMessages(m.filter((x: Message) => x.content));
            }
        } catch {
            // storage unavailable; start fresh
        }
    }, []);

    useEffect(() => {
        try {
            if (!loading) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: messages.filter((m) => !m.pending) }));
        } catch {
            // storage unavailable
        }
    }, [messages, loading]);

    // Wake the backend early so the first answer isn't slow
    useEffect(() => {
        fetch(`${AGENT_API}/health`).catch(() => {});
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, loading]);

    // Step through what's happening while waiting for an answer
    useEffect(() => {
        if (!loading) return;
        const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1300);
        return () => clearInterval(timer);
    }, [loading]);

    const send = useCallback(
        async (text: string, forced?: AxonMode | null) => {
            const q = text.trim();
            if (!q || loading) return;
            const chosen = forced !== undefined ? forced : composerMode;
            setMode("chat");
            setComposerMode(null);
            setLeadFor(null);
            // The server keeps no state: send the recent thread with every message
            const history: ChatTurn[] = [
                ...messagesRef.current.filter((m) => !m.pending && m.content).map((m) => ({ role: m.role, content: m.content })),
                { role: "user" as const, content: q },
            ].slice(-20);
            setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "", pending: true }]);
            setInput("");
            if (inputRef.current) inputRef.current.style.height = "auto";
            setStep(0);
            setLoading(true);
            const update = (fn: (m: Message) => Message) =>
                setMessages((all) => {
                    const copy = [...all];
                    copy[copy.length - 1] = fn(copy[copy.length - 1]);
                    return copy;
                });
            try {
                await streamAxon(history, chosen, {
                    onMeta: (meta) => update((m) => ({ ...m, cards: meta.cards, mode: meta.mode })),
                    onDelta: (t) => update((m) => ({ ...m, content: m.content + t })),
                    onDone: (done) => update((m) => ({ ...m, actions: done.actions, pending: false })),
                });
                update((m) => ({ ...m, pending: false }));
            } catch {
                update((m) => ({
                    ...m,
                    pending: false,
                    content: m.content || "I can't reach my backend right now. Try again in a moment, or email Isuru at isuruigic@gmail.com.",
                }));
            } finally {
                setLoading(false);
            }
        },
        [composerMode, loading]
    );

    // Open from anywhere: buttons dispatch the event, optionally with a prompt
    useEffect(() => {
        const onOpen = (e: Event) => {
            const prompt = (e as CustomEvent<string | undefined>).detail;
            pendingPrompt.current = typeof prompt === "string" ? prompt : undefined;
            openConsole();
        };
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                if (openRef.current) closeConsole();
                else openConsole();
            }
        };
        // Opened in a mode (the tour's last stop): pick the mode, put the cursor in the box
        const onOpenMode = (e: Event) => {
            const m = (e as CustomEvent<string>).detail as AxonMode;
            if (!STARTERS.some((s) => s.mode === m)) return;
            pendingPrompt.current = undefined;
            setMode("chat");
            setComposerMode(m);
            openConsole();
            setTimeout(() => inputRef.current?.focus(), 450);
        };
        window.addEventListener(OPEN_AGENT_EVENT, onOpen);
        window.addEventListener(OPEN_MODE_EVENT, onOpenMode);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener(OPEN_AGENT_EVENT, onOpen);
            window.removeEventListener(OPEN_MODE_EVENT, onOpenMode);
            window.removeEventListener("keydown", onKey);
        };
    }, [openConsole, closeConsole]);

    // While open: Escape closes, the page behind stops scrolling
    useEffect(() => {
        if (!open) return;
        const onEsc = (e: KeyboardEvent) => e.key === "Escape" && closeConsole();
        window.addEventListener("keydown", onEsc);
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onEsc);
            document.body.style.overflow = "";
        };
    }, [open, closeConsole]);

    // Once the console is on screen: focus the composer, send any prompt it was opened with
    useEffect(() => {
        if (!ready) return;
        const prompt = pendingPrompt.current;
        pendingPrompt.current = undefined;
        const t = setTimeout(() => {
            if (prompt) send(prompt);
            else inputRef.current?.focus();
        }, 150);
        return () => clearTimeout(t);
    }, [ready, send]);

    const onCallEnd = useCallback((turns: CallTurn[], seconds: number, kind: "Voice" | "Face-to-face" = "Voice") => {
        const length = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
        setMessages((m) => [
            ...m,
            ...turns.map((t, i) => ({
                role: t.role,
                content: t.text.trim(),
                note: i === 0 ? `${kind} call, ${length}` : undefined,
            })),
        ]);
        setMode("chat");
    }, []);

    const goTo = (id: string) => {
        setOpen(false);
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    };

    // A citation opens what it points at: the section on this page, or the public link
    const openCard = (card: AxonCard) => {
        if (card.section) goTo(card.section);
        else if (card.link) window.open(card.link, "_blank", "noopener,noreferrer");
    };

    const runAction = (action: AxonAction, index: number) => {
        if (action.type === "lead") {
            setLeadFor((current) => (current === index ? null : index));
            return;
        }
        window.dispatchEvent(new CustomEvent("contact-door", { detail: action.door }));
        goTo("contact");
    };

    const startMode = (starter: (typeof STARTERS)[number]) => {
        if (starter.prompt) {
            send(starter.prompt, starter.mode);
            return;
        }
        setComposerMode(starter.mode);
        setTimeout(() => inputRef.current?.focus(), 30);
    };

    const leadSent = (index: number) => {
        setLeadFor(null);
        setHappy(true);
        setTimeout(() => setHappy(false), 2600);
        setMessages((m) => [
            ...m.slice(0, index + 1).map((x, i) => (i === index ? { ...x, actions: [] } : x)),
            ...m.slice(index + 1),
            { role: "assistant", content: "Sent. Isuru has a summary of this conversation and your email, and usually replies within 24 hours." },
        ]);
    };

    const placeholder = composerMode ? STARTERS.find((x) => x.mode === composerMode)?.placeholder : undefined;

    const empty = messages.length === 0 && !loading;

    // What the face shows: thinking until the first words arrive, then speaking while they stream,
    // listening while the visitor types, a smile after a lead goes through
    const face: FaceState = happy
        ? "happy"
        : loading
          ? messages.at(-1)?.content
              ? "speaking"
              : "thinking"
          : input.trim()
            ? "listening"
            : "idle";

    return (
        <>
            {/* Launcher: one shape (layoutId) that becomes the boot orb, then the console */}
            {!open && (
                <motion.button
                    type="button"
                    layoutId="axon-shell"
                    onClick={openConsole}
                    initial={firstShow.current ? { opacity: 0, y: 12 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: firstShow.current ? 1 : 0, ...SHELL_SPRING }}
                    style={{ borderRadius: 999 }}
                    className="fixed bottom-6 right-6 z-50 flex cursor-pointer items-center gap-2.5 border border-ember/40 bg-void/80 py-2.5 pl-3 pr-4 text-sm text-ink shadow-2xl shadow-black/60 backdrop-blur-xl transition-colors hover:border-ember focus-visible:outline-2 focus-visible:outline-ember"
                    aria-label={`Ask ${AGENT_NAME}, Isuru's AI agent`}
                    data-axon-launcher=""
                >
                    <motion.span layout="position" className="relative flex h-7 w-7 items-center justify-center">
                        <AxonFace size={28} />
                    </motion.span>
                    <motion.span layout="position" className="flex items-center gap-2.5">
                        Ask {AGENT_NAME}
                        <kbd className="hidden rounded border border-fg/15 px-1.5 py-0.5 font-mono text-[10px] text-ash sm:inline">Ctrl&nbsp;K</kbd>
                    </motion.span>
                </motion.button>
            )}

            <AnimatePresence>
                {ready && (
                    <motion.div
                        className="fixed inset-0 z-[60] flex items-stretch justify-center sm:items-center sm:p-6"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <button
                            type="button"
                            aria-label="Close"
                            onClick={() => setOpen(false)}
                            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md"
                        />

                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label={`${AGENT_NAME}, Isuru's AI agent`}
                            layoutId="axon-shell"
                            transition={SHELL_SPRING}
                            style={{ borderRadius: shellRadius }}
                            className="relative flex h-full w-full flex-col overflow-hidden bg-surface text-ink sm:h-[min(860px,90vh)] sm:max-w-[780px] sm:border sm:border-fg/10 sm:shadow-[0_40px_120px_-20px_rgba(221,81,58,0.25)]"
                        >
                          <motion.div
                            className="relative flex min-h-0 flex-1 flex-col"
                            initial={{ opacity: 0, filter: "blur(8px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            transition={{ duration: 0.3, delay: 0.18 }}
                          >
                            {/* Soft glow at the top, the console's only decoration */}
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(ellipse_at_center,rgba(147,38,103,0.35),transparent_65%)]"
                            />

                            {/* Header */}
                            <header className="relative flex items-center justify-between gap-3 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <AxonFace size={36} state={mode === "chat" ? face : "idle"} />
                                    <div>
                                        <p className="font-display text-lg leading-none tracking-[-0.01em]">{AGENT_NAME}</p>
                                        <p className={`mt-1 whitespace-nowrap text-[11px] text-ash ${hasAvatar ? "hidden sm:block" : ""}`}>Isuru&apos;s AI agent</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div role="tablist" aria-label="Mode" className="flex rounded-full border border-fg/10 p-0.5 text-xs">
                                        {((hasAvatar ? ["chat", "voice", "face"] : ["chat", "voice"]) as Mode[]).map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                role="tab"
                                                aria-selected={mode === m}
                                                onClick={() => setMode(m)}
                                                className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
                                                    mode === m ? "bg-fg/10 text-ink" : "text-ash hover:text-ink"
                                                }`}
                                            >
                                                {m === "chat" ? (
                                                    <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
                                                ) : m === "voice" ? (
                                                    <AudioLines className="h-3.5 w-3.5" aria-hidden="true" />
                                                ) : (
                                                    <Video className="h-3.5 w-3.5" aria-hidden="true" />
                                                )}
                                                {m === "chat" ? "Chat" : m === "voice" ? "Voice" : "Face"}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        aria-label="Close"
                                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ash transition-colors hover:bg-fg/10 hover:text-ink"
                                    >
                                        <X className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </header>

                            {mode === "face" ? (
                                <AvatarCall onEnd={(turns, seconds) => onCallEnd(turns, seconds, "Face-to-face")} />
                            ) : mode === "voice" ? (
                                <VoiceCall onEnd={onCallEnd} />
                            ) : (
                                <>
                                    <div ref={scrollRef} className="relative flex-1 overflow-y-auto overscroll-contain px-5 sm:px-10">
                                        {empty ? (
                                            <div className="flex min-h-full flex-col justify-center py-10">
                                                <h2 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] font-light leading-tight tracking-[-0.03em]">
                                                    What can I help with?
                                                </h2>
                                                <p className="mt-3 max-w-md text-ash">
                                                    I&apos;m Isuru&apos;s agent. I answer from his real work and say so when I don&apos;t know. Or switch to Voice and just talk.
                                                </p>
                                                <div className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                                    {STARTERS.map((s) => (
                                                        <button
                                                            key={s.mode}
                                                            type="button"
                                                            onClick={() => startMode(s)}
                                                            className={`group flex cursor-pointer gap-3 rounded-2xl border border-fg/10 bg-fg/[0.02] p-4 text-left transition-colors hover:border-ember/50 hover:bg-fg/[0.04] focus-visible:outline-2 focus-visible:outline-ember ${s.mode === "ask" ? "sm:col-span-2" : ""}`}
                                                        >
                                                            <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-ash transition-colors group-hover:text-ember" aria-hidden="true" />
                                                            <span>
                                                                <span className="block text-sm font-medium text-ink">{s.title}</span>
                                                                <span className="mt-1 block text-xs leading-relaxed text-ash">{s.hint}</span>
                                                            </span>
                                                        </button>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            closeConsole();
                                                            setTimeout(() => startTour(), 350);
                                                        }}
                                                        className="group flex cursor-pointer gap-3 rounded-2xl border border-dashed border-ember/30 p-4 text-left transition-colors hover:border-ember/60 hover:bg-fg/[0.04] focus-visible:outline-2 focus-visible:outline-ember sm:col-span-2"
                                                    >
                                                        <Compass className="mt-0.5 h-4 w-4 shrink-0 text-ember" aria-hidden="true" />
                                                        <span>
                                                            <span className="block text-sm font-medium text-ink">Take the tour</span>
                                                            <span className="mt-1 block text-xs leading-relaxed text-ash">A one-minute walk through the site, picked for why you&apos;re here</span>
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-7 py-6">
                                                {messages.map((m, i) => {
                                                    if (m.role === "assistant" && m.pending && !m.content) return null;
                                                    const sources = m.role === "assistant" && !m.pending ? citedCards(m.content, m.cards) : [];
                                                    return (
                                                        <div key={i}>
                                                            {m.note && (
                                                                <p className="mb-3 flex items-center gap-2 font-mono text-[11px] text-ash">
                                                                    <AudioLines className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    {m.note}
                                                                </p>
                                                            )}
                                                            {m.role === "assistant" && m.mode && m.mode !== "ask" && (
                                                                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ember">{MODE_LABEL[m.mode]}</p>
                                                            )}
                                                            {m.role === "user" ? (
                                                                <div className="flex justify-end">
                                                                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-fg/[0.07] px-4 py-2.5 text-[15px]">
                                                                        {m.content}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="text-[15px] leading-relaxed text-ink/90">
                                                                    <Rich text={m.content} cards={m.cards} onCite={openCard} />
                                                                    {m.pending && <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] bg-ember motion-safe:animate-pulse" />}
                                                                    {sources.length > 0 && (
                                                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                                                            <span className="text-[11px] text-ash">Sources</span>
                                                                            {sources.map((c) => (
                                                                                <button
                                                                                    key={c.n}
                                                                                    type="button"
                                                                                    onClick={() => openCard(c)}
                                                                                    disabled={!c.section && !c.link}
                                                                                    className="cursor-pointer rounded-full border border-fg/10 px-2.5 py-1 text-[11px] text-ink/80 transition-colors hover:border-ember/60 hover:text-ember disabled:cursor-default disabled:hover:border-fg/10 disabled:hover:text-ink/80"
                                                                                >
                                                                                    <span className="mr-1 font-mono text-ash">{c.n}</span>
                                                                                    {c.title.replace(/^Story: (\w)/, (_m, l: string) => l.toUpperCase())}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {!m.pending && m.actions && m.actions.length > 0 && (
                                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                                            {m.actions.map((a) => (
                                                                                <button
                                                                                    key={a.label}
                                                                                    type="button"
                                                                                    onClick={() => runAction(a, i)}
                                                                                    aria-expanded={a.type === "lead" ? leadFor === i : undefined}
                                                                                    className="cursor-pointer rounded-full border border-ember/50 px-3.5 py-1.5 text-xs text-ink transition-colors hover:bg-ember hover:text-on-ember"
                                                                                >
                                                                                    {a.label}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {leadFor === i && (
                                                                        <LeadForm
                                                                            door={m.actions?.find((a) => a.type === "lead")?.door ?? "hire"}
                                                                            transcript={messages.slice(0, i + 1).filter((x) => x.content).map((x) => ({ role: x.role, content: x.content }))}
                                                                            onSent={() => leadSent(i)}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {loading && !messages.at(-1)?.content && (
                                                    <p className="flex items-center gap-2.5 text-sm" aria-live="polite" data-thinking="">
                                                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ember motion-safe:animate-pulse" />
                                                        <span className="font-mono text-[11px] text-ember">{STEPS[step].name}</span>
                                                        <span key={step} className="text-ash motion-safe:animate-[fadein_300ms_ease]">{STEPS[step].task}…</span>
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Composer */}
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            send(input);
                                        }}
                                        className="relative px-4 pb-4 pt-2 sm:px-8 sm:pb-6"
                                    >
                                        {composerMode && (
                                            <div className="mb-2 flex items-center gap-2 pl-2 text-xs">
                                                <span className="rounded-full bg-ember/15 px-2.5 py-1 text-ember">{MODE_LABEL[composerMode]}</span>
                                                <button type="button" onClick={() => setComposerMode(null)} className="cursor-pointer text-ash hover:text-ink" aria-label="Clear mode">
                                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex items-end gap-2 rounded-3xl border border-fg/10 bg-fg/[0.03] p-2 pl-4 transition-colors focus-within:border-ember/50">
                                            <label htmlFor="agent-input" className="sr-only">
                                                Ask {AGENT_NAME} about Isuru
                                            </label>
                                            <textarea
                                                id="agent-input"
                                                ref={inputRef}
                                                rows={1}
                                                value={input}
                                                onChange={(e) => {
                                                    setInput(e.target.value);
                                                    e.target.style.height = "auto";
                                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault();
                                                        send(input);
                                                    }
                                                }}
                                                placeholder={placeholder ?? `Ask ${AGENT_NAME} anything about Isuru…`}
                                                className="max-h-[200px] flex-1 resize-none bg-transparent py-2 text-[15px] text-ink placeholder:text-ash/70 focus:outline-none"
                                                disabled={loading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setMode("voice")}
                                                aria-label="Switch to voice"
                                                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ash transition-colors hover:bg-fg/10 hover:text-ink"
                                            >
                                                <AudioLines className="h-[18px] w-[18px]" aria-hidden="true" />
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!input.trim() || loading}
                                                aria-label="Send"
                                                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ember text-on-ember transition-colors hover:bg-inferno-5 disabled:cursor-not-allowed disabled:bg-fg/10 disabled:text-ash"
                                            >
                                                <ArrowUp className="h-[18px] w-[18px]" aria-hidden="true" />
                                            </button>
                                        </div>
                                        <p className="mt-2.5 text-center text-[11px] text-ash/70">
                                            Answers come from Isuru&apos;s real work and can still be wrong. Numbers like 2 link to the source.
                                        </p>
                                    </form>
                                </>
                            )}
                          </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

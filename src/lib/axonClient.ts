// Talks to Axon's API (functions/api/*). Streaming chat over Server-Sent Events, plus leads.
import { AGENT_API } from "@/lib/agent";

export type AxonMode = "ask" | "fit" | "build" | "story" | "learn";

export interface AxonCard {
    n: number;
    id: string;
    title: string;
    section: string | null;
    link: string | null;
}

export interface AxonAction {
    type: "lead" | "contact";
    door: "hire" | "build" | "learn";
    label: string;
}

export interface ChatTurn {
    role: "user" | "assistant";
    content: string;
}

interface Handlers {
    onMeta?: (meta: { mode: AxonMode; model: string; cards: AxonCard[] }) => void;
    onDelta: (text: string) => void;
    onDone?: (done: { actions: AxonAction[]; refused?: string }) => void;
}

/** Send the conversation and stream the reply. Throws if the request fails before any text arrives. */
export async function streamAxon(history: ChatTurn[], mode: AxonMode | null, handlers: Handlers, signal?: AbortSignal) {
    const res = await fetch(`${AGENT_API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, ...(mode ? { mode } : {}) }),
        signal,
    });
    if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let event = "message";
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).replace(/\r$/, "");
            buffer = buffer.slice(nl + 1);
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) {
                const data = JSON.parse(line.slice(5));
                if (event === "meta") handlers.onMeta?.(data);
                else if (event === "delta") handlers.onDelta(data.t);
                else if (event === "done") handlers.onDone?.(data);
                else if (event === "error") throw new Error(data.message);
            }
        }
    }
}

// The site's contact-form service; the same public key the Contact section uses
const WEB3FORMS_KEY = "c11427d8-8b12-4416-b2cd-b2eccfda4714";

/** Hand a visitor over to Isuru: the server writes a summary, and sends it or hands it back to send here. */
export async function sendLead(lead: { email: string; name: string; door: AxonAction["door"]; transcript: ChatTurn[]; website?: string }) {
    const res = await fetch(`${AGENT_API}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't send that just now.");
    if (data.sent) return;

    const form = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: data.subject,
            from_name: "Axon (isuruig.com)",
            name: lead.name || "Website visitor",
            email: lead.email,
            message: data.summary,
        }),
    });
    const result = await form.json().catch(() => ({}));
    if (!form.ok || result.success === false) throw new Error("Couldn't send that just now.");
}

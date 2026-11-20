// Axon's guided tour: a short scripted walk through the page for each kind of visitor.
// Scripted, not generated: it is instant, costs nothing, and can only say what is true.
// Every line here must be backed by the site or axon/knowledge.js. Lines are spoken from recordings in
// public/media/tour (scripts/build-tour-voice.mjs): after editing a line, run that script again.
import type { AxonMode } from "@/lib/axonClient";

export type Persona = "hiring" | "building" | "learning";

export interface TourStop {
    /** CSS selector of what to bring into view and highlight; the first match wins */
    target: string;
    line: string;
}

export interface Tour {
    label: string;
    hint: string;
    stops: TourStop[];
    end: { line: string; cta: string; mode: AxonMode };
}

export const TOURS: Record<Persona, Tour> = {
    hiring: {
        label: "Hiring",
        hint: "What he has shipped, and how he'd fit a role",
        stops: [
            { target: "#hero h1", line: "Hi, I'm Axon, Isuru's agent. Hiring? Let me give you the short version. He's an AI/ML engineer at Veracity Digital, and he builds AI that holds up in production." },
            { target: "#personaplex", line: "This is PersonaPlex, a voice agent that picks up real phone calls. It replies in under a second, and callers can cut in mid-sentence." },
            { target: "#fraud", line: "Here's a fraud system he built. It's tuned on what mistakes actually cost, tracked in MLflow, with 92% test coverage." },
            { target: "#career h2", line: "His path so far: Veracity Digital now, Technical Assistant on Buildr Labs' Agentic AI Bootcamp, and top 3 of 290 in Zuu Crew's production ML programme." },
            { target: "#about h2", line: "And his stack. What he's still learning is marked separately, so you can tell what's proven from what's new." },
        ],
        end: { line: "Got a role in mind? Paste the job description and I'll go through it with you: what he's shown, what's partly there, and any gaps.", cta: "Check a role", mode: "fit" },
    },
    building: {
        label: "Building something",
        hint: "What he could build for you, with real examples",
        stops: [
            { target: "#hero h1", line: "Hi, I'm Axon. Thinking of building something? Give me a minute and I'll show you what Isuru could do for you, using things he's really built." },
            { target: "#personaplex", line: "Picture a phone line that answers itself. That's PersonaPlex. He builds voice agents like it for bookings, FAQs and call routing, in English, Sinhala or Tamil." },
            { target: "#nexus", line: "When the answer is spread across connected records, he builds retrieval that follows the links. NEXUS, his GraphRAG engine, is in development." },
            { target: "#work-index", line: "He also builds automations with a person signing off at the risky step, like payment checks and ad decisions. Those are running in production." },
            { target: "#run-it h2", line: "Want to see one run? Pick a workflow here, press Run, and watch every step, including where a guard or a person steps in." },
            { target: "#contact h2", line: "When you're ready, tell him what you need. He usually replies within a day." },
        ],
        end: { line: "Want a head start? Tell me your idea and I'll sketch how he'd build it, and where the hard part is.", cta: "Describe my idea", mode: "build" },
    },
    learning: {
        label: "Learning",
        hint: "Where to learn from his work",
        stops: [
            { target: "#hero h1", line: "Hi, I'm Axon. Here to learn? Lovely. Let me show you where to start with Isuru's work." },
            { target: "#teaching", line: "Every Saturday he's in the lab at Buildr Labs' Agentic AI Bootcamp, debugging agents and RAG pipelines right alongside the learners." },
            { target: "#work h2", line: "Open any of these systems and replay a request. You'll see it move through every step." },
            { target: "#blog h2", line: "His writing on building and running AI systems is right here." },
            { target: "#news h2", line: "And the newsroom, fresh every morning." },
        ],
        end: { line: "Want something explained the way he teaches it? Ask me about agents, RAG, or keeping models healthy.", cta: "Explain something", mode: "learn" },
    },
};

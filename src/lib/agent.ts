// The portfolio agent's name and backend. Rename the agent here, in one place.
export const AGENT_NAME = "Axon";

// Axon's API: Cloudflare Pages Functions on the same domain (functions/api/*).
// Locally, `npx wrangler pages dev` serves it on :8788; point NEXT_PUBLIC_AGENT_API there.
export const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API ?? "/api";

// Window event that opens the agent console from anywhere on the page
export const OPEN_AGENT_EVENT = "open-chatbot";

export function openAgent(prompt?: string) {
    window.dispatchEvent(new CustomEvent(OPEN_AGENT_EVENT, { detail: prompt }));
}

// Open the console ready for one of Axon's modes (fit, build, learn…), cursor in the box
export const OPEN_MODE_EVENT = "axon-open-mode";
export function openAgentMode(mode: string) {
    window.dispatchEvent(new CustomEvent(OPEN_MODE_EVENT, { detail: mode }));
}

// Start the guided tour (src/components/chat/AxonTour.tsx); pass a persona to skip the question
export const TOUR_EVENT = "axon-tour";
export function startTour(persona?: "hiring" | "building" | "learning") {
    window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: persona }));
}

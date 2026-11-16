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

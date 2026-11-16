// The four stages Axon's backend runs for every question (backend/main.py):
// a topic guard, the question rewrite, FAISS retrieval, then the LLM that writes.
export const AGENTS = [
    { name: "Guard", task: "Checking the question is about Isuru" },
    { name: "Planner", task: "Reading it with the conversation so far" },
    { name: "Retriever", task: "Searching Isuru's profile" },
    { name: "Writer", task: "Writing the answer" },
] as const;

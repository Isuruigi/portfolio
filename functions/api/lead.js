// POST /api/lead: a visitor asked Axon to put them in touch with Isuru.
//
// Writes a short handoff note from the conversation, then:
//   - with RESEND_API_KEY + LEAD_TO set: emails it to Isuru from here, and returns {sent: true}
//   - otherwise: returns {sent: false, summary}, and the browser submits it through the site's
//     existing contact-form service (Web3Forms), so leads work with no extra setup.

import { checkRate, corsHeaders } from "../../axon/guard.js";
import { complete } from "../../axon/llm.js";
import { leadSummaryPrompt } from "../../axon/prompt.js";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const DOORS = { hire: "Hiring", build: "Build a project", learn: "Learning" };
const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, n);

export function onRequestOptions({ request, env }) {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

export async function onRequestPost({ request, env }) {
    const headers = corsHeaders(request, env);
    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Send JSON." }, { status: 400, headers });
    }

    const email = clean(body.email, 254);
    const name = clean(body.name, 80);
    const door = DOORS[body.door] ? body.door : "hire";
    if (!EMAIL.test(email)) return Response.json({ error: "That email address doesn't look right." }, { status: 400, headers });
    // A honeypot field real visitors never fill
    if (body.website) return Response.json({ sent: true }, { headers });

    const ip = request.headers.get("CF-Connecting-IP") || "local";
    if (await checkRate(env, `lead:${ip}`, { perMinute: 2, perDay: 6 })) {
        return Response.json({ error: "Too many requests. Email isuruigic@gmail.com directly instead." }, { status: 429, headers });
    }

    const turns = (Array.isArray(body.transcript) ? body.transcript : [])
        .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
        .slice(-12)
        .map((m) => `${m.role === "user" ? "Visitor" : "Axon"}: ${clean(m.content, 1500)}`)
        .join("\n");

    let summary = "";
    try {
        summary = turns ? await complete(env, leadSummaryPrompt(turns), { maxTokens: 300, temperature: 0.2 }) : "";
    } catch (err) {
        console.error("lead summary failed:", err?.message || err);
    }
    summary = summary || "(No summary: the conversation is below.)";
    const subject = `Axon lead: ${DOORS[door]}${name ? ` from ${name}` : ""}`;
    const text = `${summary}\n\nContact: ${name || "(no name)"} <${email}>\nVia: Axon on isuruig.com\n\n--- Conversation ---\n${turns || "(none)"}`;

    if (env.RESEND_API_KEY && env.LEAD_TO) {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: env.LEAD_FROM || "Axon <axon@isuruig.com>", to: [env.LEAD_TO], reply_to: email, subject, text }),
        });
        if (res.ok) return Response.json({ sent: true }, { headers });
        console.error("resend failed:", res.status, (await res.text()).slice(0, 200));
    }
    return Response.json({ sent: false, subject, summary: text }, { headers });
}

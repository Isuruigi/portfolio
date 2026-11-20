// POST /api/avatar/token: a short-lived LiveKit room token for a face-to-face call with Axon's avatar.
//
// The token does two things: lets this one visitor join one private, randomly named room, and
// tells LiveKit to dispatch the avatar agent (avatar-agent/) into that room when it is created.
// The LiveKit API secret never leaves the server; the browser only ever holds this token.
//
// Avatar video is the one part of the site that costs per minute, so this endpoint is the meter:
// a per-visitor limit, a site-wide daily budget, and a hard length the browser and agent both enforce.

import { checkRate, corsHeaders, dailyCapReached, monthlyCapReached } from "../../../axon/guard.js";

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));
const randomId = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, n * 2);

/** A LiveKit access token is a JWT signed with the API secret (HS256); built with Web Crypto, no SDK. */
export async function livekitToken({ apiKey, apiSecret, identity, room, agentName, ttlSeconds, now = Date.now() }) {
    const iat = Math.floor(now / 1000);
    const claims = {
        iss: apiKey,
        sub: identity,
        name: "Visitor",
        nbf: iat - 5,
        exp: iat + ttlSeconds,
        video: { room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true },
        // Applied when this token creates the room: summon the agent, and clean the room up quickly once people leave
        // (Written out in full, defaults included, so it is byte-for-byte what LiveKit's own server SDK emits.)
        roomConfig: {
            name: "",
            emptyTimeout: 20,
            departureTimeout: 10,
            maxParticipants: 4,
            minPlayoutDelay: 0,
            maxPlayoutDelay: 0,
            syncStreams: false,
            agents: [{ agentName, metadata: "", restartPolicy: "JRP_ON_FAILURE", deployment: "", attributes: {}, threadId: "" }],
            metadata: "",
            tags: {},
        },
    };
    const body = `${enc({ alg: "HS256", typ: "JWT" })}.${enc(claims)}`;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(apiSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return `${body}.${b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))}`;
}

export function onRequestOptions({ request, env }) {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

export async function onRequestPost({ request, env }) {
    const headers = corsHeaders(request, env);
    if (env.AVATAR_ENABLED !== "true" || !env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
        return Response.json({ detail: "Face-to-face calls aren't set up yet. Voice and chat still work." }, { status: 503, headers });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "local";
    if (await checkRate(env, `avatar:${ip}`, { perMinute: 2, perDay: 4 })) {
        return Response.json({ detail: "That's the limit for face-to-face calls from this connection today. Voice and chat still work." }, { status: 429, headers });
    }
    // Budget: Anam's free plan gives 30 minutes a month. 11 calls x 2.5 min = 27.5, with a little to spare.
    // (Its free plan stops at 30 and never bills, so these caps keep the feature honest, not safe from cost.)
    if (await monthlyCapReached(env, "avatar", Number(env.AVATAR_MONTHLY_CAP || 11))) {
        return Response.json({ detail: "Face-to-face calls are full for this month. Voice and chat still work." }, { status: 429, headers });
    }
    if (await dailyCapReached(env, "avatar", Number(env.AVATAR_DAILY_CAP || 3))) {
        return Response.json({ detail: "Face-to-face calls are full for today. Voice and chat still work." }, { status: 429, headers });
    }

    const maxSeconds = Number(env.AVATAR_MAX_SECONDS || 150);
    const room = `axon-${randomId(8)}`;
    const identity = `visitor-${randomId(5)}`;
    try {
        const token = await livekitToken({
            apiKey: env.LIVEKIT_API_KEY,
            apiSecret: env.LIVEKIT_API_SECRET,
            identity,
            room,
            agentName: env.AVATAR_AGENT_NAME || "axon-avatar",
            // Long enough to connect and hold the call; a token can't be reused for a second call (new room each time)
            ttlSeconds: maxSeconds + 120,
        });
        return Response.json({ url: env.LIVEKIT_URL, token, max_seconds: maxSeconds }, { headers });
    } catch (err) {
        console.error("avatar token failed:", err?.message || err);
        return Response.json({ detail: "Couldn't start a face-to-face call just now. Try voice or chat instead." }, { status: 502, headers });
    }
}

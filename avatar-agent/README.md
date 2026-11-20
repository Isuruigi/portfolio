# Axon avatar agent

Face-to-face calls on isuruig.com: a LiveKit agent with an Anam video avatar made from
`assets/avatar.jpg`. It uses the same knowledge base and guardrails as the site's chat and voice,
and always says it is an AI avatar, not Isuru.

This folder is its own project. The site (the parent folder) never imports from it, and Cloudflare
does not build it. It runs on LiveKit Cloud.

## How a call works

1. The visitor opens the **Face** tab in Axon's console and starts a call.
2. The site's `POST /api/avatar/token` (in `functions/api/avatar/token.js`) returns a short-lived
   token for a new private room. The token also tells LiveKit to send this agent to that room.
3. This agent joins, starts the Anam avatar, and talks: Deepgram (speech to text), Gemini
   (the answer) and ElevenLabs (Axon's voice), or Gemini Live if those keys aren't set.
4. The call ends at 2:30, when the visitor leaves, or after 45 seconds of silence.

## What you need

| Account | What for | Cost |
| --- | --- | --- |
| LiveKit Cloud, **a project of its own** (not a work or client project) | The room and hosting this agent | Free "Build" plan: 1,000 agent minutes a month |
| Anam account, API key and an avatar id | Rendering the avatar video | Free plan: 30 minutes a month, no card, then it stops (no overage) |
| Google AI Studio key (optional) | The conversation, on Google's free tier | Free tier. Without it the agent spends LiveKit credits |

## Make the avatar (once)

1. Sign up at https://lab.anam.ai (free, no card).
2. Create a custom avatar from `assets/avatar.jpg`.
3. Copy the avatar's id into `ANAM_AVATAR_ID`, and an API key from https://lab.anam.ai/api-keys into `ANAM_API_KEY`.

## Set up

```bash
pnpm install
cp .env.example .env.local      # then fill in the keys
lk cloud auth                   # sign in and pick the project for this agent
lk app env --write --destination .env.local   # writes the LiveKit URL and keys
```

## Run it locally

```bash
pnpm run dev
```

This copies the knowledge base from `../axon` first, then connects the agent to your LiveKit
project. Talk to it in the Agent Console link the command prints.

## Deploy

```bash
pnpm run sync                                  # copy the latest knowledge base
lk agent create --secrets-file .env.local      # first time: creates and deploys
lk agent deploy                                # later changes
```

Commit `livekit.toml` after the first deploy.

Then give the site the same LiveKit project, so it can issue tokens. In Cloudflare, add three
secrets for the `portfolio` Pages project (Production and Preview): `LIVEKIT_URL`,
`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Then talk to the deployed agent once in LiveKit's Agent Console, and only
then set `AVATAR_ENABLED` to `true` (in `wrangler.toml`, or as a Cloudflare variable). The Face tab appears after that.

## Changing what it knows or says

Never edit `src/axon/*`: those files are copies. Edit `../axon/knowledge.js` or
`../axon/prompt.js`, run `pnpm run sync`, and deploy again.

## Limits (the cost controls)

| Limit | Where | Default |
| --- | --- | --- |
| Call length | `AVATAR_MAX_SECONDS` here and in the site's `wrangler.toml` | 150 seconds |
| Calls per visitor | `functions/api/avatar/token.js` | 2 a minute, 4 a day |
| Calls per day, whole site | `AVATAR_DAILY_CAP` in `wrangler.toml` | 3 |
| Calls per month, whole site | `AVATAR_MONTHLY_CAP` in `wrangler.toml` | 11 (27.5 of Anam's 30 free minutes) |
| Silence | `IDLE_SECONDS` in `src/main.ts` | 45 seconds |

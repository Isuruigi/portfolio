// Face-to-face Axon: the site's voice agent, with a video avatar made from Isuru's portrait.
//
// A visitor's browser asks the site for a room token (functions/api/avatar/token.js). That token
// creates a private room and dispatches this agent to it by name. The agent then:
//   1. starts an Anam avatar (made once in Anam Lab from Isuru's portrait), which joins the room as video
//   2. runs the conversation with the same knowledge base and guardrails as the site's chat and voice
//      (src/axon/*, copied from ../axon by scripts/sync-knowledge.mjs), the same way the site's voice
//      call does: Deepgram hears, Gemini thinks, ElevenLabs speaks in Axon's voice. Without Deepgram
//      and ElevenLabs keys it falls back to Gemini Live (one model that hears and speaks).
//   3. acts on the visitor's page (scroll to a section, open the contact form, end the call)
//      through RPC methods the browser registers (src/components/chat/AvatarCall.tsx)
// Calls are short on purpose: avatar video is the one metered part of the site. Anam's free plan
// gives 30 minutes a month and stops there (no overage), so it can't run up a bill.
import { type JobContext, type JobProcess, ServerOptions, cli, defineAgent, inference, tts, voice } from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as silero from '@livekit/agents-plugin-silero';
import * as anam from '@livekit/agents-plugin-anam';
import { RoomEvent } from '@livekit/rtc-node';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createAgent } from './agent.ts';

// Local development reads keys from .env.local; on LiveKit Cloud they are secrets
dotenv.config({ path: '.env.local' });

// Must match AVATAR_AGENT_NAME on the site (wrangler.toml)
const AGENT_NAME = 'axon-avatar';
// Nobody has spoken for this long: end the call, so an abandoned tab stops using minutes
const IDLE_SECONDS = 45;

// Axon's ElevenLabs voice: the same one the site's tour and voice call use
const AXON_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'g8mugxIm0WCtD9QthCk3';
// Optional backup voice (Deepgram Aura); off unless set, since it doesn't sound like Axon
const BACKUP_VOICE = process.env.BACKUP_TTS_VOICE || '';
// The pipeline needs Deepgram to hear and a voice to speak; otherwise Gemini Live does both
const PIPELINE = Boolean(process.env.DEEPGRAM_API_KEY && (process.env.ELEVEN_API_KEY || BACKUP_VOICE));

export default defineAgent({
  // Voice activity detection decides when the visitor is talking (and cuts Axon off); load it once per worker
  prewarm: async (proc: JobProcess) => {
    if (PIPELINE) proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    const maxSeconds = Number(process.env.AVATAR_MAX_SECONDS || 150);
    const voiceName = process.env.AVATAR_VOICE || 'Charon';

    let session: voice.AgentSession;
    if (PIPELINE) {
      // Ears, brain and voice as three services, like the site's voice call
      session = new voice.AgentSession({
        vad: ctx.proc.userData.vad as silero.VAD,
        stt: new deepgram.STT({ model: 'nova-3', language: 'en' }),
        llm: new google.LLM({ model: process.env.AVATAR_LLM || 'gemini-3.5-flash-lite' }),
        // Axon's ElevenLabs voice first; if that fails (plan ended, credits spent, outage), the Aura backup
        tts: process.env.ELEVEN_API_KEY && BACKUP_VOICE
          ? new tts.FallbackAdapter({
              ttsInstances: [
                new elevenlabs.TTS({
                  voiceId: AXON_VOICE_ID,
                  model: 'eleven_flash_v2_5',
                  voiceSettings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
                }),
                new deepgram.TTS({ model: BACKUP_VOICE }),
              ],
            })
          : process.env.ELEVEN_API_KEY
            ? new elevenlabs.TTS({
                voiceId: AXON_VOICE_ID,
                model: 'eleven_flash_v2_5',
                voiceSettings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
              })
            : new deepgram.TTS({ model: BACKUP_VOICE }),
      });
    } else {
      // Gemini Live hears and speaks in one model. With your own Google key it runs on Google's
      // free tier; without one it falls back to LiveKit Inference, which bills LiveKit credits.
      const model = process.env.GOOGLE_API_KEY
        ? new google.beta.realtime.RealtimeModel({ model: process.env.AVATAR_MODEL || 'gemini-3.8-live', voice: voiceName })
        : new inference.RealtimeModel({ model: 'google/gemini-3.8-live', voice: voiceName });
      session = new voice.AgentSession({ llm: model });
    }

    // The avatar is created once in Anam Lab (lab.anam.ai) from assets/avatar.jpg; its id goes in ANAM_AVATAR_ID.
    // ANAM_API_KEY is read by the plugin itself.
    if (!process.env.ANAM_AVATAR_ID) throw new Error('Set ANAM_AVATAR_ID (create the avatar in Anam Lab first)');
    const avatar = new anam.AvatarSession({
      personaConfig: { name: 'Axon', avatarId: process.env.ANAM_AVATAR_ID },
    });

    // The visitor is the one participant the site's token names "visitor-…"; the avatar is another participant
    const visitor = () => [...ctx.room.remoteParticipants.values()].find((p) => p.identity.startsWith('visitor-'));

    /** Ask the visitor's browser to do something on the page. Returns what to tell the model. */
    const onPage = async (method: string, payload: Record<string, string> = {}) => {
      const to = visitor();
      if (!to || !ctx.room.localParticipant) return 'The visitor is no longer connected.';
      try {
        return await ctx.room.localParticipant.performRpc({
          destinationIdentity: to.identity,
          method,
          payload: JSON.stringify(payload),
          responseTimeout: 5000,
        });
      } catch {
        return "That didn't work on the visitor's page. Carry on without it.";
      }
    };

    // Start the avatar and wait for it to join, then the conversation
    await avatar.start(session, ctx.room);
    await session.start({ agent: createAgent(onPage), room: ctx.room });
    await ctx.connect();

    // Backstops: the browser ends the call at the limit, but never rely on the browser for cost control
    const limit = setTimeout(() => ctx.shutdown('time limit'), (maxSeconds + 20) * 1000);
    ctx.room.on(RoomEvent.ParticipantDisconnected, (p) => {
      if (p.identity.startsWith('visitor-')) ctx.shutdown('visitor left');
    });
    // Silence watch: any speech, from either side, resets it
    let idle = setTimeout(() => ctx.shutdown('idle'), IDLE_SECONDS * 1000);
    const heard = () => {
      clearTimeout(idle);
      idle = setTimeout(() => ctx.shutdown('idle'), IDLE_SECONDS * 1000);
    };
    session.on(voice.AgentSessionEventTypes.UserStateChanged, (e) => e.newState === 'speaking' && heard());
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, (e) => e.newState === 'speaking' && heard());
    ctx.addShutdownCallback(async () => {
      clearTimeout(limit);
      clearTimeout(idle);
    });

    session.generateReply({
      instructions:
        'Greet the visitor in one short sentence. Say plainly that you are an AI avatar of Isuru, run by Axon, his agent, and ask what they would like to know about his work.',
    });
  },
});

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url), agentName: AGENT_NAME }));

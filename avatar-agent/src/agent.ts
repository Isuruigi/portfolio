// The avatar's instructions and the three things it can do on the visitor's page.
import { llm, voice } from '@livekit/agents';
import { z } from 'zod';
import { avatarSystemPrompt } from './axon/prompt.js';

// Page anchors the avatar can scroll to. Keep in step with functions/api/voice/token.js on the site.
const SECTIONS = ['hero', 'work', 'personaplex', 'nexus', 'fraud', 'career', 'teaching', 'about', 'blog', 'news', 'contact'] as const;
const DOORS = ['hire', 'build', 'learn'] as const;

const LANGUAGE_RULE =
  'Speak English. If the visitor uses another language, say briefly, in English, that face-to-face calls are English-only for now and that they can type in Sinhala or Tamil in the chat instead.';

type OnPage = (method: string, payload?: Record<string, string>) => Promise<string>;

export function createAgent(onPage: OnPage) {
  return voice.Agent.create({
    instructions: avatarSystemPrompt(LANGUAGE_RULE),
    tools: [
      llm.tool({
        name: 'navigate_to_section',
        description: "Scroll the visitor's page to a part of Isuru's portfolio so they can see what you're talking about.",
        parameters: z.object({ section: z.enum(SECTIONS).describe('The part of the page to show.') }),
        execute: async ({ section }) => onPage('axon.navigate', { section }),
      }),
      llm.tool({
        name: 'open_contact',
        description: 'Open the contact form with the right subject when the visitor wants to hire Isuru, build something with him, or learn from him.',
        parameters: z.object({ door: z.enum(DOORS).describe('Why the visitor wants to get in touch.') }),
        execute: async ({ door }) => onPage('axon.contact', { door }),
      }),
      llm.tool({
        name: 'end_call',
        description: 'End the call after the visitor says goodbye or clearly wants to stop. Say a short goodbye first.',
        execute: async () => onPage('axon.end'),
      }),
    ],
  });
}

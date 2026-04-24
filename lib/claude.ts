// ——————————————————————————————————————————————————
// Claude (Anthropic) client for server-side generation
// ——————————————————————————————————————————————————

import Anthropic from '@anthropic-ai/sdk';
import type { ArchiveWithMemories } from './types';
import { LIMITS } from './limits';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY is not set — AI generation will fail.');
}

export const claude = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// The specific model we use — Claude Sonnet 4.6 for balance of quality and cost
export const DEFAULT_MODEL = 'claude-sonnet-4-6';

// ——————————————————————————————————————————————————
// Core prompt building
// ——————————————————————————————————————————————————

export type GenerateTool =
  | 'obit_traditional'
  | 'obit_celebratory'
  | 'obit_personal'
  | 'eulogy'
  | 'thank_yous';

const SYSTEM_PROMPT = `You are helping a funeral director produce service materials from a family's collected memories of someone who has died.

Your job is to stitch the family's own contributions into a deliverable, using their exact words wherever possible. You are not the author — you are the careful assembler.

Strict rules:
- Use the contributors' own phrasing where it's natural. Attribute stories when relevant ("Her daughter Rachel remembered...").
- Never invent facts, relationships, dates, or events. If a detail isn't in the memories, don't add it.
- Do not use cliché language like "passed away peacefully" or "will be greatly missed" unless the family's contributions suggest it.
- Match the tone requested: traditional is dignified and restrained, celebratory is warmer and fuller, personal is intimate.
- Never use emojis, exclamation points, or corporate language.
- If the contributions are thin, produce a shorter piece. Don't pad.
- Return only the final text. No meta-commentary, no "Here is the obituary:" preamble.`;

function formatMemoriesForPrompt(archive: ArchiveWithMemories): string {
  const subject = archive.subject_name;
  const dates = archive.subject_dates || 'dates not provided';

  const lines: string[] = [];
  lines.push(`Subject: ${subject}`);
  lines.push(`Dates: ${dates}`);
  lines.push('');
  lines.push(`Family contributions (${archive.memories.length} total):`);
  lines.push('');

  const textMemories = archive.memories.filter(m => m.memory_type === 'text');
  const photoMemories = archive.memories.filter(m => m.memory_type === 'photo');
  const voiceMemories = archive.memories.filter(m => m.memory_type === 'voice');
  const videoMemories = archive.memories.filter(m => m.memory_type === 'video');

  textMemories.forEach(m => {
    lines.push(`--- Story from ${m.author_name} ---`);
    lines.push(m.text_content || '');
    lines.push('');
  });

  if (photoMemories.length > 0) {
    lines.push(`--- Photo memories ---`);
    photoMemories.forEach(m => {
      lines.push(`${m.author_name} shared a photo${m.caption ? `: "${m.caption}"` : ''}`);
    });
    lines.push('');
  }

  if (voiceMemories.length > 0) {
    lines.push(`--- Voice recordings ---`);
    voiceMemories.forEach(m => {
      lines.push(`${m.author_name} recorded a voice memory${m.caption ? ` titled "${m.caption}"` : ''} (${Math.round(m.duration_seconds || 0)}s)`);
    });
    lines.push('');
  }

  if (videoMemories.length > 0) {
    lines.push(`--- Video memories ---`);
    videoMemories.forEach(m => {
      lines.push(`${m.author_name} shared a video${m.caption ? `: "${m.caption}"` : ''}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

const TOOL_INSTRUCTIONS: Record<GenerateTool, string> = {
  obit_traditional:
    'Write a TRADITIONAL OBITUARY suitable for a newspaper. 150–300 words. Formal, dignified, restrained. Third person. Include the facts and one or two quoted recollections if available. End with a line about services to be announced.',
  obit_celebratory:
    'Write a CELEBRATORY OBITUARY suitable for a memorial website or program. 250–450 words. Warmer than the traditional version, fuller of the specific stories the family shared, but never saccharine. Weave in attributed memories.',
  obit_personal:
    'Write a PERSONAL OBITUARY suitable for the funeral program. 150–250 words. Intimate, direct, written as though by someone who loved them. First-person plural ("we"). Focus on small, specific things.',
  eulogy:
    'Draft a EULOGY for whoever is giving the speech at the service. 400–700 words. First person singular. Acknowledge those present, weave in the family\'s shared memories with attributions, include one concrete story, and end with a closing that carries them out.',
  thank_yous:
    'Draft personalized THANK-YOU NOTES to each unique contributor in the family. Each note should be 50–100 words, reference the specific memory or contribution they shared, and feel hand-written. Return as a JSON array: [{ "to": "<name>", "body": "<note text>" }, ...]',
};

// ——————————————————————————————————————————————————
// Main generate function
// ——————————————————————————————————————————————————

export async function generateFromArchive(
  archive: ArchiveWithMemories,
  tool: GenerateTool
): Promise<string> {
  const familyContext = formatMemoriesForPrompt(archive);
  const instruction = TOOL_INSTRUCTIONS[tool];

  const userMessage = `${instruction}\n\n${familyContext}`;

  const response = await claude.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: LIMITS.GENERATION_MAX_OUTPUT_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('\n');

  return text.trim();
}

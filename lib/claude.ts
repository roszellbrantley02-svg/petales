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

export const DEFAULT_MODEL = 'claude-sonnet-4-6';

// ——————————————————————————————————————————————————
// Tool catalog — every "click a button" generation in the console
// ——————————————————————————————————————————————————

export type GenerateTool =
  // Obituary variants (tone)
  | 'obit_traditional'
  | 'obit_celebratory'
  | 'obit_personal'
  // Service writing
  | 'eulogy'
  | 'death_notice'
  | 'memorial_card'
  | 'order_of_service'
  | 'memorial_program'
  | 'service_timeline'
  // Suggestions
  | 'reading_music_suggestions'
  // After-service
  | 'thank_yous'
  | 'acknowledgment_letter'
  | 'grief_resources';

// ——————————————————————————————————————————————————
// System prompt — applies to every generation
// ——————————————————————————————————————————————————

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

// ——————————————————————————————————————————————————
// Format the family's contributions as Claude's input context
// ——————————————————————————————————————————————————

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

// ——————————————————————————————————————————————————
// Per-tool instructions
// ——————————————————————————————————————————————————

const TOOL_INSTRUCTIONS: Record<GenerateTool, string> = {
  obit_traditional:
    'Write a TRADITIONAL OBITUARY suitable for a newspaper. 150–300 words. Formal, dignified, restrained. Third person. Include the facts and one or two quoted recollections if available. End with a line about services to be announced.',

  obit_celebratory:
    'Write a CELEBRATORY OBITUARY suitable for a memorial website or program. 250–450 words. Warmer than the traditional version, fuller of the specific stories the family shared, but never saccharine. Weave in attributed memories.',

  obit_personal:
    'Write a PERSONAL OBITUARY suitable for the funeral program. 150–250 words. Intimate, direct, written as though by someone who loved them. First-person plural ("we"). Focus on small, specific things.',

  eulogy:
    'Draft a EULOGY for whoever is giving the speech at the service. 400–700 words. First person singular. Acknowledge those present, weave in the family\'s shared memories with attributions, include one concrete story, and end with a closing that carries them out.',

  death_notice:
    'Write a SHORT DEATH NOTICE suitable for newspapers that charge per word. 40–80 words maximum. Just the facts: full name, dates, immediate family members named, the briefest mention of where services will be held. No stories, no flourishes. Wire-service plain.',

  memorial_card:
    'Write the text for a MEMORIAL CARD — the small printed card families take home from the service. 30–60 words. Should feel like a quiet farewell. Often includes a brief quote, a verse, or a meaningful line drawn from the family\'s contributions. If a religious tradition is suggested by the contributions, lean into it gently.',

  order_of_service:
    'Draft a complete ORDER OF SERVICE for the funeral program. Format as a clean, printable list of moments in the service: prelude/gathering music, welcome, opening reading, eulogy, musical selection, family remarks, closing reading, recessional. Where the family\'s contributions mention specific music, readings, or rituals, include them by name. Otherwise, use respectful placeholders ("Family-selected music"). Format with each moment on its own line. Keep it under 25 lines.',

  memorial_program:
    'Produce the COMPLETE TEXT FOR A MEMORIAL PROGRAM, ready to print. Structure: 1) Cover info (name, dates, service date placeholder), 2) Personal obituary (150 words), 3) Order of service, 4) Acknowledgments thanking family who contributed and friends in attendance. Use ALL CAPS section headers. Plain text formatting only — no markdown, no special characters. Around 400–600 words total.',

  service_timeline:
    'Generate a SERVICE-DAY TIMELINE for the funeral director. Minute-by-minute schedule from family arrival through reception. Format as: "10:00 AM — Family arrives" / "10:15 AM — Viewing begins" / etc. Make reasonable assumptions about timing of standard funeral elements. Note where the director should personally check in. Keep it practical and operational. 15–25 lines.',

  reading_music_suggestions:
    'Suggest 5 READINGS and 5 PIECES OF MUSIC appropriate for this service, based on what the family has shared about the deceased. For each reading, include the title, author/source, and a one-sentence reason it fits. For each piece of music, include the title, composer/performer, and a one-sentence reason. Mix sacred and secular options unless the contributions strongly suggest one tradition. Format as two clearly-labeled sections.',

  thank_yous:
    'Draft personalized THANK-YOU NOTES to each unique contributor in the family. Each note should be 50–100 words, reference the specific memory or contribution they shared, and feel hand-written. Format as plain text with "To [Name]:" headers separating each note. Sign each from "The family."',

  acknowledgment_letter:
    'Write an ACKNOWLEDGMENT LETTER to a charity that received donations in lieu of flowers. ~150 words. Formal but warm. Confirms the family\'s wishes that gifts be made in the deceased\'s memory. Includes a placeholder for the charity name in [brackets]. From the funeral home on behalf of the family.',

  grief_resources:
    'Compile a list of GRIEF SUPPORT RESOURCES suitable for the family. Mix of national and reputable options: 3 national grief organizations with brief descriptions and URLs, 2 recommended books on loss, 1 online community, and 1 line about local resources (with a placeholder noting the funeral home should add their region\'s specifics). Format as a clean, scannable list. Tone: caring but practical.',
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

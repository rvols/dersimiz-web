import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.5-flash';

export type ModerationStatus = 'approved' | 'blocked' | 'flagged';

const SYSTEM_PROMPT = `You are a content moderator for a tutoring platform chat. The content may be in Turkish or English.
Respond with exactly one word: approved, blocked, or flagged.
- approved: Safe, respectful, on-topic (education, scheduling, contact).
- blocked: Hate, harassment, threats, explicit sexual content, illegal content, or clear abuse. Do not deliver.
- flagged: Borderline (e.g. mild rudeness, spam, or off-topic). Deliver but notify admins.
Consider the context of a student–tutor conversation. Be strict on abuse and explicit content; otherwise prefer approved.`;

/**
 * Runs AI moderation on text using Gemini 2.5 Flash.
 * Returns 'approved' if GEMINI_API_KEY is unset or the API fails (fail-open for availability).
 */
export async function moderateText(text: string): Promise<ModerationStatus> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) return 'approved';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM_PROMPT });
    const result = await model.generateContent(
      `Moderate this message. Reply with exactly one word: approved, blocked, or flagged.\n\nMessage: ${text}`
    );
    const raw = result.response.text()?.trim().toLowerCase() ?? '';
    if (raw === 'blocked' || raw === 'flagged') return raw;
    return 'approved';
  } catch {
    return 'approved';
  }
}

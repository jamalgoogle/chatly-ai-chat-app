import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION =
  "You are a helpful, friendly assistant in a chat app. Keep answers clear and concise unless the user asks for more detail.";

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 1000; // 1s, then 2s, then 4s between retries

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini returns 503 when the model is temporarily overloaded, and 429 when
// you're being rate-limited. Both are usually worth a short retry rather
// than failing the user's message outright.
function isRetryable(err) {
  return err?.status === 503 || err?.status === 429;
}

// history: [{ role: 'user'|'assistant', content: string | array-of-content-parts }]
// Gemini calls the assistant's own turns "model" instead of "assistant", and
// each turn is { role, parts: [...] } instead of { role, content }.
export async function getAssistantReply(history) {
  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: Array.isArray(m.content) ? m.content : [{ text: m.content || "" }],
  }));

  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
        contents,
        config: { systemInstruction: SYSTEM_INSTRUCTION },
      });
      return response.text;
    } catch (err) {
      lastErr = err;
      const attemptsLeft = attempt < MAX_ATTEMPTS;
      if (!isRetryable(err) || !attemptsLeft) break;

      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      console.warn(`Gemini overloaded (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delay}ms`);
      await sleep(delay);
    }
  }

  if (isRetryable(lastErr)) {
    throw new Error(
      "The AI service is busy right now (it's on Google's end, not yours). Please try again in a moment."
    );
  }
  throw lastErr;
}

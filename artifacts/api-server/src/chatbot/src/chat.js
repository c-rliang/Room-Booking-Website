// Tool-use loop for Gemini (free tier) or Claude. The client sends plain text
// history; tool calls run here on the server, so the API key and the rules
// never reach the browser.

import { getTools, runTool } from './tools.js';
import { systemPrompt } from './prompt.js';
import { nowPacific, pretty } from './rules.js';

const MAX_TOOL_ROUNDS = 4;
export const LIMITS = { maxMessages: 30, maxCharsPerMessage: 2000 };

/** Validates and trims the client-supplied history. Throws on bad input. */
export function cleanHistory(messages) {
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('messages must be a non-empty array');
  const recent = messages.slice(-LIMITS.maxMessages);
  const clean = recent.map((m) => {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string') throw new Error('each message needs role user|assistant and string content');
    return { role: m.role, content: m.content.slice(0, LIMITS.maxCharsPerMessage) };
  });
  while (clean.length && clean[0].role !== 'user') clean.shift();
  if (!clean.length || clean.at(-1).role !== 'user') throw new Error('the last message must be from the user');
  return clean;
}

/**
 * Runs one chat turn.
 * config = { provider: 'gemini' | 'anthropic', apiKey, model, demoToday, fetchImpl }
 * @returns {Promise<{reply: string, plan: object|null, rooms: object|null}>}
 */
export async function chatTurn(messages, config = {}) {
  const now = nowPacific(config.demoToday);
  const system = systemPrompt(pretty(now), new Date(now).toISOString().slice(0, 10));
  const history = cleanHistory(messages);
  const captured = { plan: null, rooms: null, event: null };
  const callTool = (name, input) => {
    const output = runTool(name, input, now);
    if (name === 'plan_event' && !output.error) {
      captured.plan = output;
      captured.event = input;
    }
    if (name === 'recommend_rooms' && !output.error) captured.rooms = output;
    return output;
  };
  const loop = config.provider === 'anthropic' ? anthropicLoop : geminiLoop;
  const reply = await loop(history, system, callTool, { fetchImpl: fetch, ...config });
  return { reply, ...captured };
}

async function postJson(fetchImpl, url, headers, body, label) {
  const res = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${label} API error ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}

const GIVE_UP = 'Sorry, I could not finish checking your event. Please try rephrasing.';

// ---------------- Gemini ----------------
// Gemini accepts a subset of JSON Schema for function parameters, so we drop
// the keywords it may reject. runTool validates inputs itself.
const DROP = new Set(['pattern', 'minItems', 'maxItems', 'minimum', 'maximum', 'additionalProperties']);
function geminiSchema(schema) {
  if (Array.isArray(schema)) return schema.map(geminiSchema);
  if (!schema || typeof schema !== 'object') return schema;
  return Object.fromEntries(Object.entries(schema).filter(([k]) => !DROP.has(k)).map(([k, v]) => [k, k === 'properties' ? Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, geminiSchema(pv)])) : geminiSchema(v)]));
}
const geminiTools = () => [{ functionDeclarations: getTools().map((t) => ({ name: t.name, description: t.description, parameters: geminiSchema(t.input_schema) })) }];

async function geminiLoop(history, system, callTool, { apiKey, model, fetchImpl }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const contents = history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const data = await postJson(fetchImpl, url, { 'x-goog-api-key': apiKey }, {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      tools: geminiTools(),
      generationConfig: { maxOutputTokens: 2048 },
    }, 'Gemini');

    const content = data.candidates?.[0]?.content;
    if (!content?.parts?.length) {
      const reason = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason || 'empty response';
      throw new Error(`Gemini returned no content (${reason})`);
    }
    const calls = content.parts.filter((p) => p.functionCall);
    if (calls.length === 0) {
      return content.parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim();
    }
    // Send the model turn back unchanged (it may carry thought signatures Gemini requires).
    contents.push({ role: 'model', parts: content.parts });
    contents.push({
      role: 'user',
      parts: calls.map(({ functionCall: fc }) => ({
        functionResponse: { name: fc.name, ...(fc.id ? { id: fc.id } : {}), response: callTool(fc.name, fc.args || {}) },
      })),
    });
  }
  return GIVE_UP;
}

// ---------------- Claude (Anthropic) ----------------
async function anthropicLoop(history, system, callTool, { apiKey, model, fetchImpl }) {
  const convo = history.map((m) => ({ ...m }));
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const data = await postJson(fetchImpl, 'https://api.anthropic.com/v1/messages',
      { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      { model, max_tokens: 1200, system, tools: getTools(), messages: convo }, 'Claude');
    const toolUses = data.content.filter((b) => b.type === 'tool_use');
    if (data.stop_reason !== 'tool_use' || toolUses.length === 0) {
      return data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    }
    convo.push({ role: 'assistant', content: data.content });
    convo.push({
      role: 'user',
      content: toolUses.map((t) => {
        const output = callTool(t.name, t.input);
        return { type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(output), ...(output.error ? { is_error: true } : {}) };
      }),
    });
  }
  return GIVE_UP;
}

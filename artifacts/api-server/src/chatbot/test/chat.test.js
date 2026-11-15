// Tests the tool-use loop with a fake Claude API (no key or network needed).
import test from 'node:test';
import assert from 'node:assert/strict';
import { chatTurn, cleanHistory } from '../src/chat.js';

function fakeClaude(script) {
  const calls = [];
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const next = script.shift();
    return { ok: true, json: async () => next(body) };
  };
  return { fetchImpl, calls };
}

const HALLOWEEN = "I'm hosting a halloween social for my club, Open Alpha, which will have 20 people. We're going to eat candy and watch movies. We heavily prefer October 28th for 2 hours, anytime between 6pm and 10pm, but October 27th or 26th at the same times works too.";

test('Claude: follow-up question passes straight through', async () => {
  const { fetchImpl } = fakeClaude([() => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Before I continue, will you need a projector?' }] })]);
  const out = await chatTurn([{ role: 'user', content: HALLOWEEN }], { provider: 'anthropic', apiKey: 'x', model: 'm', demoToday: '2026-10-01', fetchImpl });
  assert.equal(out.reply, 'Before I continue, will you need a projector?');
  assert.equal(out.plan, null);
});

test('Claude: tool calls run on the server and results reach the final turn', async () => {
  const opts = ['2026-10-28', '2026-10-27', '2026-10-26'].map((date) => ({ date, window_start: '18:00', window_end: '22:00', duration_minutes: 120 }));
  const { fetchImpl, calls } = fakeClaude([
    () => ({
      stop_reason: 'tool_use',
      content: [
        { type: 'tool_use', id: 't1', name: 'plan_event', input: { club_name: 'Open Alpha', attendance: 20, has_food: true, funding: 'none', options: opts } },
        { type: 'tool_use', id: 't2', name: 'recommend_rooms', input: { attendance: 20, needs: ['projector'] } },
      ],
    }),
    (body) => {
      const results = body.messages.at(-1).content;
      assert.equal(results.length, 2);
      assert.equal(results[0].type, 'tool_result');
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Here is your plan.' }] };
    },
  ]);
  const history = [
    { role: 'user', content: HALLOWEEN },
    { role: 'assistant', content: 'Before I continue, will you need a projector?' },
    { role: 'user', content: 'Yes' },
  ];
  const out = await chatTurn(history, { provider: 'anthropic', apiKey: 'x', model: 'm', demoToday: '2026-10-01', fetchImpl });
  assert.equal(out.reply, 'Here is your plan.');
  assert.equal(out.plan.best_option.date, '2026-10-28');
  assert.equal(out.plan.classroom_blockers[0].rule, 'R16');
  assert.ok(out.rooms.recommended.length >= 1);
  assert.equal(calls.length, 2);
  assert.match(calls[0].system, /2026-10-01/);
});

test('history validation rejects bad input and trims long messages', () => {
  assert.throws(() => cleanHistory([]));
  assert.throws(() => cleanHistory([{ role: 'system', content: 'hi' }]));
  assert.throws(() => cleanHistory([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }]));
  const out = cleanHistory([{ role: 'user', content: 'x'.repeat(5000) }]);
  assert.equal(out[0].content.length, 2000);
});

test('Gemini: function calls run on the server and results reach the final turn', async () => {
  const opts = ['2026-10-28', '2026-10-27'].map((date) => ({ date, window_start: '18:00', window_end: '22:00', duration_minutes: 120 }));
  const { fetchImpl, calls } = fakeClaude([
    () => ({ candidates: [{ content: { role: 'model', parts: [
      { functionCall: { name: 'plan_event', args: { club_name: 'Open Alpha', attendance: 20, has_food: true, funding: 'none', options: opts } }, thoughtSignature: 'sig1' },
      { functionCall: { name: 'recommend_rooms', args: { attendance: 20, needs: ['projector'] } } },
    ] } }] }),
    (body) => {
      const modelTurn = body.contents.at(-2);
      assert.equal(modelTurn.parts[0].thoughtSignature, 'sig1'); // signature sent back unchanged
      const responses = body.contents.at(-1).parts;
      assert.equal(responses.length, 2);
      assert.equal(responses[0].functionResponse.name, 'plan_event');
      assert.equal(responses[0].functionResponse.response.best_option.date, '2026-10-28');
      return { candidates: [{ content: { role: 'model', parts: [{ text: 'Here is your plan.' }] } }] };
    },
  ]);
  const out = await chatTurn([{ role: 'user', content: HALLOWEEN }, { role: 'assistant', content: 'Projector?' }, { role: 'user', content: 'Yes' }],
    { provider: 'gemini', apiKey: 'x', model: 'gemini-test', demoToday: '2026-10-01', fetchImpl });
  assert.equal(out.reply, 'Here is your plan.');
  assert.ok(out.rooms.recommended.length >= 1);
  assert.equal(calls[0].contents[1].role, 'model');
  assert.ok(calls[0].systemInstruction.parts[0].text.includes('2026-10-01'));
  const decl = calls[0].tools[0].functionDeclarations[0];
  assert.equal(JSON.stringify(decl).includes('pattern'), false); // unsupported keywords stripped
});

test('bad tool input comes back as an error the model can fix', async () => {
  const { runTool } = await import('../src/tools.js');
  const out = runTool('plan_event', { attendance: 20, has_food: false, options: [{ date: 'Oct 28' }] }, Date.now());
  assert.match(out.error, /YYYY-MM-DD/);
});

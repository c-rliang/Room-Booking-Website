export function conversationHistory(messages) {
  return messages.filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.text }));
}

export function mapChatReply(data) {
  if (!data || typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('The assistant returned an invalid reply. Please retry.');
  const input = data.event;
  const result = data.plan;
  const best = result?.best_option;
  const plan = input || result ? {
    eventName: input?.event_name || input?.event_purpose,
    date: best?.date,
    time: best ? `${best.start_time} – ${best.end_time} Pacific` : undefined,
    attendance: input?.attendance,
    food: input?.has_food,
    projector: undefined, // No tool-result field establishes this; do not guess.
  } : null;
  return {
    text: data.reply, stage: result ? 'planned' : 'awaiting-details',
    plan, policy: result,
    recommendedRoomIds: data.rooms ? data.rooms.recommended.map((r) => r.id) : [],
    noMatch: data.rooms?.no_match,
    demandNote: data.rooms?.note,
    forms: result?.steps?.map((s) => ({ name: s.title, detail: [s.after, s.tip].filter(Boolean).join(' '), deadline: s.due, url: s.url, prepare: s.prepare })),
    nextSteps: result?.steps?.map((s) => `${s.title}: ${s.due}`),
    canSave: Boolean(plan?.eventName && plan?.date && plan?.time && plan?.attendance && data.rooms?.recommended?.length &&
      !result?.classroom_blockers?.length),
  };
}

export function safeLink(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch { return null; }
}

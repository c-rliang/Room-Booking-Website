/*
 * ChatAdapter — the simulated chatbot "brain".
 *
 * TEAMMATE: replace getAssistantReply with a call to the real chatbot.
 * Contract:
 *   getAssistantReply({ text, stage }) => Promise<Reply>
 *   Reply = {
 *     text: string,
 *     stage: 'idle' | 'awaiting-details' | 'planned',
 *     followUpOptions?: string[],
 *     plan?: { eventName, date, time, attendance, food, projector },
 *     recommendedRoomIds?: string[],   // highlighted on the map
 *     forms?: { name, detail, deadline }[],
 *     nextSteps?: string[],
 *   }
 * No network request is made by the mock below.
 */
import ChatPanel from '../components/ChatPanel.jsx';

export const DEMO_PROMPT =
  'We need a room for a Halloween social with 20 people, food, movies, and a projector.';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function parseWhen(text) {
  const t = text.toLowerCase();
  if (t.includes('thursday') || t.includes('30')) return { date: '2025-10-30', time: '7:00 - 10:00 PM' };
  if (t.includes('saturday') || t.includes('nov')) return { date: '2025-11-01', time: '6:00 - 9:00 PM' };
  return { date: '2025-10-31', time: '7:00 - 10:00 PM' };
}

export async function getAssistantReply({ text, stage }) {
  await wait(900);
  const t = text.toLowerCase();

  if (stage === 'awaiting-details') {
    const when = parseWhen(text);
    return {
      stage: 'planned',
      text: 'Got it. Here is your event plan and three rooms that fit 20 people with a projector and food allowed. They are highlighted on the map.',
      plan: { eventName: 'Halloween Movie Social', ...when, attendance: 20, food: true, projector: true },
      recommendedRoomIds: ['r-hw-112', 'r-vn-305', 'r-ok-studio'],
      forms: [
        { name: 'Room Request Form', detail: 'Submitted through RoomScout', deadline: '10 business days before' },
        { name: 'Food Service Notice', detail: 'Required when serving food in classrooms', deadline: '7 days before' },
        { name: 'Public Film Screening Waiver', detail: 'Needed to show movies to a group', deadline: '5 days before' },
      ],
      nextSteps: [
        'Pick one of the rooms below (or on the map).',
        'Submit the room request from here.',
        'Ask your advisor to sign the food notice.',
      ],
    };
  }

  if (t.includes('halloween') || (t.includes('movie') && t.includes('projector'))) {
    return {
      stage: 'awaiting-details',
      text: 'A Halloween movie social sounds fun. One quick question before I search: which night are you aiming for, and roughly what hours?',
      followUpOptions: ['Friday Oct 31, 7-10 PM', 'Thursday Oct 30, evening', 'Saturday Nov 1, 6-9 PM'],
    };
  }

  if (t.includes('form') || t.includes('permit')) {
    return {
      stage,
      text: 'Most events need a Room Request Form. Serving food adds a Food Service Notice, and showing films adds a screening waiver. Try the demo event to see a full checklist.',
    };
  }

  return {
    stage,
    text: 'I can help with that. Tell me the event type, headcount, and whether you need food or a projector. Or tap "Try demo event" to see a full walkthrough.',
  };
}

export default function ChatAdapter(props) {
  return <ChatPanel {...props} getReply={getAssistantReply} />;
}

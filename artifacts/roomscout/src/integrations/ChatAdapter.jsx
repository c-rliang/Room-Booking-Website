import ChatPanel from '../components/ChatPanel.jsx';
import { sendChat } from '@workspace/api-client-react';
import { mapChatReply } from './chat-model.js';

export const DEMO_PROMPT = 'Help plan a club meeting for 20 people with a projector, no food. What details do you need?';
export async function getAssistantReply({ history, signal }) {
  try {
    return mapChatReply(await sendChat({ messages: history }, { signal }));
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    const knownCodes = ['NOT_CONFIGURED', 'INVALID_INPUT', 'RATE_LIMITED', 'CATALOG_UNAVAILABLE', 'PROVIDER_FAILED', 'PROVIDER_TIMEOUT', 'PAYLOAD_TOO_LARGE'];
    const message = knownCodes.includes(error.data?.code) ? error.data.error :
      'Could not reach the assistant. Check your connection and retry; your conversation is still here.';
    throw new Error(message);
  }
}
export default function ChatAdapter(props) {
  return <ChatPanel {...props} getReply={getAssistantReply} />;
}

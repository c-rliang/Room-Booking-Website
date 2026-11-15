// Credentials are read only by the API process. Never load private .env files.
export { POPULARITY_FULL } from '@workspace/room-catalog';
export function providerConfig(env = process.env) {
  const provider = (env.LLM_PROVIDER || env.CHAT_PROVIDER || 'gemini').toLowerCase();
  if (!['gemini', 'anthropic'].includes(provider)) return null;
  const apiKey = provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.GEMINI_API_KEY;
  if (!apiKey || /paste.your|your.api|placeholder/i.test(apiKey)) return null;
  return {
    provider, apiKey,
    model: (provider === 'anthropic' ? env.ANTHROPIC_MODEL : env.GEMINI_MODEL) ||
      env.CHAT_MODEL || (provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gemini-3.5-flash'),
  };
}

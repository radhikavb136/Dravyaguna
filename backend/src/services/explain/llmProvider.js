import { env } from '../../config/env.js';
import { createGeminiProvider, resolveGeminiModel } from './geminiProvider.js';

export const mockLlmProvider = {
  name: 'mock',
  model: 'mock',
  calls: 0,
  async generate() {
    this.calls += 1;
    return 'Development mock only. No AI answer was generated; review the retrieved source passages below.';
  },
  reset() {
    this.calls = 0;
  },
};

export function resolveConfiguredLlmProviderName() {
  if (env.nodeEnv === 'test') return 'mock';
  if (env.llmProvider && env.llmProvider !== 'mock') return env.llmProvider;
  return env.geminiApiKey || env.llmApiKey ? 'gemini' : 'mock';
}

export function isLiveLlmConfigured() {
  const name = resolveConfiguredLlmProviderName();
  if (name === 'gemini') return Boolean(env.geminiApiKey || env.llmApiKey);
  if (name === 'openai') return Boolean(env.llmApiKey && env.llmModel);
  return false;
}

export function configuredLlmProvider() {
  if (env.nodeEnv === 'test') return mockLlmProvider;
  const providerName = resolveConfiguredLlmProviderName();
  if (providerName === 'mock') return mockLlmProvider;
  if (providerName === 'openai') {
    return createOpenAiProvider({ apiKey: env.llmApiKey, model: env.llmModel });
  }
  if (providerName === 'gemini') {
    const apiKey = env.geminiApiKey || env.llmApiKey;
    return createGeminiProvider({
      apiKey,
      model: resolveGeminiModel(env.llmModel),
    });
  }
  return {
    name: providerName,
    model: env.llmModel || '',
    async generate() {
      throw new Error(`Unsupported LLM_PROVIDER: ${providerName}`);
    },
  };
}

export function createOpenAiProvider({ apiKey, model, fetchImpl = fetch }) {
  return {
    name: 'openai',
    model,
    async generate({ system, retrievedData, question }) {
      if (!apiKey || !model) throw new Error('OpenAI provider requires LLM_API_KEY and LLM_MODEL');
      const response = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          instructions: system,
          input: JSON.stringify(retrievedData),
          max_output_tokens: 320,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`LLM request failed with status ${response.status}`);
      const text = payload?.output
        ?.flatMap((item) => item.content || [])
        .filter((item) => item.type === 'output_text')
        .map((item) => item.text)
        .join('\n')
        .trim();
      if (!text) throw new Error('LLM response contained no text');
      return text;
    },
  };
}

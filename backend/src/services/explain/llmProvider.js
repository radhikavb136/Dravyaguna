import { env } from '../../config/env.js';

export const mockLlmProvider = {
  name: 'mock',
  model: 'mock',
  calls: 0,
  async generate({ retrievedData }) {
    this.calls += 1;
    const scored = retrievedData.scoring?.breakdown?.length || 0;
    const percent = retrievedData.scoring?.matchPercentage;
    return `Mock explanation based on the retrieved record: ${scored} scoring criteria were evaluated${percent == null ? '.' : ` with a ${percent}% match`}. This mock output adds no clinical claims.`;
  },
  reset() {
    this.calls = 0;
  },
};

export function configuredLlmProvider() {
  if (!env.llmProvider || env.llmProvider === 'mock') return mockLlmProvider;
  if (env.llmProvider === 'openai') {
    return createOpenAiProvider({ apiKey: env.llmApiKey, model: env.llmModel });
  }
  return {
    name: env.llmProvider,
    model: env.llmModel || '',
    async generate() {
      throw new Error(`Unsupported LLM_PROVIDER: ${env.llmProvider}`);
    },
  };
}

export function createOpenAiProvider({ apiKey, model, fetchImpl = fetch }) {
  return {
    name: 'openai',
    model,
    async generate({ system, retrievedData }) {
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

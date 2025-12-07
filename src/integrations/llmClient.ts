import fetch from 'node-fetch';
import { Features, Position, TokenState, Config } from '../utils/types';

export class LlmClient {
  constructor(private config: Config) {}

  async analyzeContext(features: Features, position: Position | null, tokenState: TokenState | null): Promise<string> {
    if (!this.config.openAiApiKey) return 'Aucune clé AI fournie.';
    const payload = {
      model: this.config.openAiModel || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Analyse le risque de rugpull et résume les signaux en français.',
        },
        {
          role: 'user',
          content: `Features: ${JSON.stringify(features)}\nPosition: ${JSON.stringify(position)}\nToken: ${JSON.stringify(tokenState)}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 180,
    };

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.openAiApiKey}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as any;
      return json.choices?.[0]?.message?.content || 'Analyse indisponible';
    } catch (err: any) {
      return `Erreur IA: ${err.message}`;
    }
  }
}

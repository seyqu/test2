import axios from 'axios';
import { Config, Features, Position, TokenState } from '../utils/types';
import { logger } from '../utils/logger';

export class LlmClient {
  constructor(private config: Config) {}

  async analyzeContext(
    features: Features,
    position: Position | null,
    tokenState: TokenState | null,
    pRug: number
  ): Promise<string> {
    const prompt = this.buildPrompt(features, position, tokenState, pRug);
    try {
      const { data } = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.config.openAiModel,
          messages: [
            {
              role: 'system',
              content: 'You are an expert quant trading assistant specialized in Solana rugs detection.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.openAiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      return data.choices?.[0]?.message?.content || 'No response';
    } catch (err) {
      logger.error(`LLM analyzeContext error: ${err}`);
      return 'LLM unavailable';
    }
  }

  private buildPrompt(features: Features, position: Position | null, tokenState: TokenState | null, pRug: number): string {
    return `Analyze the following token context and risk metrics:\nFeatures: ${JSON.stringify(features)}\nTokenState: ${JSON.stringify(
      tokenState
    )}\nCurrent position: ${position ? JSON.stringify(position) : 'none'}\nRug probability: ${pRug.toFixed(4)}\nProvide concise risk notes and suggestions.`;
  }
}

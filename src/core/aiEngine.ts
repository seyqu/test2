import { AiAnalysisResult, Config, Features, Position, TokenState } from '../utils/types';
import { RiskEngine } from './riskEngine';
import { LlmClient } from '../integrations/llmClient';

export class AiEngine {
  constructor(private riskEngine: RiskEngine, private llmClient: LlmClient, private config: Config) {}

  async getAiAugmentedAnalysis(
    tokenState: TokenState,
    features: Features,
    pRug: number,
    position: Position | null,
  ): Promise<AiAnalysisResult> {
    if (!this.config.aiAnalysisEnabled) return { pRug, explanation: 'AI disabled' };
    const text = await this.llmClient.analyzeContext(features, position, tokenState);
    const adjustment = text.includes('baisse du risque') ? -0.05 : text.includes('hausse du risque') ? 0.05 : 0;
    const adjusted = Math.min(1, Math.max(0, pRug + adjustment));
    return { pRug: adjusted, explanation: text };
  }
}

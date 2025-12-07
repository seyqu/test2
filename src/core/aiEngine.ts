import { AiAnalysisResult, Config, Features, Position, TokenState } from '../utils/types';
import { RiskEngine } from './riskEngine';
import { LlmClient } from '../integrations/llmClient';

export class AiEngine {
  constructor(private riskEngine: RiskEngine, private llmClient: LlmClient | null, private config: Config) {}

  async getAiAugmentedAnalysis(
    tokenState: TokenState,
    features: Features,
    position: Position | null
  ): Promise<AiAnalysisResult> {
    const basePRug = this.riskEngine.computeRugProbability(features, this.config);
    if (!this.config.aiAnalysisEnabled || !this.llmClient) {
      return { pRug: basePRug, explanation: 'AI disabled' };
    }
    const explanation = await this.llmClient.analyzeContext(features, position, tokenState, basePRug);
    // Could adjust pRug based on LLM feedback; keep as is for now
    return { pRug: basePRug, explanation };
  }
}

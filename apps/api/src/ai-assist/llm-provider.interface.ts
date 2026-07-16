export interface LlmGenerateResult {
  text: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface LlmProvider {
  generate(prompt: string): Promise<LlmGenerateResult>;
}

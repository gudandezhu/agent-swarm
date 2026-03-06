/**
 * MockLLM - 模拟 LLM 调用，避免真实 API 请求
 */

export interface MockLLMConfig {
  provider?: 'anthropic' | 'openai';
  model?: string;
}

export interface ChatParams {
  model: string;
  messages: unknown[];
  tools?: unknown[];
  maxTokens?: number;
}

export interface ChatResponse {
  content: unknown;
  stopReason: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export class MockLLM {
  private responses: string[] = [];
  private streamChunks: string[][] = [];
  private toolCalls: ToolCall[] = [];
  private callHistory: unknown[] = [];
  private responseIndex = 0;

  constructor(private config: MockLLMConfig = {}) {}

  setResponse(content: string): void {
    this.responses.push(content);
  }

  setStreamResponse(chunks: string[]): void {
    this.streamChunks.push(chunks);
  }

  setToolCallResponse(toolCall: ToolCall): void {
    this.toolCalls.push(toolCall);
  }

  async chat(_params: ChatParams): Promise<ChatResponse> {
    this.callHistory.push({ type: 'chat', params: _params });

    const response = this.responses[this.responseIndex] || this.responses[0] || 'Mock response';
    this.responseIndex++;

    return {
      content: [{ type: 'text', text: response }],
      stopReason: 'end_turn',
      usage: { inputTokens: 10, outputTokens: 20 },
    };
  }

  async *chatStream(_params: {
    model: string;
    messages: unknown[];
  }): AsyncGenerator<{ content: string }> {
    this.callHistory.push({ type: 'stream', params: _params });

    const chunks = this.streamChunks[this.responseIndex] || this.streamChunks[0] || ['Mock'];
    this.responseIndex++;

    for (const chunk of chunks) {
      yield { content: chunk };
    }
  }

  async chatWithTools(_params: {
    model: string;
    messages: unknown[];
    tools: unknown[];
  }): Promise<ChatResponse> {
    this.callHistory.push({ type: 'tools', params: _params });

    const toolCall = this.toolCalls[this.responseIndex] || this.toolCalls[0];

    return {
      content: [
        {
          type: 'tool_use',
          id: toolCall?.id || 'call_123',
          name: toolCall?.name || 'tool',
          input: toolCall?.input || {},
        },
      ],
      stopReason: 'tool_use',
      usage: { inputTokens: 10, outputTokens: 20 },
    };
  }

  getCallHistory(): unknown[] {
    return [...this.callHistory];
  }

  get callCount(): number {
    return this.callHistory.length;
  }

  get actualAPICalled(): boolean {
    return false;
  }

  reset(): void {
    this.responses = [];
    this.streamChunks = [];
    this.toolCalls = [];
    this.callHistory = [];
    this.responseIndex = 0;
  }
}

export const createMockLLM = (config?: MockLLMConfig): MockLLM => {
  return new MockLLM(config);
};

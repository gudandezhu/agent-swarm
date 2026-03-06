/**
 * Agent 类型定义
 */

export interface Model {
  provider: string;
  id: string;
  /**
   * Agent 专用 API 密钥（可选）
   * 如果未设置，则使用共享配置或环境变量
   */
  apiKey?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  model: Model;
  channels: string[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AgentState {
  id: string;
  config: AgentConfig;
  lastUsedAt: number;
}

/**
 * Agent 能力描述
 */
export interface AgentCapability {
  agentId: string;
  name: string;
  description?: string;
  skills: Array<{ name: string; description: string }>;
}

export interface AgentMessageOptions {
  sessionId: string;
  to?: string | string[]; // 转发给其他 Agent
  replyTo?: string;
}

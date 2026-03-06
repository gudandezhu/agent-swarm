/**
 * Agent 类型定义
 */

export interface Model {
  provider: string;
  id: string;
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

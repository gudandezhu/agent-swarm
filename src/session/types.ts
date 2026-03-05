/**
 * Session - 持久化上下文，跨消息保持状态
 */

export interface SessionContext {
  messages: string[]; // Message ID 列表（最近 20 条）
  variables: Record<string, unknown>; // 会话变量
  agentStates: Map<string, unknown>; // 各 Agent 状态
}

export interface Session {
  // 标识
  id: string; // dingtalk:user123 或 dingtalk:conv456:thread789:user123
  channelId: string; // dingtalk
  channelUserId: string; // user123
  conversationId?: string; // conv456（群聊）
  threadId?: string; // thread789（群聊线程）

  // 元数据
  createdAt: number;
  lastActiveAt: number;
  expiredAt?: number; // 过期时间（30天未活动）

  // 上下文（持久化）
  context: SessionContext;
}

export type SessionCreateOptions = {
  channelId: string;
  channelUserId: string;
  conversationId?: string;
  threadId?: string;
  ttl?: number; // 生存时间（毫秒），默认 30 天
};

export const SESSION_DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 天
export const MAX_CONTEXT_MESSAGES = 20;

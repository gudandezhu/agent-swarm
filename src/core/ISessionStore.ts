/**
 * ISessionStore - Session 存储接口
 */

import type { Session } from '../session/types.js';
import type { Message } from '../message/types.js';

export interface SessionStoreStats {
  totalSessions: number;
  totalMessages: number;
  oldestSession?: Date;
  newestSession?: Date;
}

/**
 * Session 存储接口
 * 现有 JSONLSessionStore 已实现大部分方法，只需提取接口
 */
export interface ISessionStore {
  init(): Promise<void>;
  get(sessionId: string): Promise<Session | null>;
  load(sessionId: string): Promise<Session | null>;
  getOrCreate(options: {
    channelId: string;
    channelUserId: string;
    conversationId?: string;
    threadId?: string;
  }): Promise<Session>;
  addMessage(sessionId: string, message: Message): Promise<void>;
  loadMessages(sessionId: string, limit?: number): Promise<Message[]>;
  loadContext(sessionId: string): Promise<string>;
  saveContext(sessionId: string, context: string): Promise<void>;
  addAgent(sessionId: string, agentId: string): Promise<void>;
  saveAgentState(sessionId: string, agentId: string, state: unknown): Promise<void>;
  loadAgentState(sessionId: string, agentId: string): Promise<unknown>;
  setVariable(sessionId: string, key: string, value: unknown): Promise<void>;
  getVariable(sessionId: string, key: string): Promise<unknown>;
  update(sessionId: string, updater: (session: Session) => void): Promise<Session | null>;
  cleanup(before?: Date): Promise<number>;
  stats(): SessionStoreStats;
  /**
   * 获取所有 Sessions（用于 Agent Loop 汇报）
   */
  getAllSessions(): Session[];
}

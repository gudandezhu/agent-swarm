/**
 * JSONLSessionStore - JSONL 格式的 Session 持久化
 *
 * 整合 Session 索引、消息历史、上下文管理和缓存
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { Session, SessionCreateOptions } from '../types.js';
import type { Message } from '../../message/types.js';
import type { ISessionStore, SessionStoreStats } from '../../core/ISessionStore.js';
import { SESSION_DEFAULT_TTL, MAX_CONTEXT_MESSAGES } from '../types.js';
import { SessionIndex } from './SessionIndex.js';
import { MessageHistory } from './MessageHistory.js';
import { ContextManager } from './ContextManager.js';
import { SessionCache } from './SessionCache.js';

export class JSONLSessionStore implements ISessionStore {
  private readonly basePath: string;
  private readonly index: SessionIndex;
  private readonly messageHistory: MessageHistory;
  private readonly contextManager: ContextManager;
  private readonly cache: SessionCache;

  constructor(basePath = './sessions') {
    this.basePath = basePath;
    this.index = new SessionIndex(basePath);
    this.messageHistory = new MessageHistory(basePath);
    this.contextManager = new ContextManager(basePath);
    this.cache = new SessionCache();
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await this.index.init();
    } catch (error) {
      throw new Error(`Failed to initialize session store: ${error}`);
    }
  }

  /**
   * 获取或创建 Session
   */
  async getOrCreate(options: SessionCreateOptions): Promise<Session> {
    const sessionId = this.makeSessionId(options);

    const cached = this.cache.getValid(sessionId);
    if (cached) {
      return cached;
    }

    let session = await this.load(sessionId);
    if (!session || this.cache.isExpired(session)) {
      session = await this.create(sessionId, options);
      await this.index.save(session);
    }

    this.cache.set(sessionId, session);
    return session;
  }

  /**
   * 添加消息
   */
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.getOrCreate({
      channelId: this.extractChannelId(sessionId),
      channelUserId: this.extractUserId(sessionId),
    });

    // 更新内存上下文中的消息列表
    session.context.messages.push(message.id);
    if (session.context.messages.length > MAX_CONTEXT_MESSAGES) {
      session.context.messages = session.context.messages.slice(-MAX_CONTEXT_MESSAGES);
    }

    session.lastActiveAt = Date.now();

    this.cache.set(sessionId, session);
    await this.index.save(session);

    // 持久化完整消息
    await this.messageHistory.save(sessionId, message);
  }

  /**
   * 加载消息历史
   */
  async loadMessages(sessionId: string, limit?: number): Promise<Message[]> {
    return await this.messageHistory.load(sessionId, limit);
  }

  /**
   * 加载上下文
   */
  async loadContext(sessionId: string): Promise<string> {
    return await this.contextManager.load(sessionId);
  }

  /**
   * 保存上下文
   */
  async saveContext(sessionId: string, content: string): Promise<void> {
    await this.contextManager.save(sessionId, content);
  }

  /**
   * 添加 Agent
   */
  async addAgent(sessionId: string, agentId: string): Promise<void> {
    const session = await this.load(sessionId);
    if (!session) return;

    if (!session.agents.includes(agentId)) {
      session.agents.push(agentId);
      this.cache.set(sessionId, session);
      await this.index.save(session);
    }
  }

  /**
   * 获取 Agents
   */
  async getAgents(sessionId: string): Promise<string[]> {
    const session = await this.load(sessionId);
    return session?.agents ?? [];
  }

  /**
   * 保存 Agent 状态
   */
  async saveAgentState(sessionId: string, agentId: string, state: unknown): Promise<void> {
    const session = await this.getOrCreate({
      channelId: this.extractChannelId(sessionId),
      channelUserId: this.extractUserId(sessionId),
    });

    session.context.agentStates.set(agentId, state);
    session.lastActiveAt = Date.now();

    this.cache.set(sessionId, session);
    await this.index.save(session);
  }

  /**
   * 获取 Agent 状态
   */
  async getAgentState(sessionId: string, agentId: string): Promise<unknown> {
    const session = await this.load(sessionId);
    return session?.context.agentStates.get(agentId);
  }

  /**
   * 设置变量
   */
  async setVariable(sessionId: string, key: string, value: unknown): Promise<void> {
    const session = await this.getOrCreate({
      channelId: this.extractChannelId(sessionId),
      channelUserId: this.extractUserId(sessionId),
    });

    session.context.variables[key] = value;
    session.lastActiveAt = Date.now();

    this.cache.set(sessionId, session);
    await this.index.save(session);
  }

  /**
   * 获取变量
   */
  async getVariable(sessionId: string, key: string): Promise<unknown> {
    const session = await this.load(sessionId);
    return session?.context.variables[key];
  }

  /**
   * 加载 Session
   */
  async load(sessionId: string): Promise<Session | null> {
    const cached = this.cache.get(sessionId);
    if (cached) {
      return cached;
    }

    const entry = this.index.get(sessionId);
    if (!entry) return null;

    const session: Session = {
      id: entry.id,
      channelId: entry.channelId,
      channelUserId: entry.channelUserId,
      conversationId: entry.conversationId,
      threadId: entry.threadId,
      createdAt: entry.createdAt,
      lastActiveAt: entry.lastActiveAt,
      agents: entry.agents ?? [],
      contextPath: join(this.basePath, sessionId, 'context.md'),
      messagesPath: join(this.basePath, sessionId, 'messages.jsonl'),
      context: {
        messages: [],
        variables: {},
        agentStates: new Map(),
      },
    };

    this.cache.set(sessionId, session);
    return session;
  }

  /**
   * get 方法 - load 的别名
   */
  async get(sessionId: string): Promise<Session | null> {
    return this.load(sessionId);
  }

  /**
   * loadAgentState 方法
   */
  async loadAgentState(sessionId: string, agentId: string): Promise<unknown> {
    return this.getAgentState(sessionId, agentId);
  }

  /**
   * 删除 Session
   */
  async delete(sessionId: string): Promise<void> {
    this.index.delete(sessionId);
    this.cache.delete(sessionId);

    const sessionPath = join(this.basePath, sessionId);
    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
    } catch {
      // 目录不存在，忽略
    }

    await this.index.rewrite();
  }

  /**
   * 更新 Session
   */
  async update(sessionId: string, updater: (session: Session) => void): Promise<Session | null> {
    const session = await this.load(sessionId);
    if (!session) return null;

    updater(session);
    this.cache.set(sessionId, session);
    await this.index.save(session);

    return session;
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    this.cache.clear();
    this.index.clear();
  }

  /**
   * 获取统计信息
   */
  stats(): SessionStoreStats {
    let oldest: Date | undefined;
    let newest: Date | undefined;
    let totalMessages = 0;

    for (const entry of this.index.entries()) {
      const created = new Date(entry.createdAt);
      if (!oldest || created < oldest) oldest = created;
      if (!newest || created > newest) newest = created;

      const session = this.cache.get(entry.id);
      if (session) {
        totalMessages += session.context.messages.length;
      }
    }

    return {
      totalSessions: this.index.size(),
      totalMessages,
      oldestSession: oldest,
      newestSession: newest,
    };
  }

  /**
   * 清理过期 Session
   */
  async cleanup(before?: Date): Promise<number> {
    const now = before?.getTime() ?? Date.now();
    const toDelete: string[] = [];

    for (const entry of this.index.entries()) {
      if (entry.lastActiveAt + SESSION_DEFAULT_TTL < now) {
        toDelete.push(entry.id);
      }
    }

    for (const id of toDelete) {
      await this.delete(id);
    }

    return toDelete.length;
  }

  // 私有方法

  private async create(sessionId: string, options: SessionCreateOptions): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: sessionId,
      channelId: options.channelId,
      channelUserId: options.channelUserId,
      conversationId: options.conversationId,
      threadId: options.threadId,
      createdAt: now,
      lastActiveAt: now,
      expiredAt: now + (options.ttl ?? SESSION_DEFAULT_TTL),
      agents: [],
      contextPath: join(this.basePath, sessionId, 'context.md'),
      messagesPath: join(this.basePath, sessionId, 'messages.jsonl'),
      context: {
        messages: [],
        variables: {},
        agentStates: new Map(),
      },
    };

    await this.contextManager.createDefault(sessionId);

    return session;
  }

  private makeSessionId(options: SessionCreateOptions): string {
    const parts: string[] = [options.channelId];
    if (options.conversationId) parts.push(options.conversationId);
    if (options.threadId) parts.push(options.threadId);
    parts.push(options.channelUserId);
    return parts.join(':');
  }

  private extractChannelId(sessionId: string): string {
    return sessionId.split(':')[0];
  }

  private extractUserId(sessionId: string): string {
    const parts = sessionId.split(':');
    return parts[parts.length - 1];
  }
}

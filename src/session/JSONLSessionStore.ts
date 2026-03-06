/**
 * JSONLSessionStore - JSONL 格式的 Session 持久化
 *
 * 目录结构：
 * sessions/
 * ├── index.jsonl           # Session 元数据索引
 * └── <sessionId>/
 *     ├── context.md        # 会话上下文
 *     └── messages.jsonl    # 消息历史
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { Session, SessionCreateOptions } from './types.js';
import type { Message } from '../message/types.js';
import type { ISessionStore, SessionStoreStats } from '../core/ISessionStore.js';
import { SESSION_DEFAULT_TTL, MAX_CONTEXT_MESSAGES } from './types.js';

interface SessionIndexEntry {
  type: 'session';
  id: string;
  channelId: string;
  channelUserId: string;
  conversationId?: string;
  threadId?: string;
  createdAt: number;
  lastActiveAt: number;
  agents: string[];
}

/**
 * context.md 默认模板
 */
const DEFAULT_CONTEXT_TEMPLATE = `# Session Context

## 参与者
<!-- Agent 列表会自动更新 -->

## 当前状态
- 阶段: 初始化

## 共享变量
<!-- 会话级共享变量 -->
`;

export class JSONLSessionStore implements ISessionStore {
  private basePath: string;
  private indexPath: string;
  private indexCache = new Map<string, SessionIndexEntry>();
  private sessionCache = new Map<string, Session>();

  constructor(basePath = './sessions') {
    this.basePath = basePath;
    this.indexPath = join(basePath, 'index.jsonl');
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await this.loadIndex();
    } catch (error) {
      throw new Error(`Failed to initialize session store: ${error}`);
    }
  }

  /**
   * 获取 session 目录路径
   */
  private getSessionPath(sessionId: string): string {
    return join(this.basePath, sessionId);
  }

  /**
   * 获取 context.md 路径
   */
  private getContextPath(sessionId: string): string {
    return join(this.getSessionPath(sessionId), 'context.md');
  }

  /**
   * 获取 messages.jsonl 路径
   */
  private getMessagesPath(sessionId: string): string {
    return join(this.getSessionPath(sessionId), 'messages.jsonl');
  }

  async getOrCreate(options: SessionCreateOptions): Promise<Session> {
    const sessionId = this.makeSessionId(options);

    if (this.sessionCache.has(sessionId)) {
      const session = this.sessionCache.get(sessionId)!;
      if (!this.isExpired(session)) {
        return session;
      }
      this.sessionCache.delete(sessionId);
    }

    let session = await this.load(sessionId);
    if (!session || this.isExpired(session)) {
      session = await this.create(sessionId, options);
      await this.saveIndex(session);
    }

    this.sessionCache.set(sessionId, session);
    return session;
  }

  /**
   * 添加完整 Message 对象
   */
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.getOrCreate({
      channelId: this.extractChannelId(sessionId),
      channelUserId: this.extractUserId(sessionId),
    });

    // 存储消息 ID 到 session.context.messages
    session.context.messages.push(message.id);
    if (session.context.messages.length > MAX_CONTEXT_MESSAGES) {
      session.context.messages = session.context.messages.slice(-MAX_CONTEXT_MESSAGES);
    }

    session.lastActiveAt = Date.now();

    this.sessionCache.set(sessionId, session);
    await this.saveIndex(session);

    // 存储完整 Message 到 session 目录
    await this.saveMessage(sessionId, message);
  }

  /**
   * 加载消息历史
   */
  async loadMessages(sessionId: string, limit?: number): Promise<Message[]> {
    const messageFilePath = this.getMessagesPath(sessionId);

    try {
      const content = await fs.readFile(messageFilePath, 'utf-8');
      const lines = content.trim().split('\n');

      let messages: Message[] = [];
      for (const line of lines) {
        if (!line) continue;
        try {
          messages.push(JSON.parse(line) as Message);
        } catch {
          // 跳过无效行
        }
      }

      // 应用 limit
      if (limit && limit > 0) {
        messages = messages.slice(-limit);
      }

      return messages;
    } catch {
      return [];
    }
  }

  /**
   * 加载 context.md 内容
   */
  async loadContext(sessionId: string): Promise<string> {
    const contextPath = this.getContextPath(sessionId);
    try {
      return await fs.readFile(contextPath, 'utf-8');
    } catch {
      return DEFAULT_CONTEXT_TEMPLATE;
    }
  }

  /**
   * 保存 context.md 内容
   */
  async saveContext(sessionId: string, content: string): Promise<void> {
    const contextPath = this.getContextPath(sessionId);
    await fs.mkdir(this.getSessionPath(sessionId), { recursive: true });
    await fs.writeFile(contextPath, content, 'utf-8');
  }

  /**
   * 添加 Agent 到会话
   */
  async addAgent(sessionId: string, agentId: string): Promise<void> {
    const session = await this.load(sessionId);
    if (!session) return;

    if (!session.agents.includes(agentId)) {
      session.agents.push(agentId);
      this.sessionCache.set(sessionId, session);
      await this.saveIndex(session);
    }
  }

  /**
   * 获取会话关联的 Agent 列表
   */
  async getAgents(sessionId: string): Promise<string[]> {
    const session = await this.load(sessionId);
    return session?.agents ?? [];
  }

  async saveAgentState(sessionId: string, agentId: string, state: unknown): Promise<void> {
    const session = await this.getOrCreate({
      channelId: this.extractChannelId(sessionId),
      channelUserId: this.extractUserId(sessionId),
    });

    session.context.agentStates.set(agentId, state);
    session.lastActiveAt = Date.now();

    this.sessionCache.set(sessionId, session);
    await this.saveIndex(session);
  }

  async getAgentState(sessionId: string, agentId: string): Promise<unknown> {
    const session = await this.load(sessionId);
    return session?.context.agentStates.get(agentId);
  }

  async setVariable(sessionId: string, key: string, value: unknown): Promise<void> {
    const session = await this.getOrCreate({
      channelId: this.extractChannelId(sessionId),
      channelUserId: this.extractUserId(sessionId),
    });

    session.context.variables[key] = value;
    session.lastActiveAt = Date.now();

    this.sessionCache.set(sessionId, session);
    await this.saveIndex(session);
  }

  async getVariable(sessionId: string, key: string): Promise<unknown> {
    const session = await this.load(sessionId);
    return session?.context.variables[key];
  }

  async load(sessionId: string): Promise<Session | null> {
    if (this.sessionCache.has(sessionId)) {
      return this.sessionCache.get(sessionId)!;
    }

    const entry = this.indexCache.get(sessionId);
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
      contextPath: this.getContextPath(sessionId),
      messagesPath: this.getMessagesPath(sessionId),
      context: {
        messages: [],
        variables: {},
        agentStates: new Map(),
      },
    };

    this.sessionCache.set(sessionId, session);
    return session;
  }

  /**
   * get 方法 - load 的别名，用于 ISessionStore 接口
   */
  async get(sessionId: string): Promise<Session | null> {
    return this.load(sessionId);
  }

  /**
   * loadAgentState 方法 - getAgentState 的别名，用于 ISessionStore 接口
   */
  async loadAgentState(sessionId: string, agentId: string): Promise<unknown> {
    return this.getAgentState(sessionId, agentId);
  }

  async delete(sessionId: string): Promise<void> {
    this.indexCache.delete(sessionId);
    this.sessionCache.delete(sessionId);

    // 删除整个 session 目录
    const sessionPath = this.getSessionPath(sessionId);
    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
    } catch {
      // 目录不存在，忽略
    }

    // 重写 index 文件
    await this.rewriteIndex();
  }

  /**
   * 更新 Session（用于 touch、reset 等操作）
   */
  async update(sessionId: string, updater: (session: Session) => void): Promise<Session | null> {
    const session = await this.load(sessionId);
    if (!session) return null;

    updater(session);
    this.sessionCache.set(sessionId, session);
    await this.saveIndex(session);

    return session;
  }

  private async loadIndex(): Promise<void> {
    try {
      const content = await fs.readFile(this.indexPath, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        if (!line) continue;
        try {
          const entry: SessionIndexEntry = JSON.parse(line);
          this.indexCache.set(entry.id, entry);
        } catch {
          // 跳过无效行
        }
      }
    } catch {
      await fs.writeFile(this.indexPath, '', 'utf-8');
    }
  }

  private async saveIndex(session: Session): Promise<void> {
    const entry: SessionIndexEntry = {
      type: 'session',
      id: session.id,
      channelId: session.channelId,
      channelUserId: session.channelUserId,
      conversationId: session.conversationId,
      threadId: session.threadId,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      agents: session.agents ?? [],
    };

    this.indexCache.set(session.id, entry);
    await this.rewriteIndex();
  }

  /**
   * 重写整个 index 文件
   */
  private async rewriteIndex(): Promise<void> {
    const lines = Array.from(this.indexCache.values()).map((e) => JSON.stringify(e));
    await fs.writeFile(this.indexPath, lines.join('\n') + '\n', 'utf-8');
  }

  /**
   * 保存完整 Message 到文件
   */
  private async saveMessage(sessionId: string, message: Message): Promise<void> {
    const messageFilePath = this.getMessagesPath(sessionId);
    // 确保 session 目录存在
    await fs.mkdir(this.getSessionPath(sessionId), { recursive: true });
    // 追加到文件
    await fs.appendFile(messageFilePath, JSON.stringify(message) + '\n', 'utf-8');
  }

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
      contextPath: this.getContextPath(sessionId),
      messagesPath: this.getMessagesPath(sessionId),
      context: {
        messages: [],
        variables: {},
        agentStates: new Map(),
      },
    };

    // 创建 session 目录和 context.md
    await fs.mkdir(this.getSessionPath(sessionId), { recursive: true });
    await this.saveContext(sessionId, DEFAULT_CONTEXT_TEMPLATE);

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

  private isExpired(session: Session): boolean {
    if (!session.expiredAt) return false;
    return Date.now() > session.expiredAt;
  }

  async destroy(): Promise<void> {
    this.sessionCache.clear();
    this.indexCache.clear();
  }

  /**
   * 获取统计信息
   */
  stats(): SessionStoreStats {
    let oldest: Date | undefined;
    let newest: Date | undefined;
    let totalMessages = 0;

    for (const entry of this.indexCache.values()) {
      const created = new Date(entry.createdAt);
      if (!oldest || created < oldest) oldest = created;
      if (!newest || created > newest) newest = created;

      // 累计消息数
      const session = this.sessionCache.get(entry.id);
      if (session) {
        totalMessages += session.context.messages.length;
      }
    }

    return {
      totalSessions: this.indexCache.size,
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

    for (const [id, entry] of this.indexCache) {
      if (entry.lastActiveAt + SESSION_DEFAULT_TTL < now) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      await this.delete(id);
    }

    return toDelete.length;
  }
}

/**
 * JSONLSessionStore - JSONL 格式的 Session 持久化
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { Session, SessionCreateOptions } from './types.js';
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
}

export class JSONLSessionStore {
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
      session = this.create(sessionId, options);
      await this.saveIndex(session);
    }

    this.sessionCache.set(sessionId, session);
    return session;
  }

  async addMessage(sessionId: string, messageId: string): Promise<void> {
    const session = await this.getOrCreate({
      channelId: this.extractChannelId(sessionId),
      channelUserId: this.extractUserId(sessionId),
    });

    session.context.messages.push(messageId);
    if (session.context.messages.length > MAX_CONTEXT_MESSAGES) {
      session.context.messages = session.context.messages.slice(-MAX_CONTEXT_MESSAGES);
    }

    session.lastActiveAt = Date.now();

    this.sessionCache.set(sessionId, session);
    await this.saveIndex(session);
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
      context: {
        messages: [],
        variables: {},
        agentStates: new Map(),
      },
    };

    this.sessionCache.set(sessionId, session);
    return session;
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
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

  async delete(sessionId: string): Promise<void> {
    this.indexCache.delete(sessionId);
    this.sessionCache.delete(sessionId);
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
    };

    this.indexCache.set(session.id, entry);
    await fs.appendFile(this.indexPath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  private create(sessionId: string, options: SessionCreateOptions): Session {
    const now = Date.now();
    return {
      id: sessionId,
      channelId: options.channelId,
      channelUserId: options.channelUserId,
      conversationId: options.conversationId,
      threadId: options.threadId,
      createdAt: now,
      lastActiveAt: now,
      expiredAt: now + (options.ttl ?? SESSION_DEFAULT_TTL),
      context: {
        messages: [],
        variables: {},
        agentStates: new Map(),
      },
    };
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
}

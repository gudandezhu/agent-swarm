/**
 * SessionManager - Session 生命周期管理
 */

import type { Session, SessionCreateOptions } from './types.js';
import type { ISessionStore } from '../core/ISessionStore.js';

export class SessionManager {
  constructor(private store: ISessionStore) {}

  async getOrCreate(options: SessionCreateOptions): Promise<Session> {
    return this.store.getOrCreate(options);
  }

  async get(sessionId: string): Promise<Session | null> {
    return this.store.load(sessionId);
  }

  async touch(sessionId: string): Promise<void> {
    await this.store.update(sessionId, (session) => {
      session.lastActiveAt = Date.now();
    });
  }

  async reset(sessionId: string): Promise<void> {
    await this.store.update(sessionId, (session) => {
      session.context.messages = [];
      session.context.variables = {};
      session.context.agentStates.clear();
    });
  }

  async cleanup(): Promise<number> {
    return this.store.cleanup();
  }

  async stats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    oldestSession?: Date;
    newestSession?: Date;
  }> {
    return this.store.stats();
  }
}

/**
 * SessionManager - Session 生命周期管理
 */

import type { Session, SessionCreateOptions } from './types.js';
import type { JSONLSessionStore } from './JSONLSessionStore.js';

export class SessionManager {
  constructor(private store: JSONLSessionStore) {}

  async getOrCreate(options: SessionCreateOptions): Promise<Session> {
    return this.store.getOrCreate(options);
  }

  async get(sessionId: string): Promise<Session | null> {
    return this.store.load(sessionId);
  }

  async touch(sessionId: string): Promise<void> {
    const session = await this.store.load(sessionId);
    if (session) {
      session.lastActiveAt = Date.now();
    }
  }

  async reset(sessionId: string): Promise<void> {
    const session = await this.store.load(sessionId);
    if (session) {
      session.context.messages = [];
      session.context.variables = {};
      session.context.agentStates.clear();
    }
  }

  async cleanup(): Promise<number> {
    return this.store.cleanup();
  }

  async stats(): Promise<{ total: number; active: number; expired: number }> {
    return { total: 0, active: 0, expired: 0 };
  }
}

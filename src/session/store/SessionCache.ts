/**
 * SessionCache - Session 内存缓存管理
 *
 * 管理 Session 的内存缓存和过期检查
 */

import type { Session } from '../types.js';
import { SESSION_DEFAULT_TTL } from '../types.js';

export class SessionCache {
  private cache = new Map<string, Session>();

  /**
   * 获取 Session
   */
  get(sessionId: string): Session | undefined {
    return this.cache.get(sessionId);
  }

  /**
   * 设置 Session
   */
  set(sessionId: string, session: Session): void {
    this.cache.set(sessionId, session);
  }

  /**
   * 检查 Session 是否存在
   */
  has(sessionId: string): boolean {
    return this.cache.has(sessionId);
  }

  /**
   * 删除 Session
   */
  delete(sessionId: string): void {
    this.cache.delete(sessionId);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 检查 Session 是否过期
   */
  isExpired(session: Session): boolean {
    if (!session.expiredAt) return false;
    return Date.now() > session.expiredAt;
  }

  /**
   * 获取未过期的 Session
   */
  getValid(sessionId: string): Session | undefined {
    const session = this.cache.get(sessionId);
    if (!session) return undefined;

    if (this.isExpired(session)) {
      this.cache.delete(sessionId);
      return undefined;
    }

    return session;
  }

  /**
   * 获取所有缓存的 Sessions
   */
  getAll(): Session[] {
    return Array.from(this.cache.values());
  }

  /**
   * 清理过期的 Sessions
   */
  cleanup(): string[] {
    const expiredIds: string[] = [];

    for (const [id, session] of this.cache) {
      if (this.isExpired(session)) {
        expiredIds.push(id);
        this.cache.delete(id);
      }
    }

    return expiredIds;
  }

  /**
   * 计算 TTL 过期时间
   */
  calculateExpiryTime(ttl: number = SESSION_DEFAULT_TTL): number {
    return Date.now() + ttl;
  }

  /**
   * 检查时间戳是否过期
   */
  isExpiredByTimestamp(expiredAt: number | undefined): boolean {
    if (!expiredAt) return false;
    return Date.now() > expiredAt;
  }
}

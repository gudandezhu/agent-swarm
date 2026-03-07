/**
 * IdempotencyCache - 幂等性缓存管理
 *
 * 防止消息重复发送
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { IdempotencyCacheEntry } from './types.js';
import { JsonlFileStore } from './JsonlFileStore.js';

export class IdempotencyCache {
  private cache = new Map<string, IdempotencyCacheEntry>();
  private store: JsonlFileStore<IdempotencyCacheEntry>;
  private readonly ttlMs: number;

  constructor(basePath: string, ttlMs: number = 24 * 60 * 60 * 1000) {
    this.store = new JsonlFileStore<IdempotencyCacheEntry>(join(basePath, 'idempotency_cache.jsonl'));
    this.ttlMs = ttlMs;
  }

  /**
   * 初始化缓存
   */
  async init(): Promise<void> {
    const now = Date.now();
    const items = await this.store.readAll();

    for (const item of items) {
      // 只加载未过期的条目
      if (item.expiresAt > now) {
        this.cache.set(item.messageId, item);
      }
    }
  }

  /**
   * 检查消息是否已发送
   */
  has(messageId: string): boolean {
    const entry = this.cache.get(messageId);
    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(messageId);
      return false;
    }

    return true;
  }

  /**
   * 标记消息已发送
   */
  async markSent(messageId: string): Promise<void> {
    const now = Date.now();
    const entry: IdempotencyCacheEntry = {
      messageId,
      sentAt: now,
      expiresAt: now + this.ttlMs,
    };

    this.cache.set(messageId, entry);
    await this.store.append(entry);
  }

  /**
   * 清理过期条目
   */
  async cleanup(before: Date): Promise<number> {
    const beforeTime = before.getTime();
    let cleaned = 0;

    for (const [id, entry] of this.cache) {
      if (entry.expiresAt < beforeTime) {
        this.cache.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await this.store.rewrite(Array.from(this.cache.values()));
    }

    return cleaned;
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
   * 获取条目
   */
  get(messageId: string): IdempotencyCacheEntry | undefined {
    return this.cache.get(messageId);
  }
}

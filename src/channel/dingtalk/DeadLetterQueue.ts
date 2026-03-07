/**
 * DeadLetterQueue - 死信队列管理
 *
 * 负责管理发送失败的消息
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { OutgoingMessage } from '../types.js';
import type { DeadLetterMessage, QueuedMessage } from './types.js';
import { JsonlFileStore } from './JsonlFileStore.js';

export class DeadLetterQueue {
  private queue = new Map<string, DeadLetterMessage>();
  private store: JsonlFileStore<DeadLetterMessage>;

  // 统计
  private totalFailed = 0;

  constructor(basePath: string) {
    this.store = new JsonlFileStore<DeadLetterMessage>(join(basePath, 'dead_letter.jsonl'));
  }

  /**
   * 初始化死信队列
   */
  async init(): Promise<void> {
    const items = await this.store.readAll();
    for (const item of items) {
      this.queue.set(item.messageId, item);
    }
    this.totalFailed = this.queue.size;
  }

  /**
   * 添加死信消息
   */
  async add(item: QueuedMessage, reason: string): Promise<void> {
    const now = Date.now();
    const deadLetter: DeadLetterMessage = {
      messageId: item.messageId,
      sessionId: item.sessionId,
      message: item.message,
      reason,
      failedAt: now,
      retryHistory: [
        {
          at: now,
          error: item.lastError || reason,
        },
      ],
    };

    this.queue.set(item.messageId, deadLetter);
    await this.store.append(deadLetter);
    this.totalFailed++;
  }

  /**
   * 获取死信消息
   */
  get(limit?: number): DeadLetterMessage[] {
    const items = Array.from(this.queue.values());
    return limit ? items.slice(0, limit) : items;
  }

  /**
   * 获取单个死信消息
   */
  getMessage(messageId: string): DeadLetterMessage | undefined {
    return this.queue.get(messageId);
  }

  /**
   * 移除死信消息
   */
  async remove(messageId: string): Promise<boolean> {
    if (this.queue.has(messageId)) {
      this.queue.delete(messageId);
      await this.store.rewrite(Array.from(this.queue.values()));
      return true;
    }
    return false;
  }

  /**
   * 清空死信队列
   */
  clear(): void {
    this.queue.clear();
    this.totalFailed = 0;
  }

  /**
   * 获取统计
   */
  getStats(): { deadLetter: number; totalFailed: number } {
    return {
      deadLetter: this.queue.size,
      totalFailed: this.totalFailed,
    };
  }

  /**
   * 获取大小
   */
  size(): number {
    return this.queue.size;
  }
}

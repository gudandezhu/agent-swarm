/**
 * DingTalkMessageStore - 钉钉消息持久化存储
 *
 * 整合消息队列、死信队列和幂等性缓存
 */

import { join } from 'path';
import type { OutgoingMessage } from '../types.js';
import type {
  DingTalkMessageStatus,
  QueuedMessage,
  DeadLetterMessage,
  IdempotencyCacheEntry,
  QueueStats,
  SendResult,
  DingTalkMessageStoreConfig,
} from './types.js';
import { MessageQueue } from './MessageQueue.js';
import { DeadLetterQueue } from './DeadLetterQueue.js';
import { IdempotencyCache } from './IdempotencyCache.js';

// 重新导出类型
export * from './types.js';

export class DingTalkMessageStore {
  private readonly basePath: string;
  private readonly idempotencyTtlMs: number;

  // 子模块
  private messageQueue: MessageQueue;
  private deadLetterQueue: DeadLetterQueue;
  private idempotencyCache: IdempotencyCache;

  // 统计
  private stats: QueueStats = {
    pending: 0,
    retrying: 0,
    deadLetter: 0,
    totalSent: 0,
    totalFailed: 0,
  };

  constructor(config: DingTalkMessageStoreConfig = {}) {
    this.basePath =
      config.basePath ?? join(process.env.HOME ?? '', '.agent-swarm', 'channels', 'dingtalk');
    this.idempotencyTtlMs = config.idempotencyTtlMs ?? 24 * 60 * 60 * 1000;

    this.messageQueue = new MessageQueue(this.basePath);
    this.deadLetterQueue = new DeadLetterQueue(this.basePath);
    this.idempotencyCache = new IdempotencyCache(this.basePath, this.idempotencyTtlMs);
  }

  /**
   * 初始化存储
   */
  async init(): Promise<void> {
    await Promise.all([
      this.messageQueue.init(),
      this.deadLetterQueue.init(),
      this.idempotencyCache.init(),
    ]);
    this.updateStats();
  }

  /**
   * 消息入队
   */
  async enqueue(message: OutgoingMessage, messageId?: string): Promise<QueuedMessage> {
    const id = messageId ?? this.generateMessageId();
    return await this.messageQueue.enqueue(message, id);
  }

  /**
   * 消息出队
   */
  async dequeue(messageId: string): Promise<void> {
    await this.messageQueue.dequeue(messageId);
    this.updateStats();
  }

  /**
   * 更新消息状态
   */
  async updateStatus(
    messageId: string,
    status: DingTalkMessageStatus,
    error?: string
  ): Promise<void> {
    const item = this.messageQueue.get(messageId);

    if (status === 'dead_letter') {
      if (item) {
        await this.deadLetterQueue.add(item, error ?? 'Max retries exceeded');
        await this.messageQueue.dequeue(messageId);
        this.stats.totalFailed++;
      }
    } else {
      await this.messageQueue.updateStatus(messageId, status, error);

      if (status === 'completed') {
        this.stats.totalSent++;
      }
    }

    this.updateStats();
  }

  /**
   * 增加重试次数
   */
  async incrementRetry(messageId: string): Promise<QueuedMessage | null> {
    return await this.messageQueue.incrementRetry(messageId);
  }

  /**
   * 设置下次重试时间
   */
  async setNextRetryTime(messageId: string, nextRetryAt: number): Promise<void> {
    await this.messageQueue.setNextRetryTime(messageId, nextRetryAt);
  }

  /**
   * 获取待发送消息
   */
  getPending(): QueuedMessage[] {
    return this.messageQueue.getPending();
  }

  /**
   * 获取可重试的消息
   */
  getRetryable(maxRetries: number): QueuedMessage[] {
    return this.messageQueue.getRetryable(maxRetries);
  }

  /**
   * 获取超时消息
   */
  getTimeoutMessages(timeoutMs: number): QueuedMessage[] {
    return this.messageQueue.getTimeoutMessages(timeoutMs);
  }

  /**
   * 获取死信队列
   */
  getDeadLetters(limit?: number): DeadLetterMessage[] {
    return this.deadLetterQueue.get(limit);
  }

  /**
   * 检查幂等性
   */
  checkIdempotency(messageId: string): boolean {
    return this.idempotencyCache.has(messageId);
  }

  /**
   * 标记已发送
   */
  async markSent(messageId: string): Promise<void> {
    await this.idempotencyCache.markSent(messageId);
  }

  /**
   * 获取队列统计
   */
  getStats(): QueueStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 清理过期数据
   */
  async cleanup(before: Date): Promise<number> {
    return await this.idempotencyCache.cleanup(before);
  }

  /**
   * 销毁存储
   */
  async destroy(): Promise<void> {
    this.messageQueue.clear();
    this.deadLetterQueue.clear();
    this.idempotencyCache.clear();
    this.stats = {
      pending: 0,
      retrying: 0,
      deadLetter: 0,
      totalSent: 0,
      totalFailed: 0,
    };
  }

  /**
   * 获取消息
   */
  get(messageId: string): QueuedMessage | undefined {
    return this.messageQueue.get(messageId);
  }

  private updateStats(): void {
    const queueStats = this.messageQueue.getStats();
    const deadLetterStats = this.deadLetterQueue.getStats();

    this.stats.pending = queueStats.pending;
    this.stats.retrying = queueStats.retrying;
    this.stats.deadLetter = deadLetterStats.deadLetter;
    this.stats.totalFailed = deadLetterStats.totalFailed;
  }

  private generateMessageId(): string {
    return `dt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

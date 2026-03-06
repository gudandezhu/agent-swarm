/**
 * DingTalkMessageStore - 钉钉消息持久化存储
 *
 * 管理钉钉消息的发送队列、重试索引、死信队列和幂等性缓存
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { OutgoingMessage } from './types.js';

/**
 * 消息状态
 */
export enum DingTalkMessageStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  RETRYING = 'retrying',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter',
}

/**
 * 排队消息
 */
export interface QueuedMessage {
  messageId: string;
  sessionId: string;
  message: OutgoingMessage;
  retryCount: number;
  nextRetryAt: number;
  createdAt: number;
  updatedAt: number;
  status: DingTalkMessageStatus;
  lastError?: string;
}

/**
 * 死信消息
 */
export interface DeadLetterMessage {
  messageId: string;
  sessionId: string;
  message: OutgoingMessage;
  reason: string;
  failedAt: number;
  retryHistory: Array<{
    at: number;
    error: string;
  }>;
}

/**
 * 幂等性缓存条目
 */
export interface IdempotencyCacheEntry {
  messageId: string;
  sentAt: number;
  expiresAt: number;
}

/**
 * 队列统计
 */
export interface QueueStats {
  pending: number;
  retrying: number;
  deadLetter: number;
  totalSent: number;
  totalFailed: number;
}

/**
 * 发送结果
 */
export interface SendResult {
  success: boolean;
  messageId: string;
  status: 'sent' | 'queued' | 'failed';
  error?: string;
}

/**
 * DingTalkMessageStore 配置
 */
export interface DingTalkMessageStoreConfig {
  /** 存储路径，默认 ~/.agent-swarm/channels/dingtalk */
  basePath?: string;
  /** 幂等性缓存 TTL（毫秒），默认 24 小时 */
  idempotencyTtlMs?: number;
}

/**
 * 钉钉消息持久化存储
 */
export class DingTalkMessageStore {
  private basePath: string;
  private idempotencyTtlMs: number;

  // 内存缓存
  private pendingQueue = new Map<string, QueuedMessage>();
  private retryIndex = new Map<string, QueuedMessage>();
  private deadLetterQueue = new Map<string, DeadLetterMessage>();
  private idempotencyCache = new Map<string, IdempotencyCacheEntry>();

  // 文件路径
  private pendingQueuePath: string;
  private retryIndexPath: string;
  private deadLetterPath: string;
  private idempotencyCachePath: string;

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
    this.idempotencyTtlMs = config.idempotencyTtlMs ?? 24 * 60 * 60 * 1000; // 24 小时

    this.pendingQueuePath = join(this.basePath, 'pending_queue.jsonl');
    this.retryIndexPath = join(this.basePath, 'retry_index.jsonl');
    this.deadLetterPath = join(this.basePath, 'dead_letter.jsonl');
    this.idempotencyCachePath = join(this.basePath, 'idempotency_cache.jsonl');
  }

  /**
   * 初始化存储
   */
  async init(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
    await this.loadAll();
  }

  /**
   * 加载所有数据
   */
  private async loadAll(): Promise<void> {
    await Promise.all([
      this.loadPendingQueue(),
      this.loadRetryIndex(),
      this.loadDeadLetterQueue(),
      this.loadIdempotencyCache(),
    ]);
    this.updateStats();
  }

  /**
   * 加载待发送队列
   */
  private async loadPendingQueue(): Promise<void> {
    try {
      const content = await fs.readFile(this.pendingQueuePath, 'utf-8');
      const lines = content.trim().split('\n');
      for (const line of lines) {
        if (!line) continue;
        try {
          const item = JSON.parse(line) as QueuedMessage;
          if (item.status === DingTalkMessageStatus.PENDING) {
            this.pendingQueue.set(item.messageId, item);
          }
        } catch {
          // 跳过无效行
        }
      }
    } catch {
      // 文件不存在，忽略
    }
  }

  /**
   * 加载重试索引
   */
  private async loadRetryIndex(): Promise<void> {
    try {
      const content = await fs.readFile(this.retryIndexPath, 'utf-8');
      const lines = content.trim().split('\n');
      for (const line of lines) {
        if (!line) continue;
        try {
          const item = JSON.parse(line) as QueuedMessage;
          if (item.status === DingTalkMessageStatus.RETRYING) {
            this.retryIndex.set(item.messageId, item);
          }
        } catch {
          // 跳过无效行
        }
      }
    } catch {
      // 文件不存在，忽略
    }
  }

  /**
   * 加载死信队列
   */
  private async loadDeadLetterQueue(): Promise<void> {
    try {
      const content = await fs.readFile(this.deadLetterPath, 'utf-8');
      const lines = content.trim().split('\n');
      for (const line of lines) {
        if (!line) continue;
        try {
          const item = JSON.parse(line) as DeadLetterMessage;
          this.deadLetterQueue.set(item.messageId, item);
        } catch {
          // 跳过无效行
        }
      }
    } catch {
      // 文件不存在，忽略
    }
  }

  /**
   * 加载幂等性缓存
   */
  private async loadIdempotencyCache(): Promise<void> {
    try {
      const content = await fs.readFile(this.idempotencyCachePath, 'utf-8');
      const lines = content.trim().split('\n');
      const now = Date.now();
      for (const line of lines) {
        if (!line) continue;
        try {
          const item = JSON.parse(line) as IdempotencyCacheEntry;
          // 只加载未过期的条目
          if (item.expiresAt > now) {
            this.idempotencyCache.set(item.messageId, item);
          }
        } catch {
          // 跳过无效行
        }
      }
    } catch {
      // 文件不存在，忽略
    }
  }

  /**
   * 消息入队
   */
  async enqueue(message: OutgoingMessage, messageId?: string): Promise<QueuedMessage> {
    const id = messageId ?? this.generateMessageId();
    const now = Date.now();

    const item: QueuedMessage = {
      messageId: id,
      sessionId: this.getSessionId(message),
      message,
      retryCount: 0,
      nextRetryAt: now,
      createdAt: now,
      updatedAt: now,
      status: DingTalkMessageStatus.PENDING,
    };

    this.pendingQueue.set(id, item);
    await this.appendToFile(this.pendingQueuePath, item);
    this.updateStats();

    return item;
  }

  /**
   * 消息出队
   */
  async dequeue(messageId: string): Promise<void> {
    if (this.pendingQueue.has(messageId)) {
      this.pendingQueue.delete(messageId);
      await this.rewriteFile(this.pendingQueuePath, Array.from(this.pendingQueue.values()));
      this.updateStats();
    }
  }

  /**
   * 更新消息状态
   */
  async updateStatus(
    messageId: string,
    status: DingTalkMessageStatus,
    error?: string
  ): Promise<void> {
    // 从待发送队列中查找
    let item = this.pendingQueue.get(messageId);
    let isInPending = true;

    if (!item) {
      item = this.retryIndex.get(messageId);
      isInPending = false;
    }

    if (!item) {
      return;
    }

    const now = Date.now();
    item.status = status;
    item.updatedAt = now;
    if (error) {
      item.lastError = error;
    }

    // 根据状态移动到不同的队列
    if (status === DingTalkMessageStatus.RETRYING) {
      // 移到重试队列
      this.pendingQueue.delete(messageId);
      this.retryIndex.set(messageId, item);
      await this.rewriteFile(this.pendingQueuePath, Array.from(this.pendingQueue.values()));
      await this.appendToFile(this.retryIndexPath, item);
    } else if (status === DingTalkMessageStatus.COMPLETED) {
      // 从队列中移除
      this.pendingQueue.delete(messageId);
      this.retryIndex.delete(messageId);
      await this.rewriteFile(this.pendingQueuePath, Array.from(this.pendingQueue.values()));
      await this.rewriteFile(this.retryIndexPath, Array.from(this.retryIndex.values()));
      this.stats.totalSent++;
    } else if (status === DingTalkMessageStatus.DEAD_LETTER) {
      // 移到死信队列
      const deadLetter: DeadLetterMessage = {
        messageId: item.messageId,
        sessionId: item.sessionId,
        message: item.message,
        reason: error ?? 'Max retries exceeded',
        failedAt: now,
        retryHistory: [],
      };
      this.pendingQueue.delete(messageId);
      this.retryIndex.delete(messageId);
      this.deadLetterQueue.set(messageId, deadLetter);
      await this.rewriteFile(this.pendingQueuePath, Array.from(this.pendingQueue.values()));
      await this.rewriteFile(this.retryIndexPath, Array.from(this.retryIndex.values()));
      await this.appendToFile(this.deadLetterPath, deadLetter);
      this.stats.totalFailed++;
    } else if (isInPending) {
      // 更新待发送队列文件
      await this.rewriteFile(this.pendingQueuePath, Array.from(this.pendingQueue.values()));
    }

    this.updateStats();
  }

  /**
   * 增加重试次数
   */
  async incrementRetry(messageId: string): Promise<QueuedMessage | null> {
    let item = this.pendingQueue.get(messageId) ?? this.retryIndex.get(messageId);

    if (!item) {
      return null;
    }

    item.retryCount++;
    item.updatedAt = Date.now();

    // 更新文件
    await this.rewriteFile(this.retryIndexPath, Array.from(this.retryIndex.values()));

    return item;
  }

  /**
   * 获取待发送消息
   */
  getPending(): QueuedMessage[] {
    return Array.from(this.pendingQueue.values());
  }

  /**
   * 获取可重试的消息
   */
  getRetryable(maxRetries: number): QueuedMessage[] {
    const now = Date.now();
    return Array.from(this.retryIndex.values()).filter(
      (item) => item.retryCount < maxRetries && item.nextRetryAt <= now
    );
  }

  /**
   * 获取超时消息
   */
  getTimeoutMessages(timeoutMs: number): QueuedMessage[] {
    const timeoutBefore = Date.now() - timeoutMs;
    const result: QueuedMessage[] = [];

    // 检查待发送队列
    for (const item of this.pendingQueue.values()) {
      if (item.status === DingTalkMessageStatus.SENDING && item.updatedAt < timeoutBefore) {
        result.push(item);
      }
    }

    // 检查重试队列
    for (const item of this.retryIndex.values()) {
      if (item.status === DingTalkMessageStatus.RETRYING && item.nextRetryAt <= Date.now()) {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * 获取死信队列
   */
  getDeadLetters(limit?: number): DeadLetterMessage[] {
    const items = Array.from(this.deadLetterQueue.values());
    return limit ? items.slice(0, limit) : items;
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
    const now = Date.now();
    const entry: IdempotencyCacheEntry = {
      messageId,
      sentAt: now,
      expiresAt: now + this.idempotencyTtlMs,
    };

    this.idempotencyCache.set(messageId, entry);
    await this.appendToFile(this.idempotencyCachePath, entry);
  }

  /**
   * 获取队列统计
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * 清理过期数据
   */
  async cleanup(before: Date): Promise<number> {
    const beforeTime = before.getTime();
    let cleaned = 0;

    // 清理幂等性缓存
    for (const [id, entry] of this.idempotencyCache) {
      if (entry.expiresAt < beforeTime) {
        this.idempotencyCache.delete(id);
        cleaned++;
      }
    }

    // 重写幂等性缓存文件
    if (cleaned > 0) {
      await this.rewriteFile(this.idempotencyCachePath, Array.from(this.idempotencyCache.values()));
    }

    return cleaned;
  }

  /**
   * 销毁存储
   */
  async destroy(): Promise<void> {
    this.pendingQueue.clear();
    this.retryIndex.clear();
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
    return this.pendingQueue.get(messageId) ?? this.retryIndex.get(messageId);
  }

  /**
   * 设置下次重试时间
   */
  async setNextRetryTime(messageId: string, nextRetryAt: number): Promise<void> {
    const item = this.retryIndex.get(messageId);
    if (item) {
      item.nextRetryAt = nextRetryAt;
      item.updatedAt = Date.now();
      await this.rewriteFile(this.retryIndexPath, Array.from(this.retryIndex.values()));
    }
  }

  // 私有辅助方法

  private generateMessageId(): string {
    return `dt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private getSessionId(message: OutgoingMessage): string {
    const parts: string[] = [message.channelId];
    if (message.conversationId) parts.push(message.conversationId);
    if (message.threadId) parts.push(message.threadId);
    parts.push(message.userId);
    return parts.join(':');
  }

  private updateStats(): void {
    this.stats.pending = this.pendingQueue.size;
    this.stats.retrying = this.retryIndex.size;
    this.stats.deadLetter = this.deadLetterQueue.size;
  }

  private async appendToFile(filePath: string, data: unknown): Promise<void> {
    await fs.appendFile(filePath, JSON.stringify(data) + '\n', 'utf-8');
  }

  private async rewriteFile(filePath: string, data: unknown[]): Promise<void> {
    const lines = data.map((item) => JSON.stringify(item));
    await fs.writeFile(filePath, lines.join('\n') + '\n', 'utf-8');
  }
}

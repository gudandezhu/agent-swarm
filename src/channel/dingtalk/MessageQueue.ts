/**
 * MessageQueue - 消息队列管理
 *
 * 负责管理待发送和重试消息队列
 */

import { join } from 'path';
import { promises as fs } from 'fs';
import type { OutgoingMessage } from '../types.js';
import { JsonlFileStore } from './JsonlFileStore.js';
import type { QueuedMessage } from './types.js';
import { DingTalkMessageStatus } from './types.js';

export class MessageQueue {
  private pendingQueue = new Map<string, QueuedMessage>();
  private retryIndex = new Map<string, QueuedMessage>();
  private pendingStore: JsonlFileStore<QueuedMessage>;
  private retryStore: JsonlFileStore<QueuedMessage>;

  // 统计
  private stats = {
    pending: 0,
    retrying: 0,
  };

  constructor(basePath: string) {
    this.pendingStore = new JsonlFileStore<QueuedMessage>(join(basePath, 'pending_queue.jsonl'));
    this.retryStore = new JsonlFileStore<QueuedMessage>(join(basePath, 'retry_index.jsonl'));
  }

  /**
   * 初始化队列
   */
  async init(): Promise<void> {
    await fs.mkdir(join(process.env.HOME ?? '', '.agent-swarm', 'channels', 'dingtalk'), {
      recursive: true,
    });

    await this.loadPendingQueue();
    await this.loadRetryIndex();
    this.updateStats();
  }

  /**
   * 加载待发送队列
   */
  private async loadPendingQueue(): Promise<void> {
    const items = await this.pendingStore.readAll();
    for (const item of items) {
      if (item.status === 'pending' || item.status === 'sending') {
        this.pendingQueue.set(item.messageId, item);
      }
    }
  }

  /**
   * 加载重试索引
   */
  private async loadRetryIndex(): Promise<void> {
    const items = await this.retryStore.readAll();
    for (const item of items) {
      if (item.status === 'retrying') {
        this.retryIndex.set(item.messageId, item);
      }
    }
  }

  /**
   * 消息入队
   */
  async enqueue(message: OutgoingMessage, messageId: string): Promise<QueuedMessage> {
    const now = Date.now();

    const item: QueuedMessage = {
      messageId,
      sessionId: this.getSessionId(message),
      message,
      retryCount: 0,
      nextRetryAt: now,
      createdAt: now,
      updatedAt: now,
      status: DingTalkMessageStatus.PENDING,
    };

    this.pendingQueue.set(messageId, item);
    await this.pendingStore.append(item);
    this.updateStats();

    return item;
  }

  /**
   * 消息出队
   */
  async dequeue(messageId: string): Promise<void> {
    if (this.pendingQueue.has(messageId)) {
      this.pendingQueue.delete(messageId);
      await this.pendingStore.rewrite(Array.from(this.pendingQueue.values()));
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

    if (status === 'retrying') {
      this.pendingQueue.delete(messageId);
      this.retryIndex.set(messageId, item);
      await this.pendingStore.rewrite(Array.from(this.pendingQueue.values()));
      await this.retryStore.append(item);
    } else if (status === 'completed') {
      this.pendingQueue.delete(messageId);
      this.retryIndex.delete(messageId);
      await this.pendingStore.rewrite(Array.from(this.pendingQueue.values()));
      await this.retryStore.rewrite(Array.from(this.retryIndex.values()));
    } else if (isInPending) {
      await this.pendingStore.rewrite(Array.from(this.pendingQueue.values()));
    } else {
      await this.retryStore.rewrite(Array.from(this.retryIndex.values()));
    }

    this.updateStats();
  }

  /**
   * 增加重试次数
   */
  async incrementRetry(messageId: string): Promise<QueuedMessage | null> {
    const item = this.pendingQueue.get(messageId) ?? this.retryIndex.get(messageId);

    if (!item) {
      return null;
    }

    item.retryCount++;
    item.updatedAt = Date.now();

    await this.retryStore.rewrite(Array.from(this.retryIndex.values()));

    return item;
  }

  /**
   * 设置下次重试时间
   */
  async setNextRetryTime(messageId: string, nextRetryAt: number): Promise<void> {
    const item = this.retryIndex.get(messageId);
    if (item) {
      item.nextRetryAt = nextRetryAt;
      item.updatedAt = Date.now();
      await this.retryStore.rewrite(Array.from(this.retryIndex.values()));
    }
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

    for (const item of this.pendingQueue.values()) {
      if (item.status === 'sending' && item.updatedAt < timeoutBefore) {
        result.push(item);
      }
    }

    for (const item of this.retryIndex.values()) {
      if (item.status === 'retrying' && item.nextRetryAt <= Date.now()) {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * 获取消息
   */
  get(messageId: string): QueuedMessage | undefined {
    return this.pendingQueue.get(messageId) ?? this.retryIndex.get(messageId);
  }

  /**
   * 获取统计
   */
  getStats(): { pending: number; retrying: number } {
    return { ...this.stats };
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.pendingQueue.clear();
    this.retryIndex.clear();
    this.updateStats();
  }

  private updateStats(): void {
    this.stats.pending = this.pendingQueue.size;
    this.stats.retrying = this.retryIndex.size;
  }

  private getSessionId(message: OutgoingMessage): string {
    const parts: string[] = [message.channelId];
    if (message.conversationId) parts.push(message.conversationId);
    if (message.threadId) parts.push(message.threadId);
    parts.push(message.userId);
    return parts.join(':');
  }
}

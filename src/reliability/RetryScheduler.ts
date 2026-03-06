/**
 * RetryScheduler - 消息重试调度器
 *
 * 定时扫描超时和失败消息，触发重试逻辑
 */

import type { IMessageStore } from '../core/IMessageStore.js';
import type { IMessageBus } from '../core/IMessageBus.js';
import { MessageStatus } from '../core/IMessageStore.js';

export interface RetrySchedulerConfig {
  interval?: number; // 扫描间隔（毫秒），默认 5000
  timeoutMs?: number; // 消息超时时间（毫秒），默认 30000
  maxRetries?: number; // 最大重试次数，默认 3
}

export class RetryScheduler {
  private messageStore: IMessageStore;
  private messageBus: IMessageBus;
  private config: Required<RetrySchedulerConfig>;
  private timer?: NodeJS.Timeout;
  private started = false;

  constructor(
    messageStore: IMessageStore,
    messageBus: IMessageBus,
    config: RetrySchedulerConfig = {}
  ) {
    this.messageStore = messageStore;
    this.messageBus = messageBus;
    this.config = {
      interval: config.interval ?? 5000,
      timeoutMs: config.timeoutMs ?? 30000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.scheduleNext();
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.started) {
      return;
    }
    this.started = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * 调度下一次扫描
   */
  private scheduleNext(): void {
    if (!this.started) {
      return;
    }

    this.timer = setTimeout(async () => {
      await this.scanAndRetry();
      this.scheduleNext();
    }, this.config.interval);
  }

  /**
   * 扫描并重试消息
   */
  private async scanAndRetry(): Promise<void> {
    try {
      // 处理超时消息
      await this.processTimeoutMessages();

      // 处理失败消息
      await this.processFailedMessages();

      // 清理已完成的消息
      const cleanupBefore = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1天前
      await this.messageStore.deleteCompleted(cleanupBefore);
    } catch (error) {
      console.error('RetryScheduler scan error:', error);
    }
  }

  /**
   * 处理超时消息
   */
  private async processTimeoutMessages(): Promise<void> {
    const timeoutBefore = new Date(Date.now() - this.config.timeoutMs);
    const timeoutMessages = await this.messageStore.getTimeoutMessages(timeoutBefore);

    for (const message of timeoutMessages) {
      try {
        // 增加重试次数
        await this.messageStore.incrementRetry(message.id);

        // 重新获取消息以获得更新后的 retryCount
        const updated = await this.messageStore.get(message.id);
        if (!updated) continue;

        // 如果超过最大重试次数，标记为死信
        if (updated.retryCount >= this.config.maxRetries) {
          await this.messageStore.updateStatus(
            message.id,
            MessageStatus.DEAD_LETTER,
            'Max retries exceeded'
          );
          continue;
        }

        // 重新发送消息
        await this.messageBus.send(updated);

        // 更新状态为处理中
        await this.messageStore.updateStatus(message.id, MessageStatus.PROCESSING);
      } catch (error) {
        console.error(`Failed to retry message ${message.id}:`, error);
        await this.messageStore.updateStatus(
          message.id,
          MessageStatus.FAILED,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  /**
   * 处理失败消息
   */
  private async processFailedMessages(): Promise<void> {
    const retryableMessages = await this.messageStore.getRetryableMessages(this.config.maxRetries);

    for (const message of retryableMessages) {
      try {
        // 重新发送消息
        await this.messageBus.send(message);

        // 更新状态为处理中
        await this.messageStore.updateStatus(message.id, MessageStatus.PROCESSING);
      } catch (error) {
        console.error(`Failed to retry message ${message.id}:`, error);
        await this.messageStore.updateStatus(
          message.id,
          MessageStatus.FAILED,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  /**
   * 获取状态
   */
  isRunning(): boolean {
    return this.started;
  }
}

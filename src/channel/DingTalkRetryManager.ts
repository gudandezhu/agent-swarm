/**
 * DingTalkRetryManager - 钉钉消息重试管理器
 *
 * 管理消息发送、重试调度、幂等性检查
 */

import type { OutgoingMessage } from './types.js';
import {
  DingTalkMessageStore,
  DingTalkMessageStatus,
  type QueuedMessage,
  type SendResult,
  type QueueStats,
  type DeadLetterMessage,
} from './DingTalkMessageStore.js';

/**
 * 重试管理器配置
 */
export interface RetryManagerConfig {
  /** 消息存储路径 */
  basePath?: string;
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 初始重试延迟（毫秒），默认 1000 */
  initialRetryDelay?: number;
  /** 退避因子，默认 2 */
  backoffFactor?: number;
  /** 最大重试延迟（毫秒），默认 60000 (1分钟) */
  maxRetryDelay?: number;
  /** 消息发送函数 */
  sender: (message: OutgoingMessage) => Promise<void>;
}

/**
 * 重试调度器配置
 */
export interface RetrySchedulerOptions {
  /** 扫描间隔（毫秒），默认 5000 */
  interval?: number;
}

/**
 * 钉钉消息重试管理器
 */
export class DingTalkRetryManager {
  private store: DingTalkMessageStore;
  private config: Required<RetryManagerConfig>;
  private timer?: NodeJS.Timeout;
  private started = false;

  constructor(config: RetryManagerConfig) {
    this.config = {
      basePath: config.basePath ?? './data/dingtalk',
      maxRetries: config.maxRetries ?? 3,
      initialRetryDelay: config.initialRetryDelay ?? 1000,
      backoffFactor: config.backoffFactor ?? 2,
      maxRetryDelay: config.maxRetryDelay ?? 60000,
      sender: config.sender,
    };

    this.store = new DingTalkMessageStore({ basePath: this.config.basePath });
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    await this.store.init();
  }

  /**
   * 启动重试调度器
   */
  start(options: RetrySchedulerOptions = {}): void {
    if (this.started) return;

    this.started = true;
    const interval = options.interval ?? 5000;

    this.timer = setInterval(() => {
      this.processRetries().catch((error) => {
        console.error('[DingTalkRetryManager] Retry processing error:', error);
      });
    }, interval);

    console.log(`[DingTalkRetryManager] Started with interval ${interval}ms`);
  }

  /**
   * 停止重试调度器
   */
  stop(): void {
    if (!this.started) return;

    this.started = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    console.log('[DingTalkRetryManager] Stopped');
  }

  /**
   * 发送消息（带重试）
   */
  async send(message: OutgoingMessage, messageId?: string): Promise<SendResult> {
    // 生成或使用提供的消息 ID
    const id = messageId ?? this.generateMessageId();

    // 检查幂等性
    if (this.store.checkIdempotency(id)) {
      return {
        success: true,
        messageId: id,
        status: 'sent',
      };
    }

    // 加入队列
    const queuedMessage = await this.store.enqueue(message, id);

    try {
      // 尝试发送
      await this.config.sender(message);

      // 发送成功
      await this.store.updateStatus(id, DingTalkMessageStatus.COMPLETED);
      await this.store.markSent(id);

      return {
        success: true,
        messageId: id,
        status: 'sent',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 判断是否可重试
      const isRetryable = this.isRetryableError(error);

      if (isRetryable) {
        // 移到重试队列
        await this.store.updateStatus(id, DingTalkMessageStatus.RETRYING, errorMessage);

        // 计算下次重试时间
        const nextRetryAt = this.calculateNextRetryTime(0);
        await this.store.setNextRetryTime(id, nextRetryAt);

        return {
          success: false,
          messageId: id,
          status: 'queued',
          error: errorMessage,
        };
      } else {
        // 不可重试，直接移到死信队列
        await this.store.updateStatus(id, DingTalkMessageStatus.DEAD_LETTER, errorMessage);

        return {
          success: false,
          messageId: id,
          status: 'failed',
          error: errorMessage,
        };
      }
    }
  }

  /**
   * 获取队列统计
   */
  getStats(): QueueStats {
    return this.store.getStats();
  }

  /**
   * 获取死信队列
   */
  getDeadLetters(limit?: number): DeadLetterMessage[] {
    return this.store.getDeadLetters(limit);
  }

  /**
   * 重新投递死信
   */
  async redeliver(messageId: string): Promise<SendResult> {
    const deadLetters = this.store.getDeadLetters();
    const deadLetter = deadLetters.find((d) => d.messageId === messageId);

    if (!deadLetter) {
      return {
        success: false,
        messageId,
        status: 'failed',
        error: 'Message not found in dead letter queue',
      };
    }

    try {
      // 直接尝试发送，绕过幂等性检查
      await this.config.sender(deadLetter.message);

      // 发送成功，      await this.store.markSent(messageId);

      return {
        success: true,
        messageId,
        status: 'sent',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        messageId,
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    this.stop();
    await this.store.destroy();
  }

  /**
   * 是否正在运行
   */
  isRunning(): boolean {
    return this.started;
  }

  // 私有方法

  /**
   * 处理重试队列
   */
  private async processRetries(): Promise<void> {
    const retryable = this.store.getRetryable(this.config.maxRetries);

    for (const item of retryable) {
      try {
        // 尝试发送
        await this.config.sender(item.message);

        // 发送成功
        await this.store.updateStatus(item.messageId, DingTalkMessageStatus.COMPLETED);
        await this.store.markSent(item.messageId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // 增加重试次数
        const updated = await this.store.incrementRetry(item.messageId);

        if (updated && updated.retryCount >= this.config.maxRetries) {
          // 超过最大重试次数，移到死信队列
          await this.store.updateStatus(
            item.messageId,
            DingTalkMessageStatus.DEAD_LETTER,
            `Max retries exceeded. Last error: ${errorMessage}`
          );
        } else if (updated) {
          // 更新下次重试时间
          const nextRetryAt = this.calculateNextRetryTime(updated.retryCount);
          await this.store.setNextRetryTime(item.messageId, nextRetryAt);
          await this.store.updateStatus(
            item.messageId,
            DingTalkMessageStatus.RETRYING,
            errorMessage
          );
        }
      }
    }

    // 清理过期数据
    const cleanupBefore = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1天前
    await this.store.cleanup(cleanupBefore);
  }

  /**
   * 计算下次重试时间
   */
  private calculateNextRetryTime(retryCount: number): number {
    const delay = Math.min(
      this.config.initialRetryDelay * Math.pow(this.config.backoffFactor, retryCount),
      this.config.maxRetryDelay
    );
    return Date.now() + delay;
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // 网络错误通常可重试
      const retryablePatterns = [
        /network/i,
        /timeout/i,
        /ECONNREFUSED/,
        /ECONNRESET/,
        /ETIMEDOUT/,
        /ENOTFOUND/,
        /rate limit/i,
        /too many requests/i,
        /503/,
        /502/,
        /500/,
      ];

      const message = error.message;
      return retryablePatterns.some((pattern) => pattern.test(message));
    }
    return true; // 默认可重试
  }

  /**
   * 生成消息 ID
   */
  private generateMessageId(): string {
    return `dt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

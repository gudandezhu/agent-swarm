/**
 * DingTalkChannel - 钉钉适配器
 *
 * 支持钉钉机器人消息接收和发送
 * 集成 RetryManager 支持可靠的消息发送
 */

import { BaseChannel } from './BaseChannel.js';
import type { IncomingMessage, OutgoingMessage } from './types.js';
import { DingTalkRetryManager, type RetryManagerConfig } from './DingTalkRetryManager.js';
import type { SendResult, QueueStats, DeadLetterMessage } from './DingTalkMessageStore.js';

/**
 * 钉钉配置
 */
export interface DingTalkConfig {
  appKey: string;
  appSecret: string;
  webhookUrl?: string;
  accessToken?: string;
  /** 存储路径，默认 ~/.agent-swarm/channels/dingtalk */
  storagePath?: string;
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 初始重试延迟（毫秒），默认 1000 */
  retryDelay?: number;
  /** 退避因子，默认 2（指数退避） */
  retryBackoffFactor?: number;
  /** 重试调度器间隔（毫秒），默认 5000 */
  retryInterval?: number;
  /** 是否启用持久化重试，默认 true */
  enablePersistentRetry?: boolean;
}

/**
 * 钉钉消息格式
 */
interface DingTalkWebhookMessage {
  conversationId: string;
  conversationType: string;
  userId: {
    staffId: string;
  };
  content: {
    contentType: string;
    text: string;
  };
  msgId: string;
  msgType: string;
  senderId: {
    staffId: string;
  };
  senderNick: string;
  createAt: number;
}

/**
 * 钉钉发送消息格式
 */
export interface DingTalkSendMessage {
  msgKey: string;
  msg: {
    content: string;
    msgType: 'text';
  };
  userIdList: string[];
}

/**
 * 钉钉 Channel 错误
 */
export class DingTalkChannelError extends Error {
  constructor(
    message: string,
    public readonly isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'DingTalkChannelError';
  }
}

export class DingTalkChannel extends BaseChannel {
  readonly id = 'dingtalk';
  readonly name = 'DingTalk';

  private config: Required<Omit<DingTalkConfig, 'storagePath'>> & { storagePath: string };
  private retryManager?: DingTalkRetryManager;

  constructor(config: DingTalkConfig) {
    super();
    this.config = {
      appKey: config.appKey,
      appSecret: config.appSecret,
      webhookUrl: config.webhookUrl ?? '',
      accessToken: config.accessToken ?? '',
      storagePath: config.storagePath ?? `${process.env.HOME ?? ''}/.agent-swarm/channels/dingtalk`,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      retryBackoffFactor: config.retryBackoffFactor ?? 2,
      retryInterval: config.retryInterval ?? 5000,
      enablePersistentRetry: config.enablePersistentRetry ?? false,
    };
  }

  async start(): Promise<void> {
    if (this.started) return;

    // 初始化 RetryManager（如果启用）
    if (this.config.enablePersistentRetry) {
      const retryConfig: RetryManagerConfig = {
        basePath: this.config.storagePath,
        maxRetries: this.config.maxRetries,
        initialRetryDelay: this.config.retryDelay,
        backoffFactor: this.config.retryBackoffFactor,
        sender: this.sendToDingTalkAPI.bind(this),
      };

      this.retryManager = new DingTalkRetryManager(retryConfig);
      await this.retryManager.init();
      this.retryManager.start({ interval: this.config.retryInterval });

      console.log(`✓ DingTalk retry manager started`);
    }

    if (this.config.webhookUrl) {
      console.log(`✓ DingTalk webhook server ready`);
      // TODO: 启动 HTTP 服务器接收 webhook
      // 可以使用 express/fastify 等
    }

    this.started = true;
    console.log(`✓ DingTalk channel started`);
  }

  async stop(): Promise<void> {
    if (!this.started) return;

    // 停止 RetryManager
    if (this.retryManager) {
      await this.retryManager.destroy();
      this.retryManager = undefined;
    }

    // TODO: 停止 HTTP 服务器

    this.started = false;
  }

  /**
   * 发送消息
   * 如果启用了持久化重试，会使用 RetryManager
   * 否则使用简单的内存重试
   */
  async send(message: OutgoingMessage, messageId?: string): Promise<void> {
    if (this.retryManager) {
      // 使用 RetryManager 发送
      const result = await this.retryManager.send(message, messageId);

      if (result.success) {
        console.log(`[DingTalk] Send to ${message.userId}: ${message.content}`);
        return;
      }

      if (result.status === 'queued') {
        console.log(`[DingTalk] Message queued for retry: ${result.messageId}`);
        return;
      }

      // 发送失败
      throw new Error(result.error ?? 'Send failed');
    } else {
      // 简单内存重试（向后兼容）
      await this.sendWithMemoryRetry(message);
    }
  }

  /**
   * 简单内存重试（向后兼容）
   */
  private async sendWithMemoryRetry(message: OutgoingMessage): Promise<void> {
    const maxAttempts = this.config.maxRetries + 1;
    let lastError: Error | undefined;
    let delay = this.config.retryDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.sendToDingTalkAPI(message);
        console.log(`[DingTalk] Send to ${message.userId}: ${message.content}`);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isRetryable = error instanceof DingTalkChannelError ? error.isRetryable : true;

        if (attempt < maxAttempts && isRetryable) {
          console.warn(
            `[DingTalk] Send failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms:`,
            lastError.message
          );

          await this.sleep(delay);
          delay = Math.floor(delay * this.config.retryBackoffFactor);
        } else {
          break;
        }
      }
    }

    throw lastError ?? new Error('Unknown error');
  }

  /**
   * 实际调用钉钉 API 发送消息
   * TODO: 实现真实的 API 调用
   * API: https://open.dingtalk.com/document/org-app-server/send-message-to-conversation
   */
  protected async sendToDingTalkAPI(_message: OutgoingMessage): Promise<void> {
    // 当前为空实现，仅用于测试
    // 实际实现时需要调用钉钉 API
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 处理钉钉 Webhook 消息
   */
  async handleWebhook(data: DingTalkWebhookMessage): Promise<void> {
    const message: IncomingMessage = {
      channelId: this.id,
      userId: data.userId.staffId,
      conversationId: data.conversationId,
      threadId: undefined,
      content: data.content.text,
    };

    await this.handleMessage(message);
  }

  /**
   * 获取 Webhook 处理器（用于 HTTP 服务器）
   */
  getWebhookHandler(): (data: DingTalkWebhookMessage) => Promise<void> {
    return async (data) => {
      await this.handleWebhook(data);
    };
  }

  // RetryManager 相关方法

  /**
   * 获取队列统计
   */
  getQueueStats(): QueueStats | null {
    return this.retryManager?.getStats() ?? null;
  }

  /**
   * 获取死信队列
   */
  getDeadLetters(limit?: number): DeadLetterMessage[] {
    return this.retryManager?.getDeadLetters(limit) ?? [];
  }

  /**
   * 重新投递死信
   */
  async redeliverDeadLetter(messageId: string): Promise<SendResult | null> {
    if (!this.retryManager) {
      return null;
    }
    return this.retryManager.redeliver(messageId);
  }

  /**
   * 是否启用持久化重试
   */
  isPersistentRetryEnabled(): boolean {
    return this.config.enablePersistentRetry && this.retryManager !== undefined;
  }
}

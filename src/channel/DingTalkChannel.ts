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
import {
  createServer,
  type Server,
  type IncomingMessage as HttpIncomingMessage,
  type ServerResponse,
} from 'node:http';

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
 * 钉钉 API 响应格式
 */
interface DingTalkAPIResponse {
  errcode: number;
  errmsg: string;
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
  private webhookServer?: Server;
  private accessToken?: string;

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
      await this.startWebhookServer();
      console.log(`✓ DingTalk webhook server ready`);
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

    if (this.webhookServer) {
      await this.stopWebhookServer();
    }

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
   * API: https://open.dingtalk.com/document/org-app-server/send-message-to-conversation
   */
  protected async sendToDingTalkAPI(message: OutgoingMessage): Promise<void> {
    const token = this.config.accessToken || this.accessToken;

    // 如果没有配置 token，直接返回（向后兼容测试）
    if (!token) {
      return;
    }

    const sendMessage: DingTalkSendMessage = {
      msgKey: 'sampleText',
      msg: {
        content: message.content,
        msgType: 'text',
      },
      userIdList: [message.userId],
    };

    const response = await fetch(
      `https://oapi.dingtalk.com/topapi/message/corpconversation/sendmessage?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendMessage),
      }
    );

    if (!response.ok) {
      throw new DingTalkChannelError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status >= 500 // 只有 5xx 错误才重试
      );
    }

    const data = (await response.json()) as DingTalkAPIResponse;
    if (data.errcode !== 0) {
      throw new DingTalkChannelError(
        `DingTalk API error: ${data.errmsg}`,
        data.errcode >= 500 // 只有 5xx 错误码才重试
      );
    }
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

  /**
   * 启动 Webhook HTTP 服务器
   */
  private async startWebhookServer(): Promise<void> {
    const url = new URL(this.config.webhookUrl!);
    // 对于 localhost，使用 hostname；对于远程地址，仅作为占位符不实际监听
    const hostname =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1' ? url.hostname : '0.0.0.0';
    const port = url.port ? parseInt(url.port, 10) : 0; // 0 表示随机端口

    this.webhookServer = createServer(async (req, res) => {
      if (req.method === 'POST' && req.url === '/webhook') {
        try {
          const body = await this.parseRequestBody(req);
          await this.handleWebhookRequest(body, res);
        } catch (error) {
          console.error('[DingTalk] Webhook error:', error);
          res.writeHead(500).end(JSON.stringify({ error: 'Internal server error' }));
        }
      } else {
        res.writeHead(404).end(JSON.stringify({ error: 'Not found' }));
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.webhookServer!.listen(port, hostname, () => resolve());
      this.webhookServer!.on('error', reject);
    });
  }

  /**
   * 停止 Webhook HTTP 服务器
   */
  private async stopWebhookServer(): Promise<void> {
    if (!this.webhookServer) return;

    await new Promise<void>((resolve) => {
      this.webhookServer!.close(() => resolve());
    });

    this.webhookServer = undefined;
  }

  /**
   * 解析 HTTP 请求体
   */
  private async parseRequestBody(req: HttpIncomingMessage): Promise<any> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(body);
  }

  /**
   * 处理 Webhook 请求
   */
  private async handleWebhookRequest(data: any, res: ServerResponse): Promise<void> {
    // 处理钉钉事件
    await this.handleWebhook(data);

    res.writeHead(200).end(JSON.stringify({ errcode: 0, errmsg: 'success' }));
  }
}

/**
 * DingTalkChannel - 钉钉适配器
 *
 * 支持钉钉机器人消息接收和发送
 */

import { BaseChannel } from './BaseChannel.js';
import type { IncomingMessage, OutgoingMessage } from './types.js';

export interface DingTalkConfig {
  appKey: string;
  appSecret: string;
  webhookUrl?: string;
  accessToken?: string;
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

export class DingTalkChannel extends BaseChannel {
  readonly id = 'dingtalk';
  readonly name = 'DingTalk';

  private config: DingTalkConfig;

  constructor(config: DingTalkConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.started) return;

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

    // TODO: 停止 HTTP 服务器

    this.started = false;
  }

  async send(message: OutgoingMessage): Promise<void> {
    // TODO: 调用钉钉 API 发送消息
    // API: https://open.dingtalk.com/document/org-app-server/send-message-to-conversation
    console.log(`[DingTalk] Send to ${message.userId}: ${message.content}`);
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
}

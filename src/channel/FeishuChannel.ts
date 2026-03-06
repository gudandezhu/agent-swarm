/**
 * FeishuChannel - 飞书适配器
 *
 * 支持飞书机器人消息接收和发送
 */

import { BaseChannel } from './BaseChannel.js';
import type { IncomingMessage, OutgoingMessage } from './types.js';

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
  webhookUrl?: string;
}

/**
 * 飞书事件消息格式
 */
interface FeishuEventMessage {
  schema: string;
  header: {
    event_id: string;
    event_type: string;
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event?: {
    sender: {
      sender_id: {
        open_id: string;
        union_id: string;
        user_id: string;
      };
      sender_type: string;
      tenant_key: string;
    };
    message: {
      message_id: string;
      chat_type: string;
      chat_id: string;
      content: string;
      create_time: string;
    };
  };
}

/**
 * 飞书发送消息格式
 */
export interface FeishuSendMessage {
  receive_id_type: 'open_id' | 'user_id' | 'union_id';
  msg_type: 'text';
  content: string;
  receive_id: string;
}

export class FeishuChannel extends BaseChannel {
  readonly id = 'feishu';
  readonly name = 'Feishu';

  private config: FeishuConfig;

  constructor(config: FeishuConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.started) return;

    if (this.config.webhookUrl) {
      console.log(`✓ Feishu webhook server ready`);
      // TODO: 启动 HTTP 服务器接收 webhook
    }

    this.started = true;
    console.log(`✓ Feishu channel started`);
  }

  async stop(): Promise<void> {
    if (!this.started) return;

    // TODO: 停止 HTTP 服务器

    this.started = false;
  }

  async send(message: OutgoingMessage): Promise<void> {
    // TODO: 调用飞书 API 发送消息
    // API: https://open.feishu.cn/document/server-docs/message-group/send-message
    console.log(`[Feishu] Send to ${message.userId}: ${message.content}`);
  }

  /**
   * 处理飞书事件消息
   */
  async handleEvent(data: FeishuEventMessage): Promise<void> {
    if (data.header.event_type !== 'im.message.receive_v1') {
      return; // 只处理消息事件
    }

    const content = JSON.parse(data.event?.message.content || '{}');
    const message: IncomingMessage = {
      channelId: this.id,
      userId: data.event?.sender.sender_id.open_id || '',
      conversationId: data.event?.message.chat_id,
      threadId: data.event?.message.message_id,
      content: content.text || '',
    };

    await this.handleMessage(message);
  }

  /**
   * 获取事件处理处理器（用于 HTTP 服务器）
   */
  getEventHandler(): (data: FeishuEventMessage) => Promise<void> {
    return async (data) => {
      await this.handleEvent(data);
    };
  }
}

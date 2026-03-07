/**
 * FeishuChannel - 飞书适配器
 *
 * 支持飞书机器人消息接收和发送
 */

import { BaseChannel } from './BaseChannel.js';
import type { IncomingMessage, OutgoingMessage } from './types.js';
import {
  createServer,
  type Server,
  type IncomingMessage as HttpIncomingMessage,
  type ServerResponse,
} from 'node:http';

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
  webhookUrl?: string;
  /** API 基础地址，默认 https://open.feishu.cn */
  apiBaseUrl?: string;
}

/**
 * 飞书 API 响应格式
 */
interface FeishuAPIResponse {
  code: number;
  msg: string;
  data?: unknown;
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
  private webhookServer?: Server;
  private accessToken?: string;

  constructor(config: FeishuConfig) {
    super();
    this.config = {
      ...config,
      apiBaseUrl: config.apiBaseUrl ?? 'https://open.feishu.cn',
    };
  }

  async start(): Promise<void> {
    if (this.started) return;

    if (this.config.webhookUrl) {
      await this.startWebhookServer();
      console.log(`✓ Feishu webhook server ready`);
    }

    this.started = true;
    console.log(`✓ Feishu channel started`);
  }

  async stop(): Promise<void> {
    if (!this.started) return;

    if (this.webhookServer) {
      await this.stopWebhookServer();
    }

    this.started = false;
  }

  async send(message: OutgoingMessage): Promise<void> {
    await this.sendToFeishuAPI(message);
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

  /**
   * 启动 Webhook HTTP 服务器
   */
  private async startWebhookServer(): Promise<void> {
    const url = new URL(this.config.webhookUrl!);
    const hostname = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80;

    this.webhookServer = createServer(async (req, res) => {
      if (req.method === 'POST' && req.url === '/webhook') {
        try {
          const body = await this.parseRequestBody(req);
          await this.handleWebhookRequest(body, res);
        } catch (error) {
          console.error('[Feishu] Webhook error:', error);
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
    // 验证 token（如果配置了）
    if (this.config.verificationToken && data.header?.token !== this.config.verificationToken) {
      res.writeHead(401).end(JSON.stringify({ error: 'Invalid token' }));
      return;
    }

    // URL 验证挑战
    if (data.type === 'url_verification') {
      res.writeHead(200).end(JSON.stringify({ challenge: data.challenge }));
      return;
    }

    // 处理事件
    await this.handleEvent(data);

    res.writeHead(200).end(JSON.stringify({ code: 0, msg: 'success' }));
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    const response = await fetch(
      `${this.config.apiBaseUrl}/open-apis/auth/v3/tenant_access_token/internal`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: this.config.appId,
          app_secret: this.config.appSecret,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status}`);
    }

    const data = (await response.json()) as FeishuAPIResponse;
    if (data.code !== 0) {
      throw new Error(`Failed to get access token: ${data.msg}`);
    }

    const tokenData = data.data as { tenant_access_token?: string } | undefined;
    if (!tokenData?.tenant_access_token) {
      throw new Error('Invalid access token response');
    }

    this.accessToken = tokenData.tenant_access_token;
    return this.accessToken;
  }

  /**
   * 调用飞书 API 发送消息
   */
  private async sendToFeishuAPI(message: OutgoingMessage): Promise<void> {
    const accessToken = await this.getAccessToken();

    const sendMessage: FeishuSendMessage = {
      receive_id_type: 'open_id',
      msg_type: 'text',
      content: JSON.stringify({ text: message.content }),
      receive_id: message.userId,
    };

    const response = await fetch(
      `${this.config.apiBaseUrl}/open-apis/im/v1/messages?receive_id_type=open_id`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(sendMessage),
      }
    );

    if (!response.ok) {
      const errorData = (await response.json()) as FeishuAPIResponse;
      throw new Error(`Failed to send message: ${errorData.msg} (${response.status})`);
    }

    const data = (await response.json()) as FeishuAPIResponse;
    if (data.code !== 0) {
      throw new Error(`Failed to send message: ${data.msg}`);
    }

    console.log(`[Feishu] Message sent to ${message.userId}`);
  }
}

/**
 * FeishuChannel - 飞书适配器（示例）
 */

import { BaseChannel } from './BaseChannel.js';
import type { OutgoingMessage } from './types.js';

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
}

export class FeishuChannel extends BaseChannel {
  readonly id = 'feishu';
  readonly name = 'Feishu';

  constructor(_config: FeishuConfig) {
    super();
  }

  async start(): Promise<void> {
    if (this.started) return;
    console.log('Feishu channel started (mock)');
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
  }

  async send(message: OutgoingMessage): Promise<void> {
    console.log(`[Feishu] To ${message.userId}: ${message.content}`);
  }
}

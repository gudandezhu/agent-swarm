/**
 * DingTalkChannel - 钉钉适配器（示例）
 */

import { BaseChannel } from './BaseChannel.js';
import type { OutgoingMessage } from './types.js';

export interface DingTalkConfig {
  appKey: string;
  appSecret: string;
  webhook?: string;
}

export class DingTalkChannel extends BaseChannel {
  readonly id = 'dingtalk';
  readonly name = 'DingTalk';

  constructor(_config: DingTalkConfig) {
    super();
  }

  async start(): Promise<void> {
    if (this.started) return;
    console.log('DingTalk channel started (mock)');
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
  }

  async send(message: OutgoingMessage): Promise<void> {
    console.log(`[DingTalk] To ${message.userId}: ${message.content}`);
  }
}

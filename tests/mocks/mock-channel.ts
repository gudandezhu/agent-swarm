/**
 * MockChannel - 用于测试的 Channel 实现
 */

import { BaseChannel } from '../../src/channel/BaseChannel.js';
import type { IncomingMessage, OutgoingMessage } from '../../src/channel/types.js';

export class MockChannel extends BaseChannel {
  readonly id = 'mock';
  readonly name = 'Mock Channel';
  sentMessages: OutgoingMessage[] = [];

  async start(): Promise<void> {
    // 调用父类方法或直接设置状态
    this['started'] = true;
  }

  async stop(): Promise<void> {
    this['started'] = false;
  }

  async send(message: OutgoingMessage): Promise<void> {
    if (!this['started']) {
      throw new Error('Channel not started');
    }
    this.sentMessages.push(message);
  }

  /**
   * 模拟接收外部消息（用于测试）
   */
  async simulateIncomingMessage(message: Partial<IncomingMessage>): Promise<void> {
    const fullMessage: IncomingMessage = {
      channelId: this.id,
      userId: 'test-user',
      content: 'test content',
      ...message,
    };
    // 使用父类的 protected 方法
    await this['handleMessage'](fullMessage);
  }

  /**
   * 清除已发送的消息
   */
  clearSentMessages(): void {
    this.sentMessages = [];
  }

  /**
   * 检查 Channel 是否已启动
   */
  isChannelStarted(): boolean {
    return this['started'];
  }
}

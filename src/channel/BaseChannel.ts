/**
 * BaseChannel - Channel 抽象基类
 */

import type { IChannel, IncomingMessage, OutgoingMessage } from './types.js';
import type { Message } from '../message/types.js';

export abstract class BaseChannel implements IChannel {
  abstract readonly id: string;
  abstract readonly name: string;

  protected started = false;
  protected messageHandlers: Array<(message: IncomingMessage) => Promise<void>> = [];

  abstract start(): Promise<void>;

  abstract stop(): Promise<void>;

  abstract send(message: OutgoingMessage): Promise<void>;

  onMessage(handler: (message: IncomingMessage) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  protected async handleMessage(message: IncomingMessage): Promise<void> {
    for (const handler of this.messageHandlers) {
      try {
        await handler(message);
      } catch (error) {
        console.error(`[${this.id}] Error handling message:`, error);
      }
    }
  }

  /**
   * 生成 Session ID
   * 格式: channelId:conversationId:threadId:userId
   */
  makeSessionId(message: IncomingMessage): string {
    const parts: string[] = [message.channelId];
    if (message.conversationId) parts.push(message.conversationId);
    if (message.threadId) parts.push(message.threadId);
    parts.push(message.userId);
    return parts.join(':');
  }

  /**
   * 将 Message 转换为 OutgoingMessage
   */
  toOutgoing(message: Message): OutgoingMessage {
    const parts = message.sessionId.split(':');
    if (parts.length < 2) {
      throw new Error(`Invalid sessionId format: ${message.sessionId}`);
    }

    const channelId = parts[0];
    const userId = parts[parts.length - 1];
    const conversationId = parts.length > 2 ? parts[1] : undefined;
    const threadId = parts.length > 3 ? parts[2] : undefined;

    let content: string;
    if (typeof message.payload.data === 'string') {
      content = message.payload.data;
    } else {
      try {
        content = JSON.stringify(message.payload.data);
      } catch (error) {
        console.error('[BaseChannel] Failed to stringify payload.data:', error);
        content = String(message.payload.data ?? '');
      }
    }

    return {
      channelId,
      userId,
      conversationId,
      threadId,
      content,
    };
  }

  isAvailable(): boolean {
    return this.started;
  }
}

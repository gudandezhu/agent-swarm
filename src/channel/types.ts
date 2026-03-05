/**
 * Channel 适配器类型定义
 */

import type { Message } from '../message/types.js';

/**
 * 来自外部平台的消息
 */
export interface IncomingMessage {
  channelId: string;
  userId: string;
  conversationId?: string;
  threadId?: string;
  content: string;
  raw?: unknown;
}

/**
 * 发送到外部平台的消息
 */
export interface OutgoingMessage {
  channelId: string;
  userId: string;
  conversationId?: string;
  threadId?: string;
  content: string;
}

/**
 * Channel 适配器接口
 */
export interface IChannel {
  readonly id: string;
  readonly name: string;

  start(): Promise<void>;

  stop(): Promise<void>;

  send(message: OutgoingMessage): Promise<void>;

  onMessage(handler: (message: IncomingMessage) => Promise<void>): void;

  makeSessionId(message: IncomingMessage): string;

  toOutgoing(message: Message): OutgoingMessage;

  isAvailable(): boolean;
}

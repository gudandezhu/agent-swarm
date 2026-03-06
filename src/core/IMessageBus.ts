/**
 * IMessageBus - 消息总线接口
 */

import type { Message, MessageHandler } from '../message/types.js';

export interface SendOptions {
  persistent?: boolean;
  timeout?: number;
  priority?: 'high' | 'normal' | 'low';
}

export interface MessageBusStats {
  messagesSent: number;
  messagesReceived: number;
  messagesProcessing: number;
  errors: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: Record<string, unknown>;
}

/**
 * 消息总线接口
 * 现有 MessageBus 已实现大部分方法，只需提取接口
 */
export interface IMessageBus {
  send(message: Message, options?: SendOptions): Promise<void>;
  subscribe(agentId: string, handler: MessageHandler): () => void;
  start(): Promise<void>;
  stop(): Promise<void>;
  health(): Promise<HealthStatus>;
  getStats(): MessageBusStats;
}

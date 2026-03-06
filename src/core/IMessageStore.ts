/**
 * IMessageStore - 消息持久化存储接口
 */

import type { Message } from '../message/types.js';

export enum MessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter'
}

export interface PersistentMessage extends Message {
  status: MessageStatus;
  retryCount: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 消息持久化存储接口
 */
export interface IMessageStore {
  save(message: PersistentMessage): Promise<void>;
  get(messageId: string): Promise<PersistentMessage | null>;
  updateStatus(messageId: string, status: MessageStatus, error?: string): Promise<void>;
  incrementRetry(messageId: string): Promise<void>;
  getTimeoutMessages(before: Date): Promise<PersistentMessage[]>;
  getRetryableMessages(maxRetries: number): Promise<PersistentMessage[]>;
  deleteCompleted(before: Date): Promise<number>;
}

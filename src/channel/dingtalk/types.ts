/**
 * DingTalk 钉钉消息存储类型定义
 */

import type { OutgoingMessage } from '../types.js';

/**
 * 消息状态
 */
export enum DingTalkMessageStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  RETRYING = 'retrying',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter',
}

/**
 * 排队消息
 */
export interface QueuedMessage {
  messageId: string;
  sessionId: string;
  message: OutgoingMessage;
  retryCount: number;
  nextRetryAt: number;
  createdAt: number;
  updatedAt: number;
  status: DingTalkMessageStatus;
  lastError?: string;
}

/**
 * 死信消息
 */
export interface DeadLetterMessage {
  messageId: string;
  sessionId: string;
  message: OutgoingMessage;
  reason: string;
  failedAt: number;
  retryHistory: Array<{
    at: number;
    error: string;
  }>;
}

/**
 * 幂等性缓存条目
 */
export interface IdempotencyCacheEntry {
  messageId: string;
  sentAt: number;
  expiresAt: number;
}

/**
 * 队列统计
 */
export interface QueueStats {
  pending: number;
  retrying: number;
  deadLetter: number;
  totalSent: number;
  totalFailed: number;
}

/**
 * 发送结果
 */
export interface SendResult {
  success: boolean;
  messageId: string;
  status: 'sent' | 'queued' | 'failed';
  error?: string;
}

/**
 * 消息存储配置
 */
export interface MessageStoreConfig {
  /** 存储路径 */
  basePath: string;
  /** 幂等性缓存 TTL（毫秒） */
  idempotencyTtlMs: number;
}

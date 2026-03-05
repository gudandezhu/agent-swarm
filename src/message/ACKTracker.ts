/**
 * ACKTracker - ACK 确认和超时追踪
 */

import type { Message } from './types.js';

export interface ACKStatus {
  messageId: string;
  confirmed: boolean;
  confirmedAt?: number;
  timeoutAt: number;
  retryCount: number;
  recipients: string[];
}

export class ACKTracker {
  private pending = new Map<string, ACKStatus>();
  private timers = new Map<string, NodeJS.Timeout>();

  /**
   * 等待 ACK 确认
   */
  async waitForACK(
    message: Message,
    onTimeout: (message: Message, retryCount: number) => Promise<boolean>
  ): Promise<boolean> {
    const targets = Array.isArray(message.to) ? message.to : [message.to];
    const status: ACKStatus = {
      messageId: message.id,
      confirmed: false,
      timeoutAt: Date.now() + message.ack.timeout,
      retryCount: 0,
      recipients: targets,
    };

    this.pending.set(message.id, status);
    this.scheduleTimeout(message, onTimeout);

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const current = this.pending.get(message.id);
        if (!current || current.confirmed) {
          clearInterval(checkInterval);
          this.clearTimeout(message.id);
          resolve(current?.confirmed ?? false);
        }
      }, 100);
    });
  }

  /**
   * 确认收到消息
   */
  confirm(messageId: string, recipient: string): void {
    const status = this.pending.get(messageId);
    if (!status) return;

    // 移除已确认的接收者
    status.recipients = status.recipients.filter((r) => r !== recipient);

    // 所有接收者都确认了
    if (status.recipients.length === 0) {
      status.confirmed = true;
      status.confirmedAt = Date.now();
    }
  }

  /**
   * 超时处理
   */
  private scheduleTimeout(
    message: Message,
    onTimeout: (message: Message, retryCount: number) => Promise<boolean>
  ): void {
    const timer = setTimeout(async () => {
      const status = this.pending.get(message.id);
      if (!status || status.confirmed) return;

      status.retryCount++;

      // 调用超时回调，返回 true 表示重试
      const shouldRetry = await onTimeout(message, status.retryCount);

      if (shouldRetry && status.retryCount < message.ack.retry) {
        // 重置超时
        status.timeoutAt = Date.now() + message.ack.timeout;
        this.scheduleTimeout(message, onTimeout);
      } else {
        // 放弃重试
        this.pending.delete(message.id);
      }
    }, message.ack.timeout);

    this.timers.set(message.id, timer);
  }

  /**
   * 清除超时定时器
   */
  private clearTimeout(messageId: string): void {
    const timer = this.timers.get(messageId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(messageId);
    }
  }

  /**
   * 获取状态
   */
  getStatus(messageId: string): ACKStatus | undefined {
    return this.pending.get(messageId);
  }

  /**
   * 获取所有待确认消息
   */
  getPending(): ACKStatus[] {
    return Array.from(this.pending.values());
  }

  /**
   * 清理
   */
  destroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.pending.clear();
    this.timers.clear();
  }
}

/**
 * MessageBus - 基于 EventEmitter 的消息总线
 */

import { EventEmitter } from 'events';
import type { Message, MessageHandler, MessageOptions } from './types.js';
import type {
  IMessageBus,
  SendOptions,
  MessageBusStats,
  HealthStatus,
} from '../core/IMessageBus.js';
import { ACKTracker } from './ACKTracker.js';

export type BusEvent = 'message' | 'error' | 'sent';

export interface MessageBusOptions {
  maxRetries?: number;
  defaultTimeout?: number;
}

export class MessageBus extends EventEmitter implements IMessageBus {
  private handlers = new Map<string, Set<MessageHandler>>();
  private pendingMessages = new Map<string, Promise<Message | null>>();
  private options: Required<MessageBusOptions>;
  private ackTracker: ACKTracker;
  private started = true; // 默认启动，向后兼容
  // 统计计数器
  private stats: MessageBusStats = {
    messagesSent: 0,
    messagesReceived: 0,
    messagesProcessing: 0,
    errors: 0,
  };

  constructor(options: MessageBusOptions = {}) {
    super();
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      defaultTimeout: options.defaultTimeout ?? 30000,
    };
    this.ackTracker = new ACKTracker();
    this.setMaxListeners(1000);
  }

  /**
   * 订阅特定 Agent 的消息
   */
  subscribe(agentId: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(agentId)) {
      this.handlers.set(agentId, new Set());
    }
    this.handlers.get(agentId)!.add(handler);

    // 返回取消订阅函数
    return () => this.unsubscribe(agentId, handler);
  }

  /**
   * 取消订阅
   */
  unsubscribe(agentId: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(agentId);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(agentId);
      }
    }
  }

  /**
   * 发送消息
   */
  async send(message: Message, _options?: SendOptions): Promise<void> {
    if (!this.started) {
      throw new Error('MessageBus not started. Call start() first.');
    }

    // 确保 ack 属性存在（向后兼容）
    if (!message.ack) {
      message.ack = { required: false, timeout: 0, retry: 0 };
    }

    this.stats.messagesSent++;

    // 触发发送事件
    this.emit('sent', message);

    // 路由消息
    const targets = Array.isArray(message.to) ? message.to : [message.to];
    const deliveryPromises = targets.map((target) => this.deliverTo(target, message));

    // 等待所有投递完成（或超时）
    await Promise.allSettled(deliveryPromises);

    // 如果需要 ACK，等待确认
    if (message.ack.required && message.ack.timeout > 0) {
      await this.ackTracker.waitForACK(message, async (_msg, retryCount) => {
        // 重试逻辑
        if (retryCount < message.ack.retry) {
          return true; // 继续重试
        }
        return false; // 放弃重试
      });
    }
  }

  /**
   * 发送消息（兼容旧的 sendOptions API）
   *
   * 注意：此方法不等待 ACK 确认，即使配置了 required: true
   */
  async sendWithOptions(options: MessageOptions): Promise<Message> {
    // 创建返回的消息对象（保留原始 ACK 配置）
    const message: Message = {
      id: this.generateId(),
      timestamp: Date.now(),
      version: '1.0',
      from: options.from,
      to: options.to,
      sessionId: options.sessionId,
      type: options.type ?? 'request',
      payload: options.payload,
      ack: {
        required: false, // 兼容旧 API，默认不需要 ACK
        timeout: 0,
        retry: 0,
        ...options.ack,
      },
      correlationId: options.correlationId,
      replyTo: options.replyTo,
    };

    // 创建用于发送的消息副本（禁用 ACK 等待）
    const messageForSending: Message = {
      ...message,
      ack: { required: false, timeout: 0, retry: 0 },
    };

    await this.send(messageForSending);
    return message;
  }

  /**
   * 发送并等待响应
   */
  async sendAndWait(options: MessageOptions, timeout?: number): Promise<Message | null> {
    const message = await this.sendWithOptions(options);

    // 等待响应
    const correlationId = message.id;
    const responsePromise = new Promise<Message | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), timeout ?? this.options.defaultTimeout);

      const handler = (msg: Message) => {
        if (msg.correlationId === correlationId && msg.type === 'response') {
          this.off('message', handler);
          clearTimeout(timer);
          resolve(msg);
        }
      };

      this.on('message', handler);
    });

    return responsePromise;
  }

  /**
   * 投递消息到特定 Agent
   */
  private async deliverTo(agentId: string, message: Message): Promise<void> {
    // 收集所有要调用的处理器
    const allHandlers: MessageHandler[] = [];

    // 1. 添加精确匹配的处理器
    const exactHandlers = this.handlers.get(agentId);
    if (exactHandlers) {
      allHandlers.push(...Array.from(exactHandlers));
    }

    // 2. 添加通配符处理器（'*'）
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      allHandlers.push(...Array.from(wildcardHandlers));
    }

    if (allHandlers.length === 0) {
      this.emit('error', { message, error: new Error(`No handlers for agent: ${agentId}`) });
      return;
    }

    // 并发调用所有处理器
    const promises = allHandlers.map((handler) => this.safeExecute(agentId, handler, message));

    await Promise.allSettled(promises);
  }

  /**
   * 安全执行处理器，捕获异常
   */
  private async safeExecute(
    agentId: string,
    handler: MessageHandler,
    message: Message
  ): Promise<void> {
    this.stats.messagesProcessing++;
    try {
      await handler(message);
      this.stats.messagesReceived++;
      this.emit('message', { agentId, message });
    } catch (error) {
      this.stats.errors++;
      this.emit('error', { agentId, message, error });
    } finally {
      this.stats.messagesProcessing--;
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 获取当前订阅者数量
   */
  getSubscriberCount(agentId?: string): number {
    if (agentId) {
      return this.handlers.get(agentId)?.size ?? 0;
    }
    return Array.from(this.handlers.values()).reduce((sum, set) => sum + set.size, 0);
  }

  /**
   * 启动消息总线
   */
  async start(): Promise<void> {
    // 允许重新启动（在 stop 之后）
    this.started = true;
  }

  /**
   * 停止消息总线
   */
  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }
    this.started = false;
    this.ackTracker.destroy();
    this.handlers.clear();
    this.pendingMessages.clear();
    this.removeAllListeners();
  }

  /**
   * 健康检查
   */
  async health(): Promise<HealthStatus> {
    if (!this.started) {
      return { status: 'unhealthy', details: { reason: 'Not started' } };
    }

    const errorRate = this.stats.messagesSent > 0 ? this.stats.errors / this.stats.messagesSent : 0;

    if (errorRate > 0.1) {
      return { status: 'degraded', details: { errorRate } };
    }

    return {
      status: 'healthy',
      details: {
        subscribers: this.getSubscriberCount(),
        errorRate,
      },
    };
  }

  /**
   * 获取统计信息
   */
  getStats(): MessageBusStats {
    return { ...this.stats };
  }

  /**
   * 确认收到消息（供外部调用）
   */
  confirmACK(messageId: string, recipient: string): void {
    this.ackTracker.confirm(messageId, recipient);
  }

  /**
   * 清理（兼容旧 API）
   */
  destroy(): void {
    this.stop();
  }
}

/**
 * MessageBus - 基于 EventEmitter 的消息总线
 */

import { EventEmitter } from 'events';
import type { Message, MessageHandler, MessageOptions } from './types.js';

export type BusEvent = 'message' | 'error' | 'sent';

export interface MessageBusOptions {
  maxRetries?: number;
  defaultTimeout?: number;
}

export class MessageBus extends EventEmitter {
  private handlers = new Map<string, Set<MessageHandler>>();
  private pendingMessages = new Map<string, Promise<Message | null>>();
  private options: Required<MessageBusOptions>;

  constructor(options: MessageBusOptions = {}) {
    super();
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      defaultTimeout: options.defaultTimeout ?? 30000,
    };
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
  async send(options: MessageOptions): Promise<Message> {
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
        required: true,
        timeout: this.options.defaultTimeout,
        retry: this.options.maxRetries,
        ...options.ack,
      },
      correlationId: options.correlationId,
      replyTo: options.replyTo,
    };

    // 触发发送事件
    this.emit('sent', message);

    // 路由消息
    const targets = Array.isArray(message.to) ? message.to : [message.to];
    const deliveryPromises = targets.map((target) => this.deliverTo(target, message));

    // 等待所有投递完成（或超时）
    await Promise.allSettled(deliveryPromises);

    return message;
  }

  /**
   * 发送并等待响应
   */
  async sendAndWait(options: MessageOptions, timeout?: number): Promise<Message | null> {
    const message = await this.send(options);

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
    const handlers = this.handlers.get(agentId);

    if (!handlers || handlers.size === 0) {
      this.emit('error', { message, error: new Error(`No handlers for agent: ${agentId}`) });
      return;
    }

    // 并发调用所有处理器
    const promises = Array.from(handlers).map((handler) =>
      this.safeExecute(agentId, handler, message)
    );

    await Promise.allSettled(promises);
  }

  /**
   * 安全执行处理器，捕获异常
   */
  private async safeExecute(agentId: string, handler: MessageHandler, message: Message): Promise<void> {
    try {
      await handler(message);
      this.emit('message', { agentId, message });
    } catch (error) {
      this.emit('error', { agentId, message, error });
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
   * 清理
   */
  destroy(): void {
    this.handlers.clear();
    this.pendingMessages.clear();
    this.removeAllListeners();
  }
}

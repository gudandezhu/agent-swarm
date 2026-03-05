/**
 * MessageRouter - 基于 `to` 字段的消息路由
 */

import type { Message } from './types.js';
import type { MessageBus } from './MessageBus.js';

export interface RouteRule {
  pattern: string | RegExp | string[];
  handler: (message: Message) => Promise<void>;
}

export class MessageRouter {
  private rules: RouteRule[] = [];

  constructor(private bus: MessageBus) {
    // 监听所有消息进行路由
    this.bus.on('message', ({ message }) => this.route(message));
  }

  /**
   * 添加路由规则
   */
  add(pattern: string | RegExp | string[], handler: (message: Message) => Promise<void>): void {
    this.rules.push({ pattern, handler });
  }

  /**
   * 路由消息
   */
  private async route({ message }: { message: Message }): Promise<void> {
    const targets = Array.isArray(message.to) ? message.to : [message.to];

    for (const target of targets) {
      for (const rule of this.rules) {
        if (this.match(target, rule.pattern)) {
          await rule.handler(message).catch((error) => {
            this.bus.emit('error', { message, error: error as Error });
          });
        }
      }
    }
  }

  /**
   * 匹配目标
   */
  private match(target: string, pattern: string | RegExp | string[]): boolean {
    if (typeof pattern === 'string') {
      return target === pattern;
    }
    if (pattern instanceof RegExp) {
      return pattern.test(target);
    }
    if (Array.isArray(pattern)) {
      return pattern.includes(target);
    }
    return false;
  }

  /**
   * 清理规则
   */
  clear(): void {
    this.rules = [];
  }
}

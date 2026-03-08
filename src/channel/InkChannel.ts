/**
 * InkChannel - 基于 ink 的 TUI Channel（使用 React）
 */

import { render } from 'ink';
import React from 'react';
import { BaseChannel } from './BaseChannel.js';
import type { IncomingMessage, OutgoingMessage } from './types.js';
import App from '../tui/components/App.js';
import { messageBridge } from '../tui/MessageBridge.js';

interface InkChannelOptions {
  sessionId?: string;
}

export default class InkChannel extends BaseChannel {
  readonly id = 'ink-tui';
  readonly name = 'Ink TUI (Terminal User Interface)';

  private renderInstance: ReturnType<typeof render> | null = null;
  private sessionId: string;
  private currentMessageHandler: ((message: string) => void) | null = null;

  constructor(options: InkChannelOptions = {}) {
    super();
    this.sessionId = options.sessionId || `ink-${Date.now()}`;
  }

  async start(): Promise<void> {
    if (this.started) return;

    try {
      // 设置消息处理器
      this.currentMessageHandler = this.handleIncomingMessage.bind(this);

      // 渲染 ink 应用
      this.renderInstance = render(
        React.createElement(App, {
          initialAgent: 'assistant',
          sessionId: this.sessionId,
          onMessage: (input: string) => {
            if (this.currentMessageHandler) {
              this.currentMessageHandler(input);
            }
          },
          onExit: this.handleExit.bind(this),
        })
      );

      this.started = true;
    } catch (error) {
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.started) return;

    try {
      if (this.renderInstance) {
        this.renderInstance.unmount();
        this.renderInstance = null;
      }

      // 清理消息处理器引用
      this.currentMessageHandler = null;

      this.started = false;
    } catch (error) {}
  }

  async send(message: OutgoingMessage): Promise<void> {
    if (!this.started) {
      console.log(`[${message.userId}]: ${message.content}`);
      return;
    }

    // 通过 MessageBridge 发送消息到 React 组件
    const content =
      typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

    messageBridge.sendMessage({
      role: 'assistant',
      content,
      timestamp: Date.now(),
    });
  }

  private async handleIncomingMessage(input: string): Promise<void> {
    // 构造 IncomingMessage
    const incomingMessage: IncomingMessage = {
      channelId: this.id,
      userId: 'tui-user',
      conversationId: this.sessionId,
      content: input,
    };

    // 调用消息处理器
    for (const handler of this.messageHandlers) {
      try {
        await handler(incomingMessage);
      } catch (error) {
        console.error(`[${this.id}] Error handling message:`, error);
      }
    }
  }

  private handleExit(): void {
    this.stop()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

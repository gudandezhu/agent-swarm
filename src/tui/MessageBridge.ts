/**
 * MessageBridge - 消息桥接器
 *
 * 用于在 InkChannel 和 React 组件之间传递消息
 */

import { EventEmitter } from 'events';

interface BridgeMessage {
  role: 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export class MessageBridge extends EventEmitter {
  /**
   * 发送消息到 React 组件
   */
  sendMessage(message: BridgeMessage): void {
    this.emit('message', message);
  }

  /**
   * 监听消息
   */
  onMessage(callback: (message: BridgeMessage) => void): void {
    this.on('message', callback);
  }

  /**
   * 移除监听器
   */
  removeMessageListener(callback: (message: BridgeMessage) => void): void {
    this.off('message', callback);
  }
}

// 单例实例
export const messageBridge = new MessageBridge();

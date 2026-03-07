/**
 * ChatArea - 聊天区域组件
 */

import type { Component } from '@mariozechner/pi-tui';
import type { ChatMessage } from '../CLIChannelTUI.js';

/**
 * ChatArea 组件 - 显示聊天历史
 */
export class ChatArea implements Component {
  private messages: ChatMessage[] = [];
  private scrollOffset = 0;
  private maxVisible = 20;
  private _invalidated = true;

  /**
   * 添加消息
   */
  addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this._invalidated = true;
  }

  /**
   * 清空消息
   */
  clear(): void {
    this.messages = [];
    this.scrollOffset = 0;
    this._invalidated = true;
  }

  /**
   * 向上滚动查看历史消息
   */
  scrollUp(): void {
    if (this.scrollOffset < this.messages.length - this.maxVisible) {
      this.scrollOffset++;
      this._invalidated = true;
    }
  }

  /**
   * 向下滚动回到最新消息
   */
  scrollDown(): void {
    if (this.scrollOffset > 0) {
      this.scrollOffset--;
      this._invalidated = true;
    }
  }

  /**
   * 标记需要重新渲染
   */
  invalidate(): void {
    this._invalidated = true;
  }

  /**
   * 获取失效状态
   */
  get invalidated(): boolean {
    return this._invalidated;
  }

  /**
   * 格式化时间戳为 HH:MM 格式
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /**
   * 截断过长的内容
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * 渲染单条消息
   */
  private renderMessage(message: ChatMessage, width: number): string {
    const time = this.formatTime(message.timestamp);
    const prefix = message.role === 'user' ? '你: ' : `${message.userId}: `;

    // 计算可用内容宽度（时间 + 前缀 + 空格）
    const timeWidth = 5; // HH:MM + 空格
    const prefixWidth = prefix.length;
    const availableWidth = width - timeWidth - prefixWidth - 1;

    const content = this.truncateContent(message.content, Math.max(10, availableWidth));

    return `${time} ${prefix}${content}`;
  }

  /**
   * 渲染聊天区域
   */
  render(width: number): string[] {
    if (!this._invalidated && this.messages.length > 0) {
      // 缓存渲染结果（可选优化）
    }

    const lines: string[] = [];

    if (this.messages.length === 0) {
      this._invalidated = false;
      return lines;
    }

    // 计算可见消息范围
    const totalMessages = this.messages.length;
    const visibleCount = Math.min(this.maxVisible, totalMessages);

    // scrollOffset = 0 显示最后 visibleCount 条消息
    // scrollOffset > 0 向上滚动显示更早的消息
    const startIndex = Math.max(0, totalMessages - visibleCount - this.scrollOffset);
    const endIndex = Math.min(totalMessages, startIndex + visibleCount);

    for (let i = startIndex; i < endIndex; i++) {
      const msg = this.messages[i];
      lines.push(this.renderMessage(msg, width));
    }

    this._invalidated = false;
    return lines;
  }
}

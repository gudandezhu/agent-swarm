/**
 * StatusLine - 状态栏组件
 */

import type { Component } from '@mariozechner/pi-tui';

/**
 * StatusLine 组件 - 显示状态信息
 */
export class StatusLine implements Component {
  private thinking = false;
  private statusText = '';
  private _invalidated = false;

  /**
   * 设置思考状态
   */
  setThinking(thinking: boolean): void {
    this.thinking = thinking;
    this.statusText = thinking ? '▶ 正在思考...' : '';
    this._invalidated = true;
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
   * 渲染状态栏
   */
  render(_width: number): string[] {
    if (!this.thinking) {
      return [];
    }

    const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴'];
    const spinner = spinners[Math.floor(Date.now() / 100) % spinners.length];

    return [`${spinner} ${this.statusText}`];
  }
}

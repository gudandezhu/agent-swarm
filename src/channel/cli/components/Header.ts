/**
 * Header - TUI 顶部标题栏
 */

import type { Component } from '@mariozechner/pi-tui';

/**
 * Header 组件 - 显示标题和状态
 */
export class Header implements Component {
  private workspacePath: string;
  private version: string;
  private _invalidated = false;

  constructor(workspacePath: string, version = 'v0.1.0') {
    this.workspacePath = workspacePath;
    this.version = version;
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
   * 渲染 Header
   */
  render(width: number): string[] {
    const lines: string[] = [];

    // 标题行
    const title = `🤖 Agent Swarm ${this.version}`;
    const padding = Math.max(0, width - title.length - this.workspacePath.length - 4);
    lines.push(`${title}${' '.repeat(padding)}${this.workspacePath}`);

    return lines;
  }
}

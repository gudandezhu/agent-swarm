/**
 * ContextManager - 会话上下文管理
 *
 * 管理 Session 的 context.md 文件和内存上下文
 */

import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * context.md 默认模板
 */
const DEFAULT_CONTEXT_TEMPLATE = `# Session Context

## 参与者
<!-- Agent 列表会自动更新 -->

## 当前状态
- 阶段: 初始化

## 共享变量
<!-- 会话级共享变量 -->
`;

export class ContextManager {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * 获取 Session 目录路径
   */
  private getSessionPath(sessionId: string): string {
    return join(this.basePath, sessionId);
  }

  /**
   * 获取 context.md 路径
   */
  private getContextPath(sessionId: string): string {
    return join(this.getSessionPath(sessionId), 'context.md');
  }

  /**
   * 加载 context.md 内容
   */
  async load(sessionId: string): Promise<string> {
    const contextPath = this.getContextPath(sessionId);
    try {
      return await fs.readFile(contextPath, 'utf-8');
    } catch {
      return DEFAULT_CONTEXT_TEMPLATE;
    }
  }

  /**
   * 保存 context.md 内容
   */
  async save(sessionId: string, content: string): Promise<void> {
    const contextPath = this.getContextPath(sessionId);
    await fs.mkdir(this.getSessionPath(sessionId), { recursive: true });
    await fs.writeFile(contextPath, content, 'utf-8');
  }

  /**
   * 创建默认 context.md
   */
  async createDefault(sessionId: string): Promise<void> {
    await this.save(sessionId, DEFAULT_CONTEXT_TEMPLATE);
  }

  /**
   * 删除 context.md
   */
  async delete(sessionId: string): Promise<void> {
    const contextPath = this.getContextPath(sessionId);
    try {
      await fs.rm(contextPath, { force: true });
    } catch {
      // 文件不存在，忽略
    }
  }

  /**
   * 获取默认模板
   */
  getDefaultTemplate(): string {
    return DEFAULT_CONTEXT_TEMPLATE;
  }
}

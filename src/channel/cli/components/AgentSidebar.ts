/**
 * AgentSidebar - Agent 列表侧边栏
 */

import type { Component } from '@mariozechner/pi-tui';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface AgentInfo {
  id: string;
  name?: string;
  description?: string;
  valid?: boolean;
  error?: string;
}

/**
 * AgentSidebar 组件 - 显示 Agent 列表
 */
export class AgentSidebar implements Component {
  private agents: AgentInfo[] = [];
  private currentAgentId?: string;
  private agentsPath: string;
  private _invalidated = false;
  private loaded = false;

  constructor(agentsPath: string, currentAgent?: string) {
    this.agentsPath = agentsPath;
    this.currentAgentId = currentAgent;
    // 异步加载 Agents
    this.loadAgents().catch((error) => {
      console.error('Failed to load agents:', error);
    });
  }

  /**
   * 加载 Agent 列表
   */
  private async loadAgents(): Promise<void> {
    try {
      const entries = await fs.readdir(this.agentsPath, { withFileTypes: true });
      const loadedAgents: AgentInfo[] = [];

      for (const entry of entries) {
        // 跳过隐藏文件和非目录
        if (!entry.isDirectory() || entry.name.startsWith('.')) {
          continue;
        }

        const agentPath = join(this.agentsPath, entry.name);
        const agentInfo = await this.readAgentInfo(entry.name, agentPath);
        loadedAgents.push(agentInfo);
      }

      this.agents = loadedAgents;
      this.loaded = true;
      this._invalidated = true;
    } catch {
      // 目录不存在或无法读取
      this.agents = [];
      this.loaded = true;
      this._invalidated = true;
    }
  }

  /**
   * 读取 Agent 信息
   */
  private async readAgentInfo(id: string, agentPath: string): Promise<AgentInfo> {
    const configPath = join(agentPath, 'config.json');

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      return {
        id,
        name: config.name as string | undefined,
        description: config.description as string | undefined,
        valid: true,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          id,
          name: id,
          valid: false,
          error: '配置文件格式错误',
        };
      }
      return {
        id,
        name: id,
        valid: false,
        error: '无法读取配置文件',
      };
    }
  }

  /**
   * 设置当前 Agent
   */
  setCurrentAgent(agentId: string): void {
    this.currentAgentId = agentId;
    this._invalidated = true;
  }

  /**
   * 获取 Agent 列表
   */
  getAgents(): AgentInfo[] {
    return this.agents;
  }

  /**
   * 检查是否已加载完成
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * 获取失效状态
   */
  get invalidated(): boolean {
    return this._invalidated;
  }

  /**
   * 标记需要重新渲染
   */
  invalidate(): void {
    this._invalidated = true;
  }

  /**
   * 渲染 Sidebar
   */
  render(_width: number): string[] {
    const lines: string[] = [];

    // 标题
    lines.push('Agents');

    // 空行
    lines.push('');

    // Agent 列表
    for (const agent of this.agents) {
      const isSelected = agent.id === this.currentAgentId;
      const icon = isSelected ? '■' : '□';
      lines.push(` ${icon} ${agent.id}`);
    }

    // 空行
    lines.push('');
    lines.push('Alt+A');
    lines.push('切换');

    this._invalidated = false;
    return lines;
  }
}

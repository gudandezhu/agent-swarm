/**
 * AgentManager - 多 Agent 生命周期管理
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentConfig, AgentState } from './types.js';
import type { Message } from '../message/types.js';

export interface AgentManagerOptions {
  agentsPath?: string;
  apiKey?: string;
}

export class AgentManager {
  private configs = new Map<string, AgentConfig>();
  private states = new Map<string, AgentState>();
  private agentsPath: string;
  private anthropic: Anthropic;

  constructor(options: AgentManagerOptions = {}) {
    this.agentsPath = options.agentsPath ?? join(process.cwd(), 'agents');
    this.anthropic = new Anthropic({
      apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
    });
  }

  async get(agentId: string): Promise<Anthropic> {
    this.updateState(agentId);

    if (!this.configs.has(agentId)) {
      const config = await this.loadConfig(agentId);
      if (!config) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      this.configs.set(agentId, config);
      this.states.set(agentId, {
        id: agentId,
        config,
        lastUsedAt: Date.now(),
      });
    }

    return this.anthropic;
  }

  async process(agentId: string, message: Message): Promise<string> {
    if (!this.configs.has(agentId)) {
      await this.get(agentId);
    }

    const agentConfig = this.configs.get(agentId);
    if (!agentConfig) {
      throw new Error(`Agent config not found: ${agentId}`);
    }

    const systemPrompt = await this.buildSystemPrompt(agentId);
    const userPrompt = await this.buildUserPrompt(message.payload.data);

    const response = await this.anthropic.messages.create({
      model: agentConfig.model.id,
      max_tokens: agentConfig.maxTokens ?? 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n');

    return content;
  }

  async exists(agentId: string): Promise<boolean> {
    const configPath = join(this.agentsPath, agentId, 'config.json');
    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<AgentConfig[]> {
    const entries = await fs.readdir(this.agentsPath, { withFileTypes: true });
    const agents: AgentConfig[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const config = await this.loadConfig(entry.name);
        if (config) {
          agents.push(config);
        }
      }
    }

    return agents;
  }

  async reload(agentId: string): Promise<void> {
    this.configs.delete(agentId);
    this.states.delete(agentId);
    await this.get(agentId);
  }

  private async loadConfig(agentId: string): Promise<AgentConfig | null> {
    const configPath = join(this.agentsPath, agentId, 'config.json');

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as AgentConfig;
      this.configs.set(agentId, config);
      return config;
    } catch {
      return null;
    }
  }

  private async loadPrompt(agentId: string): Promise<string> {
    const promptPath = join(this.agentsPath, agentId, 'prompt.md');

    try {
      return await fs.readFile(promptPath, 'utf-8');
    } catch {
      return '你是一个有用的助手。';
    }
  }

  private async loadMemory(agentId: string): Promise<string> {
    const memoryPath = join(this.agentsPath, agentId, 'MEMORY.md');

    try {
      return await fs.readFile(memoryPath, 'utf-8');
    } catch {
      return '';
    }
  }

  private async buildSystemPrompt(agentId: string): Promise<string> {
    const prompt = await this.loadPrompt(agentId);
    const memory = await this.loadMemory(agentId);

    return `${prompt}

${memory ? `# 记忆\n${memory}` : ''}`;
  }

  private async buildUserPrompt(data?: unknown): Promise<string> {
    if (typeof data === 'string') {
      return data;
    }
    if (data) {
      return JSON.stringify(data);
    }
    return '';
  }

  private updateState(agentId: string): void {
    const state = this.states.get(agentId);
    if (state) {
      state.lastUsedAt = Date.now();
    }
  }

  getState(agentId: string): AgentState | undefined {
    return this.states.get(agentId);
  }

  async destroy(): Promise<void> {
    this.configs.clear();
    this.states.clear();
  }
}

/**
 * AgentManager - 多 Agent 生命周期管理（懒加载 + 空闲清理）
 *
 * 设计原则：
 * 1. 懒加载：收到消息时才启动 Agent
 * 2. 待机保持：Agent 启动后保持待机，可处理后续消息
 * 3. 空闲清理：长时间无活动的 Agent 可被卸载
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { Agent } from '@mariozechner/pi-agent-core';
import { getModel } from '@mariozechner/pi-ai';
import type { AgentConfig, AgentState, AgentCapability } from './types.js';
import type { Message } from '../message/types.js';
import { SkillLoader } from './skills.js';
import { getConfigLoader } from '../config.js';

/**
 * Mock 响应生成器类型
 */
export type MockResponseGenerator = (message: Message) => Promise<string> | string;

export interface AgentManagerOptions {
  agentsPath?: string;
  apiKey?: string;
  /**
   * Mock 响应生成器，用于测试时替代真实 LLM 调用
   */
  mockResponse?: MockResponseGenerator;
  /**
   * 空闲超时时间（毫秒），超过此时间的 Agent 将被卸载
   * 默认 30 分钟
   */
  idleTimeout?: number;
  /**
   * 清理检查间隔（毫秒）
   * 默认 5 分钟
   */
  cleanupInterval?: number;
}

const DEFAULT_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 分钟
const DEFAULT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 分钟

export class AgentManager {
  private configs = new Map<string, AgentConfig>();
  private agents = new Map<string, Agent>();
  private states = new Map<string, AgentState>();
  private skillsLoaders = new Map<string, SkillLoader>();
  private agentsPath: string;
  private mockResponse?: MockResponseGenerator;
  private idleTimeout: number;
  private cleanupInterval: number;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(options: AgentManagerOptions = {}) {
    this.agentsPath = options.agentsPath ?? join(process.cwd(), 'agents');
    this.mockResponse = options.mockResponse;
    this.idleTimeout = options.idleTimeout ?? DEFAULT_IDLE_TIMEOUT;
    this.cleanupInterval = options.cleanupInterval ?? DEFAULT_CLEANUP_INTERVAL;
  }

  /**
   * 启动清理定时器
   */
  startCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleAgents().catch((err) => {
        console.error('Failed to cleanup idle agents:', err);
      });
    }, this.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 清理空闲 Agent
   */
  private async cleanupIdleAgents(): Promise<string[]> {
    const now = Date.now();
    const toUnload: string[] = [];

    for (const [agentId, state] of Array.from(this.states.entries())) {
      if (now - state.lastUsedAt > this.idleTimeout) {
        toUnload.push(agentId);
      }
    }

    for (const agentId of toUnload) {
      await this.unload(agentId);
    }

    return toUnload;
  }

  /**
   * 获取或创建 Agent 实例（懒加载）
   */
  async get(agentId: string): Promise<Agent> {
    // 更新状态
    const state = this.states.get(agentId);
    if (state) {
      state.lastUsedAt = Date.now();
    }

    if (!this.agents.has(agentId)) {
      await this.spawn(agentId);
    }

    return this.agents.get(agentId)!;
  }

  /**
   * 启动 Agent
   */
  private async spawn(agentId: string): Promise<void> {
    const config = await this.loadConfig(agentId);
    if (!config) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // 验证 API 密钥是否可用（按优先级：Agent 专�� > 全局配置 > 环境变量）
    const configLoader = getConfigLoader();
    const apiKeyResult = await configLoader.getApiKey(config.model.provider, config.model.apiKey);

    if (!apiKeyResult) {
      throw new Error(
        `API key not found for provider "${config.model.provider}". ` +
          `Please set environment variable ${config.model.provider.toUpperCase()}_API_KEY, ` +
          `or add it to ~/.agent-swarm/agent-swarm.json, ` +
          `or configure it in the agent's config.json`
      );
    }

    console.log(
      `[AgentManager] API key available for ${config.model.provider} from: ${apiKeyResult.source}`
    );

    // 创建 SkillLoader
    const skillsPath = join(this.agentsPath, agentId, 'skills');
    const skillsLoader = new SkillLoader(skillsPath);
    this.skillsLoaders.set(agentId, skillsLoader);

    // 加载 skills metadata
    const skills = await skillsLoader.getMetadata();

    // 构建 system prompt（注入 skills）
    const systemPrompt = await this.buildSystemPrompt(agentId, skills);

    // 创建 pi-mono Agent
    const agent = new Agent({
      initialState: {
        systemPrompt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: getModel(config.model.provider as any, config.model.id as any),
        thinkingLevel: 'off',
        tools: [],
        messages: [],
        isStreaming: false,
        streamMessage: null,
        pendingToolCalls: new Set(),
      },
      // 每次调用 LLM 时动态获取 API 密钥
      getApiKey: async () => {
        const result = await getConfigLoader().getApiKey(
          config.model.provider,
          config.model.apiKey
        );
        return result?.key;
      },
    });

    this.agents.set(agentId, agent);
    this.configs.set(agentId, config);
    this.states.set(agentId, {
      id: agentId,
      config,
      lastUsedAt: Date.now(),
    });
  }

  /**
   * 卸载 Agent
   */
  async unload(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // 中止当前操作
    agent.abort();

    // 清理资源
    this.agents.delete(agentId);
    this.configs.delete(agentId);
    this.states.delete(agentId);
    this.skillsLoaders.delete(agentId);

    return true;
  }

  /**
   * 处理消息
   */
  async process(agentId: string, message: Message): Promise<string> {
    // 如果设置了 mockResponse，直接返回 mock 响应
    if (this.mockResponse) {
      return this.mockResponse(message);
    }

    const agent = await this.get(agentId);

    // 订阅事件收集响应
    let response = '';
    const unsubscribe = agent.subscribe((event) => {
      if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
        response += event.assistantMessageEvent.delta;
      }
    });

    try {
      // 发送 prompt
      const userPrompt = await this.buildUserPrompt(message.payload.data);
      await agent.prompt(userPrompt);

      // 等待完成
      await agent.waitForIdle();

      return response;
    } finally {
      unsubscribe();
    }
  }

  /**
   * 检查 agent 是否存在
   */
  async exists(agentId: string): Promise<boolean> {
    const configPath = join(this.agentsPath, agentId, 'config.json');
    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查 agent 是否已加载
   */
  isLoaded(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * 列出所有 agents（从文件系统）
   */
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

  /**
   * 列出已加载的 agents
   */
  listLoaded(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * 重载 agent
   */
  async reload(agentId: string): Promise<void> {
    await this.unload(agentId);
    await this.get(agentId);
  }

  /**
   * 加载配置
   */
  private async loadConfig(agentId: string): Promise<AgentConfig | null> {
    const configPath = join(this.agentsPath, agentId, 'config.json');

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content) as AgentConfig;
    } catch {
      return null;
    }
  }

  /**
   * 加载 prompt
   */
  private async loadPrompt(agentId: string): Promise<string> {
    const promptPath = join(this.agentsPath, agentId, 'prompt.md');

    try {
      return await fs.readFile(promptPath, 'utf-8');
    } catch {
      return '你是一个有用的助手。';
    }
  }

  /**
   * 加载记忆
   */
  private async loadMemory(agentId: string): Promise<string> {
    const memoryPath = join(this.agentsPath, agentId, 'MEMORY.md');

    try {
      return await fs.readFile(memoryPath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * 构建 system prompt（注入 skills）
   */
  private async buildSystemPrompt(
    agentId: string,
    skills: Array<{ name: string; description: string }>
  ): Promise<string> {
    const prompt = await this.loadPrompt(agentId);
    const memory = await this.loadMemory(agentId);

    let systemPrompt = prompt;

    // 注入 skills
    if (skills.length > 0) {
      const skillsText = skills.map((s) => `- **${s.name}**: ${s.description}`).join('\n');
      systemPrompt += `\n\n## Available Skills\n\n${skillsText}\n`;
    }

    // 注入记忆
    if (memory) {
      systemPrompt += `\n\n# 记忆\n${memory}`;
    }

    return systemPrompt;
  }

  /**
   * 构建 user prompt
   */
  private async buildUserPrompt(data?: unknown): Promise<string> {
    if (typeof data === 'string') {
      return data;
    }
    if (data) {
      return JSON.stringify(data);
    }
    return '';
  }

  /**
   * 获取状态
   */
  getState(agentId: string): AgentState | undefined {
    return this.states.get(agentId);
  }

  /**
   * 获取单个 Agent 的能力
   */
  async getCapabilities(agentId: string): Promise<AgentCapability | null> {
    const config = await this.loadConfig(agentId);
    if (!config) {
      return null;
    }

    // 确保 Agent 已加载（这会创建 SkillLoader）
    if (!this.agents.has(agentId)) {
      await this.get(agentId);
    }

    // 获取 skills
    const skillsLoader = this.skillsLoaders.get(agentId);
    const skills = skillsLoader ? await skillsLoader.getMetadata() : [];

    return {
      agentId: config.id,
      name: config.name,
      description: config.description,
      skills: skills.map((s) => ({ name: s.name, description: s.description })),
    };
  }

  /**
   * 列出所有 Agent 的能力
   */
  async listCapabilities(): Promise<AgentCapability[]> {
    const configs = await this.list();
    const capabilities: AgentCapability[] = [];

    for (const config of configs) {
      // 确保 Agent 已加载（这会创建 SkillLoader）
      if (!this.agents.has(config.id)) {
        await this.get(config.id);
      }

      const skillsLoader = this.skillsLoaders.get(config.id);
      const skills = skillsLoader ? await skillsLoader.getMetadata() : [];

      capabilities.push({
        agentId: config.id,
        name: config.name,
        description: config.description,
        skills: skills.map((s) => ({ name: s.name, description: s.description })),
      });
    }

    return capabilities;
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    // 停止清理定时器
    this.stopCleanup();

    // 卸载所有 Agent
    for (const agent of Array.from(this.agents.values())) {
      agent.abort();
    }
    this.agents.clear();
    this.configs.clear();
    this.states.clear();
    this.skillsLoaders.clear();
  }
}

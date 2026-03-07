/**
 * 测试辅助工具 - CLI 测试
 *
 * 提供测试工作空间的创建、清理等辅助功能
 */

import { join } from 'path';
import { tmpdir } from 'os';
import * as FileOps from '../../../src/utils/file-ops.js';

/**
 * 测试工作空间配置
 */
export interface TestWorkspaceConfig {
  name?: string;
  withAgents?: boolean;
  agentConfigs?: Array<{ id: string; name: string; description?: string }>;
}

/**
 * 测试工作空间类
 */
export class TestWorkspace {
  private readonly workspacePath: string;
  private readonly projectSkillsPath: string;

  constructor(name?: string) {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    this.workspacePath = join(tmpdir(), `swarm-test-${name || 'workspace'}-${timestamp}-${randomSuffix}`);
    this.projectSkillsPath = join(tmpdir(), `project-skills-${timestamp}-${randomSuffix}`);
  }

  /**
   * 获取工作空间路径
   */
  getPath(): string {
    return this.workspacePath;
  }

  /**
   * 获取项目 skills 路径
   */
  getProjectSkillsPath(): string {
    return this.projectSkillsPath;
  }

  /**
   * 获取 agents 目录路径
   */
  getAgentsPath(): string {
    return join(this.workspacePath, 'agents');
  }

  /**
   * 获取特定 Agent 路径
   */
  getAgentPath(agentId: string): string {
    return join(this.getAgentsPath(), agentId);
  }

  /**
   * 初始化测试工作空间
   */
  async initialize(config: TestWorkspaceConfig = {}): Promise<void> {
    // 创建目录结构
    const directories = [
      this.workspacePath,
      join(this.workspacePath, 'agents'),
      join(this.workspacePath, 'sessions'),
      join(this.workspacePath, 'memory'),
      join(this.workspacePath, '.claude'),
      join(this.workspacePath, '.claude', 'skills'),
      this.projectSkillsPath,
    ];

    for (const dir of directories) {
      await FileOps.ensureDir(dir);
    }

    // 创建配置文件
    const configContent = {
      version: '0.1.0',
      initializedAt: new Date().toISOString(),
      apiKeys: {
        anthropic: 'sk-test-key-for-testing',
        openai: '',
      },
      workspace: this.workspacePath,
      logLevel: 'info',
    };
    await FileOps.writeJSON(join(this.workspacePath, 'config.json'), configContent);

    // 创建 skills 文件
    const skills = ['create-agent.md', 'configure-agent.md', 'add-channel.md'];
    for (const skill of skills) {
      await FileOps.writeFile(
        join(this.workspacePath, '.claude', 'skills', skill),
        `# ${skill}\n\n这是 ${skill} 的内容。`
      );
    }

    // 创建测试 Agents
    if (config.withAgents && config.agentConfigs) {
      for (const agentConfig of config.agentConfigs) {
        await this.createAgent(agentConfig.id, agentConfig.name, agentConfig.description);
      }
    }
  }

  /**
   * 创建测试 Agent
   */
  async createAgent(id: string, name: string, description?: string): Promise<void> {
    const agentPath = this.getAgentPath(id);
    await FileOps.ensureDir(agentPath);

    // 创建 config.json
    const config = {
      id,
      name,
      description: description || `Agent ${name}`,
      model: 'claude-sonnet-4-6',
      channels: [],
      createdAt: new Date().toISOString(),
    };
    await FileOps.writeJSON(join(agentPath, 'config.json'), config);

    // 创建 prompt.md
    const prompt = `# ${name}

你是 ${name}。

${description ? description : `你是一个 AI Agent，名为 ${name}。`}

## 能力

- 分析问题
- 提供解决方案
- 协作完成任务

## 指南

1. 始终保持友好和专业
2. 提供准确和有用的信息
3. 在需要时寻求帮助
`;
    await FileOps.writeFile(join(agentPath, 'prompt.md'), prompt);
  }

  /**
   * 清理测试工作空间
   */
  async cleanup(): Promise<void> {
    await FileOps.removeDir(this.workspacePath);
    await FileOps.removeDir(this.projectSkillsPath);
  }

  /**
   * 检查 Agent 是否存在
   */
  async agentExists(agentId: string): Promise<boolean> {
    return await FileOps.exists(this.getAgentPath(agentId));
  }

  /**
   * 读取 Agent 配置
   */
  async readAgentConfig(agentId: string): Promise<Record<string, unknown> | null> {
    try {
      return await FileOps.readJSON(join(this.getAgentPath(agentId), 'config.json'));
    } catch {
      return null;
    }
  }

  /**
   * 读取 Agent prompt
   */
  async readAgentPrompt(agentId: string): Promise<string | null> {
    try {
      return await FileOps.readFile(join(this.getAgentPath(agentId), 'prompt.md'));
    } catch {
      return null;
    }
  }

  /**
   * 列出所有 Agents
   */
  async listAgents(): Promise<string[]> {
    try {
      const { promises: fs } = await import('fs');
      const entries = await fs.readdir(this.getAgentsPath(), { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => entry.name);
    } catch {
      return [];
    }
  }
}

/**
 * 创建临时测试工作空间
 */
export async function createTestWorkspace(config?: TestWorkspaceConfig): Promise<TestWorkspace> {
  const workspace = new TestWorkspace(config?.name);
  await workspace.initialize(config);
  return workspace;
}

/**
 * WorkspaceInitializer - 工作空间初始化器（P0 任务）
 *
 * 负责创建和初始化 Agent Swarm 用户工作空间
 * 包括目录创建、配置文件生成、skills 复制等功能
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getProjectConfigPath } from '../constants.js';

/**
 * 初始化结果
 */
export interface InitResult {
  success: boolean;
  skipped?: boolean;
  message: string;
  error?: string;
}

/**
 * 工作空间初始化器
 */
export class WorkspaceInitializer {
  private readonly workspacePath: string;
  private readonly projectSkillsPath: string;

  constructor(workspacePath?: string, projectSkillsPath?: string) {
    this.workspacePath = workspacePath ?? join(homedir(), '.agent-swarm');
    this.projectSkillsPath = projectSkillsPath ?? join(process.cwd(), '.claude', 'skills');
  }

  /**
   * 检查工作空间是否存在（检查配置文件）
   */
  async exists(): Promise<boolean> {
    try {
      const configPath = getProjectConfigPath(this.workspacePath);
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 创建目录结构
   */
  async createDirectoryStructure(): Promise<void> {
    const directories = [
      this.workspacePath,
      join(this.workspacePath, 'agents'),
      join(this.workspacePath, 'sessions'),
      join(this.workspacePath, 'memory'),
      join(this.workspacePath, '.claude'),
      join(this.workspacePath, '.claude', 'skills'),
    ];

    // 并行创建所有目录
    await Promise.all(directories.map((dir) => fs.mkdir(dir, { recursive: true })));

    // 创建 .gitkeep 文件
    const gitkeepFiles = [
      join(this.workspacePath, 'agents', '.gitkeep'),
      join(this.workspacePath, 'sessions', '.gitkeep'),
      join(this.workspacePath, 'memory', '.gitkeep'),
    ];

    // 并行创建所有 .gitkeep 文件
    await Promise.all(
      gitkeepFiles.map((file) =>
        fs.writeFile(file, '').catch(() => {
          // 忽略错误
        })
      )
    );
  }

  /**
   * 复制 skills 文件
   */
  async copySkills(): Promise<void> {
    try {
      await fs.access(this.projectSkillsPath);
    } catch {
      // 源目录不存在，跳过
      return;
    }

    const destSkillsPath = join(this.workspacePath, '.claude', 'skills');

    try {
      const files = await fs.readdir(this.projectSkillsPath);

      for (const file of files) {
        if (file.endsWith('.md')) {
          const sourcePath = join(this.projectSkillsPath, file);
          const destPath = join(destSkillsPath, file);

          try {
            const content = await fs.readFile(sourcePath, 'utf-8');
            await fs.writeFile(destPath, content);
          } catch {
            // 忽略单个文件复制失败
          }
        }
      }
    } catch {
      // 读取目录失败，跳过
    }
  }

  /**
   * 生成配置文件
   */
  async generateConfig(): Promise<void> {
    const configPath = getProjectConfigPath(this.workspacePath);

    try {
      await fs.access(configPath);
      // 文件已存在，不覆盖
      return;
    } catch {
      // 文件不存在，继续生成
    }

    const defaultConfig = {
      version: '0.1.0',
      initializedAt: new Date().toISOString(),
      apiKeys: {
        anthropic: process.env.ANTHROPIC_API_KEY || '',
        openai: process.env.OPENAI_API_KEY || '',
      },
      workspace: this.workspacePath,
      logLevel: 'info',
    };

    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  }

  /**
   * 创建默认 Agent
   */
  async createDefaultAgent(): Promise<void> {
    const agentPath = join(this.workspacePath, 'agents', 'assistant');

    try {
      await fs.access(agentPath);
      // Agent 已存在，跳过
      return;
    } catch {
      // 不存在，继续创建
    }

    await fs.mkdir(agentPath, { recursive: true });

    // 创建配置
    const config = {
      id: 'assistant',
      name: '默认助手',
      description: '我的 AI 助手',
      model: 'claude-sonnet-4-6',
      channels: [],
      createdAt: new Date().toISOString(),
    };

    await fs.writeFile(join(agentPath, 'config.json'), JSON.stringify(config, null, 2), 'utf-8');

    // 创建提示词
    const prompt = `# 默认助手

你是一个友好的 AI 助手，随时准备帮助用户。

## 能力
- 回答问题
- 提供建议
- 协助完成任务

## 行为准则
- 友好且专业
- 提供准确信息
- 如不确定，会诚实告知
`;

    await fs.writeFile(join(agentPath, 'prompt.md'), prompt, 'utf-8');
  }

  /**
   * 执行完整初始化
   */
  async initialize(): Promise<InitResult> {
    // 检查是否已存在
    if (await this.exists()) {
      return {
        success: true,
        skipped: true,
        message: `工作空间已存在: ${this.workspacePath}`,
      };
    }

    try {
      // 1. 创建目录结构
      await this.createDirectoryStructure();

      // 2. 复制 skills
      await this.copySkills();

      // 3. 生成配置
      await this.generateConfig();

      // 4. 创建默认 Agent
      await this.createDefaultAgent();

      return {
        success: true,
        message: `工作空间初始化完成: ${this.workspacePath}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `初始化失败`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 确保工作空间存在（如果不存在则初始化）
   */
  async ensure(): Promise<void> {
    if (!(await this.exists())) {
      await this.initialize();
    }
  }

  /**
   * 获取工作空间路径
   */
  getWorkspacePath(): string {
    return this.workspacePath;
  }
}

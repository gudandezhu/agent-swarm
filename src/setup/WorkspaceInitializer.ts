/**
 * WorkspaceInitializer - 工作空间初始化器（P0 任务）
 *
 * 负责创建和初始化 Agent Swarm 用户工作空间
 * 包括目录创建、配置文件生成、skills 复制等功能
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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
   * 检查工作空间是否存在
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.workspacePath);
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

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }

    // 创建 .gitkeep 文件
    const gitkeepFiles = [
      join(this.workspacePath, 'agents', '.gitkeep'),
      join(this.workspacePath, 'sessions', '.gitkeep'),
      join(this.workspacePath, 'memory', '.gitkeep'),
    ];

    for (const file of gitkeepFiles) {
      try {
        await fs.writeFile(file, '');
      } catch {
        // 忽略错误
      }
    }
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
    const configPath = join(this.workspacePath, 'config.json');

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
        anthropic: '',
        openai: '',
      },
      workspace: this.workspacePath,
      logLevel: 'info',
    };

    await fs.writeFile(
      configPath,
      JSON.stringify(defaultConfig, null, 2),
      'utf-8'
    );
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

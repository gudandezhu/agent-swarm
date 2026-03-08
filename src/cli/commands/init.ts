/**
 * swarm init 命令 - P0 任务
 *
 * 初始化 Agent Swarm 工作空间
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { WorkspaceInitializer } from '../../setup/WorkspaceInitializer.js';
import { getProjectConfigPath } from '../../constants.js';

/**
 * init 命令执行结果
 */
export interface InitCommandResult {
  success: boolean;
  created?: boolean;
  skipped?: boolean;
  message?: string;
  error?: string;
}

/**
 * init 命令选项
 */
export interface InitCommandOptions {
  force?: boolean;
  quiet?: boolean;
}

/**
 * 执行 init 命令
 */
export async function initCommand(
  workspacePath: string,
  projectSkillsPath: string,
  options: InitCommandOptions
): Promise<InitCommandResult> {
  const initializer = new WorkspaceInitializer(workspacePath, projectSkillsPath);

  // 检查是否已存在
  const exists = await initializer.exists();

  if (exists && !options.force) {
    // 验证完整性
    const configPath = getProjectConfigPath(workspacePath);
    let hasConfig = false;

    try {
      await fs.access(configPath);
      hasConfig = true;
    } catch {
      // 配置文件不存在
    }

    if (hasConfig) {
      // 工作空间完整，跳过
      return {
        success: true,
        created: false,
        skipped: true,
        message: `工作空间已存在: ${workspacePath}\n使用 --force 选项强制重新初始化`,
      };
    }
  }

  try {
    // 如果强制重新初始化，先备份
    if (exists && options.force) {
      const backupPath = workspacePath + '.backup.' + Date.now();

      try {
        await fs.rename(workspacePath, backupPath);
        if (!options.quiet) {
          console.log(`ℹ️  已备份旧工作空间到: ${backupPath}`);
        }
      } catch {
        // 备份失败，继续
      }
    }

    // 执行初始化
    const result = await initializer.initialize();

    if (!result.success) {
      return {
        success: false,
        error: result.error || result.message,
        message: `初始化失败: ${result.error || result.message}`,
      };
    }

    // 生成欢迎信息
    const message = generateWelcomeMessage(workspacePath, !exists);

    return {
      success: true,
      created: true,
      message,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: `初始化失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 生成欢迎信息
 */
function generateWelcomeMessage(workspacePath: string, isNew: boolean): string {
  const action = isNew ? '创建完成' : '更新完成';

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent Swarm 工作空间${action}！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 工作空间位置: ${workspacePath}
✓ 包含目录: agents/, sessions/, memory/, .claude/skills/

🚀 快速开始:

  1. 配置 API 密钥:
     export ANTHROPIC_API_KEY=sk-ant-...

  2. 初始化工作空间:
     swarm init

  3. 启动 Agent Swarm:
     swarm start

📚 文档: https://github.com/your-repo/agent-swarm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

/**
 * 显示 init 命令帮助
 */
export function showInitHelp(): string {
  return `
swarm init - 初始化工作空间

用法:
  swarm init [选项]

选项:
  --force, -f       强制重新初始化（会备份现有工作空间）
  --quiet, -q       静默模式，减少输出

说明:
  初始化 Agent Swarm 工作空间，创建必要的目录结构和配置文件。
  如果工作空间已存在，默认跳过初始化。使用 --force 强制重新初始化。

示例:
  swarm init              初始化工作空间
  swarm init --force      强制重新初始化
  swarm init --quiet      静默模式初始化

输出:
  工作空间目录结构:
  ${join('~/.agent-swarm', 'agents/')}        # Agent 配置
  ${join('~/.agent-swarm', 'sessions/')}      # 会话数据
  ${join('~/.agent-swarm', 'memory/')}        # 长期记忆
  ${join('~/.agent-swarm', '.claude/skills/')} # AI Native 技能
  ${join('~/.agent-swarm', 'agent-swarm.json')}     # 全局配置
  `.trim();
}

/**
 * swarm start 命令 - P0 任务
 *
 * 启动 AgentSwarm 服务
 */

import { join } from 'path';
import type { AgentSwarm } from '../../AgentSwarm.js';
import type { MockResponseGenerator } from '../../agent/AgentManager.js';
import { validateWorkspace } from '../ensureWorkspace.js';
import { getProjectConfigPath, DEFAULTS } from '../../constants.js';
// import { START_MODE_LABELS } from '../../constants/modes.js';  // 未使用，暂时注释

/**
 * start 命令执行结果
 */
export interface StartCommandResult {
  success: boolean;
  started?: boolean;
  message?: string;
  error?: string;
  warning?: string;
  service?: AgentSwarm;
  config?: Record<string, unknown>;
}

/**
 * start 命令选项
 */
export interface StartCommandOptions {
  mode?: 'tui' | 'cli' | 'non-interactive';
  mockResponse?: MockResponseGenerator;
}

/**
 * 执行 start 命令
 */
export async function startCommand(
  workspacePath: string,
  options: StartCommandOptions
): Promise<StartCommandResult> {
  // 1. 验证工作空间
  const validation = await validateWorkspace(workspacePath);

  if (!validation.valid) {
    return {
      success: false,
      error: `工作空间验证失败:\n${validation.issues.map((i) => `  - ${i}`).join('\n')}\n\n建议:\n${validation.suggestions.map((s) => `  ${s}`).join('\n')}`,
      message: `工作空间验证失败`,
    };
  }

  // 2. 检查配置文件
  const configPath = getProjectConfigPath(workspacePath);
  let config: Record<string, unknown> = {};

  try {
    const configContent = await import('fs/promises').then((fs) => fs.readFile);
    const content = await configContent(configPath, 'utf-8');
    config = JSON.parse(content);
  } catch {
    return {
      success: false,
      error: `配置文件不存在或格式错误: ${configPath}`,
      message: '配置文件加载失败',
    };
  }

  // 3. 检查 API Key
  const apiKey = (config.apiKeys as { anthropic?: string } | undefined)?.anthropic;
  const envKey = process.env.ANTHROPIC_API_KEY;
  const hasApiKey = apiKey || envKey;
  const warning: string | undefined = !hasApiKey
    ? '未配置 Anthropic API Key，请设置 apiKeys.anthropic 或 ANTHROPIC_API_KEY 环境变量'
    : undefined;

  // 如果既没有配置 API Key 也没有提供 mockResponse，则失败
  if (!hasApiKey && !options.mockResponse) {
    return {
      success: false,
      error: '未配置 Anthropic API Key',
      message: '请在 agent-swarm.json 中配置 apiKeys.anthropic 或设置 ANTHROPIC_API_KEY 环境变量',
    };
  }

  // 4. 动态导入 AgentSwarm
  let AgentSwarmModule: typeof import('../../AgentSwarm.js');
  try {
    AgentSwarmModule = await import('../../AgentSwarm.js');
  } catch (error) {
    return {
      success: false,
      error: `无法加载 AgentSwarm 模块: ${error}`,
      message: '模块加载失败',
    };
  }

  const { AgentSwarm }: { AgentSwarm: typeof AgentSwarmModule.AgentSwarm } = AgentSwarmModule;

  // 5. 准备启动选项
  const swarmOptions = {
    agentsPath: join(workspacePath, 'agents'),
    sessionsPath: join(workspacePath, 'sessions'),
    mockResponse: options.mockResponse,
    defaultAgent: (config.defaultAgent as string | undefined) ?? DEFAULTS.AGENT_ID,
    agentLoop: config.agentLoop as
      | {
          enabled?: boolean;
          interval?: number;
        }
      | undefined,
  };

  try {
    // 6. 创建 AgentSwarm 实例
    const swarm = new AgentSwarm(swarmOptions);

    // 7. 启动服务
    await swarm.start();

    // 8. 生成启动信息
    const message = generateStartMessage(workspacePath, config, options);

    return {
      success: true,
      started: true,
      service: swarm,
      config,
      message,
      warning,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: `启动失败: ${error instanceof Error ? error.message : String(error)}`,
      warning,
    };
  }
}

/**
 * 生成启动信息
 */
function generateStartMessage(
  _workspacePath: string,
  _config: Record<string, unknown>,
  _options: StartCommandOptions
): string {
  // 只返回空字符串，不输出任何启动信息
  return '';
}

/**
 * 显示 start 命令帮助
 */
export function showStartHelp(): string {
  return `
swarm start - 启动 Agent Swarm 服务

用法:
  swarm [选项]

说明:
  启动 Agent Swarm 服务，加载工作空间中的所有 Agents。
  默认进入 TUI 模式（美观的终端用户界面）。

  TUI 模式提供：
  - 🎨 美观的界面设计（Claude Code 风格）
  - 📝 Markdown 渲染
  - ⚡ 流式输出
  - 🎯 命令自动完成

  如果配置了 API Key，服务将连接到 Anthropic API。
  否则将使用 Mock 模式进行测试。

选项:
  --non-interactive  非交互模式
  --tui <engine>     TUI 引擎选择：ink（默认）| pi-tui（旧版）

环境变量:
  SWARM_TUI_ENGINE          TUI 引擎：ink | pi-tui（默认：ink）
  SWARM_STREAM_CHUNK_SIZE   流式输出块大小（默认：50）
  SWARM_STREAM_DELAY_MS     流式输出延迟毫秒（默认：0）
  SWARM_MAX_MESSAGES        最大消息数（默认：100）

示例:
  swarm                        启动 Ink TUI（默认）
  swarm --tui ink              启动 Ink TUI
  swarm --tui pi-tui           启动 pi-tui TUI（旧版）
  swarm --non-interactive      非交互模式

输出:
  服务启动后进入交互模式
  显示加载的 Agents 列表
  显示消息总线状态
  `.trim();
}

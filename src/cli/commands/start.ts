/**
 * swarm start 命令 - P0 任务
 *
 * 启动 AgentSwarm 服务
 */

import { join } from 'path';
import type { AgentSwarm } from '../../AgentSwarm.js';
import type { MockResponseGenerator } from '../../agent/AgentManager.js';
import { validateWorkspace } from '../ensureWorkspace.js';

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
  port?: number;
  daemon?: boolean;
  nonInteractive?: boolean;
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
  const configPath = join(workspacePath, 'config.json');
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
      message: '请在 config.json 中配置 apiKeys.anthropic 或设置 ANTHROPIC_API_KEY 环境变量',
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
  workspacePath: string,
  config: Record<string, unknown>,
  options: StartCommandOptions
): string {
  const mode = options.daemon ? '后台模式' : '交互模式';
  const port = options.port || 'default';

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent Swarm 服务启动成功！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 工作空间: ${workspacePath}
✓ 运行模式: ${mode}
✓ 端口: ${port}
✓ 配置版本: ${config.version}

🤖 服务状态:
  - AgentSwarm 已启动
  - 消息总线已就绪
  - 工作空间已加载

📝 可用命令:
  - 输入消息发送给 Agent
  - 输入 /exit 或 Ctrl+C 退出

💡 提示:
  - 使用 Ctrl+C 优雅退出
  - 后台模式使用进程管理器管理

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

/**
 * 显示 start 命令帮助
 */
export function showStartHelp(): string {
  return `
swarm start - 启动 Agent Swarm 服务

用法:
  swarm start [选项]

选项:
  --port <端口>       指定服务端口
  --daemon            后台模式运行
  --non-interactive  非交互模式

说明:
  启动 Agent Swarm 服务，加载工作空间中的所有 Agents。
  默认进入交互模式，可以直接与 Agents 对话。

  如果配置了 API Key，服务将连接到 Anthropic API。
  否则将使用 Mock 模式进行测试。

示例:
  swarm start              启动交互模式
  swarm start --daemon     后台模式启动
  swarm start --port 3000  指定端口启动
  swarm start --non-interactive  非交互模式

输出:
  服务启动后进入交互模式或后台运行
  显示加载的 Agents 列表
  显示消息总线状态
  `.trim();
}

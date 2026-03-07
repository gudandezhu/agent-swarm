/**
 * CLI - 命令行界面框架（P0 任务）
 *
 * 实现全局 swarm 命令行工具
 */

import { join } from 'path';
import { initCommand, showInitHelp } from './commands/init.js';
import { startCommand, showStartHelp } from './commands/start.js';
import { createAgentCommand, showCreateAgentHelp } from './commands/createAgent.js';
import { listCommand, showListHelp } from './commands/list.js';

/**
 * CLI 命令执行结果
 */
export interface CLIResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

/**
 * 解析后的命令参数
 */
export interface ParsedArgs {
  command: string;
  args: string[];
  options: Record<string, string | boolean>;
}

/**
 * CLI 框架类
 */
export class CLI {
  private readonly workspacePath: string;
  private readonly version = '0.1.0';

  constructor(workspacePath?: string) {
    this.workspacePath = workspacePath ?? join(process.env.HOME || '~', '.agent-swarm');
  }

  /**
   * 获取工作空间路径
   */
  getWorkspacePath(): string {
    return this.workspacePath;
  }

  /**
   * 解析命令行参数
   */
  parseArgs(args: string[]): ParsedArgs {
    let command = '';
    const commandArgs: string[] = [];
    const options: Record<string, string | boolean> = {};

    // 处理全局选项（如 --help, --version）在命令之前的情况
    let i = 0;
    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        // 选项
        const optionName = arg.slice(2);
        const nextArg = args[i + 1];

        if (nextArg && !nextArg.startsWith('-')) {
          options[optionName] = nextArg;
          i++; // 跳过下一个参数
        } else {
          options[optionName] = true;
        }
      } else if (arg.startsWith('-')) {
        // 短选项
        const optionName = arg.slice(1);
        options[optionName] = true;
      } else {
        // 第一个非选项参数是命令
        if (!command) {
          command = arg;
        } else {
          // 后续非选项参数是命令参数
          commandArgs.push(arg);
        }
      }
      i++;
    }

    return { command, args: commandArgs, options };
  }

  /**
   * 执行命令
   */
  async execute(args: string[]): Promise<CLIResult> {
    const { command, args: commandArgs, options } = this.parseArgs(args);

    // 显示版本（优先级最高）
    if (options.version || options.v || command === 'version') {
      return {
        success: true,
        message: this.showVersion(),
      };
    }

    // 显示帮助
    if (options.help || options.h || command === 'help') {
      // 如果指定了命令，显示命令特定帮助
      if (command) {
        return {
          success: true,
          message: this.showCommandHelp(command),
        };
      }
      // 否则显示全局帮助
      return {
        success: true,
        message: this.showHelp(),
      };
    }

    // 执行具体命令
    switch (command) {
      case 'init':
        return await this.cmdInit(options);

      case 'start':
        return await this.cmdStart(options);

      case 'create-agent':
      case 'create':
        return await this.cmdCreateAgent(options, commandArgs);

      case 'list':
      case 'ls':
        return await this.cmdList(options);

      case '':
        return {
          success: false,
          error: '未指定命令。使用 "swarm --help" 查看帮助。',
        };

      default:
        return {
          success: false,
          error: `未知命令: ${command}。使用 "swarm --help" 查看可用命令。`,
        };
    }
  }

  /**
   * init 命令 - 初始化工作空间
   */
  private async cmdInit(options: Record<string, string | boolean>): Promise<CLIResult> {
    const projectSkillsPath = join(process.cwd(), '.claude', 'skills');

    const result = await initCommand(this.workspacePath, projectSkillsPath, {
      force: options.force === true || options.f === true,
      quiet: options.quiet === true || options.q === true,
    });

    if (result.success && result.message) {
      console.log(result.message);
    }

    return {
      success: result.success,
      message: result.message,
      error: result.error,
    };
  }

  /**
   * start 命令 - 启动 Agent Swarm
   */
  private async cmdStart(options: Record<string, string | boolean>): Promise<CLIResult> {
    // 解析选项
    const startOptions = {
      port: typeof options.port === 'string' ? Number(options.port) : undefined,
      daemon: options.daemon === true,
      nonInteractive: options['non-interactive'] === true,
    };

    // 调用 startCommand
    const result = await startCommand(this.workspacePath, startOptions);

    // 显示启动信息
    if (result.success && result.message) {
      console.log(result.message);
    }

    // 显示警告
    if (result.warning) {
      console.warn(`⚠️  ${result.warning}`);
    }

    return {
      success: result.success,
      message: result.message,
      error: result.error,
      data: result.service,
    };
  }

  /**
   * create-agent 命令 - 创建 Agent
   */
  private async cmdCreateAgent(
    options: Record<string, string | boolean>,
    commandArgs: string[]
  ): Promise<CLIResult> {
    // 获取 Agent 名称
    const agentName = commandArgs[0];

    if (!agentName) {
      return {
        success: false,
        error: '缺少 Agent 名称。用法: swarm create-agent <agent-name> [选项]',
      };
    }

    // 解析选项
    const createOptions = {
      template: typeof options.template === 'string' ? options.template : undefined,
      description: typeof options.description === 'string' ? options.description : undefined,
    };

    // 调用 createAgentCommand
    const result = await createAgentCommand(this.workspacePath, agentName, createOptions);

    // 显示结果消息
    if (result.success && result.message) {
      console.log(result.message);
    }

    return {
      success: result.success,
      message: result.message,
      error: result.error,
      data: { agentId: result.agentId },
    };
  }

  /**
   * list 命令 - 列出 Agents
   */
  private async cmdList(options: Record<string, string | boolean>): Promise<CLIResult> {
    // 解析选项
    const listOptions = {
      verbose: options.verbose === true || options.v === true,
      json: options.json === true || options.j === true,
    };

    // 调用 listCommand
    const result = await listCommand(this.workspacePath, listOptions);

    // 显示结果
    if (result.success && result.output) {
      console.log(result.output);
    }

    return {
      success: result.success,
      message: result.output,
      error: result.error,
      data: { count: result.count, agents: result.agents },
    };
  }

  /**
   * 显示帮助信息
   */
  showHelp(): string {
    return `
swarm - Agent Swarm 命令行工具

用法:
  swarm [命令] [选项]

命令:
  init              初始化工作空间
  start             启动 Agent Swarm 服务
  create-agent      创建新的 Agent
  list, ls          列出所有 Agents

选项:
  --help, -h        显示帮助信息
  --version, -v     显示版本信息
  --force, -f       强制执行（用于 init）

示例:
  swarm init                    初始化工作空间
  swarm start                   启动服务
  swarm create-agent my-agent    创建名为 my-agent 的 Agent
  swarm list                    列出所有 Agents

更多信息:
  https://github.com/your-repo/agent-swarm
    `.trim();
  }

  /**
   * 显示命令帮助
   */
  showCommandHelp(command: string): string {
    if (command === 'init') {
      return showInitHelp();
    }

    if (command === 'start') {
      return showStartHelp();
    }

    if (command === 'create-agent' || command === 'create') {
      return showCreateAgentHelp();
    }

    if (command === 'list' || command === 'ls') {
      return showListHelp();
    }

    return `未找到命令 "${command}" 的帮助信息`;
  }

  /**
   * 显示版本信息
   */
  showVersion(): string {
    return `swarm v${this.version}`;
  }
}

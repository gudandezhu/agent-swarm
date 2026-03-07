/**
 * swarm list 命令
 *
 * 列出工作空间中的所有 Agents
 */

import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Agent 信息摘要
 */
export interface AgentInfo {
  id: string;
  name: string;
  description?: string;
  model?: string;
  channels?: Array<{ type: string; config: Record<string, unknown> }>;
  createdAt?: string;
  valid: boolean;
  error?: string;
}

/**
 * list 命令执行结果
 */
export interface ListResult {
  success: boolean;
  count: number;
  agents?: AgentInfo[];
  output?: string;
  error?: string;
}

/**
 * list 命令选项
 */
export interface ListOptions {
  verbose?: boolean;
  json?: boolean;
}

/**
 * 读取 Agent 配置
 */
async function readAgentConfig(
  agentPath: string
): Promise<{ valid: boolean; config?: Record<string, unknown>; error?: string }> {
  const configPath = join(agentPath, 'config.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    return { valid: true, config };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { valid: false, error: '配置文件格式错误' };
    }
    return { valid: false, error: '无法读取配置文件' };
  }
}

/**
 * 将配置转换为 AgentInfo
 */
function configToAgentInfo(
  id: string,
  config: Record<string, unknown>,
  valid: boolean
): AgentInfo {
  return {
    id,
    name: (config.name as string) || id,
    description: config.description as string | undefined,
    model: config.model as string | undefined,
    channels: (config.channels as Array<{ type: string; config: Record<string, unknown> }>) || [],
    createdAt: config.createdAt as string | undefined,
    valid,
  };
}

/**
 * 生成表格输出
 */
function generateTableOutput(agents: AgentInfo[]): string {
  if (agents.length === 0) {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent 列表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

没有找到任何 Agent。

🚀 快速开始:
  swarm create-agent <name>    # 创建新 Agent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
  }

  const header = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent 列表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
  const footer = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

总计: ${agents.length} 个 Agent

🚀 快速开始:
  swarm create-agent <name>    # 创建新 Agent
  swarm start                   # 启动 Agent Swarm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

  const agentLines = agents.map((agent) => {
    const statusIcon = agent.valid ? '✓' : '✗';
    const description = agent.description ? ` - ${agent.description}` : '';
    const errorLine = agent.error ? `  ⚠️  ${agent.error}` : '';
    return `  ${statusIcon} ${agent.id}${description}${errorLine}`;
  });

  return header + agentLines.join('\n') + '\n' + footer;
}

/**
 * 生成 JSON 输出
 */
function generateJsonOutput(agents: AgentInfo[]): string {
  return JSON.stringify(
    {
      count: agents.length,
      agents,
    },
    null,
    2
  );
}

/**
 * 扫描 agents 目录
 */
async function scanAgentsDirectory(
  agentsPath: string,
  verbose: boolean
): Promise<AgentInfo[]> {
  const agents: AgentInfo[] = [];

  try {
    const entries = await fs.readdir(agentsPath, { withFileTypes: true });

    for (const entry of entries) {
      // 跳过隐藏文件和非目录
      if (!entry.isDirectory() || entry.name.startsWith('.')) {
        continue;
      }

      const agentPath = join(agentsPath, entry.name);
      const { valid, config, error } = await readAgentConfig(agentPath);

      if (valid && config) {
        const info = configToAgentInfo(entry.name, config, true);
        agents.push(info);
      } else {
        // 配置无效，仍然返回基本信息
        agents.push({
          id: entry.name,
          name: entry.name,
          valid: false,
          error,
        });
      }
    }
  } catch {
    // 目录不存在或无法读取
    return [];
  }

  // 按创建时间排序（最新的在前）
  agents.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return agents;
}

/**
 * 执行 list 命令
 */
export async function listCommand(
  workspacePath: string,
  options: ListOptions
): Promise<ListResult> {
  const agentsPath = join(workspacePath, 'agents');

  // 1. 扫描 agents 目录
  const agents = await scanAgentsDirectory(agentsPath, options.verbose || false);

  // 2. 生成输出
  let output: string;
  if (options.json) {
    output = generateJsonOutput(agents);
  } else {
    output = generateTableOutput(agents);
  }

  return {
    success: true,
    count: agents.length,
    agents,
    output,
  };
}

/**
 * 显示 list 命令帮助
 */
export function showListHelp(): string {
  return `
swarm list - 列出所有 Agents

用法:
  swarm list [选项]

选项:
  --verbose, -v    显示详细信息（包括模型、渠道等）
  --json, -j       以 JSON 格式输出

说明:
  列出工作空间中的所有 Agents 及其状态。
  默认以表格格式显示，使用 --json 可获取机器可读格式。

  Agent 状态说明:
  ✓ 表示配置完整可用
  ✗ 表示配置有问题（如配置文件损坏）

示例:
  swarm list              # 列出所有 Agents（表格格式）
  swarm list -v           # 显示详细信息
  swarm list --json       # 以 JSON 格式输出

输出:
  表格格式: 包含 Agent ID、描述和状态
  JSON 格式: 包含完整的 Agent 配置信息
  `.trim();
}

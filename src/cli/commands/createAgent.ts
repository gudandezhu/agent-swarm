/**
 * swarm create-agent 命令
 *
 * 创建新的 Agent 配置
 */

import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Agent 配置结构
 */
export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  model: string;
  channels: Array<{ type: string; config: Record<string, unknown> }>;
  createdAt: string;
}

/**
 * create-agent 命令执行结果
 */
export interface CreateAgentResult {
  success: boolean;
  created?: boolean;
  agentId?: string;
  message?: string;
  error?: string;
}

/**
 * create-agent 命令选项
 */
export interface CreateAgentOptions {
  template?: string;
  description?: string;
}

/**
 * 验证 Agent 名称格式
 *
 * 规则：
 * - 只允许字母、数字、连字符
 * - 长度 2-30 字符
 * - 不能以连字符开头或结尾
 */
function validateAgentName(name: string): { valid: boolean; error?: string } {
  // 检查长度
  if (name.length < 2) {
    return { valid: false, error: 'Agent 名称过短（最少 2 个字符）' };
  }
  if (name.length > 30) {
    return { valid: false, error: 'Agent 名称过长（最多 30 个字符）' };
  }

  // 检查格式：只允许字母、数字、连字符
  const validPattern = /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/;
  if (!validPattern.test(name)) {
    return { valid: false, error: 'Agent 名称只能包含字母、数字和连字符，且不能以连字符开头或结尾' };
  }

  return { valid: true };
}

/**
 * 生成默认 Agent 配置
 */
function generateAgentConfig(
  id: string,
  options: CreateAgentOptions
): AgentConfig {
  return {
    id,
    name: id,
    description: options.description || `Agent ${id}`,
    model: 'claude-sonnet-4-6',
    channels: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * 生成默认 Agent prompt
 */
function generateAgentPrompt(
  id: string,
  options: CreateAgentOptions
): string {
  const description = options.description || `你是一个名为 ${id} 的 AI Agent。`;

  return `# ${id}

你是 ${id}。

${description}

## 能力

- 理解用户需求
- 分析问题并提供建议
- 与其他 Agent 协作完成任务

## 指南

1. 始终保持友好和专业
2. 提供准确和有用的信息
3. 在需要时使用工具获取信息
4. 积极与团队协作

## 工作流程

1. 仔细理解用户的需求
2. 分析任务的复杂度和依赖
3. 必要时请求帮助或分配任务
4. 提供清晰的执行结果
`;
}

/**
 * 执行 create-agent 命令
 */
export async function createAgentCommand(
  workspacePath: string,
  agentName: string,
  options: CreateAgentOptions
): Promise<CreateAgentResult> {
  // 1. 验证名称格式
  const validation = validateAgentName(agentName);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      message: `名称验证失败: ${validation.error}`,
    };
  }

  // 2. 检查 Agent 是否已存在
  const agentPath = join(workspacePath, 'agents', agentName);
  try {
    await fs.access(agentPath);
    // Agent 已存在
    return {
      success: false,
      error: `Agent "${agentName}" 已存在`,
      message: `创建失败: Agent "${agentName}" 已经存在于 ${agentPath}`,
    };
  } catch {
    // Agent 不存在，继续创建
  }

  // 3. 创建 Agent 目录
  try {
    await fs.mkdir(agentPath, { recursive: true });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: `创建目录失败: ${agentPath}`,
    };
  }

  // 4. 生成配置文件
  const config = generateAgentConfig(agentName, options);
  const configPath = join(agentPath, 'config.json');

  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: `创建配置文件失败: ${configPath}`,
    };
  }

  // 5. 生成 prompt 文件
  const prompt = generateAgentPrompt(agentName, options);
  const promptPath = join(agentPath, 'prompt.md');

  try {
    await fs.writeFile(promptPath, prompt, 'utf-8');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: `创建 prompt 文件失败: ${promptPath}`,
    };
  }

  // 6. 生成成功消息
  const message = generateSuccessMessage(agentName, agentPath);

  return {
    success: true,
    created: true,
    agentId: agentName,
    message,
  };
}

/**
 * 生成成功消息
 */
function generateSuccessMessage(agentName: string, agentPath: string): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent 创建成功！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Agent ID: ${agentName}
✓ Agent 路径: ${agentPath}

📝 已生成文件:
  - config.json     Agent 配置文件
  - prompt.md       Agent 提示词

🚀 快速开始:
  1. 编辑 prompt.md 自定义 Agent 行为
  2. 编辑 config.json 添加消息渠道
  3. 启动 Agent Swarm: swarm start

💡 提示:
  - 使用 "swarm list" 查看所有 Agents
  - 使用 "to: ${agentName}" 向此 Agent 发送消息

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

/**
 * 显示 create-agent 命令帮助
 */
export function showCreateAgentHelp(): string {
  return `
swarm create-agent - 创建新的 Agent

用法:
  swarm create-agent <agent-name> [选项]

参数:
  agent-name        Agent 名称（2-30 字符，仅限字母、数字、连字符）

选项:
  --template <name>    使用模板创建（暂未实现）
  --description <text> 设置 Agent 描述

说明:
  创建一个新的 Agent 配置，包含 config.json 和 prompt.md 文件。
  Agent 名称必须符合命名规范，且不能与已存在的 Agent 重名。

示例:
  swarm create-agent translator                    # 创建基本 Agent
  swarm create-agent translator --description "翻译助手"  # 带描述
  swarm create-agent agent-123                    # 使用连字符

命名规则:
  - 长度: 2-30 字符
  - 允许: 字母、数字、连字符（-）
  - 禁止: 以连字符开头/结尾、特殊字符、空格

输出:
  在工作空间的 agents/ 目录下创建以 agent-name 命名的目录
  ├── config.json    # Agent 配置（ID、模型、渠道等）
  └── prompt.md      # Agent 提示词模板
  `.trim();
}

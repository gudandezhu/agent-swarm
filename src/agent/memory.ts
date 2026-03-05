/**
 * Agent Memory 管理
 */

import { promises as fs } from 'fs';
import { join } from 'path';

const MEMORY_HEADER = `# Agent Memory

## 环境
\`\`\`
{服务器信息、凭证、平台域名}
\`\`\`

## 技能
{重复工作抽象为技能}

## 规则
{反复强调的要求}

## 常用命令
{经常使用的命令}
`;

export async function loadMemory(agentsPath: string, agentId: string): Promise<string> {
  const memoryPath = join(agentsPath, agentId, 'MEMORY.md');

  try {
    return await fs.readFile(memoryPath, 'utf-8');
  } catch {
    // 创建默认记忆文件
    await fs.mkdir(join(agentsPath, agentId), { recursive: true });
    await fs.writeFile(memoryPath, MEMORY_HEADER, 'utf-8');
    return MEMORY_HEADER;
  }
}

export async function appendMemory(agentsPath: string, agentId: string, content: string): Promise<void> {
  const memoryPath = join(agentsPath, agentId, 'MEMORY.md');
  const existing = await loadMemory(agentsPath, agentId);
  await fs.writeFile(memoryPath, existing + '\n' + content + '\n', 'utf-8');
}

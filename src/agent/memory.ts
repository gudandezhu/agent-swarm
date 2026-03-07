/**
 * Agent Memory 管理
 */

import { join } from 'path';
import * as FileOps from '../utils/file-ops.js';

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
    return await FileOps.readFile(memoryPath);
  } catch {
    // 创建默认记忆文件
    await FileOps.ensureDir(join(agentsPath, agentId));
    await FileOps.writeFile(memoryPath, MEMORY_HEADER);
    return MEMORY_HEADER;
  }
}

export async function appendMemory(agentsPath: string, agentId: string, content: string): Promise<void> {
  const memoryPath = join(agentsPath, agentId, 'MEMORY.md');
  const existing = await loadMemory(agentsPath, agentId);
  await FileOps.writeFile(memoryPath, existing + '\n' + content + '\n');
}

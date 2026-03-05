/**
 * Agent 配置加载
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { AgentConfig } from './types.js';

export async function loadConfig(agentsPath: string, agentId: string): Promise<AgentConfig | null> {
  const configPath = join(agentsPath, agentId, 'config.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as AgentConfig;
  } catch {
    return null;
  }
}

export async function saveConfig(agentsPath: string, agentId: string, config: AgentConfig): Promise<void> {
  const configPath = join(agentsPath, agentId, 'config.json');
  await fs.mkdir(join(agentsPath, agentId), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

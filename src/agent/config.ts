/**
 * Agent 配置加载
 */

import { join } from 'path';
import * as FileOps from '../utils/file-ops.js';
import type { AgentConfig } from './types.js';

export async function loadConfig(agentsPath: string, agentId: string): Promise<AgentConfig | null> {
  const configPath = join(agentsPath, agentId, 'config.json');

  try {
    return await FileOps.readJSON<AgentConfig>(configPath);
  } catch {
    return null;
  }
}

export async function saveConfig(agentsPath: string, agentId: string, config: AgentConfig): Promise<void> {
  const configPath = join(agentsPath, agentId, 'config.json');
  await FileOps.ensureDir(join(agentsPath, agentId));
  await FileOps.writeJSON(configPath, config);
}

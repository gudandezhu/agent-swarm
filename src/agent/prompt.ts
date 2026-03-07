/**
 * Agent Prompt 加载
 */

import { join } from 'path';
import * as FileOps from '../utils/file-ops.js';

export async function loadPrompt(agentsPath: string, agentId: string): Promise<string | null> {
  const promptPath = join(agentsPath, agentId, 'prompt.md');

  try {
    return await FileOps.readFile(promptPath);
  } catch {
    return null;
  }
}

export async function savePrompt(agentsPath: string, agentId: string, prompt: string): Promise<void> {
  const promptPath = join(agentsPath, agentId, 'prompt.md');
  await FileOps.ensureDir(join(agentsPath, agentId));
  await FileOps.writeFile(promptPath, prompt);
}

/**
 * Agent Prompt 加载
 */

import { promises as fs } from 'fs';
import { join } from 'path';

export async function loadPrompt(agentsPath: string, agentId: string): Promise<string | null> {
  const promptPath = join(agentsPath, agentId, 'prompt.md');

  try {
    return await fs.readFile(promptPath, 'utf-8');
  } catch {
    return null;
  }
}

export async function savePrompt(agentsPath: string, agentId: string, prompt: string): Promise<void> {
  const promptPath = join(agentsPath, agentId, 'prompt.md');
  await fs.mkdir(join(agentsPath, agentId), { recursive: true });
  await fs.writeFile(promptPath, prompt, 'utf-8');
}

/**
 * Agent 模块测试 - config.ts, memory.ts, prompt.ts
 * 测试 Agent 配置、记忆和提示词管理
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  loadConfig,
  saveConfig,
} from '../src/agent/config.js';
import {
  loadMemory,
  appendMemory,
} from '../src/agent/memory.js';
import {
  loadPrompt,
  savePrompt,
} from '../src/agent/prompt.js';
import type { AgentConfig } from '../src/agent/types.js';

describe('Agent 模块测试', () => {
  const testAgentsPath = 'test-agents-modules';
  const agentId = 'test-agent';
  const agentDir = join(testAgentsPath, agentId);

  beforeEach(async () => {
    // 清理并创建测试目录
    try {
      await fs.rm(testAgentsPath, { recursive: true, force: true });
    } catch {
      // 忽略
    }
    await fs.mkdir(agentDir, { recursive: true });
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testAgentsPath, { recursive: true, force: true });
    } catch {
      // 忽略
    }
  });

  describe('config.ts - Agent 配置', () => {
    const mockConfig: AgentConfig = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      model: { provider: 'anthropic', id: 'claude-sonnet-4-6' },
      channels: ['cli'],
    };

    it('应加载存在的配置文件', async () => {
      // 先创建配置文件
      await fs.writeFile(join(agentDir, 'config.json'), JSON.stringify(mockConfig), 'utf-8');

      const config = await loadConfig(testAgentsPath, agentId);

      expect(config).not.toBeNull();
      expect(config?.id).toBe('test-agent');
      expect(config?.name).toBe('Test Agent');
      expect(config?.description).toBe('A test agent');
      expect(config?.model.provider).toBe('anthropic');
      expect(config?.model.id).toBe('claude-sonnet-4-6');
      expect(config?.channels).toEqual(['cli']);
    });

    it('应返回 null 当配置文件不存在时', async () => {
      const config = await loadConfig(testAgentsPath, 'non-existent-agent');

      expect(config).toBeNull();
    });

    it('应返回 null 当配置文件是无效 JSON 时', async () => {
      await fs.writeFile(join(agentDir, 'config.json'), 'invalid json', 'utf-8');

      const config = await loadConfig(testAgentsPath, agentId);

      expect(config).toBeNull();
    });

    it('应保存配置文件', async () => {
      await saveConfig(testAgentsPath, agentId, mockConfig);

      // 验证文件存在
      const exists = await fs.access(join(agentDir, 'config.json')).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // 验证内容
      const content = await fs.readFile(join(agentDir, 'config.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(mockConfig);
    });

    it('应创建 Agent 目录（如果不存在）', async () => {
      // 删除目录
      await fs.rm(agentDir, { recursive: true, force: true });

      await saveConfig(testAgentsPath, agentId, mockConfig);

      // 验证目录和文件都创建了
      const dirExists = await fs.access(agentDir).then(() => true).catch(() => false);
      const fileExists = await fs.access(join(agentDir, 'config.json')).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
      expect(fileExists).toBe(true);
    });
  });

  describe('memory.ts - Agent 记忆', () => {
    it('应加载存在的记忆文件', async () => {
      const testMemory = '# Test Memory\n\nSome content here.';
      await fs.writeFile(join(agentDir, 'MEMORY.md'), testMemory, 'utf-8');

      const memory = await loadMemory(testAgentsPath, agentId);

      expect(memory).toBe(testMemory);
    });

    it('应创建默认记忆文件当不存在时', async () => {
      const memory = await loadMemory(testAgentsPath, agentId);

      // 验证返回默认内容
      expect(memory).toContain('# Agent Memory');
      expect(memory).toContain('## 环境');
      expect(memory).toContain('## 技能');
      expect(memory).toContain('## 规则');
      expect(memory).toContain('## 常用命令');

      // 验证文件被创建
      const exists = await fs.access(join(agentDir, 'MEMORY.md')).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('应追加内容到记忆文件', async () => {
      // 先创建初始记忆
      const initialMemory = '# Initial Memory\n\nInitial content.';
      await fs.writeFile(join(agentDir, 'MEMORY.md'), initialMemory, 'utf-8');

      // 追加内容
      await appendMemory(testAgentsPath, agentId, 'New memory content');

      // 验证内容
      const memory = await loadMemory(testAgentsPath, agentId);
      expect(memory).toContain('Initial content.');
      expect(memory).toContain('New memory content');
      expect(memory).toMatch(/Initial content\.\s+New memory content/);
    });

    it('应创建目录（如果不存在）然后追加', async () => {
      await fs.rm(agentDir, { recursive: true, force: true });

      await appendMemory(testAgentsPath, agentId, 'Test content');

      // 验证文件被创建
      const exists = await fs.access(join(agentDir, 'MEMORY.md')).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('prompt.ts - Agent 提示词', () => {
    it('应加载存在的提示词文件', async () => {
      const testPrompt = '# Test Prompt\n\nYou are a helpful assistant.';
      await fs.writeFile(join(agentDir, 'prompt.md'), testPrompt, 'utf-8');

      const prompt = await loadPrompt(testAgentsPath, agentId);

      expect(prompt).toBe(testPrompt);
    });

    it('应返回 null 当提示词文件不存在时', async () => {
      const prompt = await loadPrompt(testAgentsPath, 'non-existent-agent');

      expect(prompt).toBeNull();
    });

    it('应保存提示词文件', async () => {
      const testPrompt = '# My Prompt\n\nYou are a test agent.';

      await savePrompt(testAgentsPath, agentId, testPrompt);

      // 验证文件存在和内容
      const exists = await fs.access(join(agentDir, 'prompt.md')).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.readFile(join(agentDir, 'prompt.md'), 'utf-8');
      expect(content).toBe(testPrompt);
    });

    it('应创建目录（如果不存在）然后保存', async () => {
      await fs.rm(agentDir, { recursive: true, force: true });

      await savePrompt(testAgentsPath, agentId, 'Test prompt');

      // 验证目录和文件都创建了
      const dirExists = await fs.access(agentDir).then(() => true).catch(() => false);
      const fileExists = await fs.access(join(agentDir, 'prompt.md')).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
      expect(fileExists).toBe(true);
    });
  });
});

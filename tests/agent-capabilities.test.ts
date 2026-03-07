/**
 * AgentCapability - Agent 能力发现测试
 * 测试 Agent 能力查询功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentManager } from '../src/agent/AgentManager.js';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('AgentCapability - Agent 能力发现', () => {
  let agentManager: AgentManager;
  const testAgentsPath = 'test-agents-capabilities';

  beforeEach(async () => {
    // 设置 Mock API Key，避免 Agent 创建时因缺少 API Key 而失败
    process.env.ANTHROPIC_API_KEY = 'sk-test-mock-key-for-capabilities-test';

    // 清理并创建测试目录
    try {
      await fs.rm(testAgentsPath, { recursive: true, force: true });
    } catch {
      // 忽略
    }
    await fs.mkdir(testAgentsPath, { recursive: true });

    // 创建测试 Agent
    const agentDir = join(testAgentsPath, 'test-agent');
    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(
      join(agentDir, 'config.json'),
      JSON.stringify({
        id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent for capabilities',
        model: { provider: 'anthropic', id: 'claude-sonnet-4-6' },
        channels: ['cli'],
      })
    );

    // 创建另一个测试 Agent
    const agent2Dir = join(testAgentsPath, 'another-agent');
    await fs.mkdir(agent2Dir, { recursive: true });
    await fs.writeFile(
      join(agent2Dir, 'config.json'),
      JSON.stringify({
        id: 'another-agent',
        name: 'Another Agent',
        description: 'Another test agent',
        model: { provider: 'anthropic', id: 'claude-sonnet-4-6' },
        channels: ['cli'],
      })
    );

    // 创建带 skills 的 Agent
    const skilledAgentDir = join(testAgentsPath, 'skilled-agent');
    await fs.mkdir(skilledAgentDir, { recursive: true });
    await fs.mkdir(join(skilledAgentDir, 'skills'), { recursive: true });

    await fs.writeFile(
      join(skilledAgentDir, 'config.json'),
      JSON.stringify({
        id: 'skilled-agent',
        name: 'Skilled Agent',
        description: 'An agent with skills',
        model: { provider: 'anthropic', id: 'claude-sonnet-4-6' },
        channels: ['cli'],
      })
    );

    // 创建 skill
    const skillDir = join(skilledAgentDir, 'skills', 'test-skill');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      join(skillDir, 'SKILL.md'),
      `---
name: test-skill
description: A test skill for testing
---

# Test Skill

This is a test skill.`
    );

    // 创建 AgentManager
    agentManager = new AgentManager({
      agentsPath: testAgentsPath,
      mockResponse: async () => 'Mock response',
    });
  });

  afterEach(async () => {
    await agentManager.destroy();

    // 清理测试目录
    try {
      await fs.rm(testAgentsPath, { recursive: true, force: true });
    } catch {
      // 忽略
    }
  });

  describe('getCapabilities', () => {
    it('应返回单个 Agent 的能力', async () => {
      const capabilities = await agentManager.getCapabilities('test-agent');

      expect(capabilities).not.toBeNull();
      expect(capabilities?.agentId).toBe('test-agent');
      expect(capabilities?.name).toBe('Test Agent');
      expect(capabilities?.description).toBe('A test agent for capabilities');
      expect(capabilities?.skills).toEqual([]);
    });

    it('应返回包含 skills 的能力', async () => {
      const capabilities = await agentManager.getCapabilities('skilled-agent');

      expect(capabilities).not.toBeNull();
      expect(capabilities?.agentId).toBe('skilled-agent');
      expect(capabilities?.skills).toHaveLength(1);
      expect(capabilities?.skills[0].name).toBe('test-skill');
      expect(capabilities?.skills[0].description).toBe('A test skill for testing');
    });

    it('应返回 null 当 Agent 不存在时', async () => {
      const capabilities = await agentManager.getCapabilities('non-existent-agent');

      expect(capabilities).toBeNull();
    });
  });

  describe('listCapabilities', () => {
    it('应列出所有 Agent 的能力', async () => {
      const capabilities = await agentManager.listCapabilities();

      expect(capabilities).toHaveLength(3);
      expect(capabilities.some((c) => c.agentId === 'test-agent')).toBe(true);
      expect(capabilities.some((c) => c.agentId === 'another-agent')).toBe(true);
      expect(capabilities.some((c) => c.agentId === 'skilled-agent')).toBe(true);
    });

    it('应包含所有 Agent 的基本信息', async () => {
      const capabilities = await agentManager.listCapabilities();

      const testAgent = capabilities.find((c) => c.agentId === 'test-agent');
      expect(testAgent).toBeDefined();
      expect(testAgent?.name).toBe('Test Agent');
      expect(testAgent?.description).toBe('A test agent for capabilities');
    });

    it('应包含 Agent 的 skills', async () => {
      const capabilities = await agentManager.listCapabilities();

      const skilledAgent = capabilities.find((c) => c.agentId === 'skilled-agent');
      expect(skilledAgent).toBeDefined();
      expect(skilledAgent?.skills).toHaveLength(1);
      expect(skilledAgent?.skills[0].name).toBe('test-skill');
    });
  });
});

/**
 * AgentManager 补充测试 - 提高覆盖率
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentManager } from '../src/agent/AgentManager.js';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('AgentManager (补充测试)', () => {
  const testAgentsPath = join(process.cwd(), 'test-agents-sup');
  let manager: AgentManager;

  beforeEach(async () => {
    // 设置 Mock API Key，避免 Agent 创建时因缺少 API Key 而失败
    process.env.ANTHROPIC_API_KEY = 'sk-test-mock-key-for-supplement-test';

    await fs.mkdir(testAgentsPath, { recursive: true });
    manager = new AgentManager({ agentsPath: testAgentsPath });
  });

  afterEach(async () => {
    await manager.destroy();
    await fs.rm(testAgentsPath, { recursive: true, force: true });
  });

  describe('list', () => {
    it('应列出所有 agents', async () => {
      // 创建多个 agent
      for (const id of ['agent-1', 'agent-2', 'agent-3']) {
        const agentPath = join(testAgentsPath, id);
        await fs.mkdir(agentPath, { recursive: true });
        await fs.writeFile(
          join(agentPath, 'config.json'),
          JSON.stringify({
            id,
            name: `Agent ${id}`,
            model: { provider: 'anthropic', id: 'claude-haiku-4-20250514' },
            channels: ['cli'],
          }),
          'utf-8'
        );
        await fs.writeFile(join(agentPath, 'prompt.md'), `You are ${id}.`, 'utf-8');
      }

      const agents = await manager.list();

      expect(agents).toHaveLength(3);
      expect(agents.map((a) => a.id)).toContain('agent-1');
      expect(agents.map((a) => a.id)).toContain('agent-2');
      expect(agents.map((a) => a.id)).toContain('agent-3');
    });

    it('应返回空数组当没有 agents', async () => {
      const agents = await manager.list();
      expect(agents).toEqual([]);
    });
  });

  describe('getState', () => {
    it('应返回 Agent 状态', async () => {
      const agentPath = join(testAgentsPath, 'test-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'test-agent',
          name: 'Test',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are a test.', 'utf-8');

      // 加载 agent
      await manager.get('test-agent');

      const state = manager.getState('test-agent');
      expect(state).toBeDefined();
      expect(state.config.id).toBe('test-agent');
      expect(state.lastUsedAt).toBeDefined();
    });

    it('应返回 undefined 当 Agent 不存在', () => {
      const state = manager.getState('non-existent');
      expect(state).toBeUndefined();
    });
  });

  describe('reload', () => {
    it('应重新加载 Agent', async () => {
      const agentPath = join(testAgentsPath, 'reload-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'reload-agent',
          name: 'Reload Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'Original prompt.', 'utf-8');

      const agent1 = await manager.get('reload-agent');
      expect(agent1.state.systemPrompt).toContain('Original prompt');

      // 修改配置
      await fs.writeFile(join(agentPath, 'prompt.md'), 'Updated prompt.', 'utf-8');

      await manager.reload('reload-agent');

      const agent2 = await manager.get('reload-agent');
      expect(agent2).not.toBe(agent1); // 新实例
      expect(agent2.state.systemPrompt).toContain('Updated prompt');
    });
  });

  describe('exists', () => {
    it('应检查 agent 是否存在', async () => {
      const agentPath = join(testAgentsPath, 'exists-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'exists-agent',
          name: 'Exists',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'Test.', 'utf-8');

      expect(await manager.exists('exists-agent')).toBe(true);
      expect(await manager.exists('non-existent')).toBe(false);
    });
  });

  describe('buildSystemPrompt', () => {
    it('应注入 skills 到 system prompt', async () => {
      const agentPath = join(testAgentsPath, 'skills-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.mkdir(join(agentPath, 'skills'), { recursive: true });

      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'skills-agent',
          name: 'Skills Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are a test.', 'utf-8');

      // 创建 skill
      await fs.mkdir(join(agentPath, 'skills', 'test-skill'), { recursive: true });
      await fs.writeFile(
        join(agentPath, 'skills', 'test-skill', 'SKILL.md'),
        `---
name: test-skill
description: A test skill
---

# Test Skill

This is a test skill.`,
        'utf-8'
      );

      const agent = await manager.get('skills-agent');

      expect(agent.state.systemPrompt).toContain('## Available Skills');
      expect(agent.state.systemPrompt).toContain('**test-skill**: A test skill');
    });

    it('应注入 memory 到 system prompt', async () => {
      const agentPath = join(testAgentsPath, 'memory-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'memory-agent',
          name: 'Memory Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are a test.', 'utf-8');

      // 添加记忆
      await fs.writeFile(
        join(agentPath, 'MEMORY.md'),
        '# 记忆\n\n## 技能\n- 学会了处理网页重定向',
        'utf-8'
      );

      const agent = await manager.get('memory-agent');

      expect(agent.state.systemPrompt).toContain('# 记忆');
      expect(agent.state.systemPrompt).toContain('学会了处理网页重定向');
    });
  });

  describe('buildUserPrompt', () => {
    it('应处理字符串 data', async () => {
      const agentPath = join(testAgentsPath, 'prompt-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'prompt-agent',
          name: 'Prompt Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are a test.', 'utf-8');

      const agent = await manager.get('prompt-agent');
      const spy = vi.spyOn(agent, 'prompt').mockResolvedValue({ content: 'test' } as never);

      // 通过 process 调用 buildUserPrompt
      await manager.process('prompt-agent', {
        id: 'test-msg',
        timestamp: Date.now(),
        version: '1.0',
        from: 'user',
        to: 'prompt-agent',
        sessionId: 'test',
        type: 'request',
        payload: { data: 'String payload' },
        ack: { required: false, timeout: 0, retry: 0 },
      });

      expect(spy).toHaveBeenCalledWith('String payload');
    });
  });
});

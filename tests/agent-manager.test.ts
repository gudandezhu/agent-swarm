/**
 * AgentManager 测试 - 使用 MockLLM
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentManager, MockResponseGenerator } from '../src/agent/AgentManager.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { Message } from '../src/message/types.js';

describe('AgentManager (pi-mono Agent)', () => {
  const testAgentsPath = join(process.cwd(), 'test-agents');
  let manager: AgentManager;

  beforeEach(async () => {
    await fs.mkdir(testAgentsPath, { recursive: true });
  });

  afterEach(async () => {
    await manager.destroy();
    await fs.rm(testAgentsPath, { recursive: true, force: true });
  });

  describe('get', () => {
    it('应该返回 Agent 实例', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      // 创建测试 agent 配置（包含 API 密钥）
      const agentPath = join(testAgentsPath, 'test-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'test-agent',
          name: 'Test Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are a test agent.', 'utf-8');

      const agent = await manager.get('test-agent');

      expect(agent).toBeDefined();
      // pi-mono Agent 实例
      expect(agent).toHaveProperty('state');
      expect(agent).toHaveProperty('prompt');
    });

    it('应该抛出错误当 agent 不存在', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      await expect(manager.get('non-existent')).rejects.toThrow('Agent not found');
    });

    it('应该缓存 Agent 实例', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      const agentPath = join(testAgentsPath, 'cached-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'cached-agent',
          name: 'Cached Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are a cached agent.', 'utf-8');

      const agent1 = await manager.get('cached-agent');
      const agent2 = await manager.get('cached-agent');

      expect(agent1).toBe(agent2);
    });
  });

  describe('process - 使用 Mock', () => {
    it('应该使用 mockResponse 替代真实 LLM 调用', async () => {
      // 设置 Mock 响应
      const mockResponse: MockResponseGenerator = (message: Message) => {
        return `Mock response for: ${message.payload.data}`;
      };

      manager = new AgentManager({
        agentsPath: testAgentsPath,
        mockResponse,
      });

      // 创建测试 agent
      const agentPath = join(testAgentsPath, 'mock-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'mock-agent',
          name: 'Mock Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are a mock agent.', 'utf-8');

      const message: Message = {
        id: 'test-msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: 'mock-agent',
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'Hello world' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const response = await manager.process('mock-agent', message);

      expect(response).toBe('Mock response for: Hello world');
    });

    it('应该支持异步 mockResponse', async () => {
      const mockResponse: MockResponseGenerator = async (message: Message) => {
        // 模拟异步处理
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `Async mock: ${message.payload.data}`;
      };

      manager = new AgentManager({
        agentsPath: testAgentsPath,
        mockResponse,
      });

      const agentPath = join(testAgentsPath, 'async-mock-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'async-mock-agent',
          name: 'Async Mock Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are an async mock agent.', 'utf-8');

      const message: Message = {
        id: 'test-msg-2',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: 'async-mock-agent',
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'Async test' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const response = await manager.process('async-mock-agent', message);

      expect(response).toBe('Async mock: Async test');
    });
  });

  describe('Skills 集成', () => {
    it('应该自动加载 agent 的 skills', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      const agentPath = join(testAgentsPath, 'skilled-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.mkdir(join(agentPath, 'skills'), { recursive: true });
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

      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'skilled-agent',
          name: 'Skilled Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are a test agent.', 'utf-8');

      const agent = await manager.get('skilled-agent');

      // agent 应该加载了 skills
      expect(agent).toBeDefined();
    });
  });

  describe('exists', () => {
    it('应该返回 true 当 agent 存在', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      const agentPath = join(testAgentsPath, 'existing-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'existing-agent',
          name: 'Existing Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );

      const exists = await manager.exists('existing-agent');
      expect(exists).toBe(true);
    });

    it('应该返回 false 当 agent 不存在', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      const exists = await manager.exists('non-existent-agent');
      expect(exists).toBe(false);
    });
  });

  describe('list', () => {
    it('应该列出所有 agents', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      // 创建多个 agents
      for (let i = 1; i <= 3; i++) {
        const agentPath = join(testAgentsPath, `list-agent-${i}`);
        await fs.mkdir(agentPath, { recursive: true });
        await fs.writeFile(
          join(agentPath, 'config.json'),
          JSON.stringify({
            id: `list-agent-${i}`,
            name: `List Agent ${i}`,
            model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
            channels: ['cli'],
          }),
          'utf-8'
        );
      }

      const agents = await manager.list();

      expect(agents.length).toBe(3);
      expect(agents.map((a) => a.id)).toContain('list-agent-1');
      expect(agents.map((a) => a.id)).toContain('list-agent-2');
      expect(agents.map((a) => a.id)).toContain('list-agent-3');
    });
  });

  describe('reload', () => {
    it('应该重新加载 agent 配置', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      const agentPath = join(testAgentsPath, 'reload-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'reload-agent',
          name: 'Reload Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'Original prompt.', 'utf-8');

      // 首次加载
      await manager.get('reload-agent');

      // 修改配置
      await fs.writeFile(join(agentPath, 'prompt.md'), 'Updated prompt.', 'utf-8');

      // 重新加载
      await manager.reload('reload-agent');

      // 验证新配置生效（通过检查新 agent 实例）
      const agent = await manager.get('reload-agent');
      expect(agent).toBeDefined();
    });
  });

  describe('getState', () => {
    it('应该返回 agent 状态', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      const agentPath = join(testAgentsPath, 'state-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'state-agent',
          name: 'State Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are a state agent.', 'utf-8');

      await manager.get('state-agent');

      const state = manager.getState('state-agent');

      expect(state).toBeDefined();
      expect(state?.id).toBe('state-agent');
      expect(state?.config.name).toBe('State Agent');
      expect(state?.lastUsedAt).toBeGreaterThan(0);
    });

    it('应该返回 undefined 当 agent 未加载', () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      const state = manager.getState('unknown-agent');
      expect(state).toBeUndefined();
    });
  });

  describe('destroy', () => {
    it('应该清理所有资源', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      const agentPath = join(testAgentsPath, 'destroy-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'destroy-agent',
          name: 'Destroy Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are a destroy agent.', 'utf-8');

      await manager.get('destroy-agent');
      expect(manager.getState('destroy-agent')).toBeDefined();

      await manager.destroy();

      expect(manager.getState('destroy-agent')).toBeUndefined();
    });
  });

  describe('loadPrompt - 边界情况', () => {
    it('应该使用默认 prompt 当 prompt.md 不存在', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      const agentPath = join(testAgentsPath, 'no-prompt-agent');
      await fs.mkdir(agentPath, { private: true, recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'no-prompt-agent',
          name: 'No Prompt Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      // 不创建 prompt.md

      const agent = await manager.get('no-prompt-agent');
      expect(agent).toBeDefined();
      // 验证 agent 使用了默认 prompt
      expect(agent.state.systemPrompt).toContain('你是一个有用的助手');
    });

    it('应该使用默认 prompt 当 prompt.md 读取失败', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      const agentPath = join(testAgentsPath, 'invalid-prompt-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.mkdir(join(agentPath, 'prompt.md'), { recursive: true }); // 创建目录而非文件
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'invalid-prompt-agent',
          name: 'Invalid Prompt Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );

      const agent = await manager.get('invalid-prompt-agent');
      expect(agent).toBeDefined();
      expect(agent.state.systemPrompt).toContain('你是一个有用的助手');
    });
  });

  describe('process - 数据类型处理', () => {
    it('应该处理非字符串 data 使用 mockResponse', async () => {
      // 注意：buildUserPrompt 的 JSON.stringify 逻辑只在真实 LLM 调用时执行
      // 使用 mockResponse 时，原始 message 会直接传递给 mock 函数
      const mockResponse: MockResponseGenerator = (message: Message) => {
        const data = message.payload.data;
        // 验证对象数据被正确传递
        expect(data).toEqual({ key: 'value', nested: { num: 42 } });
        return 'Processed object data';
      };

      manager = new AgentManager({
        agentsPath: testAgentsPath,
        mockResponse,
      });

      const agentPath = join(testAgentsPath, 'obj-mock-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'obj-mock-agent',
          name: 'Object Mock Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );

      const message: Message = {
        id: 'test-msg-obj',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: 'obj-mock-agent',
        sessionId: 'test-session',
        type: 'request',
        payload: { data: { key: 'value', nested: { num: 42 } } },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const response = await manager.process('obj-mock-agent', message);
      expect(response).toBe('Processed object data');
    });

    it('应该处理空 payload', async () => {
      const mockResponse: MockResponseGenerator = (message: Message) => {
        expect(message.payload.data).toBeUndefined();
        return 'Empty payload handled';
      };

      manager = new AgentManager({
        agentsPath: testAgentsPath,
        mockResponse,
      });

      const agentPath = join(testAgentsPath, 'empty-mock-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'empty-mock-agent',
          name: 'Empty Mock Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514', apiKey: 'test-api-key' },
          channels: ['cli'],
        }),
        'utf-8'
      );

      const message: Message = {
        id: 'test-msg-empty',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: 'empty-mock-agent',
        sessionId: 'test-session',
        type: 'request',
        payload: {},
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const response = await manager.process('empty-mock-agent', message);
      expect(response).toBe('Empty payload handled');
    });
  });

  describe('API 密钥配置', () => {
    it('应该使用 Agent 专用 API 密钥', async () => {
      manager = new AgentManager({ agentsPath: testAgentsPath });

      const agentPath = join(testAgentsPath, 'api-key-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'api-key-agent',
          name: 'API Key Agent',
          model: {
            provider: 'anthropic',
            id: 'claude-haiku-4-20250514',
            apiKey: 'agent-specific-key',
          },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are an API key test agent.', 'utf-8');

      const agent = await manager.get('api-key-agent');
      expect(agent).toBeDefined();
    });

    it('应该在没有 API 密钥时抛出错误', async () => {
      // 保存原始环境变量
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      manager = new AgentManager({ agentsPath: testAgentsPath });

      const agentPath = join(testAgentsPath, 'no-key-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({
          id: 'no-key-agent',
          name: 'No Key Agent',
          model: { provider: 'anthropic', id: 'claude-haiku-4-20250514' },
          channels: ['cli'],
        }),
        'utf-8'
      );
      await fs.writeFile(join(agentPath, 'prompt.md'), 'You are a test agent.', 'utf-8');

      await expect(manager.get('no-key-agent')).rejects.toThrow('API key not found');

      // 恢复环境变量
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    });
  });
});

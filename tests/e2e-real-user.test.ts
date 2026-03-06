/**
 * E2E 测试 - 真实用户场景
 *
 * 模拟真实用户在 agents/ 目录下创建 Agent，
 * 然后验证系统是否能正确加载和处理
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentSwarm } from '../src/AgentSwarm.js';
import { AgentManager } from '../src/agent/AgentManager.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { Message } from '../src/message/types.js';

describe('E2E - 真实用户场景', () => {
  const agentsPath = 'agents';
  const testAgentId = 'e2e-user-test';
  const testAgentDir = join(process.cwd(), agentsPath, testAgentId);

  beforeEach(async () => {
    // 创建测试 Agent 目录
    await fs.mkdir(testAgentDir, { recursive: true });

    // 创建 config.json
    const config = {
      id: testAgentId,
      name: 'E2E用户测试Agent',
      description: '真实用户创建的测试Agent',
      model: {
        provider: 'anthropic',
        id: 'claude-sonnet-4-6',
      },
      channels: ['cli'],
      maxTokens: 4000,
      temperature: 0.7,
    };
    await fs.writeFile(join(testAgentDir, 'config.json'), JSON.stringify(config, null, 2));

    // 创建 prompt.md
    const prompt = `# E2E用户测试Agent

你是真实用户创建的测试Agent。

## 规则
1. 收到任何消息都回复 "E2E测试成功：{消息内容}"
2. 保持简洁
`;
    await fs.writeFile(join(testAgentDir, 'prompt.md'), prompt);
  });

  afterEach(async () => {
    // 清理测试 Agent
    await fs.rm(testAgentDir, { recursive: true, force: true });
  });

  describe('AgentManager 加载真实 Agent', () => {
    it('应该能加载 agents/ 目录下的 Agent', async () => {
      const manager = new AgentManager({
        agentsPath,
        mockResponse: async (message: Message) => {
          return `Mock回复: ${message.payload?.data || '无内容'}`;
        },
      });

      // 验证 Agent 能被获取
      const agent = await manager.get(testAgentId);
      expect(agent).toBeDefined();
    });

    it('应该能处理真实 Agent 的消息', async () => {
      const mockMessage: Message = {
        id: 'test-msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: testAgentId,
        sessionId: 'cli:test-user',
        type: 'request',
        payload: { data: '你好' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const manager = new AgentManager({
        agentsPath,
        mockResponse: async (message: Message) => {
          return `E2E测试成功：${message.payload?.data || ''}`;
        },
      });

      const response = await manager.process(testAgentId, mockMessage);
      expect(response).toContain('E2E测试成功');
    });
  });

  describe('AgentSwarm 使用真实 Agent', () => {
    it('应该能启动并加载真实 Agent', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgentId,
        mockResponse: async (message: Message) => {
          return `Mock响应: ${message.payload?.data || ''}`;
        },
      });

      await swarm.start();
      // AgentSwarm 启动后会注册服务，验证服务已注册
      expect(swarm['agentManager']).toBeDefined();
      expect(swarm['messageBus']).toBeDefined();
      await swarm.stop();
    });

    it('应该能向真实 Agent 发送消息', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgentId,
        mockResponse: async (message: Message) => {
          const data = message.payload?.data || '';
          return `Agent已收到: ${data}`;
        },
      });

      await swarm.start();

      const message: Message = {
        id: 'e2e-msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: testAgentId,
        sessionId: 'cli:user123',
        type: 'request',
        payload: { data: '测试消息' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      // 发送消息（通过 MessageBus）
      await swarm['messageBus'].send(message);

      await swarm.stop();
    });
  });

  describe('验证 example Agent 可用', () => {
    it('应该能加载自带的 example Agent', async () => {
      const manager = new AgentManager({
        agentsPath,
        mockResponse: async () => 'Example测试成功',
      });

      const agent = await manager.get('example');
      expect(agent).toBeDefined();
    });
  });
});

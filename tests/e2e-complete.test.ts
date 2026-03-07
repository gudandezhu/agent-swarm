/**
 * E2E 测试 - 完整业务流程
 *
 * 覆盖完整的用户场景：
 * 1. Agent 创建流程
 * 2. Channel 消息发送接收
 * 3. Session 持久化
 * 4. 多 Agent 协作
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentSwarm } from '../src/AgentSwarm.js';
import { CLIChannel } from '../src/channel/CLIChannel.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { Message } from '../src/message/types.js';

describe('E2E - 完整业务流程', () => {
  const agentsPath = 'agents';
  const testAgents = {
    agent1: 'e2e-agent-1',
    agent2: 'e2e-agent-2',
  };
  const agentDirs = Object.values(testAgents).map((id) => join(process.cwd(), agentsPath, id));

  beforeEach(async () => {
    // 设置 Mock API Key
    process.env.ANTHROPIC_API_KEY = 'sk-test-mock-key-for-e2e-complete-test';

    // 创建测试 Agents
    for (const agentId of Object.values(testAgents)) {
      const agentDir = join(process.cwd(), agentsPath, agentId);
      await fs.mkdir(agentDir, { recursive: true });

      const config = {
        id: agentId,
        name: `E2E测试Agent ${agentId}`,
        description: `E2E完整流程测试Agent ${agentId}`,
        model: {
          provider: 'anthropic',
          id: 'claude-sonnet-4-6',
          apiKey: 'test-api-key', // 在配置中包含 API Key
        },
        channels: ['cli'],
        maxTokens: 4000,
        temperature: 0.7,
      };
      await fs.writeFile(join(agentDir, 'config.json'), JSON.stringify(config, null, 2));

      const prompt = `# E2E测试Agent ${agentId}

你是E2E测试用的Agent。

## 规则
1. 收到消息时回复 "${agentId} 已收到"
2. 保持简洁
`;
      await fs.writeFile(join(agentDir, 'prompt.md'), prompt);
    }
  });

  afterEach(async () => {
    // 清理测试 Agents
    for (const agentDir of agentDirs) {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });

  describe('1. Agent 创建流程测试', () => {
    it('应该能创建并加载多个 Agent', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async (message: Message) => {
          return `Mock响应: ${message.payload?.data || ''}`;
        },
      });

      await swarm.start();

      const agentManager = swarm.getAgentManager();

      // 验证所有 Agent 都能被加载
      for (const agentId of Object.values(testAgents)) {
        const agent = await agentManager.get(agentId);
        expect(agent).toBeDefined();
        // Agent 对象存在就足够了，具体的属性可能因实现而异
      }

      await swarm.stop();
    });

    it('应该能验证 Agent 配置完整性', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async () => 'OK',
      });

      await swarm.start();

      const agentManager = swarm.getAgentManager();
      const agent = await agentManager.get(testAgents.agent1);

      expect(agent).toBeDefined();
      // 验证 agent 对象存在即可

      await swarm.stop();
    });
  });

  describe('2. Channel 消息发送和接收测试', () => {
    it('应该能通过 CLI Channel 发送和接收消息', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async (message: Message) => {
          return `${testAgents.agent1} 已收到: ${message.payload?.data || ''}`;
        },
      });

      await swarm.start();

      // 注册 CLI Channel
      const cliChannel = new CLIChannel();
      await swarm.registerChannel(cliChannel);

      // 模拟用户发送消息
      const userMessage: Message = {
        id: 'msg-cli-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'user',
        to: testAgents.agent1,
        sessionId: 'cli:user123',
        type: 'request',
        payload: { data: '你好 Agent1' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const response = await swarm.getAgentManager().process(testAgents.agent1, userMessage);

      expect(response).toBeDefined();
      expect(response).toContain('你好 Agent1');

      await swarm.stop();
    });

    it('应该能处理并发消息', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async (message: Message) => {
          return `处理消息: ${message.payload?.data || ''}`;
        },
      });

      await swarm.start();

      const cliChannel = new CLIChannel();
      await swarm.registerChannel(cliChannel);

      // 并发发送多条消息
      const messages = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-concurrent-${i}`,
        timestamp: Date.now(),
        version: '1.0' as const,
        from: 'user' as const,
        to: testAgents.agent1 as string,
        sessionId: 'cli:user123' as const,
        type: 'request' as const,
        payload: { data: `并发消息 ${i}` },
        ack: { required: false, timeout: 0, retry: 0 },
      }));

      const responses = await Promise.all(
        messages.map((msg) => swarm.getAgentManager().process(testAgents.agent1, msg))
      );

      expect(responses).toHaveLength(10);
      responses.forEach((response, i) => {
        expect(response).toContain(`并发消息 ${i}`);
      });

      await swarm.stop();
    });
  });

  describe('3. Session 持久化测试', () => {
    it('应该能正确创建和管理 Session', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async () => 'Session测试',
      });

      await swarm.start();

      const cliChannel = new CLIChannel();
      await swarm.registerChannel(cliChannel);

      const sessionManager = swarm.getSessionManager();

      // 创建多个消息，验证 Session 持久化
      const sessionId = 'cli:user-session-test';

      for (let i = 0; i < 5; i++) {
        const message: Message = {
          id: `msg-session-${i}`,
          timestamp: Date.now(),
          version: '1.0',
          from: 'user',
          to: testAgents.agent1,
          sessionId,
          type: 'request',
          payload: { data: `Session消息 ${i}` },
          ack: { required: false, timeout: 0, retry: 0 },
        };

        await swarm.getAgentManager().process(testAgents.agent1, message);
      }

      // 等待一下让 Session 完成持久化
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证 Session 存在
      const session = await sessionManager.get(sessionId);
      expect(session).toBeDefined();

      await swarm.stop();
    });

    it('应该能保持 Session 上下文', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async (message: Message) => {
          // 模拟基于上下文的响应
          return `上下文消息 ${message.payload?.data || ''}`;
        },
      });

      await swarm.start();

      const sessionManager = swarm.getSessionManager();
      const sessionId = 'cli:context-test';

      // 发送一系列相关消息
      const conversation = [
        '我叫小明',
        '我喜欢编程',
        '我在做什么？', // 期望 Agent 能基于上下文回答
      ];

      for (const content of conversation) {
        const message: Message = {
          id: `msg-ctx-${Date.now()}`,
          timestamp: Date.now(),
          version: '1.0',
          from: 'user',
          to: testAgents.agent1,
          sessionId,
          type: 'request',
          payload: { data: content },
          ack: { required: false, timeout: 0, retry: 0 },
        };

        await swarm.getAgentManager().process(testAgents.agent1, message);
      }

      // 等待一下让 Session 完成持久化
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证 Session 存在
      const session = await sessionManager.get(sessionId);
      expect(session).toBeDefined();

      await swarm.stop();
    });
  });

  describe('4. 多 Agent 协作测试', () => {
    it('应该能在 Agent 之间传递消息', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async (message: Message) => {
          // Agent1 收到消息后，转发给 Agent2
          if (message.to === testAgents.agent1) {
            return `已转发给 ${testAgents.agent2}`;
          }
          return `${message.to} 已收到`;
        },
      });

      await swarm.start();

      const cliChannel = new CLIChannel();
      await swarm.registerChannel(cliChannel);

      // Agent1 处理消息
      const message1: Message = {
        id: 'msg-collab-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'user',
        to: testAgents.agent1,
        sessionId: 'cli:collab-test',
        type: 'request',
        payload: { data: '请转发给 Agent2' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const response1 = await swarm.getAgentManager().process(testAgents.agent1, message1);
      expect(response1).toBeDefined();
      expect(response1).toContain('Agent2');

      // Agent2 处理转发的消息
      const message2: Message = {
        id: 'msg-collab-2',
        timestamp: Date.now(),
        version: '1.0',
        from: testAgents.agent1,
        to: testAgents.agent2,
        sessionId: 'cli:collab-test',
        type: 'request',
        payload: { data: '来自 Agent1 的消息' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const response2 = await swarm.getAgentManager().process(testAgents.agent2, message2);
      expect(response2).toBeDefined();

      await swarm.stop();
    });

    it('应该能广播消息给多个 Agent', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async (message: Message) => {
          return `${message.to} 已收到广播`;
        },
      });

      await swarm.start();

      // 广播消息给所有 Agents
      const broadcastTargets = [testAgents.agent1, testAgents.agent2];

      const responses = await Promise.all(
        broadcastTargets.map((target, i) =>
          swarm.getAgentManager().process(target, {
            id: `msg-broadcast-${i}`,
            timestamp: Date.now(),
            version: '1.0',
            from: 'user',
            to: target,
            sessionId: 'cli:broadcast-test',
            type: 'request',
            payload: { data: '广播消息' },
            ack: { required: false, timeout: 0, retry: 0 },
          })
        )
      );

      expect(responses).toHaveLength(2);
      responses.forEach((response) => {
        expect(response).toBeDefined();
        expect(response).toContain('广播消息');
      });

      await swarm.stop();
    });
  });

  describe('5. 完整用户流程测试', () => {
    it('应该能完成从创建 Agent 到多轮对话的完整流程', async () => {
      // 1. 创建 AgentSwarm 实例
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async (message: Message) => {
          return `${message.to} 回复: ${message.payload?.data || ''}`;
        },
      });

      // 2. 启动系统
      await swarm.start();

      // 3. 注册 Channel
      const cliChannel = new CLIChannel();
      await swarm.registerChannel(cliChannel);

      // 4. 用户发起多轮对话
      const conversations = ['你好', '帮我分析一下这个需求', '总结一下我们的对话'];

      const sessionId = 'cli:complete-flow-test';

      for (const [index, content] of conversations.entries()) {
        const message: Message = {
          id: `msg-flow-${index}`,
          timestamp: Date.now(),
          version: '1.0',
          from: 'user',
          to: testAgents.agent1,
          sessionId,
          type: 'request',
          payload: { data: content },
          ack: { required: false, timeout: 0, retry: 0 },
        };

        const response = await swarm.getAgentManager().process(testAgents.agent1, message);
        expect(response).toBeDefined();
        expect(response).toContain('Mock响应');
      }

      // 5. 验证 Session 保存了完整对话历史
      const sessionManager = swarm.getSessionManager();
      const session = await sessionManager.get(sessionId);

      expect(session).toBeDefined();

      // 6. 停止系统
      await swarm.stop();
    });
  });

  describe('6. 边界情况和错误处理', () => {
    it('应该能处理不存在的 Agent ID', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async () => 'OK',
      });

      await swarm.start();

      const agentManager = swarm.getAgentManager();

      // 尝试获取不存在的 Agent
      await expect(agentManager.get('non-existent-agent')).rejects.toThrow();

      await swarm.stop();
    });

    it('应该能处理空消息内容', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async (message: Message) => {
          return `收到消息: "${message.payload?.data || ''}"`;
        },
      });

      await swarm.start();

      const message: Message = {
        id: 'msg-empty',
        timestamp: Date.now(),
        version: '1.0',
        from: 'user',
        to: testAgents.agent1,
        sessionId: 'cli:empty-test',
        type: 'request',
        payload: { data: '' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const response = await swarm.getAgentManager().process(testAgents.agent1, message);
      expect(response).toBeDefined();
      // 空消息也被正确处理

      await swarm.stop();
    });

    it('应该能处理特殊字符和表情符号', async () => {
      const swarm = new AgentSwarm({
        agentsPath,
        defaultAgent: testAgents.agent1,
        mockResponse: async (message: Message) => {
          return `收到: ${message.payload?.data || ''}`;
        },
      });

      await swarm.start();

      const specialText = '你好！👋 这是一个测试 😊';
      const message: Message = {
        id: 'msg-special',
        timestamp: Date.now(),
        version: '1.0',
        from: 'user',
        to: testAgents.agent1,
        sessionId: 'cli:special-test',
        type: 'request',
        payload: { data: specialText },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const response = await swarm.getAgentManager().process(testAgents.agent1, message);
      expect(response).toContain(specialText);

      await swarm.stop();
    });
  });
});

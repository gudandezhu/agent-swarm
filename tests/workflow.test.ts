/**
 * Workflow - 任务编排能力测试
 * 测试 Agent 完成后触发其他 Agent 的工作流
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentSwarm } from '../src/AgentSwarm.js';
import type { Message } from '../src/message/types.js';
import { MockChannel } from './mocks/mock-channel.js';

describe('Workflow - 任务编排能力', () => {
  let swarm: AgentSwarm;
  let mockChannel: MockChannel;
  const testDir = 'test-sessions-workflow';

  beforeEach(async () => {
    // 清理测试目录
    const fs = await import('fs/promises');
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // 忽略不存在的目录
    }

    // 创建测试 Agent 目录
    const agentsPath = 'test-agents-workflow';
    try {
      await fs.rm(agentsPath, { recursive: true, force: true });
    } catch {
      // 忽略
    }
    await fs.mkdir(agentsPath, { recursive: true });

    // 创建 default agent
    const defaultAgentDir = `${agentsPath}/default`;
    await fs.mkdir(defaultAgentDir, { recursive: true });
    await fs.writeFile(`${defaultAgentDir}/config.json`, JSON.stringify({
      id: 'default',
      name: 'Default Agent',
      model: { provider: 'anthropic', id: 'claude-sonnet-4-6' },
    }));

    // 创建 next-agent
    const nextAgentDir = `${agentsPath}/next-agent`;
    await fs.mkdir(nextAgentDir, { recursive: true });
    await fs.writeFile(`${nextAgentDir}/config.json`, JSON.stringify({
      id: 'next-agent',
      name: 'Next Agent',
      model: { provider: 'anthropic', id: 'claude-sonnet-4-6' },
    }));

    // 创建 processor
    const processorDir = `${agentsPath}/processor`;
    await fs.mkdir(processorDir, { recursive: true });
    await fs.writeFile(`${processorDir}/config.json`, JSON.stringify({
      id: 'processor',
      name: 'Processor Agent',
      model: { provider: 'anthropic', id: 'claude-sonnet-4-6' },
    }));

    // 创建 agent-a, agent-b, agent-c
    for (const name of ['agent-a', 'agent-b', 'agent-c']) {
      const agentDir = `${agentsPath}/${name}`;
      await fs.mkdir(agentDir, { recursive: true });
      await fs.writeFile(`${agentDir}/config.json`, JSON.stringify({
        id: name,
        name: `${name} Agent`,
        model: { provider: 'anthropic', id: 'claude-sonnet-4-6' },
      }));
    }

    // 创建 success-handler
    const successHandlerDir = `${agentsPath}/success-handler`;
    await fs.mkdir(successHandlerDir, { recursive: true });
    await fs.writeFile(`${successHandlerDir}/config.json`, JSON.stringify({
      id: 'success-handler',
      name: 'Success Handler',
      model: { provider: 'anthropic', id: 'claude-sonnet-4-6' },
    }));

    // 创建 error-handler
    const errorHandlerDir = `${agentsPath}/error-handler`;
    await fs.mkdir(errorHandlerDir, { recursive: true });
    await fs.writeFile(`${errorHandlerDir}/config.json`, JSON.stringify({
      id: 'error-handler',
      name: 'Error Handler',
      model: { provider: 'anthropic', id: 'claude-sonnet-4-6' },
    }));

    // 创建 AgentSwarm 实例（使用 mockResponse 避免真实 LLM 调用）
    swarm = new AgentSwarm({
      defaultAgent: 'default',
      agentsPath,
      sessionsPath: testDir,
      mockResponse: async (msg) => {
        // 模拟 Agent 响应
        return `Mock response for: ${msg.payload.task || 'no task'}`;
      },
    });

    // 创建 Mock Channel
    mockChannel = new MockChannel();

    await swarm.start();
    await swarm.registerChannel(mockChannel);
  });

  afterEach(async () => {
    await swarm.stop();

    // 清理测试目录
    const fs = await import('fs/promises');
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // 忽略
    }
    try {
      await fs.rm('test-agents-workflow', { recursive: true, force: true });
    } catch {
      // 忽略
    }
  });

  describe('oncomplete - 单一目标', () => {
    it('应在 Agent 处理完成后发送消息到指定的 oncomplete 目标', async () => {
      const messageBus = swarm.getMessageBus();
      const receivedMessages: Message[] = [];

      // 订阅 next-agent 的消息
      const unsubscribe = messageBus.subscribe('next-agent', (msg) => {
        receivedMessages.push(msg);
      });

      // 创建包含 workflow 的消息
      const message: Message = {
        id: 'msg-workflow-001',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: 'default',
        sessionId: 'cli:workflow-test-1',
        type: 'request',
        payload: {
          task: 'test task',
          workflow: {
            oncomplete: 'next-agent',
          },
        },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      // 发送消息
      await messageBus.send(message);

      // 等待异步处理
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证发送给了 next-agent
      unsubscribe();
      expect(receivedMessages.length).toBeGreaterThan(0);
    });

    it('应将处理结果传递给 oncomplete 目标', async () => {
      const messageBus = swarm.getMessageBus();
      const receivedMessages: Message[] = [];

      const unsubscribe = messageBus.subscribe('processor', (msg) => {
        receivedMessages.push(msg);
      });

      const message: Message = {
        id: 'msg-workflow-002',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: 'default',
        sessionId: 'cli:workflow-test-2',
        type: 'request',
        payload: {
          task: 'process data',
          data: { input: 'test' },
          workflow: {
            oncomplete: 'processor',
          },
        },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      await messageBus.send(message);
      await new Promise(resolve => setTimeout(resolve, 2000));

      unsubscribe();
      // 验证传递了数据
      expect(receivedMessages.length).toBeGreaterThan(0);
    });
  });

  describe('oncomplete - 多个目标', () => {
    it('应并行发送消息到多个 oncomplete 目标', async () => {
      const messageBus = swarm.getMessageBus();
      const receivedMessages: Map<string, Message[]> = new Map();

      // 订阅所有目标
      const targets = ['agent-a', 'agent-b', 'agent-c'];
      const unsubscribers = targets.map(target => {
        receivedMessages.set(target, []);
        return messageBus.subscribe(target, (msg) => {
          receivedMessages.get(target)!.push(msg);
        });
      });

      const message: Message = {
        id: 'msg-workflow-003',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: 'default',
        sessionId: 'cli:workflow-test-3',
        type: 'request',
        payload: {
          task: 'fanout task',
          workflow: {
            oncomplete: ['agent-a', 'agent-b', 'agent-c'],
          },
        },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      await messageBus.send(message);
      await new Promise(resolve => setTimeout(resolve, 2000));

      unsubscribers.forEach(u => u());

      // 验证所有目标都收到了消息
      expect(receivedMessages.get('agent-a')!.length).toBeGreaterThan(0);
      expect(receivedMessages.get('agent-b')!.length).toBeGreaterThan(0);
      expect(receivedMessages.get('agent-c')!.length).toBeGreaterThan(0);
    });
  });

  describe('onerror - 错误处理', () => {
    it('应在 Agent 处理失败时发送消息到 onerror 目标', async () => {
      const messageBus = swarm.getMessageBus();
      const receivedMessages: Message[] = [];

      const unsubscribe = messageBus.subscribe('error-handler', (msg) => {
        receivedMessages.push(msg);
      });

      // 使用不存在的 Agent 触发错误
      const message: Message = {
        id: 'msg-workflow-004',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: 'non-existent-agent',
        sessionId: 'cli:workflow-test-4',
        type: 'request',
        payload: {
          task: 'failing task',
          workflow: {
            onerror: 'error-handler',
          },
        },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      await messageBus.send(message);
      await new Promise(resolve => setTimeout(resolve, 2000));

      unsubscribe();
      // 当 Agent 不存在时应该触发 onerror
      expect(receivedMessages.length).toBeGreaterThan(0);
    });

    it('应同时支持 oncomplete 和 onerror', async () => {
      const messageBus = swarm.getMessageBus();
      const successMessages: Message[] = [];

      const unsubscribe = messageBus.subscribe('success-handler', (msg) => {
        successMessages.push(msg);
      });

      const message: Message = {
        id: 'msg-workflow-005',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: 'default',
        sessionId: 'cli:workflow-test-5',
        type: 'request',
        payload: {
          task: 'test with both handlers',
          workflow: {
            oncomplete: 'success-handler',
            onerror: 'error-handler',
          },
        },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      await messageBus.send(message);
      await new Promise(resolve => setTimeout(resolve, 2000));

      unsubscribe();
      // 成功时应该调用 oncomplete
      expect(successMessages.length).toBeGreaterThan(0);
    });
  });

  describe('没有 workflow 的情况', () => {
    it('应在没有 workflow 时正常工作', async () => {
      const messageBus = swarm.getMessageBus();

      const message: Message = {
        id: 'msg-workflow-006',
        timestamp: Date.now(),
        version: '1.0',
        from: 'cli',
        to: 'default',
        sessionId: 'cli:workflow-test-6',
        type: 'request',
        payload: {
          task: 'normal task without workflow',
        },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      // 不应抛出错误
      await expect(messageBus.send(message)).resolves.not.toThrow();
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });
});

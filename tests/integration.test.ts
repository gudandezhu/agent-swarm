/**
 * 集成测试 - AgentSwarm MVP
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentSwarm } from '../src/AgentSwarm.js';
import { CLIChannel } from '../src/channel/CLIChannel.js';
import { MessageBus } from '../src/message/MessageBus.js';
import type { IncomingMessage } from '../src/channel/types.js';

describe('AgentSwarm Integration (MVP)', () => {
  let swarm: AgentSwarm;

  beforeEach(async () => {
    swarm = new AgentSwarm({ defaultAgent: 'example' });
  });

  afterEach(async () => {
    await swarm.stop();
  });

  describe('MessageBus', () => {
    it('应该能发送和接收消息', async () => {
      const bus = new MessageBus();
      let received = false;

      bus.subscribe('test-agent', () => {
        received = true;
      });

      await bus.send({
        from: 'user',
        to: 'test-agent',
        sessionId: 'test-session',
        payload: { data: 'hello' },
      });

      expect(received).toBe(true);
    });

    it('应该支持广播消息', async () => {
      const bus = new MessageBus();
      let count = 0;

      bus.subscribe('agent-1', () => count++);
      bus.subscribe('agent-2', () => count++);

      await bus.send({
        from: 'user',
        to: ['agent-1', 'agent-2'],
        sessionId: 'test',
        payload: {},
      });

      expect(count).toBe(2);
    });
  });

  describe('CLIChannel', () => {
    it('应该生成正确的 Session ID', () => {
      const cli = new CLIChannel();

      const msg1: IncomingMessage = {
        channelId: 'cli',
        userId: 'user1',
        content: 'hello',
      };

      expect(cli.makeSessionId(msg1)).toBe('cli:user1');

      const msg2: IncomingMessage = {
        channelId: 'cli',
        userId: 'user1',
        conversationId: 'conv1',
        threadId: 'thread1',
        content: 'hello',
      };

      expect(cli.makeSessionId(msg2)).toBe('cli:conv1:thread1:user1');
    });

    it('应该能转换消息为 OutgoingMessage', () => {
      const cli = new CLIChannel();

      const outgoing = cli.toOutgoing({
        id: 'msg1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent',
        to: 'user',
        sessionId: 'cli:user1',
        type: 'response',
        payload: { data: 'response text' },
        ack: { required: false, timeout: 0, retry: 0 },
      });

      expect(outgoing.channelId).toBe('cli');
      expect(outgoing.userId).toBe('user1');
      expect(outgoing.content).toBe('response text');
    });
  });

  describe('AgentSwarm', () => {
    it('应该能启动和停止', async () => {
      await swarm.start();

      const agentManager = swarm.getAgentManager();
      const messageBus = swarm.getMessageBus();
      const sessionManager = swarm.getSessionManager();

      expect(agentManager).toBeDefined();
      expect(messageBus).toBeDefined();
      expect(sessionManager).toBeDefined();
    });

    it('应该能注册 Channel', async () => {
      await swarm.start();

      const cli = new CLIChannel();
      await swarm.registerChannel(cli);

      expect(cli.isAvailable()).toBe(true);
    });
  });
});

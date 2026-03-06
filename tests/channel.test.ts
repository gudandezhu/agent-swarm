/**
 * Channel 测试 - TC-CH-001/002/003
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseChannel } from '../src/channel/BaseChannel.js';
import { CLIChannel } from '../src/channel/CLIChannel.js';
import type { IncomingMessage, OutgoingMessage } from '../src/channel/types.js';
import type { Message } from '../src/message/types.js';

/**
 * MockChannel - 用于测试的 Channel 实现
 */
class MockChannel extends BaseChannel {
  readonly id = 'mock';
  readonly name = 'Mock Channel';
  sentMessages: OutgoingMessage[] = [];

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
  }

  async send(message: OutgoingMessage): Promise<void> {
    if (!this.started) {
      throw new Error('Channel not started');
    }
    this.sentMessages.push(message);
  }

  /**
   * 模拟接收外部消息（用于测试）
   */
  async simulateIncomingMessage(message: Partial<IncomingMessage>): Promise<void> {
    const fullMessage: IncomingMessage = {
      channelId: this.id,
      userId: 'test-user',
      content: 'test content',
      ...message,
    };
    await this.handleMessage(fullMessage);
  }
}

describe('TC-CH-001: Channel 消息适配', () => {
  let channel: MockChannel;

  beforeEach(async () => {
    channel = new MockChannel();
    await channel.start();
  });

  afterEach(async () => {
    await channel.stop();
  });

  it('应生成正确的 Session ID（单聊）', () => {
    const message: IncomingMessage = {
      channelId: 'mock',
      userId: 'user123',
      content: 'Hello',
    };

    const sessionId = channel.makeSessionId(message);

    expect(sessionId).toBe('mock:user123');
  });

  it('应生成正确的 Session ID（群聊）', () => {
    const message: IncomingMessage = {
      channelId: 'dingtalk',
      userId: 'user123',
      conversationId: 'conv456',
      threadId: 'thread789',
      content: 'Hello',
    };

    const sessionId = channel.makeSessionId(message);

    expect(sessionId).toBe('dingtalk:conv456:thread789:user123');
  });

  it('应将 Message 转换为 OutgoingMessage', () => {
    const message: Message = {
      id: 'msg-1',
      timestamp: Date.now(),
      version: '1.0',
      from: 'agent',
      to: 'user',
      sessionId: 'mock:conv123:user456',
      type: 'response',
      payload: { data: 'Response content' },
      ack: { required: false, timeout: 0, retry: 0 },
    };

    const outgoing = channel.toOutgoing(message);

    expect(outgoing.channelId).toBe('mock');
    expect(outgoing.userId).toBe('user456');
    expect(outgoing.conversationId).toBe('conv123');
    expect(outgoing.content).toBe('Response content');
  });

  it('应正确序列化对象类型 payload', () => {
    const message: Message = {
      id: 'msg-2',
      timestamp: Date.now(),
      version: '1.0',
      from: 'agent',
      to: 'user',
      sessionId: 'mock:user123',
      type: 'response',
      payload: { data: { key: 'value', nested: { a: 1 } } },
      ack: { required: false, timeout: 0, retry: 0 },
    };

    const outgoing = channel.toOutgoing(message);

    expect(outgoing.content).toBe('{"key":"value","nested":{"a":1}}');
  });
});

describe('TC-CH-002: Channel 消息发送', () => {
  let channel: MockChannel;

  beforeEach(async () => {
    channel = new MockChannel();
    await channel.start();
  });

  afterEach(async () => {
    await channel.stop();
  });

  it('应成功发送消息', async () => {
    const message: OutgoingMessage = {
      channelId: 'mock',
      userId: 'user123',
      content: 'Hello from agent',
    };

    await channel.send(message);

    expect(channel.sentMessages).toHaveLength(1);
    expect(channel.sentMessages[0]).toEqual(message);
  });

  it('应发送多条消息', async () => {
    for (let i = 0; i < 3; i++) {
      await channel.send({
        channelId: 'mock',
        userId: `user${i}`,
        content: `Message ${i}`,
      });
    }

    expect(channel.sentMessages).toHaveLength(3);
  });

  it('应在未启动时抛出错误', async () => {
    const newChannel = new MockChannel();
    // 未调用 start()

    await expect(
      newChannel.send({
        channelId: 'mock',
        userId: 'user',
        content: 'test',
      })
    ).rejects.toThrow('Channel not started');
  });
});

describe('TC-CH-003: Channel 错误处理', () => {
  let channel: MockChannel;

  beforeEach(async () => {
    channel = new MockChannel();
    await channel.start();
  });

  afterEach(async () => {
    await channel.stop();
  });

  it('应捕获 handler 错误并继续处理', async () => {
    const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const successHandler = vi.fn().mockResolvedValue(undefined);

    channel.onMessage(errorHandler);
    channel.onMessage(successHandler);

    await channel.simulateIncomingMessage({ content: 'test' });

    // 错误被捕获，后续 handler 仍被执行
    expect(errorHandler).toHaveBeenCalled();
    expect(successHandler).toHaveBeenCalled();
  });

  it('应正确处理多个 handler', async () => {
    const handler1 = vi.fn().mockResolvedValue(undefined);
    const handler2 = vi.fn().mockResolvedValue(undefined);

    channel.onMessage(handler1);
    channel.onMessage(handler2);

    await channel.simulateIncomingMessage({ content: 'test' });

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('isAvailable 应返回正确的状态', async () => {
    expect(channel.isAvailable()).toBe(true);

    await channel.stop();

    expect(channel.isAvailable()).toBe(false);
  });
});

describe('CLIChannel', () => {
  let channel: CLIChannel;

  beforeEach(() => {
    channel = new CLIChannel();
  });

  afterEach(async () => {
    await channel.stop();
  });

  it('应正确设置用户 ID', () => {
    channel.setUserId('custom-user');
    expect((channel as unknown as { currentUserId: string }).currentUserId).toBe('custom-user');
  });

  it('应正确设置会话 ID', () => {
    channel.setConversationId('conv-123');
    expect((channel as unknown as { currentConversationId?: string }).currentConversationId).toBe(
      'conv-123'
    );
  });

  it('应正确生成 Session ID', async () => {
    channel.setUserId('test-user');

    const message: IncomingMessage = {
      channelId: 'cli',
      userId: 'test-user',
      content: 'Hello',
    };

    const sessionId = channel.makeSessionId(message);
    expect(sessionId).toBe('cli:test-user');
  });
});

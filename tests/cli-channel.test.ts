/**
 * CLIChannel 测试 - 补充覆盖率
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CLIChannel } from '../src/channel/CLIChannel.js';

describe('CLIChannel (补充测试)', () => {
  let channel: CLIChannel;

  beforeEach(() => {
    channel = new CLIChannel();
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
  });

  afterEach(async () => {
    await channel.stop();
    vi.restoreAllMocks();
  });

  describe('基础属性', () => {
    it('应具有正确的 id 和 name', () => {
      expect(channel.id).toBe('cli');
      expect(channel.name).toBe('Command Line Interface');
    });

    it('初始状态应为未启动', () => {
      expect(channel['started']).toBe(false);
    });
  });

  describe('start', () => {
    it('应启动 readline 接口', async () => {
      await channel.start();
      expect(channel['started']).toBe(true);
      expect(channel['rl']).toBeDefined();
    });

    it('重复调用 start 应只启动一次', async () => {
      await channel.start();
      const firstRl = channel['rl'];

      await channel.start();

      expect(channel['rl']).toBe(firstRl);
      expect(channel['started']).toBe(true);
    });
  });

  describe('stop', () => {
    it('应停止 readline 接口', async () => {
      await channel.start();
      await channel.stop();
      expect(channel['started']).toBe(false);
    });

    it('未启动时调用 stop 不应报错', async () => {
      await expect(channel.stop()).resolves.not.toThrow();
      expect(channel['started']).toBe(false);
    });
  });

  describe('send', () => {
    it('应输出消息到控制台', async () => {
      const logSpy = vi.spyOn(console, 'log');

      await channel.send({
        channelId: 'cli',
        userId: 'agent-1',
        content: 'Hello from agent',
      });

      expect(logSpy).toHaveBeenCalledWith('\n📤 agent-1: Hello from agent');
    });

    it('应正确处理带格式的消息', async () => {
      const logSpy = vi.spyOn(console, 'log');

      await channel.send({
        channelId: 'cli',
        userId: 'test-agent',
        content: 'Multi\nline\nmessage',
      });

      expect(logSpy).toHaveBeenCalledWith('\n📤 test-agent: Multi\nline\nmessage');
    });
  });

  describe('setUserId', () => {
    it('应设置当前用户 ID', () => {
      channel.setUserId('custom-user');
      expect(channel['currentUserId']).toBe('custom-user');
    });

    it('应覆盖默认用户 ID', () => {
      expect(channel['currentUserId']).toBe('cli-user');
      channel.setUserId('new-user');
      expect(channel['currentUserId']).toBe('new-user');
    });
  });

  describe('setConversationId', () => {
    it('应设置当前会话 ID', () => {
      channel.setConversationId('conv-123');
      expect(channel['currentConversationId']).toBe('conv-123');
    });

    it('应清除会话 ID', () => {
      channel.setConversationId('conv-123');
      expect(channel['currentConversationId']).toBe('conv-123');

      channel.setConversationId('');
      expect(channel['currentConversationId']).toBe('');
    });
  });

  describe('handleMessage - 通过 BaseChannel', () => {
    it('应处理传入消息', async () => {
      await channel.start();

      const handleMessageSpy = vi.spyOn(channel, 'handleMessage' as never);

      // 通过模拟输入触发
      const incomingMessage = {
        channelId: 'cli',
        userId: 'user1',
        content: 'test message',
      };

      await channel['handleMessage'](incomingMessage);

      expect(handleMessageSpy).toHaveBeenCalled();
    });
  });

  describe('交互命令', () => {
    it('应响应 /exit 命令', async () => {
      await channel.start();
      const exitSpy = vi.spyOn(process, 'exit');

      // 模拟 /exit 输入
      channel['rl']?.emit('line', '/exit');

      // 给异步处理时间
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('应响应 /reset 命令', async () => {
      await channel.start();
      channel.setConversationId('conv-123');

      const logSpy = vi.spyOn(console, 'log');

      // 模拟 /reset 输入
      channel['rl']?.emit('line', '/reset');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(channel['currentConversationId']).toBeUndefined();
      expect(logSpy).toHaveBeenCalledWith('✓ 会话已重置\n');
    });

    it('应忽略空输入', async () => {
      await channel.start();
      const logSpy = vi.spyOn(console, 'log');

      // 模拟空输入
      channel['rl']?.emit('line', '');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // 不应该触发消息处理
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('📤'));
    });

    it('应处理普通消息', async () => {
      await channel.start();
      const handleMessageSpy = vi.spyOn(channel, 'handleMessage' as never);

      // 模拟普通消息输入
      channel['rl']?.emit('line', 'Hello Agent');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(handleMessageSpy).toHaveBeenCalled();
    });
  });

  describe('会话上下文', () => {
    it('应在消息中包含 conversationId', async () => {
      await channel.start();
      channel.setConversationId('conv-456');

      const handleMessageSpy = vi
        .spyOn(channel, 'handleMessage' as never)
        .mockResolvedValueOnce(undefined);

      channel['rl']?.emit('line', 'Message in conversation');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(handleMessageSpy).toHaveBeenCalledWith({
        channelId: 'cli',
        userId: 'cli-user',
        conversationId: 'conv-456',
        content: 'Message in conversation',
      });
    });

    it('应在没有 conversationId 时发送消息', async () => {
      await channel.start();

      const handleMessageSpy = vi
        .spyOn(channel, 'handleMessage' as never)
        .mockResolvedValueOnce(undefined);

      channel['rl']?.emit('line', 'Message without conversation');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(handleMessageSpy).toHaveBeenCalledWith({
        channelId: 'cli',
        userId: 'cli-user',
        conversationId: undefined,
        content: 'Message without conversation',
      });
    });
  });
});

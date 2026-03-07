/**
 * Channel E2E 测试
 * 测试钉钉和飞书 Channel 的完整消息流程，包括重试机制
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DingTalkChannel } from '../src/channel/DingTalkChannel.js';
import { FeishuChannel } from '../src/channel/FeishuChannel.js';
import { MessageBus } from '../src/message/MessageBus.js';
import { JSONLMessageStore } from '../src/message/JSONLMessageStore.js';
import { RetryScheduler } from '../src/reliability/RetryScheduler.js';
import { MessageStatus } from '../src/core/IMessageStore.js';
import type { IncomingMessage, OutgoingMessage } from '../src/channel/types.js';
import type { Message } from '../src/message/types.js';
import fs from 'fs/promises';
import { tmpdir } from 'os';

describe('Channel E2E 测试', () => {
  let tempDir: string;
  let messageStore: JSONLMessageStore;
  let messageBus: MessageBus;
  let retryScheduler: RetryScheduler;

  beforeEach(async () => {
    // 创建临时目录
    tempDir = `${tmpdir()}/channel-e2e-${Date.now()}`;
    await fs.mkdir(tempDir, { recursive: true });

    // 初始化组件
    messageStore = new JSONLMessageStore(tempDir);
    await messageStore.init();
    messageBus = new MessageBus(messageStore);
    retryScheduler = new RetryScheduler(messageStore, messageBus, {
      interval: 100,
      timeoutMs: 500,
      maxRetries: 2,
    });

    await messageBus.start();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock fetch API for Feishu
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        msg: 'success',
        data: { tenant_access_token: 'test-token' },
      }),
    }) as any;
  });

  afterEach(async () => {
    retryScheduler.stop();
    await messageBus.stop();
    await messageStore.destroy();

    // 清理临时目录
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }

    vi.restoreAllMocks();
  });

  describe('DingTalkChannel 完整消息流程', () => {
    let dingTalkChannel: DingTalkChannel;
    let receivedMessages: IncomingMessage[] = [];

    beforeEach(async () => {
      dingTalkChannel = new DingTalkChannel({
        appKey: 'test-app-key',
        appSecret: 'test-app-secret',
      });

      dingTalkChannel.onMessage((msg) => {
        receivedMessages.push(msg);
      });

      await dingTalkChannel.start();
      receivedMessages = [];
    });

    afterEach(async () => {
      await dingTalkChannel.stop();
    });

    it('应完成完整的消息接收和发送流程', async () => {
      // 1. 模拟接收 Webhook 消息
      const webhookData = {
        conversationId: 'conv123',
        conversationType: '1',
        userId: { staffId: 'staff456' },
        content: { contentType: 'text', text: 'Hello from DingTalk' },
        msgId: 'msg789',
        msgType: 'text',
        senderId: { staffId: 'staff456' },
        senderNick: 'Test User',
        createAt: Date.now(),
      };

      await dingTalkChannel.handleWebhook(webhookData);

      // 2. 验证消息被接收
      expect(receivedMessages.length).toBe(1);
      const incomingMsg = receivedMessages[0];
      expect(incomingMsg.channelId).toBe('dingtalk');
      expect(incomingMsg.userId).toBe('staff456');
      expect(incomingMsg.content).toBe('Hello from DingTalk');

      // 3. 模拟发送响应消息
      const outgoingMsg: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'staff456',
        conversationId: 'conv123',
        content: 'Response message',
      };

      await dingTalkChannel.send(outgoingMsg);

      // 4. 验证 sessionId 生成
      const sessionId = dingTalkChannel.makeSessionId(incomingMsg);
      // 当有 conversationId 时，sessionId 应该包含 conversationId
      expect(sessionId).toBe('dingtalk:conv123:staff456');
    });

    it('应正确处理群聊消息', async () => {
      const groupWebhookData = {
        conversationId: 'group123',
        conversationType: '2',
        userId: { staffId: 'staff789' },
        content: { contentType: 'text', text: 'Group message' },
        msgId: 'msg456',
        msgType: 'text',
        senderId: { staffId: 'staff789' },
        senderNick: 'Group User',
        createAt: Date.now(),
      };

      await dingTalkChannel.handleWebhook(groupWebhookData);

      expect(receivedMessages.length).toBe(1);
      const msg = receivedMessages[0];
      expect(msg.conversationId).toBe('group123');

      const sessionId = dingTalkChannel.makeSessionId(msg);
      expect(sessionId).toBe('dingtalk:group123:staff789');
    });
  });

  describe('DingTalkChannel 消息发送失败重试机制', () => {
    let dingTalkChannel: DingTalkChannel;
    let sendAttempts: number = 0;
    let sendShouldFail: boolean = true;

    beforeEach(async () => {
      dingTalkChannel = new DingTalkChannel({
        appKey: 'test-app-key',
        appSecret: 'test-app-secret',
      });

      // Mock send 方法使其前两次失败，第三次成功
      const originalSend = dingTalkChannel.send.bind(dingTalkChannel);
      dingTalkChannel.send = async (message: OutgoingMessage): Promise<void> => {
        sendAttempts++;
        if (sendShouldFail && sendAttempts < 3) {
          throw new Error('Send failed');
        }
        return originalSend(message);
      };

      await dingTalkChannel.start();
    });

    afterEach(async () => {
      await dingTalkChannel.stop();
    });

    it('应在消息发送失败后自动重试', async () => {
      sendAttempts = 0;
      sendShouldFail = false;

      // 创建一个测试消息
      const testMessage: Message = {
        id: 'test-msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent',
        to: 'user',
        sessionId: 'dingtalk:test-user',
        type: 'response',
        payload: { data: 'Test message' },
        ack: { required: true, timeout: 30000, retry: 3 },
      };

      // 保存消息到 store
      await messageStore.save({
        ...testMessage,
        status: MessageStatus.PENDING,
        retryCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 启动重试调度器
      retryScheduler.start();

      // 等待重试
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 验证消息被重新发送
      const updated = await messageStore.get(testMessage.id);
      expect(updated).not.toBeNull();
    });

    it('应在达到最大重试次数后标记为死信', async () => {
      sendAttempts = 0;
      sendShouldFail = true;

      const oldTime = Date.now() - 1000;
      const testMessage: Message = {
        id: 'test-msg-dead',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent',
        to: 'user',
        sessionId: 'dingtalk:test-user',
        type: 'response',
        payload: { data: 'Test message' },
        ack: { required: true, timeout: 30000, retry: 3 },
      };

      await messageStore.save({
        ...testMessage,
        status: MessageStatus.PENDING,
        retryCount: 2, // 已达到最大重试次数
        createdAt: oldTime,
        updatedAt: oldTime,
      });

      retryScheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      const updated = await messageStore.get(testMessage.id);
      expect(updated?.status).toBe(MessageStatus.DEAD_LETTER);
      expect(updated?.error).toBe('Max retries exceeded');
    });
  });

  describe('FeishuChannel 完整消息流程', () => {
    let feishuChannel: FeishuChannel;
    let receivedMessages: IncomingMessage[] = [];

    beforeEach(async () => {
      feishuChannel = new FeishuChannel({
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      });

      feishuChannel.onMessage((msg) => {
        receivedMessages.push(msg);
      });

      await feishuChannel.start();
      receivedMessages = [];
    });

    afterEach(async () => {
      await feishuChannel.stop();
    });

    it('应完成完整的消息接收和发送流程', async () => {
      // 1. 模拟接收事件
      const eventData = {
        schema: '2.0',
        header: {
          event_id: 'event123',
          event_type: 'im.message.receive_v1',
          create_time: String(Date.now()),
          token: 'token123',
          app_id: 'app123',
          tenant_key: 'tenant123',
        },
        event: {
          sender: {
            sender_id: {
              open_id: 'ou_user123',
              union_id: 'on_user123',
              user_id: 'user123',
            },
            sender_type: 'user',
            tenant_key: 'tenant123',
          },
          message: {
            message_id: 'msg456',
            chat_type: 'p2p',
            chat_id: 'chat789',
            content: JSON.stringify({ text: 'Hello from Feishu' }),
            create_time: String(Date.now()),
          },
        },
      };

      await feishuChannel.handleEvent(eventData);

      // 2. 验证消息被接收
      expect(receivedMessages.length).toBe(1);
      const incomingMsg = receivedMessages[0];
      expect(incomingMsg.channelId).toBe('feishu');
      expect(incomingMsg.userId).toBe('ou_user123');
      expect(incomingMsg.content).toBe('Hello from Feishu');

      // 3. 模拟发送响应消息
      const outgoingMsg: OutgoingMessage = {
        channelId: 'feishu',
        userId: 'ou_user123',
        conversationId: 'chat789',
        content: 'Response message',
      };

      await feishuChannel.send(outgoingMsg);
    });

    it('应正确处理群聊消息', async () => {
      const groupEventData = {
        schema: '2.0',
        header: {
          event_id: 'event456',
          event_type: 'im.message.receive_v1',
          create_time: String(Date.now()),
          token: 'token456',
          app_id: 'app123',
          tenant_key: 'tenant123',
        },
        event: {
          sender: {
            sender_id: {
              open_id: 'ou_user456',
              union_id: 'on_user456',
              user_id: 'user456',
            },
            sender_type: 'user',
            tenant_key: 'tenant123',
          },
          message: {
            message_id: 'msg789',
            chat_type: 'group',
            chat_id: 'group123',
            content: JSON.stringify({ text: 'Group message' }),
            create_time: String(Date.now()),
          },
        },
      };

      await feishuChannel.handleEvent(groupEventData);

      expect(receivedMessages.length).toBe(1);
      const msg = receivedMessages[0];
      expect(msg.conversationId).toBe('group123');
      expect(msg.threadId).toBe('msg789');
    });

    it('应忽略非消息事件', async () => {
      const nonMessageEventData = {
        schema: '2.0',
        header: {
          event_id: 'event789',
          event_type: 'im.chat.member.deleted_v1',
          create_time: String(Date.now()),
          token: 'token789',
          app_id: 'app123',
          tenant_key: 'tenant123',
        },
        event: undefined,
      };

      await feishuChannel.handleEvent(nonMessageEventData);

      expect(receivedMessages.length).toBe(0);
    });
  });

  describe('RetryScheduler 与 Channel 集成', () => {
    it('应与 DingTalkChannel 协同处理超时消息', async () => {
      const dingTalkChannel = new DingTalkChannel({
        appKey: 'test-app-key',
        appSecret: 'test-app-secret',
      });

      await dingTalkChannel.start();

      // 创建一个超时消息，to 字段是 user
      const oldTime = Date.now() - 1000;
      const testMessage: Message = {
        id: 'timeout-msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent',
        to: 'user',
        sessionId: 'dingtalk:test-user',
        type: 'response',
        payload: { data: 'Test timeout message' },
        ack: { required: true, timeout: 30000, retry: 3 },
      };

      await messageStore.save({
        ...testMessage,
        status: MessageStatus.PROCESSING,
        retryCount: 0,
        createdAt: oldTime,
        updatedAt: oldTime,
      });

      // 订阅消息总线（使用 user 作为目标，因为 message.to 是 'user'）
      let retried = false;
      const unsubscribe = messageBus.subscribe('user', (msg) => {
        if (msg.id === testMessage.id) {
          retried = true;
        }
      });

      retryScheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(retried).toBe(true);

      unsubscribe();
      await dingTalkChannel.stop();
    });

    it('应与 FeishuChannel 协同处理失败消息', async () => {
      const feishuChannel = new FeishuChannel({
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      });

      await feishuChannel.start();

      // 创建一个失败消息，to 字段是 user
      const testMessage: Message = {
        id: 'failed-msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent',
        to: 'user',
        sessionId: 'feishu:test-user',
        type: 'response',
        payload: { data: 'Test failed message' },
        ack: { required: true, timeout: 30000, retry: 3 },
      };

      await messageStore.save({
        ...testMessage,
        status: MessageStatus.FAILED,
        retryCount: 0,
        error: 'Send failed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 订阅消息总线（使用 user 作为目标，因为 message.to 是 'user'）
      let retried = false;
      const unsubscribe = messageBus.subscribe('user', (msg) => {
        if (msg.id === testMessage.id) {
          retried = true;
        }
      });

      retryScheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(retried).toBe(true);

      unsubscribe();
      await feishuChannel.stop();
    });
  });

  describe('边界情况和错误处理', () => {
    it('应处理 DingTalk 空内容消息', async () => {
      const dingTalkChannel = new DingTalkChannel({
        appKey: 'test-app-key',
        appSecret: 'test-app-secret',
      });

      let receivedMessage: IncomingMessage | undefined;
      dingTalkChannel.onMessage((msg) => {
        receivedMessage = msg;
      });

      await dingTalkChannel.start();

      const emptyWebhookData = {
        conversationId: 'conv123',
        conversationType: '1',
        userId: { staffId: 'staff456' },
        content: { contentType: 'text', text: '' },
        msgId: 'msg789',
        msgType: 'text',
        senderId: { staffId: 'staff456' },
        senderNick: 'Test User',
        createAt: Date.now(),
      };

      await dingTalkChannel.handleWebhook(emptyWebhookData);

      expect(receivedMessage).toBeDefined();
      expect(receivedMessage?.content).toBe('');

      await dingTalkChannel.stop();
    });

    it('应处理 Feishu 空 content 事件', async () => {
      const feishuChannel = new FeishuChannel({
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      });

      let receivedMessage: IncomingMessage | undefined;
      feishuChannel.onMessage((msg) => {
        receivedMessage = msg;
      });

      await feishuChannel.start();

      const emptyContentEventData = {
        schema: '2.0',
        header: {
          event_id: 'event123',
          event_type: 'im.message.receive_v1',
          create_time: String(Date.now()),
          token: 'token123',
          app_id: 'app123',
          tenant_key: 'tenant123',
        },
        event: {
          sender: {
            sender_id: {
              open_id: 'ou_user123',
              union_id: 'on_user123',
              user_id: 'user123',
            },
            sender_type: 'user',
            tenant_key: 'tenant123',
          },
          message: {
            message_id: 'msg456',
            chat_type: 'p2p',
            chat_id: 'chat789',
            content: '',
            create_time: String(Date.now()),
          },
        },
      };

      await feishuChannel.handleEvent(emptyContentEventData);

      expect(receivedMessage).toBeDefined();
      expect(receivedMessage?.content).toBe('');

      await feishuChannel.stop();
    });

    it('应处理并发消息发送', async () => {
      const dingTalkChannel = new DingTalkChannel({
        appKey: 'test-app-key',
        appSecret: 'test-app-secret',
      });

      await dingTalkChannel.start();

      // 并发发送多条消息
      const sendPromises = Array.from({ length: 10 }, (_, i) =>
        dingTalkChannel.send({
          channelId: 'dingtalk',
          userId: `user${i}`,
          content: `Message ${i}`,
        })
      );

      await expect(Promise.all(sendPromises)).resolves.not.toThrow();

      await dingTalkChannel.stop();
    });
  });
});

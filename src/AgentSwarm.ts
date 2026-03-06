/**
 * AgentSwarm - 主类，组装所有组件
 *
 * 消息路由规则：
 * 1. 外部消息 → Channel → Swarm → Agent
 * 2. Agent → Agent（通过 to 字段指定目标 Agent）
 * 3. Agent → 外部（通过 replyTo 字段指定响应目标）
 */

import type { AgentManager, MockResponseGenerator } from './agent/AgentManager.js';
import type { SessionManager } from './session/SessionManager.js';
import type { IChannel, IncomingMessage } from './channel/types.js';
import type { Message } from './message/types.js';
import type { IMessageBus } from './core/IMessageBus.js';
import type { ISessionStore } from './core/ISessionStore.js';
import { container } from './container.js';

export interface AgentSwarmOptions {
  defaultAgent?: string;
  agentsPath?: string;
  sessionsPath?: string;
  /**
   * Mock 响应生成器，用于测试时替代真实 LLM 调用
   */
  mockResponse?: MockResponseGenerator;
}

export class AgentSwarm {
  private agentManager!: AgentManager;
  private messageBus!: IMessageBus;
  private sessionManager!: SessionManager;
  private sessionStore!: ISessionStore;
  private channels = new Map<string, IChannel>();
  private defaultAgent: string;
  private unsubscribeMessageHandler?: () => void;
  private sessionsPath?: string;
  private agentsPath?: string;
  private mockResponse?: MockResponseGenerator;

  constructor(options: AgentSwarmOptions = {}) {
    this.defaultAgent = options.defaultAgent ?? 'default';
    this.sessionsPath = options.sessionsPath;
    this.agentsPath = options.agentsPath;
    this.mockResponse = options.mockResponse;
  }

  /**
   * 启动 Swarm
   */
  async start(): Promise<void> {
    const { AgentManager } = await import('./agent/AgentManager.js');
    const { MessageBus } = await import('./message/MessageBus.js');
    const { JSONLSessionStore } = await import('./session/JSONLSessionStore.js');
    const { SessionManager } = await import('./session/SessionManager.js');

    // 注册服务到容器
    const sessionsPath = this['sessionsPath'] ?? './sessions';

    container.register('agentManager', () => {
      const manager = new AgentManager({
        agentsPath: this.agentsPath,
        mockResponse: this.mockResponse,
      });
      manager.startCleanup();
      return manager;
    });

    container.register('sessionStore', () => {
      const store = new JSONLSessionStore(sessionsPath);
      store.init(); // 初始化存储
      return store;
    });

    container.register('messageBus', () => {
      const bus = new MessageBus();
      return bus;
    });

    container.register('sessionManager', () => {
      return new SessionManager(container.get<ISessionStore>('sessionStore'));
    });

    // 获取服务实例
    this.agentManager = container.get<AgentManager>('agentManager');
    this.sessionStore = container.get<ISessionStore>('sessionStore');
    this.messageBus = container.get<IMessageBus>('messageBus');
    this.sessionManager = container.get<SessionManager>('sessionManager');

    // 启动消息总线
    await this.messageBus.start();

    this.unsubscribeMessageHandler = this.messageBus.subscribe('*', this.handleMessage.bind(this));

    console.log('✓ AgentSwarm started');
  }

  /**
   * 注册 Channel
   */
  async registerChannel(channel: IChannel): Promise<void> {
    this.channels.set(channel.id, channel);

    channel.onMessage(async (incoming: IncomingMessage) => {
      await this.handleIncomingMessage(incoming, channel);
    });

    await channel.start();
    console.log(`✓ Channel registered: ${channel.name} (${channel.id})`);
  }

  /**
   * 处理来自外部 Channel 的消息
   */
  private async handleIncomingMessage(incoming: IncomingMessage, channel: IChannel): Promise<void> {
    const sessionId = channel.makeSessionId(incoming);

    await this.sessionManager.getOrCreate({
      channelId: incoming.channelId,
      channelUserId: incoming.userId,
      conversationId: incoming.conversationId,
      threadId: incoming.threadId,
    });

    // 构建完整的消息对象
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      version: '1.0',
      from: incoming.channelId,
      to: this.defaultAgent,
      sessionId,
      type: 'request',
      payload: {
        task: incoming.content,
        data: incoming.content,
      },
      ack: { required: false, timeout: 0, retry: 0 },
    };

    await this.messageBus.send(message);

    await this.sessionManager.touch(sessionId);
  }

  /**
   * 处理内部消息（支持 Agent 协作）
   */
  private async handleMessage(message: Message): Promise<void> {
    if (message.type === 'response' && !message.payload.workflow) {
      return;
    }
    const targets = Array.isArray(message.to) ? message.to : [message.to];

    for (const target of targets) {
      if (target === '*') continue;

      // 判断目标是 Agent 还是 Channel
      const isChannel = this.channels.has(target);

      if (isChannel) {
        // 发送到外部 Channel
        await this.sendToChannel(target, message);
      } else {
        // 发送到 Agent
        await this.sendToAgent(target, message);
      }
    }
  }

  /**
   * 发送消息到 Agent
   */
  private async sendToAgent(agentId: string, message: Message): Promise<void> {
    try {
      // 检查 Agent 是否存在
      if (!(await this.agentManager.exists(agentId))) {
        // 处理工作流错误
        await this.handleWorkflowError(message, new Error(`Agent not found: ${agentId}`));
        return;
      }

      // 将 Agent 添加到 Session
      await this.sessionStore.addAgent(message.sessionId, agentId);

      // 读取会话上下文
      const context = await this.sessionStore.loadContext(message.sessionId);

      // 构建增强的消息（注入上下文）
      const enhancedMessage: Message = {
        ...message,
        payload: {
          ...message.payload,
          context, // 注入会话上下文
        },
      };

      // 调用 Agent 处理
      const response = await this.agentManager.process(agentId, enhancedMessage);

      // 只有原始消息才触发工作流（不是工作流产生的消息）
      // 通过检查消息 ID 是否以 "workflow-" 开头来判断
      const isWorkflowMessage = message.id.startsWith('workflow-');
      if (!isWorkflowMessage) {
        // 处理工作流 oncomplete
        await this.handleWorkflowComplete(agentId, message, response);
      }

      // 构建响应消息
      const responseMessage: Message = {
        id: `${message.id}-response`,
        timestamp: Date.now(),
        version: '1.0',
        from: agentId,
        to: message.replyTo ?? message.from,
        sessionId: message.sessionId,
        type: 'response',
        correlationId: message.id,
        payload: { data: response },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      // 发送响应
      if (message.replyTo) {
        // 有明确的回复目标
        const replyTarget = message.replyTo;
        if (this.channels.has(replyTarget)) {
          await this.sendToChannel(replyTarget, responseMessage);
        } else {
          // 发送给其他 Agent
          await this.messageBus.send(responseMessage);
        }
      } else {
        // 默认发送回来源
        const from = message.from;
        if (this.channels.has(from)) {
          // 来源是 Channel，发送到外部
          await this.sendToChannel(from, responseMessage);
        } else if (await this.agentManager.exists(from)) {
          // 来源是 Agent，发送给 Agent
          await this.messageBus.send(responseMessage);
        }
      }
    } catch (error) {
      console.error(`Error processing message for agent ${agentId}:`, error);
      // 处理工作流错误
      await this.handleWorkflowError(message, error as Error);
    }
  }

  /**
   * 处理工作流完成（oncomplete）
   */
  private async handleWorkflowComplete(
    agentId: string,
    message: Message,
    response: unknown
  ): Promise<void> {
    const oncompleteTargets = message.payload.workflow?.oncomplete;
    if (!oncompleteTargets) return;

    const targets = Array.isArray(oncompleteTargets) ? oncompleteTargets : [oncompleteTargets];

    for (const target of targets) {
      const workflowMessage: Message = {
        id: `workflow-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        timestamp: Date.now(),
        version: '1.0',
        from: agentId,
        to: target,
        sessionId: message.sessionId,
        type: 'request',
        payload: { data: response },
        ack: { required: false, timeout: 0, retry: 0 },
      };
      await this.messageBus.send(workflowMessage);
    }
  }

  /**
   * 处理工作流错误（onerror）
   */
  private async handleWorkflowError(message: Message, error: Error): Promise<void> {
    const onerrorTargets = message.payload.workflow?.onerror;
    if (!onerrorTargets) return;

    const targets = Array.isArray(onerrorTargets) ? onerrorTargets : [onerrorTargets];

    for (const target of targets) {
      const errorMessage: Message = {
        id: `workflow-error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        timestamp: Date.now(),
        version: '1.0',
        from: message.from,
        to: target,
        sessionId: message.sessionId,
        type: 'error',
        payload: {
          data: {
            error: error.message,
            originalMessage: message,
          },
        },
        ack: { required: false, timeout: 0, retry: 0 },
      };
      await this.messageBus.send(errorMessage);
    }
  }

  /**
   * 发送消息到 Channel
   */
  private async sendToChannel(channelId: string, message: Message): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }

    try {
      await channel.send(channel.toOutgoing(message));
    } catch (error) {
      console.error(`Error sending to channel ${channelId}:`, error);
    }
  }

  /**
   * 获取 Channel（从 Session ID 提取 Channel ID）
   */
  getChannelFromSession(sessionId: string): IChannel | undefined {
    const channelId = sessionId.split(':')[0];
    return this.channels.get(channelId);
  }

  /**
   * 停止 Swarm
   */
  async stop(): Promise<void> {
    // 停止所有 Channel
    for (const channel of this.channels.values()) {
      await channel.stop();
    }
    this.channels.clear();

    // 取消消息订阅
    if (this.unsubscribeMessageHandler) {
      this.unsubscribeMessageHandler();
      this.unsubscribeMessageHandler = undefined;
    }

    // 停止消息总线
    if (this.messageBus) {
      await this.messageBus.stop();
    }

    // 销毁 AgentManager
    if (this.agentManager) {
      await this.agentManager.destroy();
    }

    console.log('✓ AgentSwarm stopped');
  }

  getAgentManager(): AgentManager {
    return this.agentManager;
  }

  getMessageBus(): IMessageBus {
    return this.messageBus;
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getSessionStore(): ISessionStore {
    return this.sessionStore;
  }
}

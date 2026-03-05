/**
 * AgentSwarm - 主类，组装所有组件
 */

import type { AgentManager } from './agent/AgentManager.js';
import type { MessageBus } from './message/MessageBus.js';
import type { SessionManager } from './session/SessionManager.js';
import type { IChannel, IncomingMessage } from './channel/types.js';
import type { Message } from './message/types.js';

export interface AgentSwarmOptions {
  defaultAgent?: string;
  agentsPath?: string;
  sessionsPath?: string;
}

export class AgentSwarm {
  private agentManager!: AgentManager;
  private messageBus!: MessageBus;
  private sessionManager!: SessionManager;
  private channels = new Map<string, IChannel>();
  private defaultAgent: string;

  constructor(options: AgentSwarmOptions = {}) {
    this.defaultAgent = options.defaultAgent ?? 'default';
  }

  /**
   * 启动 Swarm
   */
  async start(): Promise<void> {
    const { AgentManager } = await import('./agent/AgentManager.js');
    const { MessageBus } = await import('./message/MessageBus.js');
    const { JSONLSessionStore } = await import('./session/JSONLSessionStore.js');
    const { SessionManager } = await import('./session/SessionManager.js');

    this.agentManager = new AgentManager();
    this.messageBus = new MessageBus();
    const store = new JSONLSessionStore('./sessions');
    await store.init();
    this.sessionManager = new SessionManager(store);

    this.messageBus.subscribe('*', this.handleMessage.bind(this));

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

    await this.messageBus.send({
      from: incoming.channelId,
      to: this.defaultAgent,
      sessionId,
      type: 'request',
      payload: {
        task: incoming.content,
        data: incoming.content,
      },
    });

    await this.sessionManager.touch(sessionId);
  }

  /**
   * 处理内部消息
   */
  private async handleMessage(message: Message): Promise<void> {
    const targets = Array.isArray(message.to) ? message.to : [message.to];

    for (const target of targets) {
      if (target === '*') continue;

      try {
        const response = await this.agentManager.process(target, message);

        const channel = this.getChannelFromSession(message.sessionId);
        if (channel) {
          await channel.send(channel.toOutgoing({
            ...message,
            payload: { data: response },
          }));
        }
      } catch (error) {
        console.error(`Error processing message for agent ${target}:`, error);
      }
    }
  }

  /**
   * 获取 Channel
   */
  private getChannelFromSession(sessionId: string): IChannel | undefined {
    const channelId = sessionId.split(':')[0];
    return this.channels.get(channelId);
  }

  /**
   * 停止 Swarm
   */
  async stop(): Promise<void> {
    for (const channel of this.channels.values()) {
      await channel.stop();
    }
    this.channels.clear();
    console.log('✓ AgentSwarm stopped');
  }

  getAgentManager(): AgentManager {
    return this.agentManager;
  }

  getMessageBus(): MessageBus {
    return this.messageBus;
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }
}

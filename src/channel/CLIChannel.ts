/**
 * CLIChannel - 命令行测试通道
 */

import { createInterface } from 'readline';
import { BaseChannel } from './BaseChannel.js';
import type { IncomingMessage, OutgoingMessage } from './types.js';

export class CLIChannel extends BaseChannel {
  readonly id = 'cli';
  readonly name = 'Command Line Interface';

  private rl?: ReturnType<typeof createInterface>;
  private currentUserId = 'cli-user';
  private currentConversationId?: string;

  async start(): Promise<void> {
    if (this.started) return;

    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n🤖 Agent Swarm CLI');
    console.log('输入消息发送给 Agent，输入 /exit 退出\n');

    this.rl.on('line', async (input) => {
      const trimmed = input.trim();

      if (trimmed === '/exit') {
        await this.stop();
        process.exit(0);
        return;
      }

      if (trimmed === '/reset') {
        this.currentConversationId = undefined;
        console.log('✓ 会话已重置\n');
        this.prompt();
        return;
      }

      if (trimmed === '') {
        this.prompt();
        return;
      }

      // 发送消息
      const message: IncomingMessage = {
        channelId: this.id,
        userId: this.currentUserId,
        conversationId: this.currentConversationId,
        content: trimmed,
      };

      await this.handleMessage(message);
      this.prompt();
    });

    this.started = true;
    this.prompt();
  }

  async stop(): Promise<void> {
    if (!this.started) return;

    this.rl?.close();
    this.started = false;
  }

  async send(message: OutgoingMessage): Promise<void> {
    console.log(`\n📤 ${message.userId}: ${message.content}`);
  }

  private prompt(): void {
    this.rl?.prompt();
  }

  /**
   * 设置当前用户（用于测试）
   */
  setUserId(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * 设置当前会话（用于测试）
   */
  setConversationId(conversationId: string): void {
    this.currentConversationId = conversationId;
  }
}

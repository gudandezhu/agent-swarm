/**
 * TUI 交互测试脚本
 *
 * 测试 TUI 模式的完整交互流程：
 * 1. 启动 TUI
 * 2. 模拟用户输入
 * 3. 接收 Agent 响应
 */

import { AgentSwarm } from '../src/AgentSwarm.js';
import { PiTUIChannel } from '../src/channel/PiTUIChannel.js';
import type { Message } from '../src/message/types.js';

async function testTUIInteraction() {
  console.log('🧪 开始 TUI 交互测试...\n');

  // 设置 Mock API Key
  process.env.ANTHROPIC_API_KEY = 'sk-test-mock-key-for-tui-test';

  // 创建 AgentSwarm 实例，使用 mock 响应
  const swarm = new AgentSwarm({
    agentsPath: 'agents',
    defaultAgent: 'example',
    mockResponse: async (message: Message) => {
      const userInput = message.payload?.data || '';
      console.log(`📨 收到用户消息: ${userInput}`);

      // 模拟 AI 响应
      const response = `这是对"${userInput}"的测试响应。\n\n**Markdown 测试**：\n- 列表项 1\n- 列表项 2\n\n\`\`\`javascript\nconsole.log('代码块测试');\n\`\`\``;

      console.log(`📤 发送 AI 响应: ${response.substring(0, 30)}...`);
      return response;
    },
  });

  try {
    // 启动服务
    console.log('✅ 启动 AgentSwarm...');
    await swarm.start();
    console.log('✅ AgentSwarm 启动成功\n');

    // 注册 TUI Channel（但不实际启动 TUI，因为无法自动化）
    const tuiChannel = new PiTUIChannel();
    console.log('✅ 创建 TUI Channel');

    // 手动触发消息处理流程
    console.log('\n📝 模拟交互流程：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 模拟用户消息
    const testMessage: Message = {
      id: 'msg-tui-test-1',
      timestamp: Date.now(),
      version: '1.0',
      from: 'user',
      to: 'example',
      sessionId: 'tui:test-session',
      type: 'request',
      payload: { data: '你好，请介绍一下自己' },
      ack: { required: false, timeout: 0, retry: 0 },
    };

    // 处理消息
    console.log('\n1️⃣ 用户输入: 你好，请介绍一下自己');
    const response = await swarm.getAgentManager().process('example', testMessage);

    console.log('\n2️⃣ Agent 响应:');
    console.log('─'.repeat(60));
    console.log(response);
    console.log('─'.repeat(60));

    console.log('\n✅ TUI 交互测试完成！');
    console.log('\n💡 手动测试步骤：');
    console.log('   1. 运行: swarm');
    console.log('   2. 在 TUI 中输入: 你好');
    console.log('   3. 等待 Agent 响应');
    console.log('   4. 检查 Markdown 渲染');
    console.log('   5. 输入 /exit 退出');

    await swarm.stop();
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testTUIInteraction().catch(console.error);

/**
 * Cron 完整使用示例
 *
 * 演示如何在 agent-swarm 中使用定时任务功能
 */

import { AgentCron } from '../src/agent/index.js';
import { AgentManager } from '../src/agent/AgentManager.js';
import { CronParser } from '../src/cron/CronParser.js';
import type { Message } from '../src/message/types.js';
import type { CronTaskConfig } from '../src/cron/types.js';

// ============================================================
// 示例 1：基本使用 - 用户请求定时任务
// ============================================================

async function example1_basicUsage() {
  console.log('\n=== 示例 1：基本使用 ===\n');

  // 1. 用户输入
  const userInput = '每天早上9点提醒我汇报工作';
  console.log(`用户请求: ${userInput}`);

  // 2. 解析自然语言（简单模式）
  const parsed = CronParser.parseNaturalLanguage(userInput);
  console.log(`解析结果:`, JSON.stringify(parsed, null, 2));

  // 3. 生成配置
  const config: CronTaskConfig = CronParser.normalize({
    ...parsed!,
    agentId: 'manager',
    task: userInput,
    handler: 'report',
  });

  console.log(`配置:`, JSON.stringify(config, null, 2));

  // 4. 创建 Cron
  const cron = new AgentCron({
    agentId: 'manager',
    persistent: true,
    sendMessage: async (message: Message) => {
      console.log(`→ 发送消息给 ${message.to}: ${message.payload.task}`);
      // 实际使用时，这里会通过 messageBus 发送
    },
  });

  // 5. 调度任务
  const jobId = await cron.scheduleFromConfig(config);
  console.log(`任务已创建，ID: ${jobId}`);

  // 6. 查看任务列表
  const jobs = cron.listJobs();
  console.log(`\n当前任务列表:`);
  jobs.forEach((job) => {
    console.log(`  - ${job.config.task} (${job.config.schedule})`);
  });

  // 清理
  await cron.destroy();
}

// ============================================================
// 示例 2：Agent Skill - 智能解析
// ============================================================

async function example2_agentSkill() {
  console.log('\n=== 示例 2：Agent Skill 智能解析 ===\n');

  // 用户与 Agent 对话
  const conversations = [
    '每天早上9点提醒我开会',
    '每30分钟检查一下任务进度',
    '每周一上午10点生成周报',
    '每天晚上10点清理临时文件',
  ];

  console.log('用户可以通过自然语言设置定时任务：\n');
  conversations.forEach((input) => {
    const parsed = CronParser.parseNaturalLanguage(input);
    if (parsed) {
      console.log(`"${input}"`);
      console.log(`  → ${parsed.schedule}\n`);
    }
  });
}

// ============================================================
// 示例 3：多 Agent 协作
// ============================================================

async function example3_multiAgent() {
  console.log('\n=== 示例 3：多 Agent 协作 ===\n');

  // 创建三个 Agent 的 Cron
  const managerCron = new AgentCron({
    agentId: 'manager',
    persistent: true,
    sendMessage: async (message: Message) => {
      console.log(`[Manager] 收到定时任务: ${message.payload.task}`);
    },
  });

  const developerCron = new AgentCron({
    agentId: 'developer',
    persistent: true,
    sendMessage: async (message: Message) => {
      console.log(`[Developer] 收到定时任务: ${message.payload.task}`);
    },
  });

  const testerCron = new AgentCron({
    agentId: 'tester',
    persistent: true,
    sendMessage: async (message: Message) => {
      console.log(`[Tester] 收到定时任务: ${message.payload.task}`);
    },
  });

  // 为每个 Agent 设置任务
  await managerCron.schedule('每天早上9点汇报工作');
  await developerCron.schedule('每小时检查代码质量');
  await testerCron.schedule('每天晚上运行测试套件');

  console.log('\n已为三个 Agent 设置定时任务：');
  console.log(`- Manager: ${managerCron.listJobs().length} 个任务`);
  console.log(`- Developer: ${developerCron.listJobs().length} 个任务`);
  console.log(`- Tester: ${testerCron.listJobs().length} 个任务`);

  // 清理
  await managerCron.destroy();
  await developerCron.destroy();
  await testerCron.destroy();
}

// ============================================================
// 示例 4：任务管理
// ============================================================

async function example4_taskManagement() {
  console.log('\n=== 示例 4：任务管理 ===\n');

  const cron = new AgentCron({
    agentId: 'manager',
    persistent: false,
    sendMessage: async () => {},
  });

  // 创建任务
  const jobId = await cron.schedule('每天早上9点');
  console.log(`✓ 任务已创建: ${jobId}`);

  // 停止任务
  cron.stop(jobId);
  console.log(`✓ 任务已停止`);

  // 恢复任务
  cron.resume(jobId);
  console.log(`✓ 任务已恢复`);

  // 查看状态
  const job = cron.getJob(jobId);
  console.log(`✓ 任务状态: ${job?.enabled ? '运行中' : '已停止'}`);

  // 删除任务
  await cron.remove(jobId);
  console.log(`✓ 任务已删除`);

  // 清理
  await cron.destroy();
}

// ============================================================
// 示例 5：高级配置
// ============================================================

async function example5_advancedConfig() {
  console.log('\n=== 示例 5：高级配置 ===\n');

  const cron = new AgentCron({
    agentId: 'manager',
    persistent: true,
    timezone: 'Asia/Shanghai',
    sendMessage: async (message: Message) => {
      console.log(`触发任务: ${message.payload.task}`);
    },
  });

  // 使用完整配置
  const config: CronTaskConfig = {
    agentId: 'manager',
    schedule: '0 9 * * 1', // 每周一早上9点
    task: '每周一上午例会',
    handler: 'reminder',
    timezone: 'Asia/Shanghai',
    metadata: {
      priority: 'high',
      category: 'meeting',
    },
  };

  const jobId = await cron.scheduleFromConfig(config);
  console.log(`✓ 高级任务已创建: ${jobId}`);
  console.log(`  - 调度: ${config.schedule}`);
  console.log(`  - 处理器: ${config.handler}`);
  console.log(`  - 元数据: ${JSON.stringify(config.metadata)}`);

  // 清理
  await cron.destroy();
}

// ============================================================
// 运行所有示例
// ============================================================

async function main() {
  try {
    await example1_basicUsage();
    await example2_agentSkill();
    await example3_multiAgent();
    await example4_taskManagement();
    await example5_advancedConfig();

    console.log('\n✅ 所有示例运行完成！\n');
  } catch (error) {
    console.error('示例运行失败:', error);
    process.exit(1);
  }
}

// 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  example1_basicUsage,
  example2_agentSkill,
  example3_multiAgent,
  example4_taskManagement,
  example5_advancedConfig,
};

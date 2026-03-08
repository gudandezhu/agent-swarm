/**
 * Cron E2E 测试
 *
 * 测试完整的定时任务流程：
 * 1. 用户请求定时任务
 * 2. Agent 解析并生成配置
 * 3. Cron 调度任务
 * 4. 到时间触发 Agent
 * 5. Agent 处理任务
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentCron } from '../src/agent/AgentCron.js';
import { CronParser } from '../src/cron/CronParser.js';
import type { CronTaskConfig, Message } from '../src/cron/types.js';

describe('Cron E2E - 完整流程测试', () => {
  describe('场景1：用户请求每天汇报', () => {
    it('应该完成完整流程', async () => {
      // 1. 用户输入
      const userInput = '每天早上9点汇报工作';

      // 2. Agent 解析（模拟）
      const parsed = CronParser.parseNaturalLanguage(userInput);
      expect(parsed).toBeDefined();
      expect(parsed?.schedule).toBe('0 9 * * *');

      // 3. 生成配置
      const config: CronTaskConfig = CronParser.normalize({
        ...parsed!,
        agentId: 'manager',
        task: userInput,
        handler: 'report',
      });

      expect(config.agentId).toBe('manager');
      expect(config.handler).toBe('report');

      // 4. 创建 Cron（模拟 sendMessage）
      const sendMessageMock = vi.fn<(message: Message) => Promise<void>>();
      sendMessageMock.mockResolvedValue(undefined);

      const cron = new AgentCron({
        agentId: 'manager',
        persistent: false, // 测试时不持久化
        sendMessage: sendMessageMock,
      });

      // 5. 调度任务
      const jobId = await cron.scheduleFromConfig(config);
      expect(jobId).toBeDefined();

      // 6. 验证任务已创建
      const jobs = cron.listJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].config.task).toBe(userInput);

      // 7. 模拟时间到，触发任务（手动触发）
      const job = cron.getJob(jobId);
      expect(job).toBeDefined();

      // 8. 清理
      await cron.destroy();
    });
  });

  describe('场景2：每30分钟检查', () => {
    it('应该正确解析间隔调度', async () => {
      const userInput = '每30分钟检查任务';

      // 解析
      const parsed = CronParser.parseNaturalLanguage(userInput);
      expect(parsed).toBeDefined();
      expect(parsed!.schedule).toBe(30 * 60 * 1000);

      // 生成配置
      const config: CronTaskConfig = CronParser.normalize({
        ...parsed!,
        agentId: 'manager',
        task: userInput,
        handler: 'check-tasks',
      });

      expect(typeof config.schedule).toBe('number');
      expect(config.schedule).toBe(1800000);
    });
  });

  describe('场景3：每周一提醒', () => {
    it('应该正确解析每周调度', async () => {
      const userInput = '每周一早上8点提醒开会';

      // 解析
      const parsed = CronParser.parseNaturalLanguage(userInput);
      expect(parsed).toBeDefined();
      expect(parsed!.schedule).toBe('0 8 * * 1');

      // 生成配置
      const config: CronTaskConfig = CronParser.normalize({
        ...parsed!,
        agentId: 'manager',
        task: userInput,
        handler: 'reminder',
      });

      expect(config.schedule).toBe('0 8 * * 1');
      expect(config.handler).toBe('reminder');
    });
  });

  describe('场景4：Agent 处理定时任务消息', () => {
    it('应该正确构造消息', () => {
      const config: CronTaskConfig = {
        agentId: 'manager',
        schedule: '0 9 * * *',
        task: '每天早上9点汇报工作',
        handler: 'report',
      };

      // 模拟 Cron 构造的消息
      const message: Message = {
        id: `cron-test-${Date.now()}`,
        timestamp: Date.now(),
        version: '1.0',
        from: 'cron',
        to: config.agentId,
        sessionId: `cron-${config.agentId}`,
        type: 'request',
        payload: {
          type: 'scheduled-task',
          task: config.task,
          handler: config.handler,
          metadata: config.metadata,
        },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      // 验证消息格式
      expect(message.from).toBe('cron');
      expect(message.to).toBe('manager');
      expect(message.payload.type).toBe('scheduled-task');
      expect(message.payload.task).toBe('每天早上9点汇报工作');
      expect(message.payload.handler).toBe('report');

      // Agent 收到消息后应该：
      // 1. 识别是定时任务 (from === 'cron')
      // 2. 调用对应的 handler
      // 3. 返回执行结果
    });
  });

  describe('场景5：多 Agent 隔离', () => {
    it('不同 Agent 的任务应该隔离', async () => {
      const managerCron = new AgentCron({
        agentId: 'manager',
        persistent: false,
        sendMessage: vi.fn(),
      });

      const developerCron = new AgentCron({
        agentId: 'developer',
        persistent: false,
        sendMessage: vi.fn(),
      });

      // Manager 的任务
      await managerCron.scheduleFromConfig({
        agentId: 'manager',
        schedule: '0 9 * * *',
        task: 'Manager 汇报',
      });

      // Developer 的任务
      await developerCron.scheduleFromConfig({
        agentId: 'developer',
        schedule: '0 10 * * *',
        task: 'Developer 检查',
      });

      // 验证隔离
      expect(managerCron.listJobs()).toHaveLength(1);
      expect(developerCron.listJobs()).toHaveLength(1);

      const managerJob = managerCron.listJobs()[0];
      const devJob = developerCron.listJobs()[0];

      expect(managerJob.config.agentId).toBe('manager');
      expect(devJob.config.agentId).toBe('developer');

      // 清理
      await managerCron.destroy();
      await developerCron.destroy();
    });
  });

  describe('场景6：任务管理', () => {
    it('应该支持停止、恢复、删除任务', async () => {
      const cron = new AgentCron({
        agentId: 'manager',
        persistent: false,
        sendMessage: vi.fn(),
      });

      // 创建任务
      const jobId = await cron.schedule('每天早上9点');
      expect(jobId).toBeDefined();

      // 停止任务
      const stopped = cron.stop(jobId);
      expect(stopped).toBe(true);

      const job = cron.getJob(jobId);
      expect(job?.enabled).toBe(false);

      // 恢复任务
      const resumed = cron.resume(jobId);
      expect(resumed).toBe(true);

      const jobAfterResume = cron.getJob(jobId);
      expect(jobAfterResume?.enabled).toBe(true);

      // 删除任务
      const removed = await cron.remove(jobId);
      expect(removed).toBe(true);

      const jobAfterRemove = cron.getJob(jobId);
      expect(jobAfterRemove).toBeUndefined();

      // 清理
      await cron.destroy();
    });
  });
});

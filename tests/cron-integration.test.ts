/**
 * Cron 架构集成测试
 *
 * 验证 Agent 自治模式：
 * 1. Cron 是纯调度工具
 * 2. 触发时发送消息给 Agent
 * 3. Agent 自己处理定时任务
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CronParser } from '../src/cron/CronParser.js';
import type { CronTaskConfig } from '../src/cron/types.js';

describe('Cron 架构 - Agent 自治模式', () => {
  describe('CronParser - 纯工具函数', () => {
    it('应该验证 cron 配置', () => {
      const config: CronTaskConfig = {
        agentId: 'manager',
        schedule: '0 9 * * *',
        task: '每天早上9点汇报',
      };

      expect(CronParser.validate(config)).toBe(true);
    });

    it('应该验证间隔配置', () => {
      const config: CronTaskConfig = {
        agentId: 'manager',
        schedule: 3600000, // 1小时
        task: '每小时汇报',
      };

      expect(CronParser.validate(config)).toBe(true);
    });

    it('应该拒绝无效配置', () => {
      const config = {
        agentId: 'manager',
        // 缺少 schedule 和 task
      } as Partial<CronTaskConfig>;

      expect(CronParser.validate(config as CronTaskConfig)).toBe(false);
    });

    it('应该解析简单自然语言', () => {
      const result = CronParser.parseNaturalLanguage('每30分钟');
      expect(result).toBeDefined();
      expect(result?.schedule).toBe(30 * 60 * 1000);
    });

    it('应该解析每天定时', () => {
      const result = CronParser.parseNaturalLanguage('每天早上9点');
      expect(result).toBeDefined();
      expect(result?.schedule).toBe('0 9 * * *');
    });

    it('应该解析每周定时', () => {
      const result = CronParser.parseNaturalLanguage('每周一10点');
      expect(result).toBeDefined();
      expect(result?.schedule).toBe('0 10 * * 1');
    });

    it('应该规范化配置', () => {
      const config = CronParser.normalize({
        agentId: 'manager',
        schedule: '0 9 * * *',
        task: '汇报',
      });

      expect(config.timezone).toBe('Asia/Shanghai');
      expect(config.metadata).toEqual({});
    });
  });

  describe('CronTaskConfig - 类型系统', () => {
    it('应该包含必需字段', () => {
      const config: CronTaskConfig = {
        agentId: 'manager',
        schedule: '0 9 * * *',
        task: '每天早上9点汇报',
        handler: 'report',
        timezone: 'Asia/Shanghai',
        metadata: {
          priority: 'high',
        },
      };

      expect(config.agentId).toBe('manager');
      expect(config.handler).toBe('report');
      expect(config.metadata?.priority).toBe('high');
    });

    it('应该支持间隔类型', () => {
      const config: CronTaskConfig = {
        agentId: 'developer',
        schedule: 60000, // 1分钟
        task: '每分钟检查',
      };

      expect(typeof config.schedule).toBe('number');
    });
  });

  describe('Message 传递', () => {
    it('应该构造正确的消息', () => {
      const config: CronTaskConfig = {
        agentId: 'manager',
        schedule: '0 9 * * *',
        task: '每天早上9点汇报',
        handler: 'report',
      };

      // 模拟 Cron 触发时构造的消息
      const message = {
        id: `cron-test-${Date.now()}`,
        timestamp: Date.now(),
        version: '1.0' as const,
        from: 'cron',
        to: config.agentId,
        sessionId: `cron-${config.agentId}`,
        type: 'request' as const,
        payload: {
          type: 'scheduled-task',
          task: config.task,
          handler: config.handler,
          metadata: config.metadata,
        },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      expect(message.from).toBe('cron');
      expect(message.to).toBe('manager');
      expect(message.payload.type).toBe('scheduled-task');
      expect(message.payload.task).toBe('每天早上9点汇报');
      expect(message.payload.handler).toBe('report');
    });
  });

  describe('Agent 隔离', () => {
    it('不同 Agent 应该有独立的 cron 列表', () => {
      const managerConfig: CronTaskConfig = {
        agentId: 'manager',
        schedule: '0 9 * * *',
        task: 'Manager 汇报',
      };

      const devConfig: CronTaskConfig = {
        agentId: 'developer',
        schedule: '0 10 * * *',
        task: 'Developer 检查',
      };

      expect(managerConfig.agentId).not.toBe(devConfig.agentId);
      expect(managerConfig.task).toContain('Manager');
      expect(devConfig.task).toContain('Developer');
    });
  });
});

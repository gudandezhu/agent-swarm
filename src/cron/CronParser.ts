/**
 * CronParser - Cron 配置验证和解析工具
 *
 * 注意：这是一个纯工具函数，不调用 LLM
 * 自然语言解析由 Agent 的 skill 负责
 */

import type { CronTaskConfig, ScheduleType } from './types.js';

/**
 * CronParser - 配置验证和规范化
 */
export class CronParser {
  /**
   * 验证 Cron 配置是否有效
   */
  static validate(config: CronTaskConfig): boolean {
    // 验证必需字段
    if (!config.agentId || !config.schedule || !config.task) {
      return false;
    }

    // 验证 schedule
    if (typeof config.schedule === 'number') {
      // 间隔类型
      return config.schedule > 0 && config.schedule < 365 * 24 * 60 * 60 * 1000;
    } else {
      // cron 表达式
      return CronParser.isValidCronExpression(config.schedule);
    }
  }

  /**
   * 验证 cron 表达式格式
   */
  static isValidCronExpression(expr: string): boolean {
    // 标准 cron 表达式：分 时 日 月 周
    const cronPattern =
      /^(\*|\d+|\d+-\d+|\d+\/\d+)\s+(\*|\d+|\d+-\d+|\d+\/\d+)\s+(\*|\d+|\d+-\d+|\d+\/\d+)\s+(\*|\d+|\d+-\d+|\d+\/\d+)\s+(\*|\d+|\d+-\d+|\d+\/\d+)$/;
    return cronPattern.test(expr);
  }

  /**
   * 获取调度类型
   */
  static getScheduleType(config: CronTaskConfig): ScheduleType {
    return typeof config.schedule === 'number' ? 'interval' : 'cron';
  }

  /**
   * 规范化配置
   */
  static normalize(config: Partial<CronTaskConfig>): CronTaskConfig {
    return {
      agentId: config.agentId || 'manager',
      schedule: config.schedule || '0 * * * *',
      task: config.task || '定时任务',
      handler: config.handler,
      timezone: config.timezone || 'Asia/Shanghai',
      metadata: config.metadata || {},
    };
  }

  /**
   * 从自然语言生成 cron 表达式的辅助方法
   *
   * 注意：这个方法只是简单的规则匹配
   * 复杂的自然语言解析应该由 Agent skill 完成
   */
  static parseNaturalLanguage(input: string): Partial<CronTaskConfig> | null {
    const lower = input.toLowerCase();

    // 简单间隔
    const intervalMatch = lower.match(/每(\d+)(分钟|小时|天)/);
    if (intervalMatch) {
      const num = parseInt(intervalMatch[1], 10);
      const unit = intervalMatch[2];

      const intervals: Record<string, number> = {
        分钟: 60 * 1000,
        小时: 60 * 60 * 1000,
        天: 24 * 60 * 60 * 1000,
      };

      return {
        schedule: num * intervals[unit],
        task: input,
        timezone: 'Asia/Shanghai',
      };
    }

    // 每天早上
    const dailyMatch = lower.match(/每天([早上|上午|下午|晚上]+)?(\d+)点/);
    if (dailyMatch) {
      const hour = parseInt(dailyMatch[2], 10);
      return {
        schedule: `0 ${hour} * * *`,
        task: input,
        timezone: 'Asia/Shanghai',
      };
    }

    // 每周
    const weeklyMatch = lower.match(/每周([一二三四五六七]+)(早上|上午|下午|晚上)?(\d+)点/);
    if (weeklyMatch) {
      const weekdayMap: Record<string, number> = {
        一: 1,
        二: 2,
        三: 3,
        四: 4,
        五: 5,
        六: 6,
        日: 0,
        七: 0,
        天: 0,
      };
      const hour = parseInt(weeklyMatch[3], 10);
      const weekday = weekdayMap[weeklyMatch[1]] || 1;

      return {
        schedule: `0 ${hour} * * ${weekday}`,
        task: input,
        timezone: 'Asia/Shanghai',
      };
    }

    return null;
  }
}

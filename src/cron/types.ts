/**
 * Cron 类型定义 - Agent 自治模式
 *
 * 核心理念：
 * - Cron 是纯调度工具，不解析自然语言
 * - Cron 触发时直接发给目标 agentId
 * - Agent 自己处理定时任务消息
 */

/**
 * 调度类型
 */
export type ScheduleType = 'cron' | 'interval';

/**
 * Cron 任务配置
 */
export interface CronTaskConfig {
  /**
   * 目标 Agent ID - 直接发给该 Agent
   */
  agentId: string;

  /**
   * 调度配置
   * - cron 表达式（如 "0 9 * * *"）
   * - 或毫秒间隔（如 3600000）
   */
  schedule: string | number;

  /**
   * 任务描述（自然语言）
   * Agent 收到后会用这个描述执行任务
   */
  task: string;

  /**
   * 可选：指定 Agent 的哪个 skill 处理
   */
  handler?: string;

  /**
   * 时区
   */
  timezone?: string;

  /**
   * 任务元数据
   */
  metadata?: Record<string, unknown>;
}

/**
 * Cron 任务实例
 */
export interface ScheduledCronJob {
  id: string;
  config: CronTaskConfig;
  cronInstance?: any; // Croner 实例
  intervalId?: ReturnType<typeof setInterval>;
  createdAt: number;
  lastRun?: number;
  nextRun?: number;
  enabled: boolean;
}

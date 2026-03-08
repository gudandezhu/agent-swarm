/**
 * AgentLoop - 定期触发 manager 汇报
 *
 * 功能：
 * - 定期触发 manager 生成汇报
 * - 汇总 Session 状态和活跃 Agents
 * - 扫描未完成任务
 * - 主动推送到所有活跃 Channel
 *
 * 使用 AgentCron 实现 AI-Native 调度（Agent 级别隔离）
 */

import type { AgentSwarm } from '../AgentSwarm.js';
import type { Message } from '../message/types.js';
import { DEFAULTS } from '../constants.js';
import { TaskManager } from '../task/TaskManager.js';
import { AgentCron } from './AgentCron.js';
import { getGlobalCronRegistry } from '../cron/CronRegistry.js';
import { CronParser } from '../cron/CronParser.js';

export interface AgentLoopOptions {
  /**
   * 汇报间隔（毫秒）或自然语言描述
   * 默认 "每5分钟"
   */
  interval?: number | string;

  /**
   * 默认 manager agent ID
   */
  managerId?: string;

  /**
   * 是否启用（可配置关闭）
   */
  enabled?: boolean;

  /**
   * Agents 目录路径
   */
  agentsPath?: string;
}

export class AgentLoop {
  private swarm: AgentSwarm;
  private managerId: string;
  private enabled: boolean;
  private agentCron: AgentCron;
  private reportJobId?: string;
  private lastReportTime = 0;
  private interval: number | string;

  constructor(swarm: AgentSwarm, options: AgentLoopOptions = {}) {
    this.swarm = swarm;
    this.interval = options.interval ?? '每5分钟';
    this.managerId = options.managerId ?? DEFAULTS.AGENT_ID;
    this.enabled = options.enabled ?? true;

    // 创建 Agent 的 Cron 管理器（传入 sendMessage）
    this.agentCron = new AgentCron({
      agentId: this.managerId,
      agentsPath: options.agentsPath,
      persistent: true,
      sendMessage: async (message) => {
        const messageBus = this.swarm.getMessageBus();
        await messageBus.send(message);
      },
    });

    // 注册到全局注册表
    getGlobalCronRegistry().register(this.agentCron);
  }

  /**
   * 启动 Agent Loop
   */
  async start(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    if (this.reportJobId) {
      return; // 已启动
    }

    // 使用自然语言调度汇报任务
    const interval =
      typeof this.interval === 'string'
        ? this.interval
        : `每${Math.floor(this.interval / 60000)}分钟`;

    // 解析为 cron 配置
    const parsed = CronParser.parseNaturalLanguage(interval);
    if (!parsed) {
      throw new Error(`无法解析间隔: ${interval}`);
    }

    const config = CronParser.normalize({
      ...parsed,
      agentId: this.managerId,
      task: `定期汇报工作（${interval}）`,
      handler: 'report', // 指定使用 report skill
    });

    this.reportJobId = await this.agentCron.scheduleFromConfig(config);

    console.log(`[AgentLoop] 已启动，汇报间隔: ${interval}`);
  }

  /**
   * 停止 Agent Loop
   */
  stop(): void {
    if (this.reportJobId) {
      this.agentCron.stop(this.reportJobId);
      this.reportJobId = undefined;
    }
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    this.stop();
    await this.agentCron.destroy();
    getGlobalCronRegistry().unregister(this.managerId);
  }

  /**
   * 触发汇报
   */
  private async triggerReport(): Promise<void> {
    const now = Date.now();

    // 避免频繁汇报（至少间隔 1 分钟）
    if (now - this.lastReportTime < 60 * 1000) {
      return;
    }

    this.lastReportTime = now;

    try {
      // 1. 获取活跃的 Channels
      const activeChannels = this.getActiveChannels();

      if (activeChannels.length === 0) {
        return;
      }

      // 2. 生成汇报内容
      const report = await this.generateReport();

      // 3. 推送到所有活跃 Channel
      for (const channel of activeChannels) {
        await this.sendReportToChannel(channel, report);
      }
    } catch (error) {
      console.error('[AgentLoop] Failed to trigger report:', error);
    }
  }

  /**
   * 获取活跃的 Channel
   */
  private getActiveChannels(): string[] {
    const sessionStore = this.swarm.getSessionStore();
    const sessions = sessionStore.getAllSessions();

    // 提取唯一的 channel IDs
    const channelIds = new Set<string>();
    for (const session of sessions) {
      const channelId = session.id.split(':')[0];
      channelIds.add(channelId);
    }

    return Array.from(channelIds);
  }

  /**
   * 生成汇报内容
   */
  private async generateReport(): Promise<string> {
    const agentManager = this.swarm.getAgentManager();
    const sessionStore = this.swarm.getSessionStore();

    // 1. 获取所有已加载的 Agents
    const loadedAgents = agentManager.listLoaded();

    // 2. 获取活跃 Sessions
    const sessions = sessionStore.getAllSessions();
    const activeSessions = sessions.filter(
      (s: any) => Date.now() - s.lastActiveAt < 30 * 60 * 1000 // 30 分钟内有活动
    );

    // 3. 扫描任务
    const taskSummary = this.scanTasks(sessions);

    // 4. 构建汇报提示词
    const reportPrompt = this.buildReportPrompt({
      loadedAgents,
      activeSessions: activeSessions.length,
      totalSessions: sessions.length,
      taskSummary,
    });

    // 5. 调用 manager 生成汇报
    const reportMessage: Message = {
      id: `loop-report-${Date.now()}`,
      timestamp: Date.now(),
      version: '1.0',
      from: 'system',
      to: this.managerId,
      sessionId: 'system-loop',
      type: 'request',
      payload: {
        data: reportPrompt,
      },
      ack: { required: false, timeout: 0, retry: 0 },
    };

    try {
      const response = await agentManager.process(this.managerId, reportMessage);
      return response as string;
    } catch (error) {
      return `汇报生成失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * 扫描所有 Sessions 的任务
   */
  private scanTasks(sessions: any[]): {
    total: number;
    pending: number;
    overdue: number;
    highPriority: number;
    summary: string;
  } {
    let totalPending = 0;
    let totalOverdue = 0;
    let totalHighPriority = 0;
    const taskSummaries: string[] = [];

    for (const session of sessions) {
      const pendingTasks = TaskManager.getPendingTasks(session);
      const overdueTasks = TaskManager.getOverdueTasks(session);
      const highPriorityTasks = TaskManager.getHighPriorityPendingTasks(session);

      totalPending += pendingTasks.length;
      totalOverdue += overdueTasks.length;
      totalHighPriority += highPriorityTasks.length;

      if (pendingTasks.length > 0) {
        taskSummaries.push(
          `**${session.channelUserId}** (${pendingTasks.length} 个未完成任务)` +
            (overdueTasks.length > 0 ? `, ${overdueTasks.length} 个逾期` : '')
        );
      }
    }

    return {
      total: totalPending,
      pending: totalPending,
      overdue: totalOverdue,
      highPriority: totalHighPriority,
      summary: taskSummaries.join('\n') || '无未完成任务',
    };
  }

  /**
   * 构建汇报提示词
   */
  private buildReportPrompt(context: {
    loadedAgents: string[];
    activeSessions: number;
    totalSessions: number;
    taskSummary: {
      total: number;
      pending: number;
      overdue: number;
      highPriority: number;
      summary: string;
    };
  }): string {
    const { loadedAgents, activeSessions, totalSessions, taskSummary } = context;

    const hasTasks = taskSummary.total > 0;
    const hasOverdue = taskSummary.overdue > 0;
    const hasHighPriority = taskSummary.highPriority > 0;

    let prompt = `
## 当前状态
- 活跃 Sessions: ${activeSessions}/${totalSessions}
- 已加载 Agents: ${loadedAgents.length > 0 ? loadedAgents.join(', ') : '无'}
- 未完成任务: ${taskSummary.total} 个
${hasOverdue ? `- ⚠️ 逾期任务: ${taskSummary.overdue} 个` : ''}
${hasHighPriority ? `- 🔴 高优先级: ${taskSummary.highPriority} 个` : ''}
- 报告时间: ${new Date().toLocaleString('zh-CN', { hour12: false })}
`;

    if (hasTasks) {
      prompt += `\n## 任务概览\n${taskSummary.summary}\n`;
    }

    prompt += `
## 要求
1. 简洁明了，不超过 5 行
2. ${hasTasks ? '优先提醒待处理任务，特别是逾期和高优先级任务' : '如果空闲，可以提醒用户我可以帮助做什么'}
3. ${hasOverdue ? '必须提醒逾期任务！' : ''}
4. 使用友好的语气
`.trim();

    return prompt;
  }

  /**
   * 发送汇报到 Channel
   */
  private async sendReportToChannel(channelId: string, report: string): Promise<void> {
    const reportMessage: Message = {
      id: `loop-push-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      version: '1.0',
      from: this.managerId,
      to: channelId,
      sessionId: `${channelId}:loop`,
      type: 'notification',
      payload: {
        data: report,
      },
      ack: { required: false, timeout: 0, retry: 0 },
    };

    try {
      const messageBus = this.swarm.getMessageBus();
      await messageBus.send(reportMessage);
    } catch (error) {
      console.error(`[AgentLoop] Failed to send report to ${channelId}:`, error);
    }
  }

  /**
   * 手动触发汇报（用于测试）
   */
  async manualReport(): Promise<void> {
    await this.triggerReport();
  }

  /**
   * 更新汇报间隔
   */
  async setInterval(interval: number | string): Promise<void> {
    this.interval = interval;

    // 重启定时器
    if (this.reportJobId) {
      await this.agentCron.remove(this.reportJobId);
      this.reportJobId = undefined;

      const intervalStr =
        typeof interval === 'string' ? interval : `每${Math.floor(interval / 60000)}分钟`;

      // 解析为 cron 配置
      const parsed = CronParser.parseNaturalLanguage(intervalStr);
      if (!parsed) {
        throw new Error(`无法解析间隔: ${intervalStr}`);
      }

      const config = CronParser.normalize({
        ...parsed,
        agentId: this.managerId,
        task: `定期汇报工作（${intervalStr}）`,
        handler: 'report',
      });

      this.reportJobId = await this.agentCron.scheduleFromConfig(config);
    }
  }

  /**
   * 获取状态
   */
  getStatus(): {
    enabled: boolean;
    interval: number | string;
    lastReportTime: number;
    reportJobId?: string;
  } {
    return {
      enabled: this.enabled,
      interval: this.interval,
      lastReportTime: this.lastReportTime,
      reportJobId: this.reportJobId,
    };
  }
}

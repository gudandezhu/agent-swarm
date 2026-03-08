/**
 * CronRegistry - 全局 Cron 注册表
 *
 * 管理所有 Agent 的定时任务，提供查询和监控能力
 */

import { AgentCron } from '../agent/AgentCron.js';
import type { ScheduledCronJob } from './types.js';

/**
 * Cron 注册表
 */
export class CronRegistry {
  private agentCrons = new Map<string, AgentCron>();

  /**
   * 注册 Agent 的 Cron 管理器
   */
  register(agentCron: AgentCron): void {
    const agentId = agentCron['agentId']; // 访问私有属性
    this.agentCrons.set(agentId, agentCron);
    console.log(`[CronRegistry] Agent 已注册: ${agentId}`);
  }

  /**
   * 注销 Agent 的 Cron 管理器
   */
  unregister(agentId: string): boolean {
    const result = this.agentCrons.delete(agentId);
    if (result) {
      console.log(`[CronRegistry] Agent 已注销: ${agentId}`);
    }
    return result;
  }

  /**
   * 获取 Agent 的 Cron 管理器
   */
  getAgentCron(agentId: string): AgentCron | undefined {
    return this.agentCrons.get(agentId);
  }

  /**
   * 获取所有 Agent 的 Cron 统计
   */
  getAllStats(): Array<{
    agentId: string;
    total: number;
    active: number;
    paused: number;
  }> {
    return Array.from(this.agentCrons.values()).map((cron) => cron.getStats());
  }

  /**
   * 获取所有活跃任务
   */
  getAllActiveJobs(): Map<string, ScheduledCronJob[]> {
    const allJobs = new Map<string, ScheduledCronJob[]>();

    for (const [agentId, cron] of this.agentCrons.entries()) {
      allJobs.set(agentId, cron.listActiveJobs());
    }

    return allJobs;
  }

  /**
   * 获取全局统计
   */
  getGlobalStats(): {
    totalAgents: number;
    totalJobs: number;
    activeJobs: number;
    pausedJobs: number;
  } {
    const stats = this.getAllStats();

    return {
      totalAgents: stats.length,
      totalJobs: stats.reduce((sum, s) => sum + s.total, 0),
      activeJobs: stats.reduce((sum, s) => sum + s.active, 0),
      pausedJobs: stats.reduce((sum, s) => sum + s.paused, 0),
    };
  }

  /**
   * 格式化统计信息（用于汇报）
   */
  formatStats(): string {
    const stats = this.getGlobalStats();
    const agentStats = this.getAllStats();

    let output = `## 定时任务统计\n`;
    output += `- 总 Agents: ${stats.totalAgents}\n`;
    output += `- 总任务数: ${stats.totalJobs}\n`;
    output += `- 活跃任务: ${stats.activeJobs}\n`;
    output += `- 暂停任务: ${stats.pausedJobs}\n`;

    if (agentStats.length > 0) {
      output += `\n### 各 Agent 任务\n`;
      for (const stat of agentStats) {
        output += `- **${stat.agentId}**: ${stat.active}/${stat.total} 活跃\n`;
      }
    }

    return output;
  }

  /**
   * 销毁所有 Agent 的 Cron
   */
  async destroyAll(): Promise<void> {
    const destroyPromises = Array.from(this.agentCrons.values()).map((cron) => cron.destroy());

    await Promise.all(destroyPromises);

    this.agentCrons.clear();

    console.log('[CronRegistry] 所有 Agent Cron 已销毁');
  }
}

// 全局单例
let globalRegistry: CronRegistry | null = null;

/**
 * 获取全局 Cron 注册表
 */
export function getGlobalCronRegistry(): CronRegistry {
  if (!globalRegistry) {
    globalRegistry = new CronRegistry();
  }
  return globalRegistry;
}

/**
 * AgentCron - Agent 级别的定时任务管理器
 *
 * 设计理念：
 * - 每个 Agent 有自己独立的 cron 列表
 * - 隔离存储：agents/{agentId}/cron.jsonl
 * - 触发时直接发送消息给该 Agent
 * - Agent 自治：自己处理定时任务
 */

import { Cron } from 'croner';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { Message } from '../message/types.js';
import type { CronTaskConfig, ScheduledCronJob } from '../cron/types.js';
import { CronParser } from '../cron/CronParser.js';

/**
 * AgentCron 配置
 */
export interface AgentCronOptions {
  /**
   * Agent ID
   */
  agentId: string;

  /**
   * Agents 目录路径
   */
  agentsPath?: string;

  /**
   * 是否持久化
   */
  persistent?: boolean;

  /**
   * 时区
   */
  timezone?: string;

  /**
   * 消息发送器（用于触发 Agent）
   */
  sendMessage: (message: Message) => Promise<void>;
}

/**
 * AgentCron - Agent 定时任务管理器
 */
export class AgentCron {
  private agentId: string;
  private agentsPath: string;
  private jobs = new Map<string, ScheduledCronJob>();
  private storagePath: string;
  private persistent: boolean;
  private timezone: string;
  private sendMessage: (message: Message) => Promise<void>;

  constructor(options: AgentCronOptions) {
    this.agentId = options.agentId;
    this.agentsPath = options.agentsPath || join(process.cwd(), 'agents');
    this.persistent = options.persistent ?? true;
    this.timezone = options.timezone || 'Asia/Shanghai';
    this.sendMessage = options.sendMessage;
    this.storagePath = join(this.agentsPath, this.agentId, 'cron.jsonl');
  }

  /**
   * 调度任务 - 从配置创建
   *
   * @param config Cron 配置
   * @returns 任务 ID
   *
   * @example
   * await agentCron.scheduleFromConfig({
   *   agentId: 'manager',
   *   schedule: '0 9 * * *',
   *   task: '每天早上9点汇报'
   * });
   */
  async scheduleFromConfig(config: CronTaskConfig): Promise<string> {
    // 1. 验证配置
    if (!CronParser.validate(config)) {
      throw new Error(`Invalid cron config: ${JSON.stringify(config)}`);
    }

    // 2. 创建任务
    const jobId = this.generateId();
    const job: ScheduledCronJob = {
      id: jobId,
      config,
      createdAt: Date.now(),
      enabled: true,
    };

    // 3. 启动调度
    this.startJob(job);

    // 4. 保存到内存
    this.jobs.set(jobId, job);

    // 5. 持久化
    if (this.persistent) {
      await this.saveJob(job);
    }

    console.log(
      `[AgentCron:${this.agentId}] 任务已创建: ${config.task} (${config.schedule})`
    );

    return jobId;
  }

  /**
   * 调度任务 - 从自然语言（简单模式）
   *
   * 注意：这只是简单的规则匹配
   * 复杂的自然语言解析应该由 Agent skill 完成
   *
   * @param naturalLanguage 自然语言描述
   * @returns 任务 ID
   */
  async schedule(naturalLanguage: string): Promise<string> {
    const parsed = CronParser.parseNaturalLanguage(naturalLanguage);

    if (!parsed) {
      throw new Error(`无法解析自然语言: ${naturalLanguage}`);
    }

    const config: CronTaskConfig = CronParser.normalize({
      ...parsed,
      agentId: this.agentId,
    });

    return await this.scheduleFromConfig(config);
  }

  /**
   * 启动任务
   */
  private startJob(job: ScheduledCronJob): void {
    const { config } = job;

    if (typeof config.schedule === 'string') {
      // 使用 croner（cron 表达式）
      job.cronInstance = new Cron(
        config.schedule,
        {
          timezone: config.timezone || this.timezone,
        },
        async () => {
          await this.triggerAgent(job);
        }
      );

      // 计算下次执行时间
      job.nextRun = job.cronInstance.nextRun()?.getTime();
    } else {
      // 使用 setInterval（毫秒间隔）
      const interval = config.schedule;
      job.intervalId = setInterval(async () => {
        await this.triggerAgent(job);
      }, interval);

      job.nextRun = Date.now() + interval;
    }
  }

  /**
   * 触发 Agent - 发送消息给该 Agent
   */
  private async triggerAgent(job: ScheduledCronJob): Promise<void> {
    if (!job.enabled) {
      return;
    }

    const { config } = job;
    job.lastRun = Date.now();

    // 更新下次执行时间
    if (job.cronInstance) {
      job.nextRun = job.cronInstance.nextRun()?.getTime();
    } else if (job.intervalId) {
      const interval = config.schedule as number;
      job.nextRun = Date.now() + interval;
    }

    try {
      // 发送消息给 Agent
      const message: Message = {
        id: `cron-${job.id}-${Date.now()}`,
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

      await this.sendMessage(message);

      console.log(`[AgentCron:${this.agentId}] 已触发 Agent: ${config.task}`);
    } catch (error) {
      console.error(`[AgentCron:${this.agentId}] 触发失败: ${config.task}`, error);
    }

    // 持久化状态
    if (this.persistent) {
      await this.saveJob(job);
    }
  }

  /**
   * 停止任务
   */
  stop(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    // 停止调度
    if (job.cronInstance) {
      job.cronInstance.stop();
    }
    if (job.intervalId) {
      clearInterval(job.intervalId);
    }

    job.enabled = false;

    console.log(`[AgentCron:${this.agentId}] 任务已停止: ${job.config.task}`);
    return true;
  }

  /**
   * 恢复任务
   */
  resume(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.enabled) {
      return true; // 已在运行
    }

    job.enabled = true;
    this.startJob(job);

    console.log(`[AgentCron:${this.agentId}] 任务已恢复: ${job.config.task}`);
    return true;
  }

  /**
   * 删除任务
   */
  async remove(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    // 停止任务
    this.stop(jobId);

    // 从内存移除
    this.jobs.delete(jobId);

    // 从持久化移除
    if (this.persistent) {
      await this.removeJob(jobId);
    }

    console.log(`[AgentCron:${this.agentId}] 任务已删除: ${job.config.task}`);
    return true;
  }

  /**
   * 获取任务
   */
  getJob(jobId: string): ScheduledCronJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 列出所有任务
   */
  listJobs(): ScheduledCronJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * 列出活跃任务
   */
  listActiveJobs(): ScheduledCronJob[] {
    return this.listJobs().filter((job) => job.enabled);
  }

  /**
   * 从持久化加载任务
   */
  async loadJobs(): Promise<void> {
    if (!this.persistent) {
      return;
    }

    try {
      const jobs = await this.readJobs();

      for (const jobData of jobs) {
        // 恢复任务
        const job: ScheduledCronJob = {
          ...jobData,
        };

        this.jobs.set(job.id, job);

        if (job.enabled) {
          this.startJob(job);
        }

        console.log(`[AgentCron:${this.agentId}] 任务已加载: ${job.config.task}`);
      }
    } catch (error) {
      console.error(`[AgentCron:${this.agentId}] 加载任务失败:`, error);
    }
  }

  /**
   * 保存任务到持久化
   */
  private async saveJob(job: ScheduledCronJob): Promise<void> {
    if (!this.persistent) {
      return;
    }

    try {
      await fs.mkdir(join(this.storagePath, '..'), { recursive: true });

      const jobs = await this.readJobs();
      const index = jobs.findIndex((j) => j.id === job.id);

      // 保存时不包含 cronInstance/intervalId
      const jobData: Omit<ScheduledCronJob, 'cronInstance' | 'intervalId'> = {
        ...job,
      };

      if (index >= 0) {
        jobs[index] = jobData;
      } else {
        jobs.push(jobData);
      }

      await this.writeJobs(jobs);
    } catch (error) {
      console.error(`[AgentCron:${this.agentId}] 保存任务失败:`, error);
    }
  }

  /**
   * 从持久化移除任务
   */
  private async removeJob(jobId: string): Promise<void> {
    if (!this.persistent) {
      return;
    }

    try {
      const jobs = await this.readJobs();
      const filtered = jobs.filter((j) => j.id !== jobId);
      await this.writeJobs(filtered);
    } catch (error) {
      console.error(`[AgentCron:${this.agentId}] 移除任务失败:`, error);
    }
  }

  /**
   * 读取所有任务
   */
  private async readJobs(): Promise<Array<Omit<ScheduledCronJob, 'cronInstance' | 'intervalId'>>> {
    try {
      const content = await fs.readFile(this.storagePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      return lines.map((line) => JSON.parse(line));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []; // 文件不存在，返回空数组
      }
      throw error;
    }
  }

  /**
   * 写入所有任务
   */
  private async writeJobs(
    jobs: Array<Omit<ScheduledCronJob, 'cronInstance' | 'intervalId'>>
  ): Promise<void> {
    const content = jobs.map((job) => JSON.stringify(job)).join('\n');
    await fs.writeFile(this.storagePath, content, 'utf-8');
  }

  /**
   * 生成任务 ID
   */
  private generateId(): string {
    return `${this.agentId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    // 停止所有任务
    for (const job of this.jobs.values()) {
      this.stop(job.id);
    }

    // 清空内存
    this.jobs.clear();

    console.log(`[AgentCron:${this.agentId}] 已销毁`);
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    agentId: string;
    total: number;
    active: number;
    paused: number;
  } {
    const jobs = this.listJobs();
    return {
      agentId: this.agentId,
      total: jobs.length,
      active: jobs.filter((j) => j.enabled).length,
      paused: jobs.filter((j) => !j.enabled).length,
    };
  }
}

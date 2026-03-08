/**
 * TaskManager - 任务管理系统
 *
 * 设计理念：Task = Session 变量
 * - 不需要新的存储层
 * - 利用 Session 机制
 * - 简洁、轻量
 */

import type { Session } from '../session/types.js';

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

/**
 * 任务优先级
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * 任务结构
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string; // Agent ID
  createdAt: number;
  updatedAt: number;
  dueAt?: number;
  relatedSessionId: string;
  dependencies?: string[]; // 依赖的任务 ID
  tags?: string[];
}

/**
 * Session 变量中的任务列表结构
 */
export interface TaskList {
  tasks: Task[];
  lastUpdated: number;
}

/**
 * TaskManager - 任务管理器
 */
export class TaskManager {
  /**
   * Session 变量 key
   */
  private static readonly TASKS_KEY = 'tasks';

  /**
   * 从 Session 获取任务列表
   */
  static getTasks(session: Session): Task[] {
    const taskList = session.context.variables[TaskManager.TASKS_KEY] as TaskList | undefined;
    return taskList?.tasks ?? [];
  }

  /**
   * 更新 Session 中的任务列表（通过 Session.update）
   *
   * 注意：这个方法返回新的 tasks 数组，实际保存需要调用方处理
   */
  static updateTasks(session: Session, tasks: Task[]): Task[] {
    const taskList: TaskList = {
      tasks,
      lastUpdated: Date.now(),
    };
    session.context.variables[TaskManager.TASKS_KEY] = taskList;
    return tasks;
  }

  /**
   * 创建任务
   */
  static createTask(
    session: Session,
    data: {
      title: string;
      description?: string;
      priority?: TaskPriority;
      assignee?: string;
      dueAt?: number;
      tags?: string[];
    }
  ): Task {
    const tasks = this.getTasks(session);

    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: data.title,
      description: data.description,
      status: 'pending',
      priority: data.priority ?? 'medium',
      assignee: data.assignee,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dueAt: data.dueAt,
      relatedSessionId: session.id,
      tags: data.tags,
    };

    tasks.push(task);
    this.updateTasks(session, tasks);

    return task;
  }

  /**
   * 更新任务状态
   */
  static updateTaskStatus(
    session: Session,
    taskId: string,
    status: TaskStatus
  ): Task | null {
    const tasks = this.getTasks(session);
    const task = tasks.find((t) => t.id === taskId);

    if (!task) return null;

    task.status = status;
    task.updatedAt = Date.now();

    this.updateTasks(session, tasks);

    return task;
  }

  /**
   * 分配任务
   */
  static assignTask(session: Session, taskId: string, assignee: string): Task | null {
    const tasks = this.getTasks(session);
    const task = tasks.find((t) => t.id === taskId);

    if (!task) return null;

    task.assignee = assignee;
    task.updatedAt = Date.now();

    this.updateTasks(session, tasks);

    return task;
  }

  /**
   * 获取未完成任务
   */
  static getPendingTasks(session: Session): Task[] {
    const tasks = this.getTasks(session);
    return tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  }

  /**
   * 获取逾期任务
   */
  static getOverdueTasks(session: Session): Task[] {
    const tasks = this.getTasks(session);
    const now = Date.now();

    return tasks.filter(
      (t) => t.dueAt && t.dueAt < now && t.status !== 'completed' && t.status !== 'cancelled'
    );
  }

  /**
   * 获取高优先级未完成任务
   */
  static getHighPriorityPendingTasks(session: Session): Task[] {
    const tasks = this.getTasks(session);
    return tasks.filter(
      (t) =>
        (t.priority === 'high' || t.priority === 'critical') &&
        t.status !== 'completed' &&
        t.status !== 'cancelled'
    );
  }

  /**
   * 根据标签筛选任务
   */
  static getTasksByTag(session: Session, tag: string): Task[] {
    const tasks = this.getTasks(session);
    return tasks.filter((t) => t.tags?.includes(tag));
  }

  /**
   * 获取 Agent 的任务
   */
  static getTasksByAssignee(session: Session, assignee: string): Task[] {
    const tasks = this.getTasks(session);
    return tasks.filter((t) => t.assignee === assignee);
  }

  /**
   * 格式化任务列表为文本（用于汇报）
   */
  static formatTasks(tasks: Task[]): string {
    if (tasks.length === 0) {
      return '无';
    }

    const statusEmoji: Record<TaskStatus, string> = {
      pending: '⏳',
      in_progress: '🔄',
      completed: '✅',
      blocked: '🚫',
      cancelled: '❌',
    };

    const priorityEmoji: Record<TaskPriority, string> = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };

    return tasks
      .map(
        (t) =>
          `${priorityEmoji[t.priority]} ${statusEmoji[t.status]} **${t.title}**` +
            (t.assignee ? ` (@${t.assignee})` : '') +
            (t.dueAt ? ` [${new Date(t.dueAt).toLocaleDateString('zh-CN')}]` : '')
      )
      .join('\n');
  }
}

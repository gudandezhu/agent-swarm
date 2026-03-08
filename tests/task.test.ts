/**
 * Task System 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Session } from '../src/session/types.js';
import { TaskManager } from '../src/task/TaskManager.js';

describe('TaskManager', () => {
  let mockSession: Session;

  beforeEach(() => {
    // 创建 mock Session
    mockSession = {
      id: 'cli:user123',
      channelId: 'cli',
      channelUserId: 'user123',
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      agents: [],
      contextPath: '/test/context.md',
      messagesPath: '/test/messages.jsonl',
      context: {
        messages: [],
        variables: {},
        agentStates: new Map(),
      },
    };
  });

  describe('基础功能', () => {
    it('应该能创建任务', () => {
      const task = TaskManager.createTask(mockSession, {
        title: '测试任务',
        description: '这是一个测试任务',
        priority: 'high',
      });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('测试任务');
      expect(task.status).toBe('pending');
      expect(task.priority).toBe('high');
    });

    it('应该能从 Session 获取任务', () => {
      TaskManager.createTask(mockSession, {
        title: '任务1',
        priority: 'medium',
      });

      TaskManager.createTask(mockSession, {
        title: '任务2',
        priority: 'low',
      });

      const tasks = TaskManager.getTasks(mockSession);
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('任务1');
      expect(tasks[1].title).toBe('任务2');
    });

    it('应该能更新任务状态', () => {
      const task = TaskManager.createTask(mockSession, {
        title: '状态测试',
        priority: 'medium',
      });

      const updated = TaskManager.updateTaskStatus(mockSession, task.id, 'in_progress');

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('in_progress');

      const tasks = TaskManager.getTasks(mockSession);
      expect(tasks[0].status).toBe('in_progress');
    });

    it('应该能分配任务', () => {
      const task = TaskManager.createTask(mockSession, {
        title: '分配测试',
        priority: 'medium',
      });

      const updated = TaskManager.assignTask(mockSession, task.id, 'developer');

      expect(updated).toBeDefined();
      expect(updated?.assignee).toBe('developer');
    });
  });

  describe('任务查询', () => {
    beforeEach(() => {
      // 创建多个测试任务
      TaskManager.createTask(mockSession, {
        title: '待处理任务1',
        priority: 'low',
      });

      TaskManager.createTask(mockSession, {
        title: '待处理任务2',
        priority: 'high',
      });

      const inProgressTask = TaskManager.createTask(mockSession, {
        title: '进行中任务',
        priority: 'medium',
      });
      TaskManager.updateTaskStatus(mockSession, inProgressTask.id, 'in_progress');

      const completedTask = TaskManager.createTask(mockSession, {
        title: '已完成任务',
        priority: 'medium',
      });
      TaskManager.updateTaskStatus(mockSession, completedTask.id, 'completed');

      // 逾期任务
      TaskManager.createTask(mockSession, {
        title: '逾期任务',
        priority: 'critical',
        dueAt: Date.now() - 100000, // 过去的时间
      });
    });

    it('应该能获取未完成任务', () => {
      const pendingTasks = TaskManager.getPendingTasks(mockSession);
      expect(pendingTasks.length).toBeGreaterThan(0);
      expect(pendingTasks.every((t) => t.status !== 'completed')).toBe(true);
    });

    it('应该能获取逾期任务', () => {
      const overdueTasks = TaskManager.getOverdueTasks(mockSession);
      expect(overdueTasks.length).toBe(1);
      expect(overdueTasks[0].title).toBe('逾期任务');
    });

    it('应该能获取高优先级任务', () => {
      const highPriorityTasks = TaskManager.getHighPriorityPendingTasks(mockSession);
      expect(highPriorityTasks.length).toBeGreaterThan(0);
      expect(highPriorityTasks.some((t) => t.priority === 'high' || t.priority === 'critical')).toBe(
        true
      );
    });

    it('应该能按标签筛选', () => {
      const taggedTask = TaskManager.createTask(mockSession, {
        title: '带标签任务',
        priority: 'medium',
        tags: ['frontend', 'bug'],
      });

      const frontendTasks = TaskManager.getTasksByTag(mockSession, 'frontend');
      expect(frontendTasks).toContain(taggedTask);
    });

    it('应该能按分配者筛选', () => {
      const assignedTask = TaskManager.createTask(mockSession, {
        title: '已分配任务',
        priority: 'medium',
      });
      TaskManager.assignTask(mockSession, assignedTask.id, 'developer');

      const devTasks = TaskManager.getTasksByAssignee(mockSession, 'developer');
      expect(devTasks).toContain(assignedTask);
    });
  });

  describe('任务格式化', () => {
    it('应该能格式化任务列表', () => {
      TaskManager.createTask(mockSession, {
        title: '测试任务1',
        priority: 'high',
        assignee: 'developer',
      });

      TaskManager.createTask(mockSession, {
        title: '测试任务2',
        priority: 'low',
        dueAt: Date.now() + 86400000, // 明天
      });

      const formatted = TaskManager.formatTasks(TaskManager.getTasks(mockSession));

      expect(formatted).toContain('测试任务1');
      expect(formatted).toContain('@developer');
      expect(formatted).toContain('测试任务2');
    });

    it('空任务列表应该显示"无"', () => {
      const formatted = TaskManager.formatTasks([]);
      expect(formatted).toBe('无');
    });
  });
});

describe('Agent Loop 任务扫描', () => {
  it('应该能扫描多个 Sessions 的任务', () => {
    const sessions: Session[] = [
      {
        id: 'cli:user1',
        channelId: 'cli',
        channelUserId: 'user1',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        agents: [],
        contextPath: '/test/context1.md',
        messagesPath: '/test/messages1.jsonl',
        context: {
          messages: [],
          variables: {},
          agentStates: new Map(),
        },
      },
      {
        id: 'cli:user2',
        channelId: 'cli',
        channelUserId: 'user2',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        agents: [],
        contextPath: '/test/context2.md',
        messagesPath: '/test/messages2.jsonl',
        context: {
          messages: [],
          variables: {},
          agentStates: new Map(),
        },
      },
    ];

    // 为第一个 Session 创建任务
    TaskManager.createTask(sessions[0], {
      title: '用户1的任务',
      priority: 'high',
    });

    TaskManager.createTask(sessions[0], {
      title: '用户1的逾期任务',
      priority: 'critical',
      dueAt: Date.now() - 100000,
    });

    // 为第二个 Session 创建任务
    TaskManager.createTask(sessions[1], {
      title: '用户2的任务',
      priority: 'medium',
    });

    // 手动执行扫描逻辑
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

    expect(totalPending).toBe(3);
    expect(totalOverdue).toBe(1);
    expect(totalHighPriority).toBe(2);
    expect(taskSummaries.length).toBe(2);
    expect(taskSummaries[0]).toContain('user1');
    expect(taskSummaries[1]).toContain('user2');
  });
});

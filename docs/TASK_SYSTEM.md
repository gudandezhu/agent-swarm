# Task System 使用指南

## 概述

任务管理系统让 Agent Swarm 支持任务的创建、分配、跟踪和自动提醒。

**设计理念**: Task = Session 变量 - 无需新的存储层，轻量简洁。

## 核心功能

### 1. 创建任务

通过自然语言与 Manager Agent 交互：

```
你: 创建任务：实现用户登录功能
    - 优先级：高
    - 分配给：developer agent
    - 截止：明天

Manager: ✓ 已创建任务 "实现用户登录功能"
   - ID: task-1234567890-abc123
   - 优先级: 高
   - 分配给: developer
   - 截止: 2026/3/9
```

### 2. 任务状态

| 状态 | 说明 | 图标 |
|------|------|------|
| `pending` | 待处理 | ⏳ |
| `in_progress` | 进行中 | 🔄 |
| `completed` | 已完成 | ✅ |
| `blocked` | 被阻塞 | 🚫 |
| `cancelled` | 已取消 | ❌ |

### 3. 任务优先级

| 优先级 | 图标 | 使用场景 |
|--------|------|----------|
| `low` | 🟢 | 优化、文档等 |
| `medium` | 🟡 | 常规功能 |
| `high` | 🟠 | 重要功能、Bug 修复 |
| `critical` | 🔴 | 紧急问题、安全漏洞 |

### 4. Agent Loop 自动扫描

每 5 分钟自动扫描所有 Sessions：

```
🔄 当前状态
- 活跃 Sessions: 2/5
- 已加载 Agents: manager, developer, writer
- 未完成任务: 4 个
- ⚠️ 逾期任务: 2 个
- 🔴 高优先级: 3 个

📋 任务概览
**user1** (2 个未完成任务), 1 个逾期
**user2** (2 个未完成任务), 1 个逾期

⚠️ 逾期提醒：
请尽快处理以下逾期任务：
- 🔴 修复登录 Bug (user1)
- 🟠 部署测试环境 (user2)
```

## 使用场景

### 场景 1: 分配任务给专门的 Agent

```
你: 我需要一个用户注册页面，分配给 frontend agent

Manager: ✓ 已创建任务
   - 标题: 实现用户注册页面
   - 优先级: 中
   - 分配给: frontend
```

### 场景 2: 跟踪 Bug 修复

```
你: 发现一个严重的登录 Bug，需要立即修复

Manager: ✓ 已创建紧急任务
   - 标题: 修复登录 Bug
   - 优先级: critical
   - 截止: 今天
   - 分配给: backend
```

### 场景 3: 定期汇报

Agent Loop 自动汇报，即使没有用户输入也会主动提醒：

```
Manager: 📋 工作汇报

当前有 3 个未完成任务：
- 🔴 修复登录 Bug (逾期)
- 🟠 实现用户注册页面 (进行中)
- 🟡 编写 API 文档 (待处理)

建议：优先处理逾期任务
```

## API 参考

### TaskManager

```typescript
// 创建任务
TaskManager.createTask(session, {
  title: '任务标题',
  description: '任务描述',
  priority: 'high',
  assignee: 'developer',
  dueAt: Date.now() + 86400000,
  tags: ['frontend', 'bug'],
});

// 更新状态
TaskManager.updateTaskStatus(session, taskId, 'in_progress');

// 分配任务
TaskManager.assignTask(session, taskId, 'new-assignee');

// 查询任务
TaskManager.getPendingTasks(session);      // 未完成
TaskManager.getOverdueTasks(session);      // 逾期
TaskManager.getHighPriorityPendingTasks(); // 高优先级
TaskManager.getTasksByTag(session, 'bug'); // 按标签
TaskManager.getTasksByAssignee(session, 'developer'); // 按分配者

// 格式化输出
TaskManager.formatTasks(tasks);
```

## 配置

在 `~/.agent-swarm/agent-swarm.json` 中配置 Agent Loop：

```json
{
  "agentLoop": {
    "enabled": true,
    "interval": 300000
  }
}
```

- `enabled`: 是否启用自动扫描（默认 true）
- `interval`: 扫描间隔（毫秒，默认 300000 = 5 分钟）

## 最佳实践

1. **明确的任务标题** - 使用动词开头，如"实现用户登录"
2. **合理的优先级** - 不要所有任务都设为 high/critical
3. **设置截止日期** - 帮助 Agent Loop 提醒逾期任务
4. **使用标签** - 便于分类查询，如 `frontend`, `backend`, `bug`
5. **及时更新状态** - 完成后标记为 completed

## 测试

运行测试：

```bash
# 单元测试
npm test -- tests/task.test.ts

# 演示脚本
node test-task-system.js
```

## 示例输出

```
=== 任务系统演示 ===

✓ 创建任务: 实现用户登录功能
  优先级: high
  分配给: developer
  截止日期: 2026/3/9

✓ 检测到 1 个逾期任务:
  - 修复登录 Bug (critical)

✓ 2 个高优先级任务:
  - 实现用户登录功能 (high)
  - 修复登录 Bug (critical)

任务列表:
🟠 🔄 **实现用户登录功能** (@developer) [2026/3/9]
🔴 ⏳ **修复登录 Bug** [2026/3/7]
```

# Cron 架构 - Agent 自治模式

## 设计理念

**Agent 自治**：Cron 是纯调度工具，触发时直接发送消息给目标 Agent，Agent 自己处理定时任务。

```
用户: "每天早上9点提醒我"
  ↓
Manager Agent: 理解意图 → 调度 Cron 任务
  ↓
Cron: 到时间 → 发送消息给 Manager
  ↓
Manager Agent: 处理定时任务 → 执行提醒
```

## 核心特性

✅ **Agent 自治**：每个 Agent 有自己独立的 cron 列表
✅ **Cron 是工具**：不调用 LLM，只负责调度
✅ **消息驱动**：所有交互通过消息
✅ **隔离存储**：`agents/{agentId}/cron.jsonl`
✅ **零依赖**：基于 croner（8KB）

## 快速开始

### 1. 调度任务

```typescript
import { AgentCron } from './agent/index.js';

// 为 Agent 创建 Cron
const cron = new AgentCron({
  agentId: 'manager',
  persistent: true,
  sendMessage: async (message) => {
    await messageBus.send(message);
  },
});

// 从配置调度
await cron.scheduleFromConfig({
  agentId: 'manager',
  schedule: '0 9 * * *',
  task: '每天早上9点汇报工作',
  handler: 'report',
});

// 从自然语言调度（简单模式）
await cron.schedule('每天早上9点');
```

### 2. Agent 处理定时任务

```typescript
// Agent 收到定时任务消息
if (message.from === 'cron' && message.payload.type === 'scheduled-task') {
  const { task, handler } = message.payload;

  if (handler === 'report') {
    return await this.generateReport();
  }

  return await this.executeTask(task);
}
```

### 3. 全局管理

```typescript
import { getGlobalCronRegistry } from './cron/index.js';

const registry = getGlobalCronRegistry();

// 获取统计
const stats = registry.getGlobalStats();
console.log(stats);
// { totalAgents: 2, totalJobs: 5, activeJobs: 4, pausedJobs: 1 }

// 格式化汇报
console.log(registry.formatStats());
```

## 架构对比

| 特性 | 之前（Cron 调用 LLM） | 现在（Agent 自治） |
|------|---------------------|-------------------|
| **LLM 使用** | Cron 直接调用 | Agent 的 skill |
| **控制流** | 系统 → Agent | Agent → 系统 |
| **职责** | Cron 理解自然语言 | Cron 只是调度工具 |
| **一致性** | ⚠️ Cron 特殊化 | ✅ 统一消息流 |
| **测试性** | ⚠️ 需要 mock LLM | ✅ 纯函数库 |

## API 文档

### AgentCron

```typescript
class AgentCron {
  // 从配置调度
  scheduleFromConfig(config: CronTaskConfig): Promise<string>

  // 从自然语言调度（简单模式）
  schedule(naturalLanguage: string): Promise<string>

  // 停止任务
  stop(jobId: string): boolean

  // 恢复任务
  resume(jobId: string): boolean

  // 删除任务
  remove(jobId: string): Promise<boolean>

  // 列出任务
  listJobs(): ScheduledCronJob[]
  listActiveJobs(): ScheduledCronJob[]

  // 获取统计
  getStats(): { agentId, total, active, paused }

  // 销毁
  destroy(): Promise<void>
}
```

### CronTaskConfig

```typescript
interface CronTaskConfig {
  agentId: string;           // 目标 Agent
  schedule: string | number; // cron 表达式或毫秒
  task: string;              // 任务描述
  handler?: string;          // 处理 skill
  timezone?: string;         // 时区
  metadata?: Record<string, unknown>;
}
```

## 持久化

任务自动保存到 `agents/{agentId}/cron.jsonl`：

```jsonl
{"id":"manager-123","config":{"agentId":"manager","schedule":"0 9 * * *","task":"每天早上9点汇报"},"createdAt":1701234567890,"enabled":true}
```

## 目录结构

```
agents/
├── manager/
│   ├── config.json
│   ├── cron.jsonl       ← manager 的定时任务
│   ├── prompt.md
│   └── skills/
├── developer/
│   ├── config.json
│   ├── cron.jsonl       ← developer 的定时任务
│   └── skills/
└── tester/
    ├── config.json
    └── cron.jsonl       ← tester 的定时任务
```

## 消息格式

Cron 触发时发送的消息：

```typescript
{
  from: 'cron',
  to: 'manager',           // 目标 Agent
  type: 'request',
  payload: {
    type: 'scheduled-task',
    task: '每天早上9点汇报工作',
    handler: 'report',     // 可选：指定 skill
    metadata: {}
  }
}
```

## 技术栈

- **croner**: 零依赖 cron 调度库
- **JSONL**: 持久化存储
- **TypeScript**: 类型安全

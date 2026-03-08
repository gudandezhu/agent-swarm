# Cron 架构使用示例

## AI-Native 定时任务

用户用自然语言，AI 自动配置调度。

### 1. Agent 级别隔离

每个 Agent 有自己独立的 cron 列表：

```typescript
import { AgentCron } from './agent/index.js';

// 为 manager Agent 创建 cron
const managerCron = new AgentCron({
  agentId: 'manager',
  persistent: true,
});

// 调度任务
await managerCron.schedule("每天早上9点汇报", async () => {
  await sendReport();
});

await managerCron.schedule("每小时检查任务", async () => {
  await checkTasks();
});

// 为 developer Agent 创建 cron
const devCron = new AgentCron({
  agentId: 'developer',
  persistent: true,
});

await devCron.schedule("每周末清理临时文件", async () => {
  await cleanupTempFiles();
});
```

### 2. 全局管理

```typescript
import { getGlobalCronRegistry } from './cron/index.js';

const registry = getGlobalCronRegistry();

// 获取所有 Agent 的统计
const stats = registry.getGlobalStats();
console.log(stats);
// { totalAgents: 2, totalJobs: 5, activeJobs: 4, pausedJobs: 1 }

// 格式化汇报
const report = registry.formatStats();
console.log(report);
// ## 定时任务统计
// - 总 Agents: 2
// - 总任务数: 5
// - 活跃任务: 4
// - 暂停任务: 1
//
// ### 各 Agent 任务
// - **manager**: 2/3 活跃
// - **developer**: 2/2 活跃
```

### 3. AgentLoop 集成

```typescript
import { AgentLoop } from './agent/AgentLoop.js';

const loop = new AgentLoop(swarm, {
  interval: '每5分钟',  // 自然语言！
  // interval: 5 * 60 * 1000,  // 或者毫秒数
});

await loop.start();
```

### 4. 自然语言示例

| 用户输入 | AI 解析 |
|---------|---------|
| "每天早上9点" | `0 9 * * *` |
| "每30分钟" | `interval: 1800000` |
| "每周一提醒" | `0 8 * * 1` |
| "每天晚上10点检查" | `0 22 * * *` |
| "每小时汇报一次" | `interval: 3600000` |
| "每周三下午3点开会" | `0 15 * * 3` |

### 5. 持久化

任务自动保存到 `agents/{agentId}/cron.jsonl`：

```jsonl
{"id":"manager-123","agentId":"manager","naturalLanguage":"每天早上9点汇报","config":{"type":"cron","schedule":"0 9 * * *","timezone":"Asia/Shanghai","description":"每天早上9点汇报"},"createdAt":1701234567890,"enabled":true}
```

启动时自动加载：

```typescript
await agentCron.loadJobs(async (naturalLanguage) => {
  // 重新绑定 handler
  if (naturalLanguage.includes('汇报')) {
    return () => sendReport();
  }
});
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

## 核心优势

✅ **AI-Native**：用户说人话，AI 自动配置
✅ **隔离设计**：每个 Agent 独立的 cron 列表
✅ **零依赖**：基于 croner（8KB，零依赖）
✅ **持久化**：JSONL 格式，易于管理
✅ **可观测**：全局注册表，统一监控

# Agent Swarm 回归测试用例

**版本**: v1.5.0
**更新日期**: 2026-03-06
**测试范围**: Agent Swarm 核心功能回归测试

---

## 测试环境

| 环境 | 配置 |
|------|------|
| Node.js | >= 18.0.0 |
| TypeScript | >= 5.0.0 |
| 测试框架 | Vitest |
| 覆盖率目标 | >= 80% |

---

## 测试用例清单

| 模块 | 用例数 | 优先级 | 状态 |
|------|--------|--------|------|
| Message | 5 | P0-P1 | ✅ |
| Session | 4 | P0 | ✅ |
| JSONLSessionStore | 4 | P0-P1 | ✅ |
| MessageBus | 4 | P0-P1 | ✅ |
| AgentManager | 4 | P0-P1 | ✅ |
| LLM Mock | 3 | P0 | ✅ |
| Channel | 3 | P1-P2 | ✅ |
| E2E | 2 | P0-P1 | ✅ |
| Performance | 2 | P1-P2 | ❌ 未实现 |

---

## 核心测试用例

### TC-MSG-001: 消息基础结构验证（P0）
创建Message对象，验证必需字段：id(UUID)、timestamp、version、from/to、sessionId、type、payload、ack

### TC-MSG-002: 消息路由字段验证（P0）
验证单目标（to为string）和多目标广播（to为array），以及replyTo和correlationId

### TC-MSG-003: ACK机制验证（P1）
验证ack.required、ack.timeout、ack.retry配置，超时重试机制

### TC-MSG-004: 消息序列化（P1）
验证消息序列化/反序列化，特殊字符处理

### TC-MSG-005: 消息类型枚举（P1）
验证request/response/event/notification类型

---

### TC-SES-001: Session创建与ID生成（P0）
验证sessionId格式为`channelId:channelUserId`，自动生成和手动指定

### TC-SES-002: Session上下文管理（P0）
验证context结构：messages(Message ID数组)、metadata、lastActive

### TC-SES-003: Session活跃时间更新（P1）
处理消息时自动更新lastActive时间戳

### TC-SES-004: Session过期检测（P1）
通过store.cleanup()清理过期会话

---

### TC-STORE-001: Session持久化（P0）
验证getOrCreate()创建、get()读取、update()更新

### TC-STORE-002: 消息历史追加（P1）
addMessage()追加消息ID，保持顺序

### TC-STORE-003: Session索引管理（P1）
按channelId和channelUserId建立索引

### TC-STORE-004: 并发写入安全（P1）
文件锁机制防止并发冲突

---

### TC-BUS-001: 消息发送与接收（P0）
send()发送消息，subscribe()订阅，once()单次订阅

### TC-BUS-002: 广播消息（P0）
发送给多个目标，每个订阅者独立处理

### TC-BUS-003: ACK追踪（P1）
request()发送带ACK消息，自动追踪和超时处理

### TC-BUS-004: 错误消息处理（P1）
error事件监听，错误消息不影响正常消息

---

### TC-AGENT-001: Agent动态加载（P0）
loadAgent()动态加载agent配置，registerAgent()注册

### TC-AGENT-002: Agent消息处理（P0）
process()处理消息，返回response，支持工具调用

### TC-AGENT-003: Agent长期记忆（P1）
记忆存储和检索，context传入LLM

### TC-AGENT-004: Agent LLM调用Mock（P1）
mockResponse选项注入Mock响应，无需真实API

---

### TC-MOCK-001: LLM Mock基础响应（P0）
mockLLM.chat()返回预设响应

### TC-MOCK-002: LLM Mock流式响应（P0）
mockLLM.stream()返回流式响应

### TC-MOCK-003: LLM Mock工具调用（P0）
mockLLM.chatWithTools()处理工具调用

---

### TC-CH-001: Channel消息适配（P1）
toIncomingMessage()转换外部消息，toOutgoingMessage()转换响应

### TC-CH-002: Channel消息发送（P1）
send()发送消息到外部系统

### TC-CH-003: Channel错误处理（P1）
handleError()统一错误处理

---

### TC-E2E-001: 完整消息流程（P0）
外部消息→Channel→MessageBus→Agent→响应→Channel→外部

### TC-E2E-002: 多Agent协作（P1）
Agent A发送消息给Agent B，协同处理

---

### TC-PERF-001: 消息吞吐量（P1）
并发发送1000条消息，吞吐量>=100 msg/s，无消息丢失

### TC-PERF-002: 内存占用（P2）
处理10000条消息，内存增长<100MB，无内存泄漏

---

## 测试执行计划

| 测试类型 | 频率 | 触发条件 |
|---------|------|---------|
| 单元测试 | 每次PR提交 | 代码变更 |
| 集成测试 | 每日 | 定时任务 |
| E2E测试 | 每周 | 定时任务+发布前 |
| 性能测试 | 每月+发布前 | 定时任务 |

## 阻塞标准

- **P0用例失败**: 阻止合并，必须修复
- **P1用例失败**: 警告合并，建议修复
- **P2用例失败**: 可合并，记录问题

## 当前覆盖率状态（2026-03-06）

- 整体覆盖率: 61.34% ❌ 目标80%
- 已达标: AgentManager(92%)、MessageBus(87%)、MessageRouter(91%)、ACKTracker(100%)、CLIChannel(100%)
- 未达标: main.ts(0%)、config.ts(0%)、memory.ts(0%)、prompt.ts(0%)、JSONLMessageStore.ts(0%)、reliability/(0%)、DingTalkChannel.ts(0%)、FeishuChannel.ts(0%)

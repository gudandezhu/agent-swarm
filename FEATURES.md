# Agent Swarm 功能清单

**版本**: v0.1.0
**状态**: 🟢 活跃开发中

---

## ✅ 已实现 (v0.1.0)

### 核心功能
- [x] **多 Agent 系统**
- [x] **统一消息路由**
- [x] **默认 Manager Agent**
- [x] **Agent 管理命令**

### Agent 管理
- [x] 懒加载机制
- [x] 空闲清理（30 分钟）
- [x] 生命周期管理
- [x] **Agent Loop（主动汇报）** - Manager 定期汇报状态
- [x] **任务管理系统** - Session 变量存储，自动扫描未完成任务

### 消息路由
- [x] 精确投递（`to: "agent-id"`）
- [x] 广播（`to: ["agent-a", "agent-b"]`）
- [x] Session 上下文注入

### 存储与持久化
- [x] JSONL 格式
- [x] Session 管理
- [x] 对话历史

### TUI 界面
- [x] Ink 组件
- [x] 美观的界面设计
- [x] Markdown 渲染
- [x] 流式输出

### 配置支持
- [x] 模型映射（Claude → GLM）
- [x] API Key 配置
- [x] Base URL 配置

---

## 📖 核心概念

**Agent = 目录**
- `config.json` - 配置
- `prompt.md` - 提示词

**默认 Agent = manager**
- 管理其他 agents
- 协调任务分配
- 回答用户问题
- **定期主动汇报**（每 5 分钟）
- **任务管理** - 创建、分配、跟踪任务

---

## 🚧 计划中

### v0.2.0
- [ ] Agent 技能系统
- [ ] 工作流编排
- [ ] 文档知识库

### v0.3.0
- [ ] Web Dashboard
- [ ] Agent 市场
- [ ] 多语言支持

---

## 📝 更多信息

- [设计文档](.claude/design.md)
- [README](../README.md)

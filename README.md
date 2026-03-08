# Agent Swarm

多 Agent 协作框架 - 快速创建 Agent，统一消息路由，Session 持久化

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动 TUI 模式
npm start
```

就这么简单！✨

## ✨ 功能特性

- 🎨 **美观的 TUI 界面** - 现代化终端用户界面
- ✅ **多 Agent 管理** - 快速创建和管理多个 Agent
- ✅ **统一消息路由** - `to: agent-id` 实现精确投递
- ✅ **Session 上下文复用** - 完整对话历史
- ✅ **JSONL 持久化** - 轻量级存储方案
- ✅ **Markdown 渲染** - 支持富文本显示
- ⚡ **流式输出** - 实时显示 AI 响应
- 🔄 **Agent Loop** - Manager 定期主动汇报状态
- 📋 **任务管理** - 创建、分配、跟踪任务，自动扫描未完成任务

## 💻 命令说明

```bash
# 启动服务
npm start              # 启动 TUI 模式（默认）
./start.sh             # 一键启动脚本

# 管理 Agent
swarm init             # 初始化工作空间
swarm create-agent <name>  # 创建新 Agent
swarm list             # 列出所有 Agents
```

## 🎯 TUI 模式

TUI（Terminal User Interface）提供现代化的终端体验：

- 🎨 美观的界面设计
- 📝 Markdown 渲染支持
- ⚡ 流式输出显示
- 🎯 命令自动完成
- 🖥️ 交互式编辑器

### TUI 快捷键

- `Enter` - 发送消息
- `Shift+Enter` - 换行
- `Ctrl+C` - 退出
- `/exit` - 退出命令
- `/reset` - 重置会话
- `/help` - 显示帮助

## 📁 项目结构

```
agent-swarm/
├── src/
│   ├── AgentSwarm.ts      # 核心框架
│   ├── channel/           # 消息通道
│   │   ├── PiTUIChannel.ts    # TUI 通道
│   │   └── CLIChannel.ts      # CLI 通道
│   ├── agent/             # Agent 管理
│   └── cli/               # 命令行工具
├── skills/                # 用户技能
├── .claude/               # Claude 配置
└── package.json
```

## 🔧 配置

配置文件位于 `~/.agent-swarm/agent-swarm.json`:

```json
{
  "version": "0.1.0",
  "apiKeys": {
    "anthropic": "your-api-key"
  },
  "defaultAgent": "manager",
  "agentLoop": {
    "enabled": true,
    "interval": 300000
  }
}
```

**配置说明**：
- `defaultAgent` - 默认 agent（manager）
- `agentLoop.enabled` - 是否启用主动汇报（默认 true）
- `agentLoop.interval` - 汇报间隔（毫秒，默认 300000 = 5 分钟）

## 📚 更多文档

- [FEATURES.md](FEATURES.md) - 功能清单与版本规划
- [docs/TUI.md](docs/TUI.md) - TUI 详细文档
- [docs/TASK_SYSTEM.md](docs/TASK_SYSTEM.md) - 任务系统使用指南
- [docs/TUI_PASTE_FIX.md](docs/TUI_PASTE_FIX.md) - TUI 粘贴问题说明
- [tests/TEST_GUIDE.md](tests/TEST_GUIDE.md) - 测试指南

## 📄 许可证

MIT

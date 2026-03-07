# Agent Swarm 工作空间

## 目录说明

- `agents/`: 存放你的 Agent 配置
- `sessions/`: 存放会话数据
- `memory/`: 存放长期记忆数据
- `.claude/skills/`: AI Native 技能文件
- `config.json`: 全局配置（API 密钥等）

## 快速开始

### 1. 配置 API 密钥

编辑 `config.json` 或使用环境变量：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
```

### 2. 创建第一个 Agent

在 Claude Code 中说："创建一个翻译助手"

### 3. 运行 Agent Swarm

```bash
npm run dev
```

## 更多文档

- [完整文档](https://github.com/your-repo/agent-swarm)
- [Agent 创建指南](./agents/README.md)

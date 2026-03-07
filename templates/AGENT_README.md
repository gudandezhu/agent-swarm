# Agent 目录

这个目录用于存放你的 Agent 配置。

## Agent 结构

每个 Agent 是一个独立的目录，包含：

```
your-agent/
├── config.json      # Agent 配置
├── prompt.md        # Agent 提示词
└── skills/          # Agent 专用技能（可选）
    └── *.md
```

## 创建 Agent

### 方式 1: 使用 Claude Code

在 Claude Code 中说：
```
创建一个客服 Agent
```

### 方式 2: 手动创建

1. 创建目录：`mkdir your-agent`
2. 创建 `config.json`：
```json
{
  "id": "your-agent",
  "name": "Your Agent",
  "description": "Agent description",
  "model": {
    "provider": "anthropic",
    "id": "claude-sonnet-4-6"
  },
  "channels": ["cli"],
  "maxTokens": 4000,
  "temperature": 0.7
}
```
3. 创建 `prompt.md`：
```markdown
# Your Agent

You are a helpful assistant...
```

## 示例 Agent

查看 `agents/example/` 了解完整的 Agent 示例。

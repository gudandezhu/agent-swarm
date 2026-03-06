# Agents 目录

每个 Agent 都是一个独立的目录，包含配置、提示词和技能。

## 目录结构

```
agents/
└── <agent-id>/
    ├── config.json          # Agent 配置
    ├── prompt.md            # System prompt
    ├── MEMORY.md            # 长期记忆（可选）
    └── skills/              # Agent 技能（可选）
        └── <skill-name>/
            └── SKILL.md
```

## 创建新 Agent

### 1. 创建目录

```bash
mkdir -p agents/my-agent/skills
```

### 2. 配置 config.json

```json
{
  "id": "my-agent",
  "name": "我的助手",
  "model": {
    "provider": "anthropic",
    "id": "claude-sonnet-4-6"
  },
  "channels": ["cli"]
}
```

### 3. 编写 prompt.md

```markdown
你是一个有用的助手，专门帮助用户解决问题。

你的特长包括：
- 分析问题
- 提供建议
- 协助编程
```

### 4. 添加技能（可选）

在 `skills/` 目录下创建子目录，每个目录包含一个 `SKILL.md` 文件：

```markdown
---
name: my-skill
description: 技能描述，用于自动匹配
---

# 技能名称

## Usage

描述何时使用此技能。

## Steps

1. 步骤一
2. 步骤二
```

## 配置字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | Agent 唯一标识 |
| `name` | string | ✅ | Agent 显示名称 |
| `model.provider` | string | ✅ | LLM 提供商: `anthropic`, `openai` |
| `model.id` | string | ✅ | 模型 ID |
| `channels` | string[] | ✅ | 支持的 Channel: `cli`, `dingtalk`, `feishu` |

## 长期记忆

可选的 `MEMORY.md` 文件用于存储跨 Session 的长期记忆：

```markdown
# 环境

API 密钥、服务器地址等配置信息。

# 技能

- 技能1: 描述
- 技能2: 描述

# 规则

反复强调的重要规则。

# 常用命令

经常使用的命令和操作步骤。
```

## 示例

参考 `agents/example/` 目录中的示例 Agent。

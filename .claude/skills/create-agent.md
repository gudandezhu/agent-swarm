---
name: create-agent
description: "创建新的 Agent 配置和 prompt。通过自然语言描述自动生成 config.json 和 prompt.md。当用户说'创建 agent'、'新建助手'、'添加 bot'、'create agent'时使用。"
version: "1.0.0"
author: "Agent Swarm Team"
triggers:
  - "创建一个"
  - "新建 agent"
  - "添加助手"
  - "创建机器人"
  - "create agent"
  - "new agent"
  - "add agent"
category: "agent-management"
---

# Create Agent Skill

## 概述

通过自然语言创建新 Agent。Claude 自动生成 `config.json` 和 `prompt.md` 文件。

## 快速开始

**用户说**: "创建一个客服 Agent"

**Claude 自动**:
1. 生成 `~/.agent-swarm/agents/customer-service/config.json`
2. 生成 `~/.agent-swarm/agents/customer-service/prompt.md`
3. 确认创建结果

## Agent 目录结构

```
~/.agent-swarm/agents/{agent-id}/
├── config.json    # Agent 配置
├── prompt.md       # Agent 系统提示词
└── skills/         # Agent 技能（可选）
    └── {skill-name}/
        └── SKILL.md
```

## 执行步骤

### 1. 解析用户需求

识别 Agent 类型和具体要求：
- **类型**: 客服/翻译/代码/创作/分析
- **语言**: 中文/英文/日文等
- **风格**: 专业/友好/创意
- **特殊要求**: 领域知识、工具使用等

### 2. 生成 config.json

参考 [配置模板](templates/agent-config.md)，填写字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| id | 唯一标识符（小写字母、数字、中划线） | `customer-service` |
| name | 显示名称 | `电商客服助手` |
| description | 功能描述 | `处理用户咨询和售后问题` |
| model.provider | 模型提供商 | `anthropic` |
| model.id | 模型 ID | `claude-3-sonnet` |
| temperature | 温度 (0-1) | `0.7` |
| maxTokens | 最大 token 数 | `4096` |

### 3. 生成 prompt.md

根据 Agent 类型选择 [prompt 模板](templates/agent-prompts.md)：

- **客服类**: 友好、耐心、问题解决导向
- **翻译类**: 准确、保持风格、处理文化差异
- **代码类**: 最佳实践、类型安全、清晰注释
- **创作类**: 创意、吸引力、目标导向

### 4. 创建目录和文件

```bash
mkdir -p ~/.agent-swarm/agents/{agent-id}
cat > ~/.agent-swarm/agents/{agent-id}/config.json << 'EOF'
{生成的配置}
EOF

cat > ~/.agent-swarm/agents/{agent-id}/prompt.md << 'EOF'
{生成的提示词}
EOF
```

## 常见示例

### 客服 Agent

**输入**: "创建一个电商客服 Agent"

**config.json**:
```json
{
  "id": "customer-service",
  "name": "电商客服助手",
  "description": "专业的电商客服 Agent，处理用户咨询、订单问题和售后支持",
  "model": {
    "provider": "anthropic",
    "id": "claude-3-sonnet"
  }
}
```

### 翻译 Agent

**输入**: "创建一个翻译 Agent，支持中英日三语"

**config.json**:
```json
{
  "id": "translator",
  "name": "多语言翻译助手",
  "description": "专业的多语言翻译 Agent，支持中文、英文、日文互译",
  "model": {
    "provider": "anthropic",
    "id": "claude-3-opus"
  }
}
```

### 代码助手

**输入**: "创建一个 TypeScript 代码助手"

**config.json**:
```json
{
  "id": "typescript-assistant",
  "name": "TypeScript 代码助手",
  "description": "专业的 TypeScript 开发助手，提供代码编写、审查和优化建议",
  "model": {
    "provider": "anthropic",
    "id": "claude-3-opus"
  }
}
```

## 模型选择建议

| 任务类型 | 推荐模型 | 原因 |
|---------|---------|------|
| 简单对话/客服 | claude-3-sonnet | 快速、经济 |
| 代码生成/翻译 | claude-3-opus | 高质量、准确 |
| 轻量任务 | claude-3-haiku | 超快速、低成本 |

## 注意事项

1. **ID 命名**: 只用小写字母、数字、中划线
2. **名称本地化**: 根据用户语言选择
3. **温度设置**:
   - 代码/翻译: 0.2-0.3（准确）
   - 客服/日常: 0.7（平衡）
   - 创意写作: 0.9（创造性）

## 参考文档

- [配置模板](templates/agent-config.md) - 完整字段说明和示例
- [Prompt 模板](templates/agent-prompts.md) - 各类 Agent 的 prompt 模板

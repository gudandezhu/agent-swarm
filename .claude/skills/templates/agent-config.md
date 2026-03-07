# Agent 配置模板

## 完整配置示例

```json
{
  "id": "agent-id",
  "name": "Agent 显示名称",
  "description": "Agent 功能描述",
  "model": {
    "provider": "anthropic",
    "id": "claude-3-opus"
  },
  "systemPrompt": "可选：系统提示词",
  "temperature": 0.7,
  "maxTokens": 4096,
  "timeout": 30000
}
```

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent 唯一标识符（小写字母、数字、中划线） |
| name | string | 是 | Agent 显示名称 |
| description | string | 是 | Agent 功能描述 |
| model.provider | string | 否 | 模型提供商 |
| model.id | string | 否 | 模型 ID |
| systemPrompt | string | 否 | 系统提示词 |
| temperature | number | 否 | 模型温度 (0-1)，默认 0.7 |
| maxTokens | number | 否 | 最大 token 数，默认 4096 |
| timeout | number | 否 | 超时时间（毫秒），默认 30000 |

## 支持的模型

| Provider | 模型 ID | 适用场景 |
|----------|---------|----------|
| anthropic | claude-3-opus | 复杂任务、代码生成 |
| anthropic | claude-3-sonnet | 日常任务、客服 |
| anthropic | claude-3-haiku | 轻量任务 |
| openai | gpt-4 | 通用任务 |
| openai | gpt-4-turbo | 快速响应 |
| deepseek | deepseek-chat | 中文优化 |
| deepseek | deepseek-coder | 代码任务 |

## 快速开始

### 最小配置

```json
{
  "id": "my-agent",
  "name": "我的助手",
  "description": "帮助处理日常任务"
}
```

### 客服 Agent

```json
{
  "id": "customer-service",
  "name": "电商客服",
  "description": "处理用户咨询和售后",
  "model": {
    "provider": "anthropic",
    "id": "claude-3-sonnet"
  },
  "temperature": 0.7
}
```

### 代码助手 Agent

```json
{
  "id": "code-helper",
  "name": "TypeScript 助手",
  "description": "TypeScript 代码开发助手",
  "model": {
    "provider": "anthropic",
    "id": "claude-3-opus"
  },
  "temperature": 0.3,
  "maxTokens": 8192
}
```

### 翻译助手 Agent

```json
{
  "id": "translator",
  "name": "多语言翻译",
  "description": "支持中英日三语翻译",
  "model": {
    "provider": "anthropic",
    "id": "claude-3-opus"
  },
  "temperature": 0.2,
  "maxTokens": 4096
}
```

## 配置验证规则

### ID 命名
- 只允许小写字母、数字、中划线
- 长度 1-50 字符
- 示例：`customer-service`, `code-assistant-v2`

### Temperature 范围
- 0.0 - 1.0
- 更低 = 更确定性
- 更高 = 更随机和创意
- 推荐：
  - 代码/翻译: 0.2-0.3
  - 客服/日常: 0.7
  - 创意写作: 0.9

### MaxTokens 建议
- 4096: 日常使用
- 8192: 长回复、代码生成
- 128000: 长文档处理

### Timeout 建议
- 30000 (30秒): 默认
- 60000 (1分钟): 复杂任务
- 120000 (2分钟): 长文档分析

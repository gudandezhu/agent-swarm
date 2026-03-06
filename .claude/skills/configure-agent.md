# Configure Agent Skill

## 概述

此技能用于配置现有的 Agent。Claude 会根据用户的描述自动更新 Agent 的配置文件。

## 使用方式

用户可以描述想要修改的配置，例如：
- "给客服 Agent 添加新的技能"
- "修改翻译助手使用 GPT-4 模型"
- "调整代码助手的温度参数"

## Agent 配置字段

### config.json 完整字段

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

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent 唯一标识符 |
| name | string | 是 | Agent 显示名称 |
| description | string | 是 | Agent 功能描述 |
| model.provider | string | 否 | 模型提供商 |
| model.id | string | 否 | 模型 ID |
| systemPrompt | string | 否 | 系统提示词 |
| temperature | number | 否 | 模型温度 (0-1)，默认 0.7 |
| maxTokens | number | 否 | 最大 token 数，默认 4096 |
| timeout | number | 否 | 超时时间（毫秒），默认 30000 |

### 支持的模型提供商

| Provider | 模型 ID 示例 |
|----------|-------------|
| anthropic | claude-3-opus, claude-3-sonnet, claude-3-haiku |
| openai | gpt-4, gpt-4-turbo, gpt-3.5-turbo |
| openrouter | openai/gpt-4, anthropic/claude-3-opus |
| deepseek | deepseek-chat, deepseek-coder |

## 常见配置场景

### 场景 1: 修改模型

**用户输入**: "把翻译助手改成用 GPT-4"

**操作**:
```json
{
  "model": {
    "provider": "openai",
    "id": "gpt-4"
  }
}
```

### 场景 2: 调整温度

**用户输入**: "让客服 Agent 更有创意一些，调高温度"

**操作**:
```json
{
  "temperature": 0.9
}
```

### 场景 3: 添加系统提示

**用户输入**: "给代码助手添加这个规则：总是用 TypeScript 回复"

**操作**:
```json
{
  "systemPrompt": "你是一个 TypeScript 专家。总是用 TypeScript 代码回复用户。"
}
```

### 场景 4: 修改名称和描述

**用户输入**: "把 Agent 名称改成'智能客服'，描述改成'24小时在线客服'"

**操作**:
```json
{
  "name": "智能客服",
  "description": "24小时在线客服"
}
```

## 执行步骤

1. **确认 Agent ID**
   - 如果用户没有指定 Agent ID，询问要配置哪个 Agent
   - 列出现有 Agent 供选择

2. **读取现有配置**
   - 读取 `~/.agent-swarm/agents/{agent-id}/config.json`
   - 了解当前配置状态

3. **解析用户需求**
   - 识别要修改的字段
   - 验证字段值的有效性

4. **合并配置**
   - 保留未修改的字段
   - 更新指定字段
   - 不删除未提及的字段

5. **保存配置**
   - 写入更新后的 config.json
   - 确认修改成功

## 配置验证规则

### ID 验证
- 只允许小写字母、数字、中划线
- 长度 1-50 字符
- 示例：`customer-service`, `code-assistant-v2`

### Temperature 验证
- 范围：0.0 - 1.0
- 默认：0.7
- 更低 = 更确定性，更高 = 更随机

### MaxTokens 验证
- 范围：1 - 128000（取决于模型）
- 推荐：4096（日常使用）、8192（长回复）

### Timeout 验证
- 范围：1000 - 300000（1秒 - 5分钟）
- 推荐：30000（30秒）

## 注意事项

1. **保留现有配置**
   - 只更新用户指定的字段
   - 不删除未提及的字段
   - 保持配置文件格式整洁

2. **模型兼容性**
   - 确保提供商和模型 ID 匹配
   - 提醒用户可能的 API 密钥需求

3. **prompt.md 联动**
   - 如果修改了 systemPrompt，询问是否更新 prompt.md
   - 保持两者的一致性

4. **备份建议**
   - 对于重要配置变更，建议用户备份原配置

## 错误处理

| 错误类型 | 处理方式 |
|---------|---------|
| Agent 不存在 | 列出可用 Agent，询问是否创建新的 |
| 字段无效 | 解释正确格式，提供示例 |
| 值超出范围 | 说明有效范围，建议合适值 |
| 文件读取失败 | 提示文件可能损坏，建议手动检查 |

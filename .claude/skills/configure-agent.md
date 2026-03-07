---
name: configure-agent
description: "配置现有 Agent。修改 Agent 的模型、温度、token 等配置参数。当用户说'修改配置'、'调整设置'、'更改模型'、'configure agent'时使用。"
version: "1.0.0"
author: "Agent Swarm Team"
triggers:
  - "修改配置"
  - "调整设置"
  - "更改模型"
  - "update agent"
  - "configure agent"
  - "修改 temperature"
  - "换模型"
category: "agent-management"
---

# Configure Agent Skill

## 概述

配置现有 Agent 的参数。Claude 根据用户描述自动更新 `config.json`。

## 快速开始

**用户说**: "把翻译助手改成用 GPT-4"

**Claude 自动**:
1. 读取 `~/.agent-swarm/agents/translator/config.json`
2. 更新 `model` 字段
3. 保存并确认

## 配置字段

### 核心字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | Agent 唯一标识符 |
| name | string | Agent 显示名称 |
| description | string | Agent 功能描述 |

### 模型配置

| 字段 | 类型 | 说明 |
|------|------|------|
| model.provider | string | 模型提供商 |
| model.id | string | 模型 ID |

### 行为参数

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| temperature | number | 0.7 | 0=确定性，1=随机性 |
| maxTokens | number | 4096 | 最大输出长度 |
| timeout | number | 30000 | 超时（毫秒） |

完整配置参见 [配置模板](templates/agent-config.md)

## 常见配置场景

### 场景 1: 更换模型

**用户说**: "翻译助手改成 GPT-4"

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

**用户说**: "客服 Agent 更有创意一些"

**操作**:
```json
{
  "temperature": 0.9
}
```

### 场景 3: 增加 token 限制

**用户说**: "代码助手需要处理更长文件"

**操作**:
```json
{
  "maxTokens": 8192
}
```

### 场景 4: 添加系统提示

**用户说**: "给代码助手添加：总是用 TypeScript 回复"

**操作**:
```json
{
  "systemPrompt": "你是一个 TypeScript 专家。总是用 TypeScript 代码回复用户。"
}
```

## 执行步骤

1. **确认 Agent ID**
   - 如果用户未指定，列出现有 Agent 供选择
   - 读取 `~/.agent-swarm/agents/{agent-id}/config.json`

2. **解析需求**
   - 识别要修改的字段
   - 验证字段值有效性

3. **合并配置**
   - 保留未修改字段
   - 更新指定字段
   - 不删除未提及字段

4. **保存并验证**
   - 写入更新后的 config.json
   - 验证 JSON 格式
   - 确认修改成功

## 配置验证

### Temperature 范围

- **0.0-0.3**: 准确性优先（翻译、代码）
- **0.4-0.7**: 平衡（日常对话）
- **0.8-1.0**: 创意优先（写作、头脑风暴）

### MaxTokens 建议

- **4096**: 日常使用
- **8192**: 长回复、代码
- **128000**: 长文档处理

### Timeout 建议

- **30000** (30秒): 默认
- **60000** (1分钟): 复杂任务
- **120000** (2分钟): 长文档分析

## 注意事项

1. **保留现有配置**: 只更新用户指定的字段
2. **模型兼容性**: 确保提供商和模型 ID 匹配
3. **API 密钥**: 提醒用户可能需要配置 API 密钥
4. **备份**: 重要配置变更建议用户备份

## 错误处理

| 错误 | 处理方式 |
|------|---------|
| Agent 不存在 | 列出可用 Agent，询问是否创建新的 |
| 字段无效 | 解释正确格式，提供示例 |
| 值超出范围 | 说明有效范围，建议合适值 |
| 文件读取失败 | 提示文件可能损坏 |

## 参考文档

- [配置模板](templates/agent-config.md) - 完整配置示例和验证规则

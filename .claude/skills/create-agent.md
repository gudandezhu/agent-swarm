# Create Agent Skill

## 概述

此技能用于通过自然语言创建新的 Agent。Claude 会根据用户的描述自动生成 `config.json` 和 `prompt.md` 文件。

## 使用方式

用户只需描述想要创建的 Agent 类型，例如：
- "创建一个客服 Agent"
- "创建一个翻译助手，支持中英互译"
- "创建一个代码助手，精通 TypeScript"

## Agent 配置结构

### 目录结构

```
~/.agent-swarm/agents/{agent-id}/
├── config.json    # Agent 配置
├── prompt.md       # Agent 系统提示词
└── skills/         # Agent 技能（可选）
    └── {skill-name}/
        └── SKILL.md
```

### config.json 字段说明

```typescript
interface AgentConfig {
  // 必填字段
  id: string;           // Agent 唯一标识符（字母、数字、中划线）
  name: string;         // Agent 显示名称
  description: string;  // Agent 功能描述

  // 模型配置
  model?: {
    provider: string;  // 模型提供商: "anthropic" | "openai" | "openrouter"
    id: string;        // 模型 ID: "claude-3-opus" | "gpt-4" | "deepseek/deepseek-chat"
  };

  // 可选字段
  systemPrompt?: string;  // 系统提示词（可引用 prompt.md 文件）
  temperature?: number; // 模型温度 (0-1)
  maxTokens?: number;   // 最大 token 数
  timeout?: number;    // 超时时间（毫秒）
}
```

### prompt.md 结构

```markdown
# Agent 名称

角色描述和能力说明。

## 角色定义
- 主要职责
- 行为准则
- 专业领域

## 行为指南
1. 具体规则
2. 回复风格
3. 注意事项

## 示例回复
用户输入 -> Agent 回复示例
```

## 自然语言映射示例

### 示例 1: 客服 Agent

**用户输入**: "创建一个电商客服 Agent"

**生成的 config.json**:
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

**生成的 prompt.md**:
```markdown
# 电商客服助手

你是一个专业的电商客服助手，致力于为用户提供优质的购物体验。

## 角色定义
- 解答用户关于商品、订单、物流的咨询
- 处理退换货、退款等售后问题
- 收集用户反馈，帮助改进产品

## 行为指南
1. 保持耐心和专业，即使面对不满用户
2. 优先解决用户问题，而非推卸责任
3. 如无法解决，提供升级处理渠道

## 回复风格
- 友好、简洁、专业
- 主动提供额外帮助信息
- 适当使用表情符号增加亲和力
```

### 示例 2: 翻译助手

**用户输入**: "创建一个翻译 Agent，支持中英日三语"

**生成的 config.json**:
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

**生成的 prompt.md**:
```markdown
# 多语言翻译助手

你是一个专业的多语言翻译助手，精通中文、英文和日文。

## 角色定义
- 提供准确、流畅的多语言翻译
- 保持原文的风格和语气
- 处理专业术语和文化差异

## 行为指南
1. 准确翻译，不添加个人观点
2. 如有歧义，提供多种翻译选项
3. 保持格式（如引号、换行）

## 语言对
- 中文 <-> 英文
- 中文 <-> 日文
- 英文 <-> 日文
```

### 示例 3: 代码助手

**用户输入**: "创建一个 TypeScript 代码助手"

**生成的 config.json**:
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

**生成的 prompt.md**:
```markdown
# TypeScript 代码助手

你是一个专业的 TypeScript 开发助手，帮助用户编写高质量代码。

## 角色定义
- 编写、审查和优化 TypeScript 代码
- 解释代码逻辑和最佳实践
- 调试和修复 bug

## 行为指南
1. 遵循 TypeScript 最佳实践
2. 提供类型安全的代码
3. 解释复杂逻辑
4. 考虑性能和可维护性

## 代码风格
- 使用接口定义类型
- 优先使用不可变数据
- 适当的注释
- 清晰的命名
```

## 模板类型

### 客服类 Agent
- 关键词：客服、售后、咨询、支持
- 特点：友好、耐心、解决问题导向
- 推荐 model: claude-3-sonnet

### 翻译类 Agent
- 关键词：翻译、语言、本地化
- 特点：准确、保持风格、处理文化差异
- 推荐 model: claude-3-opus

### 代码助手类 Agent
- 关键词：代码、开发、编程、调试
- 特点：专业、准确、最佳实践
- 推荐 model: claude-3-opus

### 内容创作类 Agent
- 关键词：写作、文案、内容、创意
- 特点：创意、吸引人、目标导向
- 推荐 model: claude-3-opus

### 数据分析类 Agent
- 关键词：数据、分析、报表、洞察
- 特点：数据驱动、清晰、可操作建议
- 推荐 model: claude-3-opus

## 执行步骤

当用户请求创建 Agent 时：

1. **解析用户需求**
   - 识别 Agent 类型（客服/翻译/代码/创作/分析等）
   - 提取具体要求（语言、领域、风格等）
   - 确定 Agent ID（基于类型生成）

2. **生成 config.json**
   - 填写必填字段（id、name、description）
   - 根据类型选择合适的 model
   - 添加可选配置

3. **生成 prompt.md**
   - 基于 Agent 类型选择模板
   - 根据用户具体要求定制内容
   - 包含角色定义和行为指南

4. **创建目录结构**
   ```
   ~/.agent-swarm/agents/{agent-id}/
   ├── config.json
   └── prompt.md
   ```

5. **确认创建**
   - 显示生成的配置
   - 询问是否需要调整

## 注意事项

1. **ID 命名规范**
   - 只使用小写字母、数字和中划线
   - 示例：`customer-service`、`code-assistant`、`translator`

2. **名称本地化**
   - 根据用户语言选择名称
   - 中文用户用中文名称

3. **模型选择建议**
   - 简单任务：claude-3-sonnet 或 gpt-4
   - 复杂任务：claude-3-opus
   - 代码任务：claude-3-opus

4. **prompt.md 最佳实践**
   - 清晰的角色定义
   - 具体的行为指南
   - 示例回复格式

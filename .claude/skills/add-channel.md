# Add Channel Skill

## 概述

此技能用于为 Agent 添加消息渠道。Claude 会根据用户描述自动配置渠道连接。

## 使用方式

用户可以描述想要添加的渠道，例如：
- "给客服 Agent 添加钉钉渠道"
- "让翻译助手可以通过飞书接收消息"
- "为代码助手配置 CLI 测试渠道"

## 支持的渠道类型

### 1. CLI 渠道

命令行界面，用于本地测试和开发。

**配置示例**:
```json
{
  "type": "cli",
  "enabled": true
}
```

**特点**:
- 无需额外配置
- 适合本地开发测试
- 支持多行输入
- 自动显示 Agent 回复

### 2. 钉钉渠道

钉钉企业通讯平台。

**配置示例**:
```json
{
  "type": "dingtalk",
  "enabled": true,
  "config": {
    "appKey": "dingxxxxxxxxxxxx",
    "appSecret": "xxxxxxxxxxxxxxxx",
    "webhookUrl": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
    "enablePersistentRetry": true,
    "maxRetries": 3
  }
}
```

**必需配置**:
| 字段 | 说明 | 获取方式 |
|------|------|---------|
| appKey | 应用 Key | 钉钉开放平台 |
| appSecret | 应用密钥 | 钉钉开放平台 |

**可选配置**:
| 字段 | 说明 | 默认值 |
|------|------|--------|
| webhookUrl | Webhook 地址 | - |
| enablePersistentRetry | 启用持久化重试 | false |
| maxRetries | 最大重试次数 | 3 |
| retryDelay | 重试延迟(ms) | 1000 |

### 3. 飞书渠道

飞书企业通讯平台。

**配置示例**:
```json
{
  "type": "feishu",
  "enabled": true,
  "config": {
    "appId": "cli_xxxxxxxxxxxxx",
    "appSecret": "xxxxxxxxxxxxxxxx"
  }
}
```

**必需配置**:
| 字段 | 说明 | 获取方式 |
|------|------|---------|
| appId | 应用 ID | 飞书开放平台 |
| appSecret | 应用密钥 | 飞书开放平台 |

## Agent 渠道配置结构

### 配置文件位置

```
~/.agent-swarm/agents/{agent-id}/
├── config.json       # Agent 基础配置
└── channels.json     # 渠道配置（新建）
```

### channels.json 结构

```json
{
  "channels": [
    {
      "type": "cli",
      "enabled": true
    },
    {
      "type": "dingtalk",
      "enabled": true,
      "config": {
        "appKey": "...",
        "appSecret": "..."
      }
    }
  ]
}
```

## 执行步骤

1. **确认 Agent ID**
   - 如果用户没有指定 Agent ID，询问要配置哪个 Agent
   - 列出现有 Agent 供选择

2. **确认渠道类型**
   - 解析用户描述的渠道类型
   - 如果不明确，询问具体渠道

3. **收集必要信息**
   - 列出必需的配置字段
   - 引导用户提供配置值
   - 验证配置完整性

4. **创建/更新 channels.json**
   - 如果文件不存在，创建新文件
   - 如果渠道已存在，更新配置
   - 保持其他渠道配置不变

5. **验证配置**
   - 检查 JSON 格式正确性
   - 验证必需字段存在
   - 确认渠道可用

6. **确认完成**
   - 显示更新后的渠道配置
   - 提供测试建议

## 渠道配置模板

### 添加钉钉渠道模板

**用户输入**: "给 {agent-id} 添加钉钉渠道"

**Claude 响应**:
```
我需要以下信息来配置钉钉渠道：

1. App Key（从钉钉开放平台获取）
2. App Secret（从钉钉开放平台获取）

可选配置：
- Webhook URL（用于消息推送）
- 是否启用持久化重试（默认：否）

请提供这些信息。
```

### 添加飞书渠道模板

**用户输入**: "给 {agent-id} 添加飞书渠道"

**Claude 响应**:
```
我需要以下信息来配置飞书渠道：

1. App ID（从飞书开放平台获取）
2. App Secret（从飞书开放平台获取）

请提供这些信息。
```

### 添加 CLI 渠道模板

**用户输入**: "给 {agent-id} 添加 CLI 渠道"

**Claude 响应**:
```
CLI 渠道无需额外配置，我将直接添加。

[创建 channels.json]
```

## 渠道优先级

当 Agent 配置了多个渠道时，按以下优先级处理消息：

1. **按来源回复**：消息从哪个渠道来，回复到哪个渠道
2. **同时广播**：如果配置了广播，同时发送到所有启用的渠道

## 安全注意事项

1. **敏感信息保护**
   - App Secret 等敏感信息存储在本地
   - 不应提交到版本控制
   - 建议使用环境变量

2. **配置文件权限**
   - channels.json 应设置适当的文件权限
   - 避免其他用户读取

3. **建议的 .gitignore**
   ```
   channels.json
   *.secret.json
   ```

## 常见问题

### Q: 如何获取钉钉 App Key？

访问 [钉钉开放平台](https://open.dingtalk.com/)，创建企业内部应用后获取。

### Q: 如何获取飞书 App ID？

访问 [飞书开放平台](https://open.feishu.cn/)，创建企业自建应用后获取。

### Q: 可以同时配置多个渠道吗？

是的，一个 Agent 可以配置多个渠道，消息会根据来源自动路由。

### Q: 如何测试渠道配置？

使用 CLI 渠道进行本地测试，确认 Agent 工作正常后再连接外部渠道。

## 错误处理

| 错误类型 | 处理方式 |
|---------|---------|
| Agent 不存在 | 询问是否要创建新 Agent |
| 渠道类型不支持 | 列出支持的渠道类型 |
| 配置信息不完整 | 提示缺少的必需字段 |
| 配置文件损坏 | 建议备份后重新创建 |

---
name: add-channel
description: "为 Agent 添加消息渠道（CLI、钉钉、飞书等）。自动配置 webhook、API 密钥等。当用户说'添加渠道'、'连接钉钉'、'配置 webhook'、'add channel'时使用。"
version: "1.0.0"
author: "Agent Swarm Team"
triggers:
  - "添加渠道"
  - "连接钉钉"
  - "配置飞书"
  - "添加 webhook"
  - "add channel"
  - "connect dingtalk"
  - "setup feishu"
category: "channel-management"
---

# Add Channel Skill

## 概述

为 Agent 添加消息渠道。Claude 根据用户描述自动配置渠道连接。

## 快速开始

**用户说**: "给客服 Agent 添加钉钉渠道"

**Claude 自动**:
1. 询问必要信息（App Key、App Secret）
2. 创建/更新 `channels.json`
3. 验证配置并确认

## 支持的渠道

### CLI 渠道
命令行界面，无需配置，适合本地测试。

### 钉钉渠道
企业通讯平台，需要 App Key 和 App Secret。

### 飞书渠道
企业通讯平台，需要 App ID 和 App Secret。

配置示例参见 [渠道配置模板](templates/channel-configs.md)

## Agent 渠道配置结构

### 目录结构

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

### 1. 确认 Agent

如果用户未指定 Agent ID，列出现有 Agent：
```bash
ls ~/.agent-swarm/agents/
```

### 2. 确认渠道类型

解析用户描述的渠道类型。

### 3. 收集配置信息

**钉钉渠道必需**:
- App Key（钉钉开放平台获取）
- App Secret（钉钉开放平台获取）

**飞书渠道必需**:
- App ID（飞书开放平台获取）
- App Secret（飞书开放平台获取）

**CLI 渠道**: 无需配置

### 4. 创建/更新 channels.json

如果文件不存在，创建新文件：
```json
{
  "channels": [
    {
      "type": "{channel-type}",
      "enabled": true,
      "config": {
        /* 渠道特定配置 */
      }
    }
  ]
}
```

如果渠道已存在，更新配置。

### 5. 验证并确认

- 检查 JSON 格式
- 验证必需字段
- 显示更新后的配置

## 渠道配置示例

### 添加钉钉渠道

**用户**: "给客服 Agent 添加钉钉渠道"

**Claude**:
```
我需要以下信息：
1. App Key
2. App Secret

可选：
- Webhook URL
- 是否启用持久化重试
```

### 添加飞书渠道

**用户**: "给翻译助手添加飞书渠道"

**Claude**:
```
我需要以下信息：
1. App ID
2. App Secret
```

### 添加 CLI 渠道

**用户**: "给代码助手添加 CLI 渠道"

**Claude**: 直接添加，无需额外信息。

## 渠道优先级

当 Agent 配置多个渠道时：

1. **按来源回复**: 消息从哪个渠道来，回复到哪个渠道
2. **同时广播**: 如果配置了广播，同时发送到所有启用的渠道

## 安全注意事项

1. **敏感信息保护**:
   - App Secret 等存储在本地
   - 不应提交到版本控制
   - 建议使用环境变量

2. **建议的 .gitignore**:
   ```
   channels.json
   *.secret.json
   ```

3. **文件权限**:
   - 设置适当的文件权限
   - 避免其他用户读取

## 常见问题

### Q: 如何获取钉钉 App Key？

访问 [钉钉开放平台](https://open.dingtalk.com/)，创建企业内部应用。

### Q: 如何获取飞书 App ID？

访问 [飞书开放平台](https://open.feishu.cn/)，创建企业自建应用。

### Q: 可以同时配置多个渠道吗？

是的，消息会根据来源自动路由。

### Q: 如何测试渠道配置？

使用 CLI 渠道进行本地测试，确认正常后再连接外部渠道。

## 错误处理

| 错误 | 处理方式 |
|------|---------|
| Agent 不存在 | 询问是否创建新 Agent |
| 渠道类型不支持 | 列出支持的渠道类型 |
| 配置不完整 | 提示缺少的必需字段 |
| 文件损坏 | 建议备份后重新创建 |

## 参考文档

- [渠道配置模板](templates/channel-configs.md) - 完整配置示例和字段说明

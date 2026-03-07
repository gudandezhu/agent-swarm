# 渠道配置模板

## CLI 渠道

```json
{
  "type": "cli",
  "enabled": true
}
```

**特点**: 无需额外配置，适合本地开发测试

## 钉钉渠道

```json
{
  "type": "dingtalk",
  "enabled": true,
  "config": {
    "appKey": "dingxxxxxxxxxxxx",
    "appSecret": "xxxxxxxxxxxxxxxx",
    "webhookUrl": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
    "enablePersistentRetry": true,
    "maxRetries": 3,
    "retryDelay": 1000
  }
}
```

**必需字段**: appKey, appSecret
**可选字段**: webhookUrl, enablePersistentRetry, maxRetries, retryDelay

## 飞书渠道

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

**必需字段**: appId, appSecret

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 渠道类型: cli/dingtalk/feishu |
| enabled | boolean | 是 | 是否启用 |
| config | object | 否 | 渠道特定配置 |

# Agent Swarm 配置示例

本目录包含各种配置示例，帮助你快速设置 Agent Swarm。

## GLM 配置示例

### 普通端点

```bash
# 环境变量方式
export GLM_API_KEY=your-glm-api-key
export GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

```json
// 配置文件方式 (~/.agent-swarm/agent-swarm.json)
{
  "apiKeys": {
    "glm": "your-glm-api-key"
  },
  "baseUrls": {
    "glm": "https://open.bigmodel.cn/api/paas/v4"
  }
}
```

### Coding-Plan 端点

```bash
# 环境变量方式
export GLM_API_KEY=your-glm-api-key
export GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/coding-plan
```

```json
// 配置文件方式
{
  "apiKeys": {
    "glm": "your-glm-api-key"
  },
  "baseUrls": {
    "glm": "https://open.bigmodel.cn/api/paas/v4/coding-plan"
  }
}
```

## 完整配置示例

查看 [glm-config-example.json](./glm-config-example.json) 获取完整的配置示例。

## 配置优先级

Base URL 配置优先级（从高到低）：

1. **环境变量** - `GLM_BASE_URL`
2. **配置文件** - `~/.agent-swarm/agent-swarm.json` 中的 `baseUrls.glm`
3. **默认值** - 代码中指定的默认值

## 支持的环境变量

| Provider | API Key 环境变量 | Base URL 环境变量 |
|----------|-----------------|-------------------|
| Anthropic | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| GLM | `GLM_API_KEY` | `GLM_BASE_URL` |
| 自定义 | `{PROVIDER}_API_KEY` | `{PROVIDER}_BASE_URL` |

## 使用示例

```bash
# 1. 配置 GLM coding-plan
export GLM_API_KEY=your-key
export GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/coding-plan

# 2. 创建使用 GLM 的 Agent
swarm create-agent coder --model glm-4-plus

# 3. 启动服务
swarm start
```

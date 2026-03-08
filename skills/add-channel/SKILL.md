---
name: add-channel
description: "为 Agent 添加消息渠道（CLI、钉钉、飞书、企业微信等），自动配置 webhook 和 API 密钥。当用户说'添加渠道'、'连接钉钉'、'配置飞书'、'添加 webhook'、'接入企业微信'、'add channel'、'connect dingtalk'、'setup feishu'、或需要在不同平台使用 Agent 的场景时，必须使用此 skill。"
version: "2.0.0"
author: "Agent Swarm Team"
triggers:
  - "添加渠道"
  - "连接钉钉"
  - "配置飞书"
  - "添加 webhook"
  - "接入企业微信"
  - "add channel"
  - "connect dingtalk"
  - "setup feishu"
  - "配置通知"
  - "添加消息推送"
category: "channel-management"
---

# Add Channel - 渠道配置向导

## 你的角色

你是 Agent Swarm 的渠道配置助手。你的目标是帮助用户在不同平台上使用他们的 Agent，配置过程简单安全。

## 配置前检查

**在开始配置前，先确认：**

1. **Agent 是否存在？**
   ```bash
   ls ~/.agent-swarm/agents/
   ```

2. **支持哪些渠道？**
   - CLI（命令行）- 无需配置
   - 钉钉 - 需要 App Key/Secret
   - 飞书 - 需要 App ID/Secret
   - 企业微信 - 需要 CorpID/Secret
   - Webhook - 需要 URL

3. **用户有什么信息？**
   - 已有应用凭证？
   - 需要帮助创建？

## 支持的渠道

### CLI 渠道 ✅
**无需配置，开箱即用**

- 适用场景：本地测试、开发调试
- 优点：简单、快速
- 缺点：只能在命令行使用

### 钉钉渠道 📱
**企业通讯平台**

**需要信息：**
- App Key（钉钉开放平台获取）
- App Secret（钉钉开放平台获取）
- 可选：Webhook URL

**适用场景：**
- 企业内部通知
- 团队协作
- 自动化消息推送

**获取方式：**
1. 访问 https://open.dingtalk.com/
2. 创建企业内部应用
3. 在应用详情页查看凭证

### 飞书渠道 💬
**企业协作平台**

**需要信息：**
- App ID（飞书开放平台获取）
- App Secret（飞书开放平台获取）

**适用场景：**
- 企业沟通
- 项目协作
- 知识管理

**获取方式：**
1. 访问 https://open.feishu.cn/
2. 创建企业自建应用
3. 在应用凭证页查看

### 企业微信渠道 💼
**企业通讯工具**

**需要信息：**
- CorpID（企业 ID）
- AgentId（应用 ID）
- Secret（应用密钥）

**适用场景：**
- 企业办公
- 客户服务
- 内部通知

**获取方式：**
1. 访问 https://work.weixin.qq.com/
2. 创建应用
3. 查看应用凭证

### Webhook 渠道 🔗
**通用 Webhook**

**需要信息：**
- Webhook URL
- 可选：认证头（Authorization）

**适用场景：**
- 自定义集成
- 第三方平台
- 自动化工作流

## 配置流程

**采用交互式配置，逐步引导：**

### Step 1: 确认 Agent

**如果用户未指定：**
```
想为哪个 Agent 添加渠道？

可用 Agents：
• customer-service - 电商客服助手
• translator - 翻译助手

输入名称或 ID：
```

### Step 2: 确认渠道类型

**解析用户描述或询问：**
```
想添加哪种渠道？

支持的渠道：
1. CLI - 命令行（无需配置）
2. 钉钉 - 企业通讯
3. 飞书 - 团队协作
4. 企业微信 - 企业办公
5. Webhook - 自定义集成

选择编号或名称：
```

### Step 3: 收集配置信息

**根据渠道类型收集所需信息：**

#### 钉钉渠道
```
钉钉渠道需要以下信息：

必需信息：
1. App Key（应用键）
   格式：dingxxxxxxxxxxxxx
   获取：钉钉开放平台 → 应用详情

2. App Secret（应用密钥）
   格式：xxxxxxxxxxxxxxxx
   获取：钉钉开放平台 → 应用详情

可选信息：
3. Webhook URL（机器人 Webhook）
   如果使用钉钉机器人

已有这些信息吗？还是需要我帮你创建应用？
```

#### 飞书渠道
```
飞书渠道需要以下信息：

必需信息：
1. App ID（应用 ID）
   格式：cli_xxxxxxxxxxxxx
   获取：飞书开放平台 → 应用凭证

2. App Secret（应用密钥）
   格式：xxxxxxxxxxxxxxxx
   获取：飞书开放平台 → 应用凭证

需要帮助创建飞书应用吗？
```

#### Webhook 渠道
```
Webhook 渠道需要以下信息：

必需信息：
1. Webhook URL
   格式：https://your-domain.com/webhook

可选信息：
2. 认证方式
   - Bearer Token
   - API Key
   - 自定义 Header

请提供 Webhook URL：
```

### Step 4: 安全性检查

**在保存凭证前，提醒用户：**
```
⚠️ 安全提醒

我即将保存这些凭证到本地文件：
• App Key/Secret 等
• 存储位置：~/.agent-swarm/agents/{agent-id}/channels.json

安全建议：
✓ 本地存储，不会上传
✓ 建议设置文件权限为 600
✓ 不要提交到版本控制

继续保存吗？
```

### Step 5: 创建/更新配置文件

**channels.json 结构：**
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
        "appKey": "dingxxxxxxxxxxxxx",
        "appSecret": "xxxxxxxxxxxxxxxx"
      },
      "webhook": {
        "url": "https://oapi.dingtalk.com/robot/send?access_token=xxx"
      }
    }
  ]
}
```

**创建命令：**
```bash
# 如果文件不存在，创建新文件
cat > ~/.agent-swarm/agents/{agent-id}/channels.json << 'EOF'
{
  "channels": [
    {
      "type": "{channel-type}",
      "enabled": true,
      "config": {
        {channel-specific-config}
      }
    }
  ]
}
EOF

# 如果文件存在，追加新渠道
# 读取 → 追加 → 保存
```

### Step 6: 设置文件权限

```bash
# 设置安全权限
chmod 600 ~/.agent-swarm/agents/{agent-id}/channels.json
```

### Step 7: 验证配置

**验证检查清单：**
- [ ] channels.json 格式正确
- [ ] 必需字段完整
- [ ] 凭证格式正确
- [ ] 文件权限安全
- [ ] Agent 可以访问

**向用户确认：**
```
✅ 渠道配置成功！

📋 配置信息：
Agent：{agent-name}
渠道：{channel-type}
状态：已启用

🔒 安全设置：
文件权限：600（仅所有者可读写）
位置：~/.agent-swarm/agents/{agent-id}/channels.json

💡 下一步：
1. 测试渠道: "测试{agent-name}的{channel-type}渠道"
2. 添加更多渠道: "添加{channel}渠道"
3. 查看所有渠道: "列出{agent-name}的渠道"

需要测试一下新渠道吗？
```

## 交互式对话模板

**使用友好的对话方式：**

```
好的！我来帮你为客服 Agent 添加钉钉渠道。

📱 钉钉渠道配置

如果你已有钉钉应用，请提供：
1. App Key
2. App Secret

如果还没有，我可以指导你创建：
a) 我已有应用，直接配置
b) 帮我创建新应用

选择哪个？
```

```
收到，正在配置钉钉渠道...

   ✓ 验证 App Key 格式
   ✓ 验证 App Secret 格式
   ✓ 创建/更新 channels.json
   ✓ 设置安全权限

🎉 钉钉渠道已添加！

现在客服 Agent 可以在钉钉中使用了。
发送消息到钉钉群，Agent 会自动回复。

要测试一下吗？发送"测试客服"到钉钉群。
```

## 错误处理

### 常见错误场景

**场景 1: Agent 不存在**
```
❌ Agent "my-agent" 不存在

可用 Agents：
• customer-service
• translator

选择一个，或创建新的 Agent？
```

**场景 2: 渠道类型不支持**
```
❌ 暂不支持 "telegram" 渠道

支持的渠道：
• CLI
• 钉钉
• 飞书
• 企业微信
• Webhook

可以使用 Webhook 集成 Telegram，试试吗？
```

**场景 3: 配置信息不完整**
```
⚠️ 配置信息不完整

钉钉渠道需要：
✗ App Key（缺失）
✓ App Secret

请提供 App Key，格式如：dingxxxxxxxxxxxxx
```

**场景 4: 凭证格式错误**
```
❌ App Key 格式错误

正确格式：dingxxxxxxxxxxxxx
当前值：{user-input}

钉钉 App Key 应该以 "ding" 开头。
请检查并重新输入。
```

**场景 5: 文件权限问题**
```
❌ 无法写入配置文件

可能原因：
• ~/.agent-swarm/ 目录权限不足
• 磁盘空间不足

解决方案：
1. 检查权限: ls -la ~/.agent-swarm/
2. 检查空间: df -h

需要我帮你执行吗？
```

**场景 6: 渠道已存在**
```
⚠️ 钉钉渠道已配置

当前配置：
• App Key: dingxxx****xxx
• 状态: 已启用

你可以：
1. 更新现有配置
2. 禁用此渠道
3. 删除此渠道

选择哪个？
```

## 渠道管理

### 查看已配置渠道

**用户说："列出渠道" 或 "查看配置"**

```
{agent-name} 的渠道配置：

1. CLI - 已启用
2. 钉钉 - 已启用
   App Key: dingxxx****xxx
3. Webhook - 已禁用

需要修改哪个渠道？
```

### 更新渠道配置

**用户说："更新钉钉配置"**

```
当前钉钉配置：
• App Key: dingxxx****xxx
• Webhook: 已配置

想更新什么？
1. 更新凭证
2. 修改 Webhook
3. 启用/禁用

选择：
```

### 删除渠道

**用户说："删除钉钉渠道"**

```
⚠️ 确认删除钉钉渠道？

删除后，Agent 将无法通过钉钉接收和发送消息。
这不是禁用，是完全删除配置。

确认删除？(yes/no)
```

### 禁用/启用渠道

**用户说："暂时不用钉钉"**

```
可以禁用钉钉渠道，配置会保留但不会使用。

禁用钉钉渠道？(yes/no)
```

## 安全最佳实践

### 1. 文件权限

```bash
# 设置只有所有者可读写
chmod 600 ~/.agent-swarm/agents/*/channels.json

# 验证权限
ls -la ~/.agent-swarm/agents/*/channels.json
# 应该显示: -rw------- (600)
```

### 2. 环境变量

**推荐使用环境变量存储敏感信息：**

```json
{
  "channels": [
    {
      "type": "dingtalk",
      "config": {
        "appKey": "${DINGTALK_APP_KEY}",
        "appSecret": "${DINGTALK_APP_SECRET}"
      }
    }
  ]
}
```

```bash
# 在 ~/.bashrc 或 ~/.zshrc 中
export DINGTALK_APP_KEY="dingxxxxxxxxxxxxx"
export DINGTALK_APP_SECRET="xxxxxxxxxxxxxxxx"
```

### 3. 版本控制

**在项目根目录添加 .gitignore：**

```bash
cat >> ~/.agent-swarm/.gitignore << 'EOF'
# 渠道配置包含敏感信息
agents/*/channels.json
*.secret.json
.env
EOF
```

### 4. 定期轮换凭证

```
💡 安全建议

定期轮换 API 凭证：
• 钉钉：每 3-6 个月
• 飞书：每 3-6 个月
• 企业微信：每 3-6 个月

需要我提醒你何时轮换吗？
```

## 快速配置示例

### 一键添加 CLI 渠道

```
用户："添加 CLI 渠道"

Claude：✅ CLI 渠道已启用！

无需配置，直接在命令行使用即可。
测试："测试{agent-name}"
```

### 快速添加钉钉渠道

```
用户："添加钉钉渠道，App Key 是 dingxxx，Secret 是 xxxxx"

Claude：
✅ 钉钉渠道已配置！

• App Key: dingxxx
• 状态: 已启用

测试：发送消息到钉钉群
```

### 批量添加多个渠道

```
用户："添加钉钉和飞书"

Claude：
我来依次添加：

1️⃣ 钉钉渠道
需要 App Key 和 Secret...

2️⃣ 飞书渠道
需要 App ID 和 Secret...

先配置哪个？还是已有所有凭证？
```

## 特殊场景处理

### 场景 1: 配置多个相同类型渠道

```
可以配置多个钉钉应用（如不同部门）：

渠道 1：
• 名称: 钉钉-客服组
• App Key: dingaaa...

渠道 2：
• 名称: 钉钉-技术组
• App Key: dingbbb...

继续配置多个钉钉渠道吗？
```

### 场景 2: 导入/导出渠道配置

```
• 导出: "导出渠道配置"
  → 生成 channels.json（脱敏）

• 导入: "导入渠道配置"
  → 从文件导入

导入时可以选择：
1. 覆盖现有配置
2. 合并配置
```

### 场景 3: 测试渠道连接

```
用户："测试钉钉渠道"

Claude：
正在测试钉钉连接...

   ✓ 验证 App Key
   ✓ 验证 App Secret
   ✓ 测试消息发送
   ✓ 接收响应

✅ 钉钉渠道连接正常！

测试消息已发送到你的钉钉群。
```

## 渠道优先级和路由

**当配置多个渠道时：**

1. **来源路由**
   - 消息从哪个渠道来，回复到哪个渠道
   - 钉钉 → 钉钉，CLI → CLI

2. **广播模式**（可选）
   - 同时发送到所有启用的渠道
   - 用于重要通知

3. **优先级**（可选）
   - 设置渠道优先级
   - 紧急消息优先发送到高优先级渠道

```
💡 路由模式

当前：来源路由（默认）
• 钉钉消息 → 钉钉回复
• CLI 消息 → CLI 回复

可切换到：广播模式
• 任何渠道 → 所有渠道

需要切换吗？
```

## 最佳实践

**配置渠道时遵循：**

1. **先测试再部署** - 用 CLI 测试，确认正常后再接外部渠道
2. **最小权限原则** - 只授予必要的权限
3. **安全存储** - 使用环境变量，设置文件权限
4. **定期轮换** - 每 3-6 个月更新凭证
5. **监控使用** - 留意异常活动

**避免：**
- ❌ 将凭证提交到 Git
- ❌ 使用过于宽松的文件权限（777）
- ❌ 在公开场合分享凭证
- ❌ 长期不轮换凭证

## 总结

**成功的渠道配置应该实现：**
- ✓ 用户只需提供凭证
- ✓ Claude 自动处理所有细节
- ✓ 配置安全且符合最佳实践
- ✓ 立即可用，无需额外调试

**如果遇到任何问题，停下来帮助用户，不要继续。**

---
name: install
description: "引导用户完成 agent-swarm 框架的完整安装和配置流程。当用户提到'安装'、'设置'、'配置环境'、'初次使用'、'怎么开始'、'getting started'、'setup'、无法找到 swarm 命令、或者需要配置 API 密钥时，必须使用此 skill。即使在开发过程中遇到环境问题、npm 安装错误、权限问题等安装相关障碍时也应使用。"
version: "2.0.0"
author: "Agent Swarm Team"
triggers:
  - "安装 agent-swarm"
  - "帮我安装"
  - "install agent-swarm"
  - "如何安装"
  - "设置环境"
  - "安装 swarm"
  - "怎么开始"
  - "找不到 swarm 命令"
  - "配置 API"
  - "初次使用"
category: "setup"
---

# Agent Swarm 安装向导

## 你的角色

你是 agent-swarm 的安装助手。你的目标是引导用户顺利安装和配置 agent-swarm，解决安装过程中遇到的所有问题。

## 安装前检查

**在开始安装前，先检查用户环境：**

1. **检查是否已安装**
   ```bash
   command -v swarm
   ```
   - 如果返回路径 → 已安装，询问用户是要重新安装还是配置
   - 如果返回空 → 未安装，继续安装流程

2. **检查操作系统**
   ```bash
   uname -s
   ```
   - Linux/macOS → 继续标准安装
   - Windows → 提示使用 WSL 或 Git Bash

3. **检查 Node.js 版本**
   ```bash
   node --version
   ```
   - 需要 Node.js >= 18.x
   - 如果版本过低或未安装，提示用户先安装 Node.js

## 安装流程

**采用交互式安装，逐步引导用户：**

### Step 1: 定位到项目目录

```bash
cd /path/to/agent-swarm
```

确保用户在 agent-swarm 项目根目录（包含 package.json 和 scripts/ 目录）。

### Step 2: 运行安装脚本

```bash
./scripts/install.sh
```

**监控安装输出，关注以下信息：**
- ✓ npm link 成功
- ✓ PATH 配置成功
- ✗ 权限错误
- ✗ 命令未找到

**如果 npm install 失败：**
1. 检查网络连接
2. 尝试清除 npm 缓存：`npm cache clean --force`
3. 检查 Node.js 版本
4. 尝试使用淘宝镜像：`npm config set registry https://registry.npmmirror.com`

### Step 3: 重新加载 Shell 配置

安装脚本会提示重新加载配置。根据用户的 shell 执行：

```bash
# Bash 用户
source ~/.bashrc

# Zsh 用户（macOS 默认）
source ~/.zshrc

# Fish 用户
source ~/.config/fish/config.fish
```

**如果不知道用户的 shell：**
```bash
echo $SHELL
```

### Step 4: 验证安装

```bash
swarm --version
```

**成功标志：** 显示版本号（如 `swarm v0.x.x`）

**失败诊断：**
- 如果提示"command not found" → PATH 配置未生效，检查 `~/.bashrc` 或 `~/.zshrc` 中是否有 export PATH
- 如果提示"permission denied" → 文件权限问题，运行 `chmod +x ~/.agent-swarm/bin/swarm`

### Step 5: 初始化工作空间

**首次使用需要初始化：**

```bash
swarm init
```

这会：
- 创建 `~/.agent-swarm/` 目录结构
- 生成默认配置文件
- 创建示例 agents

**如果 `swarm init` 失败：**
1. 检查 `~/.agent-swarm/` 是否存在且有写权限
2. 查看错误信息，通常是配置文件格式问题
3. 可以手动创建目录：`mkdir -p ~/.agent-swarm/{agents,channels}`

## 配置 API 密钥

**agent-swarm 需要配置 AI 模型的 API 密钥。**

### 询问用户

用友好的方式询问：
```
agent-swarm 需要配置 AI 模型的 API 密钥才能工作。

你使用的是哪个 AI 服务提供商？
1. GLM (智谱 AI) - 推荐
2. OpenAI
3. Anthropic
4. 其他（兼容 OpenAI API 格式）

请告诉我你的选择和 API 密钥，我会帮你配置。
```

### GLM 配置示例

```bash
# 方式 1: 环境变量（推荐用于测试）
export GLM_API_KEY=your-api-key-here
export GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# 方式 2: 配置文件（推荐用于生产）
cat > ~/.agent-swarm/agent-swarm.json << 'EOF'
{
  "apiKeys": {
    "glm": "your-api-key-here"
  },
  "baseUrls": {
    "glm": "https://open.bigmodel.cn/api/paas/v4/coding-plan"
  }
}
EOF
```

### 安全提醒

**必须提醒用户：**
- ⚠️ 不要将 API 密钥提交到 Git 仓库
- ⚠️ 配置文件已在 `.gitignore` 中
- ⚠️ 环境变量方式只适合本地测试

## 启动服务

```bash
# 启动 TUI 模式（最简单）
swarm

# 或使用启动脚本
./start.sh
```

**成功的标志：**
- 看到"Agent Swarm 服务启动成功"消息
- TUI 界面正常显示
- 可以输入消息与 agents 交互

## 故障排查指南

### 问题: swarm 命令未找到

**症状：** 运行 `swarm --version` 提示 "command not found"

**诊断步骤：**
1. 检查 npm link 是否成功：`ls -l ~/.agent-swarm/bin/swarm`
2. 检查 PATH 配置：`echo $PATH | grep agent-swarm`
3. 检查 shell 配置文件：`cat ~/.bashrc | grep agent-swarm`

**解决方案：**
```bash
# 手动添加到 PATH（临时）
export PATH="$HOME/.agent-swarm/bin:$PATH"

# 永久添加到 ~/.bashrc
echo 'export PATH="$HOME/.agent-swarm/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 问题: npm install 权限错误

**症状：** 提示 "EACCES" 或 "permission denied"

**原因：** 使用了 sudo 安装全局包

**解决方案：**
```bash
# 卸载全局包
sudo npm uninstall -g agent-swarm

# 重新运行安装脚本（不使用 sudo）
./scripts/install.sh
```

### 问题: API 调用失败

**症状：** 启动后报错 "API key invalid" 或 "401 Unauthorized"

**诊断：**
1. 检查 API 密钥是否正确：`cat ~/.agent-swarm/agent-swarm.json`
2. 检查网络连接：`curl -I https://open.bigmodel.cn`
3. 检查 base URL 配置

**解决方案：**
- 重新配置 API 密钥
- 检查 API 服务是否正常
- 尝试使用备用端点

### 问题: Shell 配置不生效

**症状：** 修改 `.bashrc` 后运行 `swarm` 仍然提示命令未找到

**原因：** 用户使用的是其他 shell（如 zsh）

**解决方案：**
```bash
# 确认当前 shell
echo $SHELL

# 如果是 zsh，修改 ~/.zshrc 而不是 ~/.bashrc
echo 'export PATH="$HOME/.agent-swarm/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## 安装后的下一步

**安装成功后，引导用户：**

1. **启动 TUI 模式**
   ```bash
   swarm
   ```

2. **创建第一个 agent**
   ```
   现在可以创建你的第一个 agent 了！在 TUI 中输入：
   "创建一个翻译助手 agent"
   ```

3. **查看帮助**
   ```bash
   swarm --help
   ```

4. **查看文档**
   ```
   更多信息请查看项目 README.md
   ```

## 交互式对话模板

**使用友好、渐进式的对话方式：**

```
✓ 检查 Node.js 版本... v20.x.x
✓ 检查是否已安装... 未安装
→ 准备开始安装

安装过程需要 2-3 分钟，包括：
1. 安装依赖包 (~1分钟)
2. 配置命令行工具 (~30秒)
3. 初始化工作空间 (~30秒)

准备好了吗？按 Enter 继续，或 Ctrl+C 取消
```

```
✓ npm install 完成
✓ 配置 PATH 到 ~/.bashrc
✓ 创建 ~/.agent-swarm/ 目录

需要重新加载配置才能使用 swarm 命令。
运行：source ~/.bashrc

然后验证安装：swarm --version
```

## 错误处理原则

**遇到错误时：**

1. **不要继续** - 停止并解释问题
2. **提供诊断** - 告诉用户可能的原因
3. **给出方案** - 提供具体的解决步骤
4. **保持友好** - 技术问题可能让人沮丧，用鼓励的语气

**示例：**
```
❌ 安装失败：npm install 退出码 1

这可能是因为：
• 网络连接问题
• npm registry 访问受限
• Node.js 版本不兼容

建议尝试：
1. 检查网络：ping registry.npmjs.org
2. 使用国内镜像：npm config set registry https://registry.npmmirror.com
3. 查看完整日志：cat npm-debug.log

需要我帮你执行这些检查吗？
```

## 特殊场景处理

### 场景 1: 在 CI/CD 环境中安装

**无需交互式提示，直接执行：**
```bash
./scripts/install.sh --ci-mode
swarm init --non-interactive
```

### 场景 2: 开发者模式（从源码安装）

```bash
# 克隆仓库
git clone https://github.com/your-org/agent-swarm.git
cd agent-swarm

# 安装依赖
npm install

# 链接到全局
npm link

# 运行测试
npm test
```

### 场景 3: Docker 环境

```bash
# 构建镜像
docker build -t agent-swarm .

# 运行容器
docker run -it -v ~/.agent-swarm:/root/.agent-swarm agent-swarm
```

## 总结

**成功的安装应该实现：**
- ✓ `swarm` 命令在 PATH 中可用
- ✓ `~/.agent-swarm/` 目录结构正确
- ✓ API 密钥已配置
- ✓ `swarm` 能正常启动 TUI 模式
- ✓ Bun 运行时已安装（TUI 需要）

**如果任何步骤失败，停下来帮助用户解决问题，不要继续。**

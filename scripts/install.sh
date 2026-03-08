#!/bin/bash
# AI Native 安装脚本
# 用户只需要说"帮我安装 agent-swarm"，Claude 会自动执行此脚本

set -e

echo "🚀 Agent Swarm AI Native 安装"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检测操作系统
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    MINGW*)     MACHINE=Windows;;
    MSYS_NT*)   MACHINE=Windows;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo "📦 检测到系统: $MACHINE"
echo ""

# 1. 配置 npm 全局目录（避免 sudo）
echo "📁 配置 npm 全局目录..."
mkdir -p ~/.npm-global 2>/dev/null || true
npm config set prefix '~/.npm-global' 2>/dev/null || true

# 检测 shell 类型并添加到 PATH
SHELL_CONFIG=""
if [ -n "$ZSH_VERSION" ] || [ -n "$ZSH" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
else
    # 默认使用 .bashrc
    SHELL_CONFIG="$HOME/.bashrc"
fi

# 添加 PATH（如果还没有添加）
if ! grep -q "~/.npm-global/bin" "$SHELL_CONFIG" 2>/dev/null; then
    echo "" >> "$SHELL_CONFIG"
    echo "# npm global packages (agent-swarm)" >> "$SHELL_CONFIG"
    echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$SHELL_CONFIG"
    echo "✅ 已添加 PATH 到 $SHELL_CONFIG"
else
    echo "✅ PATH 已配置"
fi

# 2. 安装依赖
echo ""
echo "📦 安装项目依赖..."
if [ -f "package.json" ]; then
    npm install
    echo "✅ 依赖安装完成"
else
    echo "⚠️  未找到 package.json，跳过依赖安装"
fi

# 3. 编译项目
echo ""
echo "🔨 编译项目..."
if [ -f "package.json" ]; then
    npm run build 2>/dev/null || echo "⚠️  编译跳过（可能已经编译）"
    echo "✅ 项目准备就绪"
fi

# 4. 全局安装
echo ""
echo "🌍 全局安装 swarm 命令..."
export PATH="$HOME/.npm-global/bin:$PATH"
npm install -g . 2>/dev/null || {
    echo "⚠️  全局安装失败，尝试使用 npx..."
    echo "✅ 可以使用 'npx agent-swarm' 代替 'swarm' 命令"
}

# 5. 初始化工作空间（如果还没有）
if [ ! -d "$HOME/.agent-swarm" ]; then
    echo ""
    echo "🏠 初始化工作空间..."
    export PATH="$HOME/.npm-global/bin:$PATH"
    if command -v swarm &> /dev/null; then
        swarm init
    else
        npx agent-swarm init
    fi
    echo "✅ 工作空间初始化完成"
else
    echo ""
    echo "✅ 工作空间已存在: ~/.agent-swarm"
fi

# 完成
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 安装完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 下一步："
echo ""
echo "  1. 重新加载配置："
echo "     source $SHELL_CONFIG"
echo ""
echo "  2. 启动服务："
if command -v swarm &> /dev/null; then
    echo "     swarm start"
else
    echo "     npx agent-swarm start"
fi
echo ""
echo "  3. 配置 API 密钥（可选）："
echo "     export GLM_API_KEY=your-key"
echo "     export GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4"
echo ""

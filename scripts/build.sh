#!/bin/bash
# 一键构建脚本 - 为 TUI 模式准备

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔨 构建 Agent Swarm (TUI 模式)..."

# 安装依赖（如果还没有）
if [ ! -d "node_modules" ]; then
  echo "📦 安装依赖..."
  npm install
fi

# 构建 TypeScript
echo "📝 编译 TypeScript..."
npx tsc

# 确保 Bun 已安装
cd "$SCRIPT_DIR/.."
source "$SCRIPT_DIR/ensure-bun.sh"
ensure_bun_installed

# 验证 Bun 版本
BUN_VERSION=$(bun --version)
echo "✅ Bun $BUN_VERSION 已就绪"

echo "✅ 构建完成！"
echo ""
echo "🚀 启动方式："
echo "   ./start.sh         # 启动 TUI 模式"
echo "   swarm              # 使用 swarm 命令启动"

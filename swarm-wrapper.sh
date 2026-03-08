#!/bin/bash
# Agent Swarm 启动包装脚本

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查是否为 npm 全局安装
if [ -f "$SCRIPT_DIR/../lib/node_modules/agent-swarm/swarm-wrapper.sh" ] || \
   [ -f "$SCRIPT_DIR/swarm-wrapper.sh" ] && [ ! -d "$SCRIPT_DIR/src" ]; then
  # 全局安装：找到实际的项目目录
  if [ -d "$SCRIPT_DIR/../lib/node_modules/agent-swarm" ]; then
    PROJECT_DIR="$SCRIPT_DIR/../lib/node_modules/agent-swarm"
  else
    # 尝试通过 npm list 找到包位置
    PROJECT_DIR="$(npm root -g 2>/dev/null)/agent-swarm"
  fi

  if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 错误: 无法找到 agent-swarm 安装目录"
    echo "请尝试重新安装: npm install -g agent-swarm"
    exit 1
  fi

  cd "$PROJECT_DIR"
else
  # 本地开发：直接使用脚本所在目录
  cd "$SCRIPT_DIR"
fi

# 确保 Bun 已安装（使用内联逻辑，避免依赖外部文件）
ensure_bun_installed() {
  # 如果 bun 已在 PATH 中，直接返回
  if command -v bun &> /dev/null; then
    return 0
  fi

  # 检查 bun 是否已安装在默认位置
  BUN_BIN="$HOME/.bun/bin/bun"
  if [ -x "$BUN_BIN" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
    return 0
  fi

  # Bun 未安装，执行安装
  echo "📦 正在安装 Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"

  # 提示用户
  echo ""
  echo "✅ Bun 已安装"
  echo "⚠️  请将以下行添加到你的 shell 配置文件 (~/.bashrc 或 ~/.zshrc):"
  echo '  export PATH="$HOME/.bun/bin:$PATH"'
  echo ""
  return 0
}

ensure_bun_installed

# 使用 Bun 运行源文件
bun src/cli.ts "$@"

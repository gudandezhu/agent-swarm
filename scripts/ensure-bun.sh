#!/bin/bash
# ensure-bun.sh - 确保 Bun 已安装并配置 PATH
# 此脚本可被其他脚本 source，或直接执行

set -e

ensure_bun_installed() {
  # 如果 bun 已在 PATH 中，直接返回
  if command -v bun &> /dev/null; then
    return 0
  fi

  # 检查 bun 是否已安装在默认位置
  BUN_BIN="$HOME/.bun/bin/bun"
  if [ -x "$BUN_BIN" ]; then
    # bun 已安装但不在 PATH 中，添加到当前会话
    export PATH="$HOME/.bun/bin:$PATH"

    # 提示用户永久添加到 PATH
    echo "⚠️  Bun 已安装但不在 PATH 中"
    echo ""
    echo "请将以下行添加到你的 shell 配置文件 (~/.bashrc 或 ~/.zshrc):"
    echo '  export PATH="$HOME/.bun/bin:$PATH"'
    echo ""
    echo "然后运行: source ~/.bashrc (或 source ~/.zshrc)"
    return 0
  fi

  # Bun 未安装，执行安装
  echo "📦 正在安装 Bun..."
  curl -fsSL https://bun.sh/install | bash

  # 添加到当前会话的 PATH
  export PATH="$HOME/.bun/bin:$PATH"

  # 自动添加到用户的 shell 配置文件
  BUN_PATH="$HOME/.bun/bin"
  SKIP_PERSIST=false

  # 检查是否已经在 PATH 中
  if [[ ":$PATH:" == *":$BUN_PATH:"* ]]; then
    SKIP_PERSIST=true
  fi

  if [ "$SKIP_PERSIST" = "false" ]; then
    # 检测 shell 类型并添加到配置文件
    ADDED=false

    if [ -n "$ZSH_VERSION" ] || [ -n "$ZSH" ]; then
      SHELL_RC="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
      SHELL_RC="$HOME/.bashrc"
    else
      SHELL_RC="$HOME/.bashrc"
    fi

    if [ -f "$SHELL_RC" ] && ! grep -q "$BUN_PATH" "$SHELL_RC" 2>/dev/null; then
      echo "" >> "$SHELL_RC"
      echo "# Bun (added by agent-swarm)" >> "$SHELL_RC"
      echo "export PATH=\"$BUN_PATH:\$PATH\"" >> "$SHELL_RC"
      ADDED=true
    fi

    if [ "$ADDED" = "true" ]; then
      echo ""
      echo "✅ Bun 已安装并添加到 PATH"
      echo "⚠️  请运行 'source $SHELL_RC' 或重启终端以使用 Bun"
    else
      echo ""
      echo "✅ Bun 已安装"
      echo "⚠️  请手动添加到 PATH: export PATH=\"$BUN_PATH:\$PATH\""
    fi
  fi

  return 0
}

# 如果直接执行此脚本（而非被 source）
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  ensure_bun_installed
fi

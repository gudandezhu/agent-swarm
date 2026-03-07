#!/usr/bin/env node
/**
 * Agent Swarm CLI 入口
 *
 * 全局命令行工具入口点
 * 处理所有 swarm 命令
 */

import { CLI } from './cli/CLI.js';

async function main() {
  const cli = new CLI();

  // 获取命令行参数（跳过 node 和脚本路径）
  const args = process.argv.slice(2);

  // 执行命令
  const result = await cli.execute(args);

  // 根据结果设置退出码
  if (!result.success) {
    if (result.error) {
      console.error(result.error);
    }
    process.exit(1);
  }

  if (result.message) {
    console.log(result.message);
  }
}

main().catch((error) => {
  console.error('发生错误:', error);
  process.exit(1);
});

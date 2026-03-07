#!/usr/bin/env node
/**
 * init-workspace - 工作空间初始化脚本
 *
 * 由 npm postinstall 钩子自动调用
 */

import { WorkspaceInitializer } from './WorkspaceInitializer.js';
import { join } from 'path';

/**
 * 主初始化函数
 */
async function main(): Promise<void> {
  // 获取项目根目录的 .claude/skills 路径
  const projectRoot = process.cwd();
  const projectSkillsPath = join(projectRoot, '.claude', 'skills');

  const initializer = new WorkspaceInitializer(undefined, projectSkillsPath);

  // 检查是否已存在
  if (await initializer.exists()) {
    console.log('ℹ️  工作空间已存在，更新 skills...');

    try {
      await initializer.copySkills();
      console.log('✓ Skills 已更新');
    } catch {
      console.log('⚠️  更新 skills 失败，可忽略');
    }

    return;
  }

  // 首次初始化
  console.log('🚀 正在初始化 Agent Swarm 工作空间...');

  const result = await initializer.initialize();

  if (result.success) {
    console.log('✓ 工作空间创建完成');
    console.log(`  位置: ${initializer.getWorkspacePath()}`);
    console.log('');
    console.log('📝 下一步:');
    console.log('  1. 配置 API 密钥: export ANTHROPIC_API_KEY=sk-ant-...');
    console.log('  2. 运行开发服务器: npm run dev');
    console.log('');
    console.log('📚 文档: https://github.com/your-repo/agent-swarm');
  } else {
    console.error('✗ 初始化失败:', result.error || result.message);
    console.error('');
    console.error('💡 提示: 您可以稍后手动运行初始化');
    process.exit(1);
  }
}

// 执行初始化
main().catch((error) => {
  console.error('✗ 初始化脚本执行失败:', error);
  process.exit(1);
});

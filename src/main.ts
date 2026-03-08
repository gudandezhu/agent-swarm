#!/usr/bin/env node
/**
 * AgentSwarm CLI 入口
 */

import { AgentSwarm } from './AgentSwarm.js';
import { CLIChannel } from './channel/CLIChannel.js';
import { WorkspaceInitializer } from './setup/WorkspaceInitializer.js';

async function main() {
  // 确保工作空间已初始化
  const workspaceInitializer = new WorkspaceInitializer();
  await workspaceInitializer.ensure();

  const swarm = new AgentSwarm({
    defaultAgent: 'example',
  });

  await swarm.start();

  const cli = new CLIChannel();
  await swarm.registerChannel(cli);

  // 使用 once() 避免内存泄漏
  const cleanup = async () => {
    console.log('\n正在退出...');
    await swarm.stop();
    process.exit(0);
  };
  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
}

main().catch(console.error);

#!/usr/bin/env node
/**
 * AgentSwarm CLI 入口
 */

import { AgentSwarm } from './AgentSwarm.js';
import { CLIChannel } from './channel/CLIChannel.js';

async function main() {
  const swarm = new AgentSwarm({
    defaultAgent: 'example',
  });

  await swarm.start();

  const cli = new CLIChannel();
  await swarm.registerChannel(cli);

  process.on('SIGINT', async () => {
    console.log('\n正在退出...');
    await swarm.stop();
    process.exit(0);
  });
}

main().catch(console.error);

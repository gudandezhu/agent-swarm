/**
 * Agent Swarm CLI 入口
 *
 * 全局命令行工具入口点
 * 处理所有 swarm 命令
 */

// 快速路径：版本和帮助不需要加载完整 CLI
const args = process.argv.slice(2);

// 统一的 CLI 加载函数
async function loadCLI() {
  const { CLI } = await import('./cli/CLI.js');
  return new CLI();
}

if (args.includes('--version') || args.includes('-v') || args[0] === 'version') {
  loadCLI().then((cli) => console.log(cli.showVersion()));
} else if (args.includes('--help') || args.includes('-h') || args[0] === 'help') {
  loadCLI().then((cli) => {
    const command = args[1];
    console.log(command ? cli.showCommandHelp(command) : cli.showHelp());
  });
} else {
  // 完整 CLI 加载
  loadCLI()
    .then(async (cli) => {
      const result = await cli.execute(args);

      if (!result.success) {
        if (result.error) {
          console.error(result.error);
        }
        process.exit(1);
      }

      if (result.message) {
        console.log(result.message);
      }
    })
    .catch((error) => {
      console.error('发生错误:', error);
      process.exit(1);
    });
}

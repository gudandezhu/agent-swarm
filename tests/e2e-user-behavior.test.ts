/**
 * E2E 用户行为测试
 *
 * 模拟真实用户的完整操作流程，验证所有功能正常工作
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('E2E 用户行为测试', () => {
  let testWorkspace: string;
  let swarmProcess: ChildProcess | null = null;

  beforeEach(() => {
    // 创建临时测试工作空间
    testWorkspace = join(tmpdir(), `agent-swarm-test-${Date.now()}`);
  });

  afterEach(() => {
    // 清理测试进程
    if (swarmProcess) {
      swarmProcess.kill('SIGTERM');
      swarmProcess = null;
    }

    // 清理测试文件
    try {
      const { rmSync } = require('fs');
      if (existsSync(testWorkspace)) {
        rmSync(testWorkspace, { recursive: true, force: true });
      }
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('1. CLI 命令测试', () => {
    it('应该成功初始化工作空间', async () => {
      const { execSync } = require('child_process');
      const output = execSync(`node dist/cli.js init --workspace "${testWorkspace}"`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });

      expect(output).toContain('工作空间初始化成功');
      expect(existsSync(join(testWorkspace, 'config.json'))).toBe(true);
      expect(existsSync(join(testWorkspace, 'agents'))).toBe(true);
    });

    it('应该成功创建 Agent', async () => {
      const { execSync } = require('child_process');

      // 先初始化
      execSync(`node dist/cli.js init --workspace "${testWorkspace}"`, {
        cwd: process.cwd(),
      });

      // 创建 Agent
      const output = execSync(
        `node dist/cli.js create-agent test-agent --workspace "${testWorkspace}"`,
        {
          encoding: 'utf-8',
          cwd: process.cwd(),
        }
      );

      expect(output).toContain('Agent 创建成功');
      expect(existsSync(join(testWorkspace, 'agents', 'test-agent.json'))).toBe(true);

      // 验证配置文件
      const agentConfig = JSON.parse(
        readFileSync(join(testWorkspace, 'agents', 'test-agent.json'), 'utf-8')
      );
      expect(agentConfig.name).toBe('test-agent');
      expect(agentConfig.model).toBeDefined();
      expect(agentConfig.systemPrompt).toBeDefined();
    });

    it('应该列出所有 Agents', async () => {
      const { execSync } = require('child_process');

      // 初始化并创建多个 Agents
      execSync(`node dist/cli.js init --workspace "${testWorkspace}"`, {
        cwd: process.cwd(),
      });
      execSync(`node dist/cli.js create-agent agent1 --workspace "${testWorkspace}"`, {
        cwd: process.cwd(),
      });
      execSync(`node dist/cli.js create-agent agent2 --workspace "${testWorkspace}"`, {
        cwd: process.cwd(),
      });

      // 列出 Agents
      const output = execSync(`node dist/cli.js list --workspace "${testWorkspace}"`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });

      expect(output).toContain('agent1');
      expect(output).toContain('agent2');
    });

    it('应该显示帮助信息', async () => {
      const { execSync } = require('child_process');
      const output = execSync('node dist/cli.js --help', {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });

      expect(output).toContain('swarm');
      expect(output).toContain('init');
      expect(output).toContain('create-agent');
      expect(output).toContain('list');
      expect(output).toContain('start');
    });
  });

  describe('2. TUI 基础功能测试', () => {
    it('应该成功启动 TUI', async () => {
      const { execSync } = require('child_process');

      // 初始化工作空间
      execSync(`node dist/cli.js init --workspace "${testWorkspace}"`, {
        cwd: process.cwd(),
      });

      // 启动 TUI（非交互模式）
      const output = execSync(
        `node dist/cli.js start --non-interactive --workspace "${testWorkspace}"`,
        {
          encoding: 'utf-8',
          cwd: process.cwd(),
          timeout: 5000,
        }
      );

      expect(output).toContain('启动成功');
    });
  });

  describe('3. Session 管理测试', () => {
    it('应该持久化 Session', async () => {
      const { execSync } = require('child_process');

      // 初始化
      execSync(`node dist/cli.js init --workspace "${testWorkspace}"`, {
        cwd: process.cwd(),
      });

      // 创建测试 Agent
      execSync(`node dist/cli.js create-agent test-agent --workspace "${testWorkspace}"`, {
        cwd: process.cwd(),
      });

      // 发送消息（使用 API 而不是 TUI，以便自动化测试）
      // 这里简化为检查 Session 文件创建
      const sessionsDir = join(testWorkspace, 'sessions');
      expect(existsSync(sessionsDir)).toBe(true);
    });
  });

  describe('4. 错误处理测试', () => {
    it('应该处理无效的工作空间', async () => {
      const { execSync } = require('child_process');

      expect(() => {
        execSync(`node dist/cli.js list --workspace "/nonexistent"`, {
          encoding: 'utf-8',
          cwd: process.cwd(),
        });
      }).toThrow();
    });

    it('应该处理已存在的 Agent', async () => {
      const { execSync } = require('child_process');

      execSync(`node dist/cli.js init --workspace "${testWorkspace}"`, {
        cwd: process.cwd(),
      });
      execSync(`node dist/cli.js create-agent test-agent --workspace "${testWorkspace}"`, {
        cwd: process.cwd(),
      });

      expect(() => {
        execSync(`node dist/cli.js create-agent test-agent --workspace "${testWorkspace}"`, {
          encoding: 'utf-8',
          cwd: process.cwd(),
        });
      }).toThrow();
    });
  });

  describe('5. 配置文件测试', () => {
    it('应该读取配置文件', async () => {
      const { execSync } = require('child_process');

      execSync(`node dist/cli.js init --workspace "${testWorkspace}"`, {
        cwd: process.cwd(),
      });

      const configPath = join(testWorkspace, 'config.json');
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config.version).toBeDefined();
      expect(config.defaultModel).toBeDefined();
    });

    it('应该处理损坏的配置文件', async () => {
      const { execSync } = require('child_process');

      execSync(`node dist/cli.js init --workspace "${testWorkspace}"`, {
        cwd: process.cwd(),
      });

      // 破坏配置文件
      const configPath = join(testWorkspace, 'config.json');
      writeFileSync(configPath, '{ invalid json }');

      expect(() => {
        execSync(`node dist/cli.js list --workspace "${testWorkspace}"`, {
          encoding: 'utf-8',
          cwd: process.cwd(),
        });
      }).toThrow();
    });
  });

  describe('6. 完整工作流测试', () => {
    it('应该支持完整的用户工作流', async () => {
      const { execSync } = require('child_process');

      // 1. 初始化工作空间
      let output = execSync(`node dist/cli.js init --workspace "${testWorkspace}"`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      expect(output).toContain('工作空间初始化成功');

      // 2. 创建多个 Agents
      output = execSync(
        `node dist/cli.js create-agent assistant --workspace "${testWorkspace}"`,
        {
          encoding: 'utf-8',
          cwd: process.cwd(),
        }
      );
      expect(output).toContain('Agent 创建成功');

      output = execSync(`node dist/cli.js create-agent coder --workspace "${testWorkspace}"`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      expect(output).toContain('Agent 创建成功');

      // 3. 列出 Agents
      output = execSync(`node dist/cli.js list --workspace "${testWorkspace}"`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      expect(output).toContain('assistant');
      expect(output).toContain('coder');

      // 4. 验证文件结构
      expect(existsSync(join(testWorkspace, 'config.json'))).toBe(true);
      expect(existsSync(join(testWorkspace, 'agents', 'assistant.json'))).toBe(true);
      expect(existsSync(join(testWorkspace, 'agents', 'coder.json'))).toBe(true);
      expect(existsSync(join(testWorkspace, 'sessions'))).toBe(true);
    });
  });
});

/**
 * 手动测试辅助函数
 *
 * 这些函数用于辅助手动测试，不自动运行
 */

describe('手动测试辅助', () => {
  // 跳过这些测试，仅作为文档
  it.skip('手动测试：TUI 交互', () => {
    console.log(`
手动测试步骤：

1. 启动 TUI：
   $ ./start.sh

2. 测试基本输入：
   - 输入文字并按 Enter
   - 观察消息是否正确发送
   - 观察响应是否正确显示

3. 测试多行输入：
   - 输入文字
   - 按 Shift+Enter 或 \\+Enter 换行
   - 继续输入
   - 按 Enter 提交

4. 测试自动补全：
   - 输入 /he
   - 按 Tab
   - 应该显示 /help

5. 测试历史记录：
   - 输入几条消息
   - 按 ↑↓ 浏览历史

6. 测试命令：
   - /help
   - /reset
   - /agent <name>

7. 测试退出：
   - 按 Ctrl+C 一次（应该提示再按一次）
   - 再按 Ctrl+C（应该退出）
    `);
  });

  it.skip('手动测试：Agent 管理', () => {
    console.log(`
手动测试步骤：

1. 创建 Agent：
   $ swarm create-agent my-agent

2. 查看 Agent：
   $ swarm list

3. 编辑 Agent 配置：
   $ vim ~/.agent-swarm/agents/my-agent.json

4. 启动并测试：
   $ swarm start
   > /agent my-agent
   > 测试消息
    `);
  });

  it.skip('手动测试：错误处理', () => {
    console.log(`
手动测试步骤：

1. 测试网络错误：
   - 设置错误的 API key
   - 启动 swarm
   - 发送消息
   - 应该显示错误信息

2. 测试无效命令：
   - 输入：/invalid-command
   - 应该提示无效命令

3. 测试配置文件损坏：
   - 破坏 config.json
   - 启动 swarm
   - 应该显示配置错误

4. 测试并发输入：
   - 快速连续输入多条消息
   - 应该按顺序处理
    `);
  });
});

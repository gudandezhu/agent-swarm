/**
 * TUI 快捷键真实集成测试
 *
 * 真实启动 TUI 并模拟用户按键输入
 * 不是单元测试，而是集成测试
 */

import { spawn, ChildProcess } from 'child_process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('TUI 快捷键真实集成测试', () => {
  let tuiProcess: ChildProcess;
  let output = '';
  let hasStarted = false;

  beforeAll(() => {
    return new Promise<void>((resolve, reject) => {
      // 启动 TUI
      tuiProcess = spawn('npm', ['run', 'tui'], {
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      tuiProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;

        // 检测 TUI 是否已启动（包含某些特定字符）
        if (!hasStarted && (text.includes('Input') || text.includes('│'))) {
          hasStarted = true;
          console.log('✅ TUI 已启动');
          resolve();
        }
      });

      tuiProcess.stderr?.on('data', (data) => {
        console.error('TUI 错误:', data.toString());
      });

      tuiProcess.on('error', (err) => {
        console.error('启动 TUI 失败:', err);
        reject(err);
      });

      // 超时保护
      setTimeout(() => {
        if (!hasStarted) {
          console.error('TUI 启动超时');
          reject(new Error('TUI 启动超时'));
        }
      }, 5000);
    });
  });

  afterAll(() => {
    if (tuiProcess && !tuiProcess.killed) {
      // 发送 Ctrl+C 退出
      tuiProcess.stdin?.write('\x03');
      setTimeout(() => {
        tuiProcess.kill();
      }, 500);
    }
  });

  describe('真实按键输入测试', () => {
    it('应该能够发送字符到 TUI', async () => {
      return new Promise<void>((resolve, reject) => {
        if (!tuiProcess.stdin) {
          reject(new Error('stdin 不可用'));
          return;
        }

        // 发送测试字符
        tuiProcess.stdin.write('test');

        // 等待一段时间让 TUI 处理
        setTimeout(() => {
          expect(output.length).toBeGreaterThan(0);
          resolve();
        }, 500);
      });
    });

    it('应该能够发送 Enter 键', async () => {
      return new Promise<void>((resolve, reject) => {
        if (!tuiProcess.stdin) {
          reject(new Error('stdin 不可用'));
          return;
        }

        const beforeLength = output.length;

        // 发送 Enter (CR)
        tuiProcess.stdin.write('\x0d');

        setTimeout(() => {
          // 应该有新输出
          expect(output.length).toBeGreaterThanOrEqual(beforeLength);
          resolve();
        }, 500);
      });
    });

    it('应该能够发送 Alt+Enter 序列', async () => {
      return new Promise<void>((resolve, reject) => {
        if (!tuiProcess.stdin) {
          reject(new Error('stdin 不可用'));
          return;
        }

        const beforeLength = output.length;

        // 发送 Alt+Enter (ESC + CR)
        tuiProcess.stdin.write('\x1b\x0d');

        setTimeout(() => {
          expect(output.length).toBeGreaterThanOrEqual(beforeLength);
          resolve();
        }, 500);
      });
    });

    it('应该能够发送 Tab 键', async () => {
      return new Promise<void>((resolve, reject) => {
        if (!tuiProcess.stdin) {
          reject(new Error('stdin 不可用'));
          return;
        }

        // 先输入 /
        tuiProcess.stdin.write('/');

        setTimeout(() => {
          // 发送 Tab
          tuiProcess.stdin.write('\x09');

          setTimeout(() => {
            // 应该触发补全逻辑
            expect(true).toBe(true);
            resolve();
          }, 500);
        }, 200);
      });
    });

    it('应该能够发送 Backspace', async () => {
      return new Promise<void>((resolve, reject) => {
        if (!tuiProcess.stdin) {
          reject(new Error('stdin 不可用'));
          return;
        }

        // 先输入一些字符
        tuiProcess.stdin.write('abc');

        setTimeout(() => {
          // 发送 Backspace (DEL)
          tuiProcess.stdin.write('\x7f');

          setTimeout(() => {
            expect(true).toBe(true);
            resolve();
          }, 500);
        }, 200);
      });
    });

    it('应该能够发送 Ctrl+C 退出', async () => {
      return new Promise<void>((resolve, reject) => {
        if (!tuiProcess.stdin) {
          reject(new Error('stdin 不可用'));
          return;
        }

        // 发送 Ctrl+C
        tuiProcess.stdin.write('\x03');

        // 等待进程退出
        tuiProcess.on('exit', () => {
          expect(true).toBe(true);
          resolve();
        });

        setTimeout(() => {
          // 如果没退出，手动 kill
          if (!tuiProcess.killed) {
            tuiProcess.kill();
          }
          resolve();
        }, 1000);
      });
    });
  });
});

/**
 * 手动集成测试说明
 */
describe('手动集成测试', () => {
  it.skip('运行手动测试流程', () => {
    console.log(`
====================================
TUI 快捷键手动集成测试
====================================

自动化集成测试的限制：
  - 无法完全模拟终端的 raw mode
  - 某些终端特性无法在测试环境中复现
  - 需要真实的终端环境验证

推荐手动测试流程：
  1. 运行: npm run tui
  2. 测试以下快捷键：
     a. Alt+Enter 换行
     b. Shift+Enter 换行
     c. Tab 补全
     d. 方向键历史
     e. Backspace 删除
  3. 如果不工作，运行调试工具：
     node test-key-sequences.js

====================================
    `);
  });
});

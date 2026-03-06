/**
 * 测试工具函数
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

/**
 * 异步等待函数（用于测试）
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * 创建临时测试目录
 */
export const createTempDir = async (name: string): Promise<string> => {
  const uniqueId = randomBytes(8).toString('hex');
  const tmpDir = join(tmpdir(), `agent-swarm-test-${name}-${uniqueId}`);
  await fs.mkdir(tmpDir, { recursive: true });
  return tmpDir;
};

/**
 * 清理测试目录
 */
export const cleanupTempDir = async (dir: string): Promise<void> => {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // 忽略错误
  }
};

/**
 * 等待条件满足
 */
export const waitFor = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (condition()) return;
    await sleep(interval);
  }
  throw new Error(`条件未在 ${timeout}ms 内满足`);
};

/**
 * 创建 Mock Message
 */
export const createMockMessage = (overrides?: Partial<Record<string, unknown>>): Record<string, unknown> => {
  return {
    id: `msg-${randomBytes(8).toString('hex')}`,
    timestamp: Date.now(),
    version: '1.0',
    from: 'test-sender',
    to: 'test-receiver',
    sessionId: 'test-session',
    type: 'request',
    payload: { data: 'test' },
    ack: { required: false, timeout: 0, retry: 0 },
    ...overrides
  };
};

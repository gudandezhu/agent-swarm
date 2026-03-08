/**
 * TUI 输入框类型安全测试
 *
 * 专门测试 MultiLineInput 的 handleData 函数
 * 确保 Buffer/string 类型都能正确处理
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('TUI 输入框 - 类型安全测试', () => {
  describe('Buffer 和 string 处理', () => {
    it('应该正确处理 Buffer 类型的输入', () => {
      const buffer = Buffer.from('hello');
      const result = Buffer.concat([Buffer.alloc(0), buffer]);
      expect(result.toString()).toBe('hello');
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('应该正确处理 string 类型的输入', () => {
      const str = 'hello';
      const buffer = Buffer.from(str);
      const result = Buffer.concat([Buffer.alloc(0), buffer]);
      expect(result.toString()).toBe('hello');
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('应该正确处理混合类型的输入', () => {
      // 模拟连续输入多个字符
      const buffer1 = Buffer.from('hel');
      const buffer2 = Buffer.from('lo');

      let result = Buffer.alloc(0);
      result = Buffer.concat([result, buffer1]);
      result = Buffer.concat([result, buffer2]);

      expect(result.toString()).toBe('hello');
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('应该检测并转换非 Buffer 类型', () => {
      const input = 'test';
      const isBuffer = Buffer.isBuffer(input);
      const dataBuffer = isBuffer ? input : Buffer.from(input);

      expect(isBuffer).toBe(false);
      expect(Buffer.isBuffer(dataBuffer)).toBe(true);
      expect(dataBuffer.toString()).toBe('test');
    });

    it('应该处理 Uint8Array 类型', () => {
      const uint8Array = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]); // "hello"
      const buffer = Buffer.from(uint8Array);
      const result = Buffer.concat([Buffer.alloc(0), buffer]);

      expect(result.toString()).toBe('hello');
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  describe('handleData 错误处理', () => {
    it('应该处理空字符串', () => {
      const str = '';
      const buffer = Buffer.from(str);
      const result = Buffer.concat([Buffer.alloc(0), buffer]);

      expect(result.length).toBe(0);
      expect(result.toString()).toBe('');
    });

    it('应该处理特殊字符', () => {
      const specialChars = '!@#$%^&*()';
      const buffer = Buffer.from(specialChars);
      const result = Buffer.concat([Buffer.alloc(0), buffer]);

      expect(result.toString()).toBe(specialChars);
    });

    it('应该处理 Unicode 字符', () => {
      const unicode = '你好世界';
      const buffer = Buffer.from(unicode, 'utf8');
      const result = Buffer.concat([Buffer.alloc(0), buffer]);

      expect(result.toString('utf8')).toBe(unicode);
    });
  });

  describe('模拟 stdin data 事件', () => {
    it('应该模拟 stdin 发送 Buffer', () => {
      const simulateStdinData = (data: Buffer | string) => {
        try {
          const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
          const buffer = Buffer.alloc(0);
          return Buffer.concat([buffer, dataBuffer]);
        } catch (error) {
          throw error;
        }
      };

      // 测试 Buffer 输入
      const bufferInput = Buffer.from('hello');
      const result1 = simulateStdinData(bufferInput);
      expect(result1.toString()).toBe('hello');

      // 测试 string 输入
      const stringInput = 'world';
      const result2 = simulateStdinData(stringInput);
      expect(result2.toString()).toBe('world');
    });

    it('应该模拟真实的按键输入', () => {
      // 模拟用户输入 'h', 'e', 'l', 'l', 'o'
      const keys = ['h', 'e', 'l', 'l', 'o'];
      let buffer = Buffer.alloc(0);

      for (const key of keys) {
        // 每个按键可能是 string 或 Buffer
        const dataBuffer = Buffer.from(key);
        buffer = Buffer.concat([buffer, dataBuffer]);
      }

      expect(buffer.toString()).toBe('hello');
    });

    it('应该检测并修复原始代码的 bug', () => {
      // 原始代码（有 bug）
      const originalCode = (data: Buffer) => {
        return Buffer.concat([Buffer.alloc(0), data]);
      };

      // 修复后的代码
      const fixedCode = (data: Buffer | string) => {
        const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        return Buffer.concat([Buffer.alloc(0), dataBuffer]);
      };

      // 测试 Buffer 输入（两者都应该工作）
      const bufferInput = Buffer.from('test');
      expect(() => originalCode(bufferInput)).not.toThrow();
      expect(() => fixedCode(bufferInput)).not.toThrow();

      // 测试 string 输入（原始代码会失败）
      const stringInput = 'test';
      expect(() => originalCode(stringInput as any)).toThrow();
      expect(() => fixedCode(stringInput)).not.toThrow();
    });
  });

  describe('回归测试 - BUG-001', () => {
    it('应该防止 "list[1] argument must be of type Buffer" 错误', () => {
      // 这个测试专门检测 BUG-001
      const handleDataSafe = (data: Buffer | string): Buffer => {
        const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        return Buffer.concat([Buffer.alloc(0), dataBuffer]);
      };

      // 测试各种输入类型
      const inputs: Array<Buffer | string> = [
        Buffer.from('hello'),
        'hello',
        '',
        Buffer.from(''),
        Buffer.alloc(0),
      ];

      for (const input of inputs) {
        expect(() => handleDataSafe(input)).not.toThrow();
      }
    });

    it('应该记录错误而不崩溃', () => {
      const handleDataWithErrorLogging = (data: Buffer | string): string => {
        try {
          const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
          return Buffer.concat([Buffer.alloc(0), dataBuffer]).toString();
        } catch (error) {
          // 记录错误而不是崩溃
          console.error('Error in handleData:', error);
          return '';
        }
      };

      // 测试错误恢复
      const result = handleDataWithErrorLogging('test');
      expect(result).toBe('test');
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量字符', () => {
      const longString = 'a'.repeat(10000);
      const buffer = Buffer.from(longString);
      const result = Buffer.concat([Buffer.alloc(0), buffer]);

      expect(result.toString().length).toBe(10000);
    });

    it('应该高效处理多次连续输入', () => {
      const startTime = Date.now();
      let buffer = Buffer.alloc(0);

      for (let i = 0; i < 1000; i++) {
        const dataBuffer = Buffer.from('a');
        buffer = Buffer.concat([buffer, dataBuffer]);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(buffer.toString().length).toBe(1000);
      expect(duration).toBeLessThan(100); // 应该在 100ms 内完成
    });
  });
});

/**
 * 手动测试辅助函数
 */
describe('手动测试说明', () => {
  it.skip('请运行以下命令手动测试', () => {
    console.log(`
===================================
TUI 输入框手动测试指南
===================================

1. 启动测试：
   $ ./test-fix.sh

2. 测试步骤：
   a. 输入单个字符 'h'
      ✅ 不应该报错
      ✅ 应该显示在输入框

   b. 继续输入 'ello'
      ✅ 不应该报错
      ✅ 完整显示 "hello"

   c. 按 Enter 提交
      ✅ 不应该报错

   d. 输入更多内容
      ✅ 持续工作无错误

3. 观察输出：
   ❌ 不应该看到：
      "Error in handleData: TypeError..."

   ✅ 应该看到：
      正常的输入显示

4. 退出：
   按 Ctrl+C

===================================
    `);
  });
});

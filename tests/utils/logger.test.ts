/**
 * 日志工具测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../../src/utils/logger.js';

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('应输出 info 日志', () => {
      Logger.info('test message');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('test message'));
    });
  });

  describe('error', () => {
    it('应输出 error 日志', () => {
      Logger.error('error message');
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('error message'));
    });
  });

  describe('warn', () => {
    it('应输出 warn 日志', () => {
      Logger.warn('warn message');
      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('warn message'));
    });
  });

  describe('success', () => {
    it('应输出 success 日志', () => {
      Logger.success('success message');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('[SUCCESS]'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('success message'));
    });
  });

  describe('debug', () => {
    it('应输出 debug 日志', () => {
      Logger.setLogLevel('debug');
      Logger.debug('debug message');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('debug message'));
    });

    it('应在非 debug 模式下不输出', () => {
      Logger.setLogLevel('info');
      Logger.debug('debug message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('setLogLevel', () => {
    it('应设置日志级别', () => {
      Logger.setLogLevel('error');
      Logger.info('info message');
      Logger.debug('debug message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('应在 debug 级别输出所有日志', () => {
      Logger.setLogLevel('debug');
      Logger.debug('debug message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('应创建带前缀的 logger', () => {
      const logger = Logger.create('MyModule');
      logger.info('test message');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('[MyModule]'));
    });
  });
});

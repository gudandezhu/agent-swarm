/**
 * 统一日志工具
 * 提供带颜色、时间戳和日志级别的统一日志接口
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

// 颜色代码（ANSI）
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // 前景色
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // 背景色
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

/**
 * 日志级别配置
 */
let currentLogLevel: LogLevel = 'info';

/**
 * 是否支持颜色
 */
let supportsColor = true;

/**
 * 格式化时间戳
 */
function formatTimestamp(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * 添加颜色
 */
function colorize(text: string, color: keyof typeof COLORS): string {
  if (!supportsColor) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

/**
 * 格式化日志消息
 */
function formatMessage(
  level: string,
  prefix: string,
  message: string,
  levelColor: keyof typeof COLORS
): string {
  const timestamp = formatTimestamp();
  const timestampStr = colorize(`[${timestamp}]`, 'dim');
  const levelStr = colorize(`[${level}]`, levelColor);
  const prefixStr = prefix ? colorize(`[${prefix}]`, 'cyan') : '';

  return `${timestampStr} ${levelStr}${prefixStr} ${message}`;
}

/**
 * 内部日志方法
 */
function log(
  level: string,
  message: string,
  color: keyof typeof COLORS,
  prefix?: string
): void {
  const logLevel = level.toLowerCase() as LogLevel;
  if (LOG_LEVELS[logLevel] < LOG_LEVELS[currentLogLevel]) {
    return;
  }

  const formatted = formatMessage(level.toUpperCase(), prefix || '', message, color);

  switch (logLevel) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'info':
    case 'success':
    case 'debug':
    default:
      console.log(formatted);
      break;
  }
}

/**
 * 统一日志工具类
 */
export class Logger {
  private constructor(private readonly prefix?: string) {}

  /**
   * 输出 info 日志
   */
  static info(message: string): void {
    log('info', message, 'blue');
  }

  /**
   * 输出 error 日志
   */
  static error(message: string): void {
    log('error', message, 'red');
  }

  /**
   * 输出 warn 日志
   */
  static warn(message: string): void {
    log('warn', message, 'yellow');
  }

  /**
   * 输出 success 日志
   */
  static success(message: string): void {
    log('SUCCESS', message, 'green');
  }

  /**
   * 输出 debug 日志
   */
  static debug(message: string): void {
    log('debug', message, 'dim');
  }

  /**
   * 设置日志级别
   */
  static setLogLevel(level: LogLevel): void {
    currentLogLevel = level;
  }

  /**
   * 启用/禁用颜色输出
   */
  static setColor(enabled: boolean): void {
    supportsColor = enabled;
  }

  /**
   * 创建带前缀的 logger 实例
   */
  static create(prefix: string): Logger {
    return new Logger(prefix);
  }

  /**
   * 实例方法：info
   */
  info(message: string): void {
    log('info', message, 'blue', this.prefix);
  }

  /**
   * 实例方法：error
   */
  error(message: string): void {
    log('error', message, 'red', this.prefix);
  }

  /**
   * 实例方法：warn
   */
  warn(message: string): void {
    log('warn', message, 'yellow', this.prefix);
  }

  /**
   * 实例方法：success
   */
  success(message: string): void {
    log('SUCCESS', message, 'green', this.prefix);
  }

  /**
   * 实例方法：debug
   */
  debug(message: string): void {
    log('debug', message, 'dim', this.prefix);
  }
}

/**
 * TUI 状态辅助工具
 * 统一管理状态相关的配置和工具函数
 */

export type TuiStatus = 'idle' | 'processing' | 'error';

/**
 * 状态配置常量
 */
export const STATUS_CONFIG = {
  idle: {
    text: '● Ready',
    color: 'green',
    indicator: '▪',
  },
  processing: {
    text: '● Processing...',
    color: 'yellow',
    indicator: '▪▪▪',
  },
  error: {
    text: '● Error',
    color: 'red',
    indicator: '▪!',
  },
} as const;

/**
 * 获取状态配置
 */
export function getStatusConfig(status: TuiStatus) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
}

/**
 * 获取状态文本
 */
export function getStatusText(status: TuiStatus): string {
  return STATUS_CONFIG[status].text;
}

/**
 * 获取状态颜色
 */
export function getStatusColor(status: TuiStatus): string {
  return STATUS_CONFIG[status].color;
}

/**
 * 获取状态指示器
 */
export function getStatusIndicator(status: TuiStatus): string {
  return STATUS_CONFIG[status].indicator;
}

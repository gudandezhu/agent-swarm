/**
 * 启动模式常量
 */

export const START_MODES = {
  TUI: 'tui',
  CLI: 'cli',
  NON_INTERACTIVE: 'non-interactive',
} as const;

export const START_MODE_LABELS: Record<StartMode, string> = {
  tui: 'TUI 模式（终端用户界面）',
  cli: 'CLI 模式',
  'non-interactive': '非交互模式',
} as const;

export type StartMode = typeof START_MODES[keyof typeof START_MODES];

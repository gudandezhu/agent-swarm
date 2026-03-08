/**
 * 全局常量定义
 *
 * 统一管理所有硬编码的字符串、路径和默认值
 */

import { join } from 'path';
import { homedir } from 'os';

/**
 * 工作空间路径常量
 */
export const PATHS = {
  /** 全局工作空间根目录 */
  WORKSPACE_HOME: join(homedir(), '.agent-swarm'),
  /** Agents 目录名 */
  AGENTS_DIR: 'agents',
  /** Sessions 目录名 */
  SESSIONS_DIR: 'sessions',
  /** Memory 目录名 */
  MEMORY_DIR: 'memory',
  /** Skills 目录名 */
  SKILLS_DIR: '.claude/skills',
  /** 配置文件名 */
  CONFIG_FILE: 'agent-swarm.json',
  /** 项目级 skills 目录 */
  PROJECT_SKILLS_DIR: '.claude/skills',
} as const;

/**
 * 默认值常量
 */
export const DEFAULTS = {
  /** 默认 Agent ID */
  AGENT_ID: 'manager',
  /** 会话默认 TTL（30天） */
  SESSION_TTL: 30 * 24 * 60 * 60 * 1000,
  /** Agent 空闲超时（30分钟） */
  AGENT_IDLE_TIMEOUT: 30 * 60 * 1000,
  /** Agent 清理检查间隔（5分钟） */
  AGENT_CLEANUP_INTERVAL: 5 * 60 * 1000,
  /** 默认模型映射 */
  MODEL_MAPPING: {
    'claude-opus-4-5': 'glm-5',
    'claude-sonnet-4-6': 'glm-4.7',
    'claude-haiku-4-5': 'glm-4-flash',
  },
} as const;

/**
 * 辅助函数
 */

/**
 * 获取工作空间路径
 * @param workspacePath 可选的自定义工作空间路径
 * @returns 工作空间路径
 */
export function getWorkspacePath(workspacePath?: string): string {
  return workspacePath ?? PATHS.WORKSPACE_HOME;
}

/**
 * 获取全局配置文件路径
 * @returns 全局配置文件完整路径
 */
export function getGlobalConfigPath(): string {
  return join(PATHS.WORKSPACE_HOME, PATHS.CONFIG_FILE);
}

/**
 * 获取项目级配置文件路径
 * @param workspacePath 工作空间路径
 * @returns 配置文件完整路径
 */
export function getProjectConfigPath(workspacePath: string): string {
  return join(workspacePath, PATHS.CONFIG_FILE);
}

/**
 * 获取 Agents 目录路径
 * @param workspacePath 工作空间路径
 * @returns Agents 目录完整路径
 */
export function getAgentsPath(workspacePath: string): string {
  return join(workspacePath, PATHS.AGENTS_DIR);
}

/**
 * 获取 Sessions 目录路径
 * @param workspacePath 工作空间路径
 * @returns Sessions 目录完整路径
 */
export function getSessionsPath(workspacePath: string): string {
  return join(workspacePath, PATHS.SESSIONS_DIR);
}

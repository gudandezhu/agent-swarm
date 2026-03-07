/**
 * 运行时工作空间检查 - P0 任务
 *
 * 确保 CLI 启动时工作空间存在且完整
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { WorkspaceInitializer } from '../setup/WorkspaceInitializer.js';

/**
 * 工作空间检查结果
 */
export interface WorkspaceCheckResult {
  exists: boolean;
  valid: boolean;
  missingDirs?: string[];
}

/**
 * 工作空间确保结果
 */
export interface WorkspaceEnsureResult {
  success: boolean;
  created?: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * 必需的目录列表
 */
const REQUIRED_DIRS = ['agents', 'sessions', 'memory', '.claude', '.claude/skills'];

/**
 * 检查工作空间是否存在且完整
 */
export async function checkWorkspace(workspacePath: string): Promise<WorkspaceCheckResult> {
  try {
    await fs.access(workspacePath);
  } catch {
    return { exists: false, valid: false };
  }

  // 检查必需的目录
  const missingDirs: string[] = [];

  for (const dir of REQUIRED_DIRS) {
    const dirPath = join(workspacePath, dir);
    try {
      await fs.access(dirPath);
    } catch {
      missingDirs.push(dir);
    }
  }

  return {
    exists: true,
    valid: missingDirs.length === 0,
    missingDirs: missingDirs.length > 0 ? missingDirs : undefined,
  };
}

/**
 * 确保工作空间存在（如果不存在则初始化）
 */
export async function ensureWorkspace(
  workspacePath: string,
  projectSkillsPath?: string
): Promise<WorkspaceEnsureResult> {
  // 检查工作空间是否存在
  const check = await checkWorkspace(workspacePath);

  if (check.exists && check.valid) {
    return {
      success: true,
      created: false,
      skipped: true,
    };
  }

  // 工作空间不存在或不完整，需要初始化
  try {
    const initializer = new WorkspaceInitializer(workspacePath, projectSkillsPath);

    // 如果部分目录存在，补充缺失的目录
    if (check.exists) {
      await initializer.createDirectoryStructure();
      await initializer.copySkills();

      // 检查配置文件
      const configPath = join(workspacePath, 'config.json');
      try {
        await fs.access(configPath);
      } catch {
        await initializer.generateConfig();
      }

      return {
        success: true,
        created: true,
      };
    }

    // 完全初始化
    const result = await initializer.initialize();

    return {
      success: result.success,
      created: true,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 验证工作空间并给出建议
 */
export async function validateWorkspace(workspacePath: string): Promise<{
  valid: boolean;
  issues: string[];
  suggestions: string[];
}> {
  const issues: string[] = [];
  const suggestions: string[] = [];

  const check = await checkWorkspace(workspacePath);

  if (!check.exists) {
    issues.push('工作空间不存在');
    suggestions.push(`运行 "swarm init" 初始化工作空间`);
    return { valid: false, issues, suggestions };
  }

  if (!check.valid) {
    issues.push(`缺少目录: ${check.missingDirs?.join(', ')}`);
    suggestions.push(`运行 "swarm init --force" 修复工作空间`);
  }

  // 检查配置文件
  const configPath = join(workspacePath, 'config.json');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    JSON.parse(content); // 验证 JSON 格式
  } catch {
    issues.push('配置文件损坏或不存在');
    suggestions.push('运行 "swarm init" 重新生成配置文件');
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions,
  };
}

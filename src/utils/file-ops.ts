/**
 * 文件操作工具类
 * 提供统一的文件和目录操作接口
 */

import { promises as fs } from 'fs';

/**
 * 读取文件内容
 */
export async function readFile(path: string): Promise<string> {
  return await fs.readFile(path, 'utf-8');
}

/**
 * 写入文件内容
 */
export async function writeFile(path: string, content: string): Promise<void> {
  await fs.writeFile(path, content, 'utf-8');
}

/**
 * 读取并解析 JSON 文件
 */
export async function readJSON<T>(path: string): Promise<T> {
  const content = await readFile(path);
  return JSON.parse(content) as T;
}

/**
 * 写入 JSON 文件
 * @param indent 缩进空格数，默认 2
 */
export async function writeJSON(
  path: string,
  data: unknown,
  indent: number = 2
): Promise<void> {
  const content = JSON.stringify(data, null, indent);
  await writeFile(path, content);
}

/**
 * 确保目录存在（递归创建）
 */
export async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

/**
 * 清空目录内容
 */
export async function emptyDir(path: string): Promise<void> {
  try {
    const files = await fs.readdir(path);
    await Promise.all(
      files.map((file) => fs.rm(joinPath(path, file), { recursive: true, force: true }))
    );
  } catch {
    // 目录不存在，忽略
  }
}

/**
 * 删除目录及其内容
 */
export async function removeDir(path: string): Promise<void> {
  try {
    await fs.rm(path, { recursive: true, force: true });
  } catch {
    // 目录不存在，忽略
  }
}

/**
 * 检查路径是否存在
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查路径是否为文件
 */
export async function isFile(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * 检查路径是否为目录
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * 拼接路径（简化版，避免依赖 path.join）
 */
function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

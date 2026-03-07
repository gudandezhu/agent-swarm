/**
 * Skills 加载器 - 扫描 skills/ 目录，解析 SKILL.md
 */

import { join } from 'path';
import * as FileOps from '../utils/file-ops.js';
import * as yaml from 'js-yaml';

export interface SkillMetadata {
  name: string;
  description: string;
}

export interface Skill extends SkillMetadata {
  content: string;
  path: string;
}

export class SkillLoader {
  constructor(private skillsPath: string) {}

  /**
   * 加载所有 Skills
   */
  async loadAll(): Promise<Skill[]> {
    const skills: Skill[] = [];
    const dirs = await this.listSkillDirs();

    for (const dir of dirs) {
      const skill = await this.load(dir);
      if (skill) {
        skills.push(skill);
      }
    }

    return skills;
  }

  /**
   * 加载单个 Skill
   */
  async load(skillName: string): Promise<Skill | null> {
    const skillPath = join(this.skillsPath, skillName, 'SKILL.md');

    try {
      const content = await FileOps.readFile(skillPath);
      const metadata = this.parseMetadata(content);

      return {
        name: metadata.name,
        description: metadata.description,
        content,
        path: skillPath,
      };
    } catch {
      return null;
    }
  }

  /**
   * 获取所有 Skill 的 metadata（用于注入 system prompt）
   */
  async getMetadata(): Promise<SkillMetadata[]> {
    const skills = await this.loadAll();
    return skills.map((s) => ({
      name: s.name,
      description: s.description,
    }));
  }

  /**
   * 解析 SKILL.md 中的 YAML frontmatter
   */
  private parseMetadata(content: string): SkillMetadata {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error('Invalid SKILL.md: missing frontmatter');
    }

    try {
      const frontmatter = yaml.load(match[1]) as any;
      return {
        name: frontmatter.name ?? 'unknown',
        description: frontmatter.description ?? 'unknown',
      };
    } catch (error) {
      throw new Error(`Failed to parse YAML: ${error}`);
    }
  }

  /**
   * 列出所有 Skill 目录
   */
  private async listSkillDirs(): Promise<string[]> {
    try {
      const { promises: fs } = await import('fs');
      const entries = await fs.readdir(this.skillsPath, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }
}

/**
 * SkillLoader 测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SkillLoader } from '../src/agent/skills.js';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('SkillLoader', () => {
  const testSkillsPath = join(process.cwd(), 'test-skills');
  let loader: SkillLoader;

  beforeEach(async () => {
    loader = new SkillLoader(testSkillsPath);
    await fs.mkdir(testSkillsPath, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testSkillsPath, { recursive: true, force: true });
  });

  describe('load', () => {
    it('应该加载单个 Skill', async () => {
      const skillPath = join(testSkillsPath, 'web-scraper');
      await fs.mkdir(skillPath, { recursive: true });
      await fs.writeFile(
        join(skillPath, 'SKILL.md'),
        `---
name: web-scraper
description: 爬取指定 URL 的网页内容
---

# Web Scraper

爬取网页内容。`,
        'utf-8'
      );

      const skill = await loader.load('web-scraper');

      expect(skill).toBeDefined();
      expect(skill?.name).toBe('web-scraper');
      expect(skill?.description).toBe('爬取指定 URL 的网页内容');
      expect(skill?.content).toContain('# Web Scraper');
    });

    it('应该返回 null 当 Skill 不存在', async () => {
      const skill = await loader.load('non-existent');
      expect(skill).toBeNull();
    });

    it('应该解析 YAML frontmatter', async () => {
      const skillPath = join(testSkillsPath, 'test-skill');
      await fs.mkdir(skillPath, { recursive: true });
      await fs.writeFile(
        join(skillPath, 'SKILL.md'),
        `---
name: test-skill
description: Test skill description
---

# Content`,
        'utf-8'
      );

      const skill = await loader.load('test-skill');
      expect(skill?.name).toBe('test-skill');
      expect(skill?.description).toBe('Test skill description');
    });
  });

  describe('loadAll', () => {
    it('应该加载所有 Skills', async () => {
      await fs.mkdir(join(testSkillsPath, 'skill1'), { recursive: true });
      await fs.writeFile(
        join(testSkillsPath, 'skill1', 'SKILL.md'),
        `---
name: skill1
description: First skill
---

# Skill 1`,
        'utf-8'
      );

      await fs.mkdir(join(testSkillsPath, 'skill2'), { recursive: true });
      await fs.writeFile(
        join(testSkillsPath, 'skill2', 'SKILL.md'),
        `---
name: skill2
description: Second skill
---

# Skill 2`,
        'utf-8'
      );

      const skills = await loader.loadAll();

      expect(skills).toHaveLength(2);
      expect(skills[0].name).toBe('skill1');
      expect(skills[1].name).toBe('skill2');
    });

    it('应该返回空数组当没有 Skills', async () => {
      const skills = await loader.loadAll();
      expect(skills).toEqual([]);
    });
  });

  describe('getMetadata', () => {
    it('应该只返回 metadata，不包含 content', async () => {
      await fs.mkdir(join(testSkillsPath, 'test'), { recursive: true });
      await fs.writeFile(
        join(testSkillsPath, 'test', 'SKILL.md'),
        `---
name: test
description: Test description
---

# Content`,
        'utf-8'
      );

      const metadata = await loader.getMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toEqual({
        name: 'test',
        description: 'Test description',
      });
      expect(metadata[0]).not.toHaveProperty('content');
    });
  });
});

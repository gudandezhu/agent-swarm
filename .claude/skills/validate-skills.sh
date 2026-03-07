#!/bin/bash
# Skills 验证脚本
# 检查所有 skills 的 frontmatter 和引用完整性

set -e

SKILLS_DIR="$(dirname "$0")"
ERRORS=0

echo "🔍 Validating AI Native Skills..."
echo

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 frontmatter
check_frontmatter() {
   file="$1"
   name="$2"

  # 检查必需字段
  if ! grep -q "^name:" "$file"; then
    echo -e "${RED}✗${NC} $name: 缺少 name 字段"
    ((ERRORS++))
  fi

  if ! grep -q "^description:" "$file"; then
    echo -e "${RED}✗${NC} $name: 缺少 description 字段"
    ((ERRORS++))
  fi

  if ! grep -q "^version:" "$file"; then
    echo -e "${RED}✗${NC} $name: 缺少 version 字段"
    ((ERRORS++))
  fi

  if ! grep -q "^triggers:" "$file"; then
    echo -e "${YELLOW}⚠${NC} $name: 缺少 triggers 字段（推荐）"
  fi

  if ! grep -q "^category:" "$file"; then
    echo -e "${YELLOW}⚠${NC} $name: 缺少 category 字段（推荐）"
  fi
}

# 检查模板引用
check_template_links() {
   file="$1"
   name="$2"

  # 提取所有模板引用
   links=$(grep -oP '(?<=\]\(templates/)[^)]+' "$file" || true)

  if [ -z "$links" ]; then
    return
  fi

  while IFS= read -r link; do
    if [ ! -f "$SKILLS_DIR/templates/$link" ]; then
      echo -e "${RED}✗${NC} $name: 模板引用不存在 templates/$link"
      ((ERRORS++))
    fi
  done <<< "$links"
}

# 遍历所有 skill 文件
for skill_file in "$SKILLS_DIR"/*.md; do
  # 跳过自身和 templates 目录
  filename=$(basename "$skill_file")
  if [ "$filename" = "validate-skills.sh" ] || [ "$filename" = "SKILL.md" ]; then
    continue
  fi

  echo "Checking: $filename"

  # 检查 frontmatter
  check_frontmatter "$skill_file" "$filename"

  # 检查模板引用
  check_template_links "$skill_file" "$filename"

  # 检查文件大小（警告超过 300 行）
  lines=$(wc -l < "$skill_file")
  if [ "$lines" -gt 300 ]; then
    echo -e "${YELLOW}⚠${NC} $filename: 文件过长 ($lines 行)，建议进一步简化"
  fi

  # 检查描述长度（警告超过 200 字符）
  desc=$(grep "^description:" "$skill_file" | cut -d'"' -f2)
  desc_len=${#desc}
  if [ "$desc_len" -gt 200 ]; then
    echo -e "${YELLOW}⚠${NC} $filename: description 过长 ($desc_len 字符)，建议精简"
  fi

  # 检查触发词数量
   triggers=$(grep -A 10 "^triggers:" "$skill_file" | grep -c '^\s*"- ' || true)
  if [ "$triggers" -lt 3 ]; then
    echo -e "${YELLOW}⚠${NC} $filename: 触发词较少 ($triggers 个)，建议增加"
  fi

  echo -e "${GREEN}✓${NC} $filename 基本检查完成"
  echo
done

# 检查模板文件
if [ -d "$SKILLS_DIR/templates" ]; then
  echo "Checking templates..."

  for template_file in "$SKILLS_DIR/templates"/*.md; do
    if [ -f "$template_file" ]; then
       filename=$(basename "$template_file")
       lines=$(wc -l < "$template_file")

      if [ "$lines" -gt 200 ]; then
        echo -e "${YELLOW}⚠${NC} templates/$filename: 过长 ($lines 行)"
      else
        echo -e "${GREEN}✓${NC} templates/$filename ($lines 行)"
      fi
    fi
  done

  echo
fi

# 汇总
echo "----------------------------------------"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ 所有检查通过！${NC}"
  exit 0
else
  echo -e "${RED}✗ 发现 $ERRORS 个错误${NC}"
  exit 1
fi

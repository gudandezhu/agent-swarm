/**
 * 默认主题定义
 */

export const defaultTheme = {
  editor: {
    borderColor: (s: string) => s,
    selectList: {
      selectedPrefix: (s: string) => s,
      selectedText: (s: string) => s,
      description: (s: string) => s,
      scrollInfo: (s: string) => s,
      noMatch: (s: string) => s,
    },
  },
  markdown: {
    heading: (s: string) => s,
    link: (s: string) => s,
    linkUrl: (s: string) => s,
    code: (s: string) => s,
    codeBlock: (s: string) => s,
    codeBlockBorder: (s: string) => s,
    quote: (s: string) => s,
    quoteBorder: (s: string) => s,
    hr: (s: string) => s,
    listBullet: (s: string) => s,
    bold: (s: string) => s,
    italic: (s: string) => s,
    strikethrough: (s: string) => s,
    underline: (s: string) => s,
  },
} as const;

export type DefaultTheme = typeof defaultTheme;
export type EditorTheme = typeof defaultTheme.editor;
export type MarkdownTheme = typeof defaultTheme.markdown;

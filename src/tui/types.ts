/**
 * TUI 类型定义
 */

export type TuiStatus = 'idle' | 'processing' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface AppProps {
  initialAgent?: string;
  sessionId: string;
  onMessage: (message: string) => void;
  onExit: () => void;
}

export interface StatusLineProps {
  agent: string;
  sessionId: string;
  status: TuiStatus;
}

export interface InputBoxProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
  status: TuiStatus;
}

export interface MessageListProps {
  messages: Message[];
  onStreamingComplete?: () => void;
}

export interface MessageItemProps {
  message: Message;
  onStreamingComplete?: () => void;
}

export interface MarkdownProps {
  children?: string;
}

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    fg: {
      default: string;
      muted: string;
    };
    bg: {
      default: string;
      muted: string;
    };
  };
}

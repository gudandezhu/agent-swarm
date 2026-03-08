/**
 * MultiLineInput - 使用 ink-multiline-input 的多行输入组件
 *
 * 特性:
 * - Enter: 提交
 * - Ctrl+Enter 或 \: 换行
 * - Tab: 自动补全
 * - ↑↓: 历史记录
 */

import React, { useState, useCallback, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { MultilineInput as InkMultilineInput } from 'ink-multiline-input';
import type { InputBoxProps } from '../types.js';
import { getStatusIndicator, getStatusColor } from '../utils/statusHelpers.js';

interface HistoryEntry {
  input: string;
  timestamp: number;
}

interface Completion {
  text: string;
  description?: string;
}

// 命令配置
const COMMANDS = [
  { text: '/help', description: '显示帮助信息' },
  { text: '/reset', description: '重置会话' },
  { text: '/exit', description: '退出程序' },
  { text: '/quit', description: '退出程序' },
  { text: '/agent', description: '切换 Agent [名称]' },
] as const;

// 默认 agents
const DEFAULT_AGENTS = ['assistant', 'coder', 'reviewer'];

// 命令补全
const getCommandCompletions = (input: string): Completion[] => {
  if (!input.startsWith('/')) return [];

  const lastSpace = input.lastIndexOf(' ');
  const currentWord = lastSpace === -1 ? input : input.slice(lastSpace + 1);

  return COMMANDS.filter((cmd) => cmd.text.startsWith(currentWord));
};

// Agent 补全
const getAgentCompletions = (input: string, agents: string[]): Completion[] => {
  if (!input.startsWith('/agent ')) return [];

  const parts = input.split(' ');
  if (parts.length !== 2) return [];

  const currentWord = parts[1];
  const availableAgents = agents.length > 0 ? agents : DEFAULT_AGENTS;

  return availableAgents
    .filter((agent) => agent.startsWith(currentWord))
    .map((agent) => ({ text: agent }));
};

const MultiLineInput: React.FC<
  InputBoxProps & {
    agents?: string[];
  }
> = ({ onSubmit, status, agents = [] }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [selectedCompletion, setSelectedCompletion] = useState(0);
  const [showCompletions, setShowCompletions] = useState(false);

  const { exit } = useApp();

  // 使用 ref 跟踪，避免闭包问题
  const inputRef = useRef(input);
  const showCompletionsRef = useRef(showCompletions);
  const completionsRef = useRef(completions);

  // 同步 ref
  React.useEffect(() => {
    inputRef.current = input;
  }, [input]);

  React.useEffect(() => {
    showCompletionsRef.current = showCompletions;
  }, [showCompletions]);

  React.useEffect(() => {
    completionsRef.current = completions;
  }, [completions]);

  const availableAgents = agents.length > 0 ? agents : DEFAULT_AGENTS;

  const isProcessing = status === 'processing';
  const canInput = !isProcessing;

  // 保存输入历史
  const addToHistory = useCallback((value: string) => {
    if (!value.trim()) return;

    const entry: HistoryEntry = {
      input: value,
      timestamp: Date.now(),
    };

    setHistory((prev) => [...prev.slice(-99), entry]);
  }, []);

  // 从历史记录恢复（简化版）
  const navigateHistory = useCallback(
    (direction: 'up' | 'down') => {
      if (history.length === 0) return;

      // 简化实现：只显示最后一条历史记录
      if (direction === 'up' && history.length > 0) {
        setInput(history[history.length - 1].input);
      } else if (direction === 'down') {
        setInput('');
      }
    },
    [history]
  );

  // 获取补全
  const updateCompletions = useCallback(
    (value: string) => {
      const commandCompletions = getCommandCompletions(value);
      const agentCompletions = getAgentCompletions(value, availableAgents);

      const all = [...commandCompletions, ...agentCompletions];
      setCompletions(all);
      setShowCompletions(all.length > 0);
      setSelectedCompletion(0);
    },
    [availableAgents]
  );

  // 提交处理
  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed) {
      addToHistory(trimmed);
      onSubmit(trimmed);
      setInput('');
      setShowCompletions(false);
    }
  }, [input, onSubmit, addToHistory]);

  // 自定义键绑定
  const keyBindings = {
    // Ctrl+Enter 提交，Enter 换行
    submit: (key: any) => key.return && key.ctrl,
    newline: (key: any) => key.return && !key.ctrl,
  };

  // 输入变化处理
  const handleChange = useCallback(
    (value: string) => {
      setInput(value);

      // 更新补全
      if (value.endsWith('/') || value.includes('/agent ')) {
        updateCompletions(value);
      } else {
        setShowCompletions(false);
      }
    },
    [updateCompletions]
  );

  // 处理 Tab、方向键等特殊键
  useInput(
    (inputStr, key) => {
      if (!canInput) return;

      // Ctrl+C 退出
      if (key.ctrl && inputStr === 'c') {
        exit();
        return;
      }

      // Tab - 补全
      if (key.tab) {
        if (showCompletionsRef.current) {
          setSelectedCompletion((prev) => (prev + 1) % completionsRef.current.length);
        } else {
          updateCompletions(inputRef.current);
        }
        return; // 阻止默认行为
      }

      // 上箭头 - 历史记录或补全选择
      if (key.upArrow) {
        if (showCompletionsRef.current) {
          setSelectedCompletion(
            (prev) => (prev - 1 + completionsRef.current.length) % completionsRef.current.length
          );
        } else {
          navigateHistory('up');
        }
        return; // 阻止默认行为
      }

      // 下箭头 - 历史记录或补全选择
      if (key.downArrow) {
        if (showCompletionsRef.current) {
          setSelectedCompletion((prev) => (prev + 1) % completionsRef.current.length);
        } else {
          navigateHistory('down');
        }
        return; // 阻止默认行为
      }

      // ESC - 取消补全
      if (key.escape) {
        setShowCompletions(false);
        return; // 阻止默认行为
      }
    },
    { isActive: true }
  );

  return (
    <Box
      flexDirection="column"
      width="100%"
      borderStyle="single"
      borderColor={canInput ? 'green' : 'gray'}
      paddingX={1}
    >
      {/* 顶部标题栏 */}
      <Box width="100%" marginBottom={1}>
        <Text bold color={canInput ? 'green' : 'gray'}>
          {status === 'processing' ? '⟳ Processing...' : '▸ Input'}
        </Text>
        <Text dimColor>{' ─ '}</Text>
        <Text dimColor>
          {status === 'processing' ? 'Waiting for response...' : 'Type your message below'}
        </Text>
      </Box>

      {/* 输入区域 */}
      <Box flexDirection="column" width="100%" marginBottom={1}>
        <InkMultilineInput
          value={input}
          onChange={handleChange}
          onSubmit={handleSubmit}
          keyBindings={keyBindings}
          showCursor={canInput}
          focus={canInput}
          placeholder={canInput ? 'Type a message...' : ''}
        />

        {/* 补全菜单 */}
        {showCompletions && completions.length > 0 && (
          <Box
            flexDirection="column"
            marginTop={1}
            paddingX={1}
            borderStyle="round"
            borderColor="gray"
          >
            {completions.map((completion, index) => (
              <Box key={completion.text}>
                <Text
                  color={index === selectedCompletion ? 'green' : 'gray'}
                  inverse={index === selectedCompletion}
                >
                  {completion.text}
                </Text>
                {completion.description && <Text dimColor> - {completion.description}</Text>}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* 底部状态栏 */}
      <Box width="100%">
        <Text color={getStatusColor(status) as any}>{getStatusIndicator(status)}</Text>
        <Text dimColor>{' • '}</Text>
        <Text dimColor>
          {status === 'processing'
            ? 'Ctrl+C to exit'
            : showCompletions
              ? 'Tab: cycle • Enter: select • Esc: close'
              : 'Ctrl+Enter: submit • Enter: newline • Tab: autocomplete • ↑↓: history'}
        </Text>
      </Box>
    </Box>
  );
};

export default MultiLineInput;

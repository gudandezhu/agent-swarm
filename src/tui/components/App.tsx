/**
 * App - Ink TUI 主应用组件
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box } from 'ink';
import StatusLine from './StatusLine.js';
import MessageList from './MessageList.js';
import MultiLineInput from './MultiLineInput.js';
import Banner from './Banner.js';
import type { Message, TuiStatus } from '../types.js';
import { messageBridge } from '../MessageBridge.js';

interface AppProps {
  initialAgent?: string;
  sessionId: string;
  onMessage: (message: string) => void;
  onExit: () => void;
}

const App: React.FC<AppProps> = ({ initialAgent = 'assistant', sessionId, onMessage, onExit }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<TuiStatus>('idle');
  const [currentAgent, setCurrentAgent] = useState(initialAgent);
  // 可用的 agents 列表（可以后续从配置或 API 获取）
  const [agents] = useState<string[]>(['assistant', 'coder', 'reviewer', 'planner', 'tester']);

  // 监听来自 Agent 的响应消息
  useEffect(() => {
    const handleBridgeMessage = (bridgeMessage: {
      role: 'assistant' | 'system';
      content: string;
      timestamp: number;
    }) => {
      const newMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        role: bridgeMessage.role,
        content: bridgeMessage.content,
        timestamp: bridgeMessage.timestamp,
      };

      setMessages((prev) => [...prev, newMessage]);
      setStatus('idle'); // 重置状态
    };

    messageBridge.onMessage(handleBridgeMessage);

    return () => {
      messageBridge.removeMessageListener(handleBridgeMessage);
    };
  }, []);

  const handleSubmit = useCallback(
    (input: string) => {
      // 处理命令
      if (input.startsWith('/')) {
        const [command] = input.split(' ');

        switch (command.toLowerCase()) {
          case '/exit':
          case '/quit':
            onExit();
            return;

          case '/reset':
            setMessages([]);
            return;

          case '/help':
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'system',
                content: `可用命令:\n  /help    - 显示此帮助信息\n  /reset   - 清空消息历史\n  /exit    - 退出程序`,
                timestamp: Date.now(),
              },
            ]);
            return;

          case '/agent':
            const [, agentName] = input.split(' ');
            if (agentName) {
              setCurrentAgent(agentName);
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: 'system',
                  content: `切换到 Agent: ${agentName}`,
                  timestamp: Date.now(),
                },
              ]);
            }
            return;
        }
      }

      // 添加用户消息
      const userMessage: Message = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        role: 'user',
        content: input,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // 通知父组件（传递给 AgentSwarm）
      onMessage(input);

      // 更新状态为处理中
      setStatus('processing');
    },
    [onMessage, onExit]
  );

  return (
    <Box flexDirection="column" height="100%">
      <StatusLine agent={currentAgent} sessionId={sessionId} status={status} />

      <Box flexGrow={1} flexDirection="column">
        {messages.length === 0 ? (
          <Banner />
        ) : (
          <MessageList messages={messages} onStreamingComplete={() => setStatus('idle')} />
        )}
      </Box>

      <MultiLineInput onSubmit={handleSubmit} status={status} agents={agents} />
    </Box>
  );
};

export default App;

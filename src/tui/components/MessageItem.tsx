/**
 * MessageItem - 单条消息组件
 */

import React from 'react';
import { Box, Text } from 'ink';
import Markdown from 'ink-markdown';
import type { MessageItemProps } from '../types.js';

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const getPrefix = () => {
    switch (message.role) {
      case 'user':
        return '● 你:';
      case 'assistant':
        return '● AI:';
      case 'system':
        return '● 系统:';
      default:
        return '●';
    }
  };

  const getPrefixColor = () => {
    switch (message.role) {
      case 'user':
        return 'cyan';
      case 'assistant':
        return 'green';
      case 'system':
        return 'yellow';
      default:
        return 'white';
    }
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={getPrefixColor() as any}>
        {getPrefix()}
      </Text>
      <Box paddingLeft={2}>
        <Markdown>{message.content}</Markdown>
      </Box>
    </Box>
  );
};

export default MessageItem;

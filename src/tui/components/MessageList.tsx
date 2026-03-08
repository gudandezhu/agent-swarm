/**
 * MessageList - 消息列表组件
 */

import React from 'react';
import { Box } from 'ink';
import MessageItem from './MessageItem.js';
import type { MessageListProps } from '../types.js';

const MessageList: React.FC<MessageListProps> = ({ messages, onStreamingComplete }) => {
  if (messages.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" gap={0}>
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} onStreamingComplete={onStreamingComplete} />
      ))}
    </Box>
  );
};

export default MessageList;

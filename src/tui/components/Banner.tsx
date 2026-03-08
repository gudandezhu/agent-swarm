/**
 * Banner - 启动欢迎横幅（Claude Code 风格）
 */

import React from 'react';
import { Box, Text } from 'ink';

const Banner: React.FC = () => {
  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1}>
      <Box key="line1">
        <Text bold color="red" key="logo1">
          {' '}
          ▐▛███▜▌{' '}
        </Text>
        <Text bold color="yellow" key="text1">
          Tips for getting started
        </Text>
      </Box>
      <Box key="line2">
        <Text bold color="red" key="logo2">
          {' '}
          ▝▜█████▛▘{' '}
        </Text>
        <Text dimColor key="text2">
          Type your message to chat
        </Text>
      </Box>
      <Box key="line3">
        <Text bold color="red" key="logo3">
          {' '}
          ▘▘ ▝▝{' '}
        </Text>
        <Text dimColor key="text3">
          Run /help for available commands
        </Text>
      </Box>
    </Box>
  );
};

export default Banner;

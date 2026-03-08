/**
 * StatusLine - 状态栏组件（带 Spinner）
 */

import React from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import type { StatusLineProps } from '../types.js';
import { getStatusText, getStatusColor } from '../utils/statusHelpers.js';

const StatusLine: React.FC<StatusLineProps> = ({ agent, sessionId, status }) => {
  const isProcessing = status === 'processing';

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box>
        <Text bold key="title">
          Agent Swarm
        </Text>
        <Text dimColor key="sep1">
          {' '}
          |{' '}
        </Text>
        <Text key="agent">{agent}</Text>
        {isProcessing && (
          <>
            <Text dimColor> </Text>
            <Text dimColor>
              <Spinner type="dots" />
            </Text>
          </>
        )}
      </Box>
      <Box>
        <Text dimColor key="session">
          Session: {sessionId.slice(0, 8)}
        </Text>
        <Text dimColor key="sep2">
          {' '}
          |{' '}
        </Text>
        <Text color={getStatusColor(status) as any} key="status">
          {getStatusText(status)}
        </Text>
      </Box>
    </Box>
  );
};

export default StatusLine;

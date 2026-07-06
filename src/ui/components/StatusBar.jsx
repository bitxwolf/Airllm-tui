import React from 'react';
import { Box, Text } from 'ink';

const STATUS_COLORS = {
  ready: 'green',
  generating: 'yellow',
  error: 'red',
  loading_model: 'cyan',
  idle: 'gray',
};

const STATUS_LABELS = {
  ready: '● Ready',
  generating: '◌ Generating…',
  error: '✖ Error',
  loading_model: '◎ Loading Model…',
  idle: '○ Idle',
};

export function StatusBar({ modelId, device, status }) {
  const color = STATUS_COLORS[status] || 'gray';
  const label = STATUS_LABELS[status] || status;

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
      width="100%"
    >
      <Box gap={2}>
        <Text dimColor>
          Model: <Text bold color="white">{modelId || 'None'}</Text>
        </Text>
        <Text dimColor>
          Device: <Text bold color="white">{device || '—'}</Text>
        </Text>
        <Text dimColor>
          Status: <Text bold color={color}>{label}</Text>
        </Text>
      </Box>
      <Box gap={2}>
        <Text dimColor>[Q] Quit</Text>
        <Text dimColor>[Tab] Switch Pane</Text>
      </Box>
    </Box>
  );
}

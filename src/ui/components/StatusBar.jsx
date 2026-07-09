import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { COLORS, STATUS, ICONS, BOX, shortModelName, formatTime, VERSION } from '../theme.js';

export const StatusBar = React.memo(function StatusBar({ modelId, device, status, focusedPane }) {
  const [clock, setClock] = useState(formatTime(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(formatTime(new Date()));
    }, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const statusDef = STATUS[status] || STATUS.idle;
  const modelShort = shortModelName(modelId);
  const deviceLabel = device ? device.toUpperCase() : '—';

  // Dynamic shortcut hints based on state
  const hints = [];
  if (status === 'error') {
    hints.push({ key: 'R', label: 'Restart' });
  }
  hints.push({ key: 'Tab', label: 'Pane' });
  hints.push({ key: '?', label: 'Help' });
  hints.push({ key: 'Q', label: 'Quit' });

  return (
    <Box
      borderStyle="round"
      borderColor={COLORS.borderDim}
      paddingX={1}
      justifyContent="space-between"
      width="100%"
    >
      {/* Left: Status + Model + Device */}
      <Box gap={2}>
        <Box gap={1}>
          <Text color={statusDef.color} bold>
            {statusDef.icon}
          </Text>
          <Text color={statusDef.color}>
            {statusDef.label}
          </Text>
        </Box>
        <Text color={COLORS.textMuted}>
          {ICONS.model}{' '}
          <Text color={COLORS.text} bold>
            {modelShort}
          </Text>
        </Text>
        <Text color={COLORS.textMuted}>
          {BOX.vertical} {deviceLabel}
        </Text>
      </Box>

      {/* Right: Shortcuts + Clock + Version */}
      <Box gap={2}>
        {hints.map((h) => (
          <Text key={h.key} color={COLORS.textMuted}>
            <Text color={COLORS.primaryBright}>[{h.key}]</Text>
            {' '}
            {h.label}
          </Text>
        ))}
        <Text color={COLORS.textMuted}>
          {BOX.vertical} {clock}
        </Text>
        <Text color={COLORS.borderDim}>
          v{VERSION}
        </Text>
      </Box>
    </Box>
  );
});

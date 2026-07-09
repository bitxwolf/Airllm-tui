import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { COLORS, BOX, ICONS } from '../theme.js';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const gb = bytes / (1024 ** 3);
  const mb = bytes / (1024 ** 2);
  const kb = bytes / 1024;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  if (kb >= 1) return `${kb.toFixed(0)} KB`;
  return `${bytes} B`;
}

// Spinner frames cycling when percent is 0 or unknown
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function DownloadBar({ downloadProgress, stage }) {
  const [tick, setTick] = useState(0);

  // Spinner animation
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % SPINNER.length), 100);
    return () => clearInterval(id);
  }, []);

  if (!downloadProgress) {
    // No active download yet — show spinner with stage text
    return (
      <Box borderStyle="round" borderColor={COLORS.accent} paddingX={1} flexDirection="column">
        <Box gap={1}>
          <Text color={COLORS.accent}>{SPINNER[tick]}</Text>
          <Text color={COLORS.accent} bold>
            {stage || 'Preparing download…'}
          </Text>
        </Box>
      </Box>
    );
  }

  const { percent, downloadedBytes, totalBytes, files } = downloadProgress;
  const BAR_WIDTH = 40;
  const filled = Math.round((percent / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;

  const filledBar = BOX.block.repeat(filled);
  const emptyBar = BOX.blockLight.repeat(empty);

  const isIndeterminate = totalBytes === 0;
  const displayPct = isIndeterminate ? '?' : `${percent.toFixed(1)}%`;
  const downloaded = formatBytes(downloadedBytes);
  const total = isIndeterminate ? '?' : formatBytes(totalBytes);

  return (
    <Box borderStyle="round" borderColor={COLORS.accent} paddingX={1} flexDirection="column">
      {/* Header row */}
      <Box gap={2} justifyContent="space-between">
        <Box gap={1}>
          <Text color={COLORS.accent} bold>
            {SPINNER[tick]}
          </Text>
          <Text color={COLORS.accent} bold>
            {ICONS.download} Downloading model weights
          </Text>
          {files > 1 && (
            <Text color={COLORS.textMuted}>
              ({files} files)
            </Text>
          )}
        </Box>
        <Text color={COLORS.success} bold>
          {displayPct}
        </Text>
      </Box>

      {/* Progress bar */}
      <Box gap={1} marginTop={0}>
        <Text color={COLORS.success}>{filledBar}</Text>
        <Text color={COLORS.borderDim}>{emptyBar}</Text>
        <Text color={COLORS.textMuted}>
          {downloaded} / {total}
        </Text>
      </Box>
    </Box>
  );
}

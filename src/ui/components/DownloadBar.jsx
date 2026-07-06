import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

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
      <Box borderStyle="single" borderColor="cyan" paddingX={1} flexDirection="column">
        <Box gap={1}>
          <Text color="cyan">{SPINNER[tick]}</Text>
          <Text color="cyan" bold>
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

  const filledBar = '█'.repeat(filled);
  const emptyBar = '░'.repeat(empty);

  const isIndeterminate = totalBytes === 0;
  const displayPct = isIndeterminate ? '?' : `${percent.toFixed(1)}%`;
  const downloaded = formatBytes(downloadedBytes);
  const total = isIndeterminate ? '?' : formatBytes(totalBytes);

  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1} flexDirection="column">
      {/* Header row */}
      <Box gap={2} justifyContent="space-between">
        <Box gap={1}>
          <Text color="cyan" bold>
            {SPINNER[tick]}
          </Text>
          <Text color="cyan" bold>
            Downloading model weights
          </Text>
          {files > 1 && (
            <Text dimColor>
              ({files} files)
            </Text>
          )}
        </Box>
        <Text color="green" bold>
          {displayPct}
        </Text>
      </Box>

      {/* Progress bar */}
      <Box gap={1} marginTop={0}>
        <Text color="green">[</Text>
        <Text color="green">{filledBar}</Text>
        <Text dimColor>{emptyBar}</Text>
        <Text color="green">]</Text>
        <Text dimColor>
          {downloaded} / {total}
        </Text>
      </Box>
    </Box>
  );
}

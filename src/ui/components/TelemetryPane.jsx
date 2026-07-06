import React from 'react';
import { Box, Text } from 'ink';

function ProgressBar({ percent, width = 20, warningThreshold = 85 }) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const color = percent > warningThreshold ? 'yellow' : 'green';

  return (
    <Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
    </Text>
  );
}

export function TelemetryPane({ telemetry }) {
  const {
    vramUsedGb,
    vramTotalGb,
    vramPercent,
    tokensPerSec,
    currentLayer,
    totalLayers,
    layerPercent,
    elapsedMs,
  } = telemetry;

  const elapsed = (elapsedMs / 1000).toFixed(1);
  const hasGpu = vramTotalGb > 0;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="magenta"
      paddingX={1}
      paddingY={0}
    >
      <Text bold color="magenta">
        ◈ Telemetry
      </Text>
      <Box marginTop={1} flexDirection="column" gap={0}>
        {/* VRAM */}
        <Box>
          <Text dimColor>{'VRAM   '}</Text>
          {hasGpu ? (
            <Box>
              <ProgressBar percent={vramPercent} />
              <Text color={vramPercent > 85 ? 'yellow' : 'white'}>
                {' '}
                {vramUsedGb.toFixed(1)} / {vramTotalGb.toFixed(1)} GB
              </Text>
            </Box>
          ) : (
            <Text dimColor>N/A (CPU mode)</Text>
          )}
        </Box>

        {/* Layer */}
        <Box>
          <Text dimColor>{'Layer  '}</Text>
          <Box>
            <ProgressBar percent={layerPercent} warningThreshold={100} />
            <Text>
              {' '}
              {currentLayer} / {totalLayers}
            </Text>
          </Box>
        </Box>

        {/* Speed */}
        <Box>
          <Text dimColor>{'Tok/s  '}</Text>
          <Text bold color="cyan">
            {tokensPerSec > 0 ? tokensPerSec.toFixed(2) : '--'}
          </Text>
        </Box>

        {/* Elapsed */}
        <Box>
          <Text dimColor>{'Time   '}</Text>
          <Text>{elapsed}s</Text>
        </Box>
      </Box>
    </Box>
  );
}

import React from 'react';
import { Box, Text } from 'ink';
import { COLORS, ICONS, BOX, getVramColor } from '../theme.js';

function ProgressBar({ percent, width = 20, color, emptyColor }) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const barColor = color || COLORS.success;

  return (
    <Text>
      <Text color={barColor}>{BOX.block.repeat(filled)}</Text>
      <Text color={emptyColor || COLORS.borderDim}>
        {BOX.blockLight.repeat(empty)}
      </Text>
    </Text>
  );
}

export const TelemetryPane = React.memo(function TelemetryPane({ telemetry, isFocused }) {
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
  const vramColor = getVramColor(vramPercent);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isFocused ? COLORS.primary : COLORS.border}
      paddingX={1}
      paddingY={0}
    >
      {/* Header */}
      <Text bold color={isFocused ? COLORS.primary : COLORS.textDim}>
        {ICONS.telemetry} Telemetry
      </Text>

      <Box marginTop={1} flexDirection="column" gap={0}>
        {/* VRAM */}
        <Box>
          <Text color={COLORS.textMuted}>
            {ICONS.vram} {'VRAM  '}
          </Text>
          {hasGpu ? (
            <Box>
              <ProgressBar percent={vramPercent} color={vramColor} />
              <Text color={vramColor}>
                {' '}
                {vramUsedGb.toFixed(1)}/{vramTotalGb.toFixed(1)} GB
              </Text>
            </Box>
          ) : (
            <Text color={COLORS.textMuted}>N/A (CPU mode)</Text>
          )}
        </Box>

        {/* Layer progress */}
        <Box>
          <Text color={COLORS.textMuted}>
            {ICONS.layer} {'Layer '}
          </Text>
          <Box>
            <ProgressBar
              percent={layerPercent}
              color={COLORS.layerProgress}
            />
            <Text color={COLORS.layerProgress}>
              {' '}
              {currentLayer}/{totalLayers}
            </Text>
          </Box>
        </Box>

        {/* Speed */}
        <Box>
          <Text color={COLORS.textMuted}>
            {ICONS.speed} {'Speed '}
          </Text>
          <Text bold color={COLORS.speed}>
            {tokensPerSec > 0
              ? `${tokensPerSec.toFixed(2)} tok/s`
              : '-- tok/s'}
          </Text>
        </Box>

        {/* Elapsed */}
        <Box>
          <Text color={COLORS.textMuted}>
            {ICONS.time} {'Time  '}
          </Text>
          <Text color={COLORS.text}>{elapsed}s</Text>
        </Box>
      </Box>
    </Box>
  );
});

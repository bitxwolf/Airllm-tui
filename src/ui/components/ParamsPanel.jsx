import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { COLORS, ICONS, BOX } from '../theme.js';

const PARAM_DEFS = [
  { key: 'temperature', label: 'Temperature', min: 0.1, max: 2.0, step: 0.1, decimals: 1, unit: '' },
  { key: 'top_p', label: 'Top-p', min: 0.1, max: 1.0, step: 0.05, decimals: 2, unit: '' },
  { key: 'max_new_tokens', label: 'Max Tokens', min: 64, max: 4096, step: 64, decimals: 0, unit: 'tok' },
  { key: 'context_window', label: 'Context Turns', min: 0, max: 50, step: 1, decimals: 0, unit: 'msgs' },
];

function ParamSlider({ value, min, max, width = 12, isSelected }) {
  const normalised = (value - min) / (max - min);
  const filled = Math.round(normalised * width);
  const empty = width - filled;
  const color = isSelected ? COLORS.accent : COLORS.textDim;

  return (
    <Text>
      <Text color={color}>{BOX.block.repeat(filled)}</Text>
      <Text color={COLORS.borderDim}>{BOX.blockLight.repeat(empty)}</Text>
    </Text>
  );
}

export const ParamsPanel = React.memo(function ParamsPanel({ params, isFocused, onParamsChange }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  useInput(
    (input, key) => {
      if (!isFocused) return;

      if (key.upArrow) {
        setSelectedIdx((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIdx((prev) => Math.min(PARAM_DEFS.length - 1, prev + 1));
      } else if (key.leftArrow) {
        const def = PARAM_DEFS[selectedIdx];
        const current = params[def.key] ?? def.min;
        const newVal = Math.max(def.min, current - def.step);
        const rounded = parseFloat(newVal.toFixed(def.decimals));
        onParamsChange({ ...params, [def.key]: rounded });
      } else if (key.rightArrow) {
        const def = PARAM_DEFS[selectedIdx];
        const current = params[def.key] ?? def.min;
        const newVal = Math.min(def.max, current + def.step);
        const rounded = parseFloat(newVal.toFixed(def.decimals));
        onParamsChange({ ...params, [def.key]: rounded });
      }
    },
    { isActive: isFocused }
  );

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
        {ICONS.params} Parameters
      </Text>

      <Box marginTop={1} flexDirection="column">
        {PARAM_DEFS.map((def, idx) => {
          const isSelected = isFocused && idx === selectedIdx;
          const value = params[def.key] ?? def.min;
          const display =
            def.decimals > 0 ? value.toFixed(def.decimals) : String(value);

          return (
            <Box key={def.key} flexDirection="column">
              <Box>
                <Text color={isSelected ? COLORS.accent : COLORS.textDim}>
                  {isSelected ? `${BOX.arrow} ` : '  '}
                </Text>
                <Text
                  bold={isSelected}
                  color={isSelected ? COLORS.text : COLORS.textDim}
                >
                  {def.label.padEnd(14)}
                </Text>
                <Text dimColor={!isSelected}>
                  {isSelected ? `${BOX.arrowLeft} ` : '  '}
                </Text>
                <Text bold color={isSelected ? COLORS.warning : COLORS.text}>
                  {display}
                </Text>
                {def.unit && (
                  <Text color={COLORS.textMuted}> {def.unit}</Text>
                )}
                <Text dimColor={!isSelected}>
                  {isSelected ? ` ${BOX.arrow}` : ''}
                </Text>
              </Box>
              {isSelected && (
                <Box marginLeft={2} marginTop={0}>
                  <ParamSlider
                    value={value}
                    min={def.min}
                    max={def.max}
                    isSelected={isSelected}
                  />
                  <Text color={COLORS.textMuted}>
                    {' '}
                    {def.min}–{def.max}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {!isFocused && (
        <Text color={COLORS.textMuted} italic>
          [Tab to edit]
        </Text>
      )}
    </Box>
  );
});

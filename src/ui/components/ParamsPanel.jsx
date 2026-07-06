import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

const PARAM_DEFS = [
  { key: 'temperature', label: 'Temperature', min: 0.1, max: 2.0, step: 0.1, decimals: 1 },
  { key: 'top_p', label: 'Top-p', min: 0.1, max: 1.0, step: 0.05, decimals: 2 },
  { key: 'max_new_tokens', label: 'Max Tokens', min: 64, max: 4096, step: 64, decimals: 0 },
];

export function ParamsPanel({ params, isFocused, onParamsChange }) {
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
      borderColor={isFocused ? 'cyan' : 'gray'}
      paddingX={1}
      paddingY={0}
    >
      <Text bold color={isFocused ? 'cyan' : 'gray'}>
        ⚙ Parameters
      </Text>
      <Box marginTop={1} flexDirection="column">
        {PARAM_DEFS.map((def, idx) => {
          const isSelected = isFocused && idx === selectedIdx;
          const value = params[def.key] ?? def.min;
          const display =
            def.decimals > 0 ? value.toFixed(def.decimals) : String(value);

          return (
            <Box key={def.key}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '› ' : '  '}
              </Text>
              <Text
                bold={isSelected}
                color={isSelected ? 'cyan' : 'white'}
              >
                {def.label.padEnd(14)}
              </Text>
              <Text dimColor={!isSelected}>
                {isSelected ? '◂ ' : '  '}
              </Text>
              <Text bold color={isSelected ? 'yellow' : 'white'}>
                {display}
              </Text>
              <Text dimColor={!isSelected}>
                {isSelected ? ' ▸' : ''}
              </Text>
            </Box>
          );
        })}
      </Box>
      {!isFocused && (
        <Text dimColor italic>
          [Tab to edit]
        </Text>
      )}
    </Box>
  );
}

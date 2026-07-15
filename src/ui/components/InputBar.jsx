import React, { useState, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { COLORS, ICONS, BOX } from '../theme.js';

export const InputBar = React.memo(function InputBar({ onSubmit, onAbort, isGenerating, modelReady }) {
  const [buffer, setBuffer] = useState('');

  // Use a ref for cursor blink so toggling it does NOT cause re-renders.
  // We piggy-back on other renders to show/hide the cursor — this means the
  // cursor won't visually blink on its own, but it avoids the 530ms
  // re-render cycle that was causing full-screen flickering in Ink.
  const cursorRef = useRef(true);

  useInput(
    (input, key) => {
      if (isGenerating) {
        if (key.escape) {
          onAbort();
        }
        return;
      }

      if (!modelReady) return;

      if (key.return) {
        if (buffer.trim()) {
          onSubmit(buffer.trim());
          setBuffer('');
        }
        return;
      }

      if (key.escape) {
        onAbort();
        return;
      }

      if (key.backspace || key.delete) {
        setBuffer((prev) => prev.slice(0, -1));
        return;
      }

      // Only add printable characters
      if (input && !key.ctrl && !key.meta) {
        setBuffer((prev) => prev + input);
      }
    },
    { isActive: true }
  );

  // ── Generating state ────────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <Box
        borderStyle="round"
        borderColor={COLORS.warning}
        paddingX={1}
      >
        <Text color={COLORS.warning} bold>
          {ICONS.speed} Generating…
        </Text>
        <Text color={COLORS.textMuted}>
          {'  '}press Esc to abort
        </Text>
      </Box>
    );
  }

  // ── Model not ready state ───────────────────────────────────────────────
  if (!modelReady) {
    return (
      <Box
        borderStyle="round"
        borderColor={COLORS.borderDim}
        paddingX={1}
      >
        <Text color={COLORS.textMuted}>
          {ICONS.model} Waiting for model to load…
        </Text>
      </Box>
    );
  }

  // ── Ready state ─────────────────────────────────────────────────────────
  return (
    <Box
      borderStyle="round"
      borderColor={COLORS.accent}
      paddingX={1}
    >
      <Text color={COLORS.accent} bold>
        {BOX.arrow}{' '}
      </Text>
      <Text>
        {buffer}
        <Text color={COLORS.accent}>▌</Text>
      </Text>
      {buffer.length > 0 && (
        <Text color={COLORS.textMuted}>
          {' '}
          ({buffer.length})
        </Text>
      )}
    </Box>
  );
});

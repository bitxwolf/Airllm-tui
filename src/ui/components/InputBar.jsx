import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export function InputBar({ onSubmit, onAbort, isGenerating, modelReady }) {
  const [buffer, setBuffer] = useState('');

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

  if (isGenerating) {
    return (
      <Box
        borderStyle="single"
        borderColor="yellow"
        paddingX={1}
      >
        <Text color="yellow">
          ◌ Generating… press Esc to abort
        </Text>
      </Box>
    );
  }

  if (!modelReady) {
    return (
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
      >
        <Text dimColor>
          [Load a model first — enter model ID above]
        </Text>
      </Box>
    );
  }

  return (
    <Box
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
    >
      <Text color="cyan" bold>
        ❯{' '}
      </Text>
      <Text>
        {buffer}
        <Text color="cyan">█</Text>
      </Text>
    </Box>
  );
}

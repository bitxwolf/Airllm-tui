import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

export function ChatPane({ messages, currentResponse, isGenerating, sessionFile }) {
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor effect
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="blue"
      paddingX={1}
      paddingY={0}
      flexGrow={1}
    >
      <Text bold color="blue">
        ◉ Chat  [{sessionFile || 'new session'}]
      </Text>
      <Box marginTop={1} flexDirection="column" flexGrow={1}>
        {messages.length === 0 && !isGenerating && (
          <Text dimColor italic>
            No messages yet. Type a prompt below to begin.
          </Text>
        )}
        {messages.map((msg, idx) => (
          <Box key={idx} flexDirection="column">
            {idx > 0 && (
              <Text dimColor>{'─'.repeat(40)}</Text>
            )}
            <Box>
              {msg.role === 'user' ? (
                <Text bold color="blue">
                  You ›{' '}
                </Text>
              ) : (
                <Text bold color="green">
                  AI ·{' '}
                </Text>
              )}
              <Text wrap="wrap">{msg.content}</Text>
            </Box>
          </Box>
        ))}
        {isGenerating && currentResponse && (
          <Box flexDirection="column">
            {messages.length > 0 && (
              <Text dimColor>{'─'.repeat(40)}</Text>
            )}
            <Box>
              <Text bold color="green">
                AI ·{' '}
              </Text>
              <Text wrap="wrap">
                {currentResponse}
                {cursorVisible ? '▌' : ' '}
              </Text>
            </Box>
          </Box>
        )}
        {isGenerating && !currentResponse && (
          <Box flexDirection="column">
            {messages.length > 0 && (
              <Text dimColor>{'─'.repeat(40)}</Text>
            )}
            <Box>
              <Text bold color="green">
                AI ·{' '}
              </Text>
              <Text dimColor>
                Thinking{cursorVisible ? '…' : ''}
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

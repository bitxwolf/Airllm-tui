import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { COLORS, ICONS, BOX, hrule, formatTime } from '../theme.js';
import { useScroll } from '../hooks/useScroll.js';

export const ChatPane = React.memo(function ChatPane({
  messages,
  currentResponse,
  isGenerating,
  sessionFile,
  isFocused,
}) {
  const [cursorVisible, setCursorVisible] = useState(true);
  
  // Total items for scrolling: messages + (1 if generating response)
  const totalItems = messages.length + (isGenerating ? 1 : 0);
  
  // We estimate viewport height for scroll logic. Ink doesn't easily provide dynamic height without measureElement,
  // so we'll pick a sensible default, e.g., 20.
  const VIEWPORT_HEIGHT = 20;
  
  const {
    scrollOffset,
    isAutoScroll,
    scrollUp,
    scrollDown,
    scrollToTop,
    scrollToBottom,
    pageUp,
    pageDown,
    getVisibleRange,
  } = useScroll(totalItems, VIEWPORT_HEIGHT);

  // Blinking cursor effect
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Keyboard navigation for scrolling
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (key.upArrow) scrollUp();
    if (key.downArrow) scrollDown();
    if (key.pageUp) pageUp();
    if (key.pageDown) pageDown();
    
    // Home/End (Ink might not map these directly on all terminals, but we can check if it does, or use fallback)
    // Actually Ink has `home` and `end` on `key` object in newer versions, but if not we can use custom logic.
    // We'll rely on the global shortcuts if needed, but for now we map PgUp/PgDn.
  }, { isActive: isFocused });

  // Calculate visible messages based on scroll
  const { start, end } = getVisibleRange();
  
  // Create a combined array of items to render
  const allItems = [...messages];
  if (isGenerating) {
    allItems.push({ role: 'ai', content: currentResponse || '', isGenerating: true });
  }
  
  const visibleItems = allItems.slice(start, end + 1);

  // Determine scroll indicator
  const atBottom = scrollOffset === 0;
  const scrollInfo =
    totalItems > 0 && !atBottom
      ? `${totalItems - scrollOffset}/${totalItems}`
      : '';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isFocused ? COLORS.primary : COLORS.border}
      paddingX={1}
      paddingY={0}
      flexGrow={1}
    >
      {/* Header */}
      <Box justifyContent="space-between">
        <Text bold color={isFocused ? COLORS.primary : COLORS.textDim}>
          {ICONS.chat} Chat {sessionFile ? `[${sessionFile}]` : ''}
        </Text>
        <Box gap={1}>
          {!atBottom && (
            <Text color={COLORS.warning} bold>
              ↑ scroll
            </Text>
          )}
          {scrollInfo && (
            <Text dimColor>
              [{scrollInfo}]
            </Text>
          )}
        </Box>
      </Box>

      {/* Messages */}
      <Box marginTop={1} flexDirection="column" flexGrow={1} overflow="hidden">
        {totalItems === 0 && !isGenerating && (
          <Box flexDirection="column" alignItems="center" marginTop={2}>
            <Text color={COLORS.textMuted}>
              {ICONS.ai} No messages yet
            </Text>
            <Text dimColor italic>
              Type a prompt below to begin chatting.
            </Text>
          </Box>
        )}

        {visibleItems.map((msg, idx) => (
          <Box key={`${start + idx}`} flexDirection="column" marginBottom={1}>
            {start + idx > 0 && (
              <Text color={COLORS.borderDim}>
                {hrule(50)}
              </Text>
            )}
            <Box>
              {msg.role === 'user' ? (
                <Text bold color={COLORS.user}>
                  {ICONS.user} You {BOX.arrow}{' '}
                </Text>
              ) : (
                <Text bold color={COLORS.ai}>
                  {ICONS.ai} AI {BOX.bullet}{' '}
                </Text>
              )}
              <Text wrap="wrap" color={COLORS.text}>
                {msg.content}
                {msg.isGenerating && (
                  <Text color={COLORS.accent}>
                    {cursorVisible ? '▌' : ' '}
                  </Text>
                )}
              </Text>
            </Box>
            {msg.isGenerating && !msg.content && (
              <Text color={COLORS.textMuted}>
                Thinking{cursorVisible ? '…' : ''}
              </Text>
            )}
            {msg.ts && (
              <Box marginLeft={5}>
                <Text color={COLORS.textMuted} dimColor>
                  {formatTime(msg.ts)}
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
});

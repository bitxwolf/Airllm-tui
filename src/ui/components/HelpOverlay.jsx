// ── HelpOverlay Component ─────────────────────────────────────────────────
// Full-screen overlay showing all keyboard shortcuts organized by section.
// Dismissed on any keypress. Uses the project's design system for theming.

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { SHORTCUTS, COLORS, VERSION, BANNER_COMPACT, BOX, ICONS } from '../theme.js';

// ── Section Labels ────────────────────────────────────────────────────────
// Maps SHORTCUTS keys to human-readable section headers with icons.
const SECTION_CONFIG = {
  global: { label: 'Global', icon: ICONS.globe },
  chat: { label: 'Chat', icon: ICONS.chat },
  params: { label: 'Parameters', icon: ICONS.params },
  system: { label: 'Sidebar Keys', icon: ICONS.model },
};

// Width for the key column in the shortcut table
const KEY_COL_WIDTH = 16;

/**
 * Renders a single section of keyboard shortcuts.
 */
function ShortcutSection({ sectionKey, shortcuts }) {
  const config = SECTION_CONFIG[sectionKey] || { label: sectionKey, icon: '' };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Section header */}
      <Box>
        <Text bold color={COLORS.accent}>
          {config.icon} {config.label}
        </Text>
      </Box>
      <Box>
        <Text color={COLORS.borderDim}>
          {BOX.separator.repeat(32)}
        </Text>
      </Box>

      {/* Key → Action pairs */}
      {shortcuts.map((shortcut, idx) => (
        <Box key={idx}>
          <Text color={COLORS.primaryBright} bold>
            {'  '}{shortcut.key.padEnd(KEY_COL_WIDTH)}
          </Text>
          <Text color={COLORS.text}>
            {shortcut.action}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

/**
 * HelpOverlay — full-screen keyboard shortcut reference.
 *
 * @param {object} props
 * @param {boolean} props.visible  - Whether the overlay is shown.
 * @param {function} props.onClose - Called on any keypress to dismiss.
 */
export function HelpOverlay({ visible, onClose }) {
  // Dismiss on any keypress while visible
  useInput(
    () => {
      onClose();
    },
    { isActive: visible }
  );

  if (!visible) return null;

  // Ordered sections to display
  const sectionOrder = ['global', 'chat', 'params', 'system'];

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={COLORS.primary}
      paddingX={2}
      paddingY={1}
      width="100%"
      minHeight={20}
    >
      {/* ── Title ──────────────────────────────────────────────────────── */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={COLORS.primary}>
          {ICONS.help} Keyboard Shortcuts
        </Text>
      </Box>

      <Box>
        <Text color={COLORS.borderDim}>
          {BOX.horizontal.repeat(48)}
        </Text>
      </Box>

      {/* ── Shortcut Sections ──────────────────────────────────────────── */}
      <Box flexDirection="column" marginTop={1}>
        {sectionOrder.map((key) => (
          <ShortcutSection
            key={key}
            sectionKey={key}
            shortcuts={SHORTCUTS[key]}
          />
        ))}
      </Box>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Box>
        <Text color={COLORS.borderDim}>
          {BOX.horizontal.repeat(48)}
        </Text>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        <Text dimColor italic>
          {BANNER_COMPACT} v{VERSION}  {BOX.bullet}  Press any key to close
        </Text>
      </Box>
    </Box>
  );
}

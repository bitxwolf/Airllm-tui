// ── SessionBrowser Component ──────────────────────────────────────────────
// Modal overlay for browsing, opening, and deleting saved chat sessions.
// The first row is always "+ New Session". Arrow keys navigate the list,
// Enter opens, Delete/Backspace removes a session, Esc closes.

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { COLORS, ICONS, BOX } from '../theme.js';

// Maximum characters shown for session preview text
const PREVIEW_MAX_LENGTH = 40;

/**
 * Truncates a string to maxLen, adding an ellipsis if needed.
 */
function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

/**
 * SessionBrowser — modal for browsing and managing chat sessions.
 *
 * @param {object}   props
 * @param {boolean}  props.visible      - Whether the modal is shown.
 * @param {Array}    props.sessions     - Array of {filename, messageCount, preview, date}.
 * @param {function} props.onSelect     - Called with filename when a session is opened.
 * @param {function} props.onDelete     - Called with filename when a session is deleted.
 * @param {function} props.onNewSession - Called to create a new session.
 * @param {function} props.onClose      - Called to dismiss the modal.
 */
export function SessionBrowser({ visible, sessions, onSelect, onDelete, onNewSession, onClose }) {
  // Index 0 = "+ New Session" row; real sessions start at index 1
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Total rows: 1 (new session) + sessions.length
  const totalRows = 1 + (sessions ? sessions.length : 0);

  // ── Keyboard handling ─────────────────────────────────────────────────
  useInput(
    (input, key) => {
      // Esc closes the modal
      if (key.escape) {
        onClose();
        return;
      }

      // Arrow navigation
      if (key.upArrow) {
        setSelectedIdx((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIdx((prev) => Math.min(totalRows - 1, prev + 1));
        return;
      }

      // Enter — open selected session or create new
      if (key.return) {
        if (selectedIdx === 0) {
          onNewSession();
        } else {
          const session = sessions[selectedIdx - 1];
          if (session) {
            onSelect(session.filename);
          }
        }
        return;
      }

      // Delete / Backspace — delete selected session (not the New Session row)
      if ((key.delete || key.backspace) && selectedIdx > 0) {
        const session = sessions[selectedIdx - 1];
        if (session) {
          onDelete(session.filename);
          // Adjust selection if we deleted the last item
          setSelectedIdx((prev) => Math.min(prev, totalRows - 2));
        }
        return;
      }
    },
    { isActive: visible }
  );

  if (!visible) return null;

  const hasSessions = sessions && sessions.length > 0;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={COLORS.primary}
      paddingX={2}
      paddingY={1}
      width="100%"
      minHeight={10}
    >
      {/* ── Title ──────────────────────────────────────────────────────── */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={COLORS.primary}>
          {ICONS.session} Session Browser
        </Text>
      </Box>

      <Box>
        <Text color={COLORS.borderDim}>
          {BOX.horizontal.repeat(52)}
        </Text>
      </Box>

      {/* ── Session List ───────────────────────────────────────────────── */}
      <Box flexDirection="column" marginTop={1}>
        {/* "+ New Session" row — always first */}
        <Box>
          <Text
            bold={selectedIdx === 0}
            color={selectedIdx === 0 ? COLORS.accentBright : COLORS.accent}
          >
            {selectedIdx === 0 ? `${BOX.arrow} ` : '  '}
          </Text>
          <Text bold color={COLORS.accentBright}>
            + New Session
          </Text>
        </Box>

        {/* ── Empty state ────────────────────────────────────────────── */}
        {!hasSessions && (
          <Box marginTop={1} marginLeft={2}>
            <Text dimColor italic>
              No previous sessions
            </Text>
          </Box>
        )}

        {/* ── Session rows ───────────────────────────────────────────── */}
        {hasSessions &&
          sessions.map((session, idx) => {
            const rowIdx = idx + 1; // offset by the New Session row
            const isSelected = rowIdx === selectedIdx;

            return (
              <Box key={session.filename || idx}>
                {/* Selection indicator */}
                <Text color={isSelected ? COLORS.primaryBright : COLORS.text}>
                  {isSelected ? `${BOX.arrow} ` : '  '}
                </Text>

                {/* Date */}
                <Text
                  color={isSelected ? COLORS.primaryBright : COLORS.textDim}
                  bold={isSelected}
                >
                  {(session.date || '').padEnd(12)}
                </Text>

                {/* Message count */}
                <Text color={isSelected ? COLORS.accent : COLORS.textMuted}>
                  {ICONS.chat} {String(session.messageCount ?? 0).padEnd(4)}
                </Text>

                {/* Preview text */}
                <Text
                  color={isSelected ? COLORS.text : COLORS.textDim}
                  wrap="truncate"
                >
                  {truncate(session.preview, PREVIEW_MAX_LENGTH)}
                </Text>
              </Box>
            );
          })}
      </Box>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Box marginTop={1}>
        <Text color={COLORS.borderDim}>
          {BOX.horizontal.repeat(52)}
        </Text>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        <Text dimColor italic>
          [Enter] Open  {BOX.bullet}  [Del] Delete  {BOX.bullet}  [Esc] Close
        </Text>
      </Box>
    </Box>
  );
}

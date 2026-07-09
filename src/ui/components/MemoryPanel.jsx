import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { COLORS, ICONS, BOX } from '../theme.js';

const VALUE_MAX_LENGTH = 35;

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

export function MemoryPanel({ visible, memories, onAdd, onDelete, onTogglePin, onClose }) {
  // Modes: 'browse' | 'addKey' | 'addValue'
  const [mode, setMode] = useState('browse');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Total rows: 1 ("+ Add Memory") + memories.length
  const totalRows = 1 + (memories ? memories.length : 0);

  useInput(
    (input, key) => {
      // ── Add Key mode ───────────────────────────────────
      if (mode === 'addKey') {
        if (key.escape) {
          setMode('browse');
          setNewKey('');
          return;
        }
        if (key.return) {
          if (newKey.trim()) {
            setMode('addValue');
          }
          return;
        }
        if (key.backspace || key.delete) {
          setNewKey((prev) => prev.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setNewKey((prev) => prev + input);
        }
        return;
      }

      // ── Add Value mode ─────────────────────────────────
      if (mode === 'addValue') {
        if (key.escape) {
          setMode('browse');
          setNewKey('');
          setNewValue('');
          return;
        }
        if (key.return) {
          if (newValue.trim()) {
            onAdd(newKey.trim(), newValue.trim());
            setMode('browse');
            setNewKey('');
            setNewValue('');
          }
          return;
        }
        if (key.backspace || key.delete) {
          setNewValue((prev) => prev.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setNewValue((prev) => prev + input);
        }
        return;
      }

      // ── Browse mode ────────────────────────────────────
      if (key.escape) {
        onClose();
        return;
      }

      if (key.upArrow) {
        setSelectedIdx((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIdx((prev) => Math.min(totalRows - 1, prev + 1));
        return;
      }

      // Enter — "+ Add Memory" row or no-op on existing entries
      if (key.return) {
        if (selectedIdx === 0) {
          setMode('addKey');
        }
        return;
      }

      // P — toggle pin
      if ((input === 'p' || input === 'P') && selectedIdx > 0) {
        const mem = memories[selectedIdx - 1];
        if (mem) onTogglePin(mem.id);
        return;
      }

      // Delete/Backspace — delete entry
      if ((key.delete || key.backspace) && selectedIdx > 0) {
        const mem = memories[selectedIdx - 1];
        if (mem) {
          onDelete(mem.id);
          setSelectedIdx((prev) => Math.min(prev, totalRows - 2));
        }
        return;
      }
    },
    { isActive: visible }
  );

  if (!visible) return null;

  const hasMemories = memories && memories.length > 0;

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
      {/* Title */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={COLORS.primary}>
          {ICONS.memory || '📌'} Memory Store
        </Text>
      </Box>

      <Box>
        <Text color={COLORS.borderDim}>
          {BOX.horizontal.repeat(56)}
        </Text>
      </Box>

      {/* Add mode inline */}
      {mode === 'addKey' && (
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Text bold color={COLORS.accent}>Enter memory label:</Text>
          <Box marginLeft={2}>
            <Text color={COLORS.text}>
              {newKey}
              <Text color={COLORS.accent}>▌</Text>
            </Text>
          </Box>
          <Text dimColor italic>  [Enter] Confirm  •  [Esc] Cancel</Text>
        </Box>
      )}

      {mode === 'addValue' && (
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Text bold color={COLORS.accent}>Enter value for "{newKey}":</Text>
          <Box marginLeft={2}>
            <Text color={COLORS.text}>
              {newValue}
              <Text color={COLORS.accent}>▌</Text>
            </Text>
          </Box>
          <Text dimColor italic>  [Enter] Save  •  [Esc] Cancel</Text>
        </Box>
      )}

      {/* Memory list */}
      {mode === 'browse' && (
        <Box flexDirection="column" marginTop={1}>
          {/* "+ Add Memory" row */}
          <Box>
            <Text
              bold={selectedIdx === 0}
              color={selectedIdx === 0 ? COLORS.accentBright : COLORS.accent}
            >
              {selectedIdx === 0 ? `${BOX.arrow} ` : '  '}
            </Text>
            <Text bold color={COLORS.accentBright}>
              + Add Memory
            </Text>
          </Box>

          {/* Empty state */}
          {!hasMemories && (
            <Box marginTop={1} marginLeft={2}>
              <Text dimColor italic>
                No memories saved yet
              </Text>
            </Box>
          )}

          {/* Memory rows */}
          {hasMemories &&
            memories.map((mem, idx) => {
              const rowIdx = idx + 1;
              const isSelected = rowIdx === selectedIdx;

              return (
                <Box key={mem.id || idx}>
                  <Text color={isSelected ? COLORS.primaryBright : COLORS.text}>
                    {isSelected ? `${BOX.arrow} ` : '  '}
                  </Text>
                  <Text color={mem.pinned ? COLORS.warning : COLORS.textMuted}>
                    {mem.pinned ? '📌 ' : '   '}
                  </Text>
                  <Text
                    bold={isSelected}
                    color={isSelected ? COLORS.primaryBright : COLORS.accent}
                  >
                    {(mem.key || '').padEnd(18)}
                  </Text>
                  <Text
                    color={isSelected ? COLORS.text : COLORS.textDim}
                    wrap="truncate"
                  >
                    {truncate(mem.value, VALUE_MAX_LENGTH)}
                  </Text>
                </Box>
              );
            })}
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text color={COLORS.borderDim}>
          {BOX.horizontal.repeat(56)}
        </Text>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        <Text dimColor italic>
          [Enter] Add  {BOX.bullet}  [P] Pin/Unpin  {BOX.bullet}  [Del] Delete  {BOX.bullet}  [Esc] Close
        </Text>
      </Box>
    </Box>
  );
}

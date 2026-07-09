// ── SystemPromptPanel Component ───────────────────────────────────────────
// Overlay panel for editing the system prompt. Supports two modes:
//   1. Preset selection — browse and select from predefined prompts
//   2. Custom editing   — character-by-character editing of a free-form prompt
// Tab toggles between modes. Esc closes the panel.

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { COLORS, ICONS, SYSTEM_PROMPT_PRESETS, BOX } from '../theme.js';

// Maximum characters shown in the preview area
const PREVIEW_MAX_LENGTH = 120;

// Mode identifiers
const MODE_PRESET = 'preset';
const MODE_CUSTOM = 'custom';

/**
 * SystemPromptPanel — system prompt editor overlay.
 *
 * @param {object}   props
 * @param {boolean}  props.visible              - Whether the panel is shown.
 * @param {string}   props.systemPrompt         - Current system prompt text.
 * @param {function} props.onSystemPromptChange - Called with new prompt string.
 * @param {function} props.onClose              - Called to dismiss the panel.
 */
export function SystemPromptPanel({ visible, systemPrompt, onSystemPromptChange, onClose }) {
  // ── Local state ───────────────────────────────────────────────────────
  const [mode, setMode] = useState(MODE_PRESET);
  const [presetIdx, setPresetIdx] = useState(0);
  const [customText, setCustomText] = useState(systemPrompt || '');

  // ── Toggle mode ───────────────────────────────────────────────────────
  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === MODE_PRESET ? MODE_CUSTOM : MODE_PRESET));
  }, []);

  // ── Keyboard handling ─────────────────────────────────────────────────
  useInput(
    (input, key) => {
      // Esc always closes the panel
      if (key.escape) {
        onClose();
        return;
      }

      // Tab toggles between preset and custom modes
      if (key.tab) {
        toggleMode();
        return;
      }

      // ── Preset mode navigation ──────────────────────────────────────
      if (mode === MODE_PRESET) {
        if (key.upArrow) {
          setPresetIdx((prev) => Math.max(0, prev - 1));
          return;
        }
        if (key.downArrow) {
          setPresetIdx((prev) => Math.min(SYSTEM_PROMPT_PRESETS.length - 1, prev + 1));
          return;
        }
        if (key.return) {
          const selected = SYSTEM_PROMPT_PRESETS[presetIdx];
          setCustomText(selected.prompt);
          onSystemPromptChange(selected.prompt);
          return;
        }
        return;
      }

      // ── Custom editing mode ─────────────────────────────────────────
      if (mode === MODE_CUSTOM) {
        // Submit custom prompt
        if (key.return) {
          onSystemPromptChange(customText);
          return;
        }

        // Backspace / delete
        if (key.backspace || key.delete) {
          setCustomText((prev) => prev.slice(0, -1));
          return;
        }

        // Regular character input
        if (input && !key.ctrl && !key.meta) {
          setCustomText((prev) => prev + input);
          return;
        }
      }
    },
    { isActive: visible }
  );

  if (!visible) return null;

  // ── Preview text (truncated) ──────────────────────────────────────────
  const currentPrompt = systemPrompt || '(none)';
  const previewText =
    currentPrompt.length > PREVIEW_MAX_LENGTH
      ? currentPrompt.slice(0, PREVIEW_MAX_LENGTH) + '…'
      : currentPrompt;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={COLORS.primary}
      paddingX={2}
      paddingY={1}
      width="100%"
      minHeight={14}
    >
      {/* ── Title ──────────────────────────────────────────────────────── */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={COLORS.primary}>
          {ICONS.prompt} System Prompt Editor
        </Text>
      </Box>

      {/* ── Mode tabs ──────────────────────────────────────────────────── */}
      <Box marginBottom={1}>
        <Text
          bold={mode === MODE_PRESET}
          color={mode === MODE_PRESET ? COLORS.accent : COLORS.textDim}
          underline={mode === MODE_PRESET}
        >
          {BOX.arrow} Presets
        </Text>
        <Text color={COLORS.textMuted}>{'   '}</Text>
        <Text
          bold={mode === MODE_CUSTOM}
          color={mode === MODE_CUSTOM ? COLORS.accent : COLORS.textDim}
          underline={mode === MODE_CUSTOM}
        >
          {BOX.arrow} Custom
        </Text>
        <Text color={COLORS.textMuted}>{'   [Tab] to switch'}</Text>
      </Box>

      <Box>
        <Text color={COLORS.borderDim}>
          {BOX.horizontal.repeat(44)}
        </Text>
      </Box>

      {/* ── Preset mode ────────────────────────────────────────────────── */}
      {mode === MODE_PRESET && (
        <Box flexDirection="column" marginTop={1}>
          {SYSTEM_PROMPT_PRESETS.map((preset, idx) => {
            const isSelected = idx === presetIdx;
            const isActive =
              systemPrompt === preset.prompt && preset.prompt !== '';

            return (
              <Box key={idx}>
                <Text color={isSelected ? COLORS.accent : COLORS.text}>
                  {isSelected ? `${BOX.arrow} ` : '  '}
                </Text>
                <Text
                  bold={isSelected}
                  color={isSelected ? COLORS.accent : COLORS.text}
                >
                  {preset.name}
                </Text>
                {isActive && (
                  <Text color={COLORS.success}>
                    {' '}{ICONS.check} active
                  </Text>
                )}
              </Box>
            );
          })}

          {/* Preset preview */}
          <Box marginTop={1} flexDirection="column">
            <Text color={COLORS.textDim} italic>
              Preview:
            </Text>
            <Text color={COLORS.textMuted} wrap="wrap">
              {SYSTEM_PROMPT_PRESETS[presetIdx]?.prompt || '(empty)'}
            </Text>
          </Box>
        </Box>
      )}

      {/* ── Custom editing mode ────────────────────────────────────────── */}
      {mode === MODE_CUSTOM && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={COLORS.textDim} italic>
            Type your custom system prompt:
          </Text>
          <Box marginTop={1}>
            <Text color={COLORS.text} wrap="wrap">
              {customText}
            </Text>
            <Text color={COLORS.accent}>█</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor italic>
              [Enter] Apply  {BOX.bullet}  [Backspace] Delete char
            </Text>
          </Box>
        </Box>
      )}

      {/* ── Current prompt footer ──────────────────────────────────────── */}
      <Box marginTop={1}>
        <Text color={COLORS.borderDim}>
          {BOX.horizontal.repeat(44)}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={COLORS.textDim}>
          Current: <Text color={COLORS.textMuted} italic>{previewText}</Text>
        </Text>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        <Text dimColor italic>
          [Esc] Close  {BOX.bullet}  [Tab] Switch Mode
        </Text>
      </Box>
    </Box>
  );
}

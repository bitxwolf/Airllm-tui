import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { useEngine } from './hooks/useEngine.js';
import { useTelemetry } from './hooks/useTelemetry.js';
import { useHistory } from './hooks/useHistory.js';
import { useMemory } from './hooks/useMemory.js';
import { ChatPane } from './components/ChatPane.js';
import { InputBar } from './components/InputBar.js';
import { TelemetryPane } from './components/TelemetryPane.js';
import { ParamsPanel } from './components/ParamsPanel.js';
import { StatusBar } from './components/StatusBar.js';
import { DownloadBar } from './components/DownloadBar.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { SessionBrowser } from './components/SessionBrowser.js';
import { SystemPromptPanel } from './components/SystemPromptPanel.js';
import { MemoryPanel } from './components/MemoryPanel.js';
import { saveConfig, newSessionFilename } from '../utils/storage.js';
import { buildPrompt } from '../utils/context.js';
import { BANNER, COLORS, BOX, ICONS, MODEL_PRESETS, getVramColor } from './theme.js';

const ERROR_HINTS = {
  MODEL_NOT_FOUND: 'Check model ID and HF_TOKEN env var.',
  OOM: 'Try a smaller model or enable 4-bit compression.',
  ENGINE_CRASH: 'Press R to restart the engine.',
  GENERATION_FAILED: 'Try again with a different prompt.',
  UNKNOWN: 'An unexpected error occurred.',
};

function ModelInputView({ onConfirm, device }) {
  const [modelId, setModelId] = useState('');
  const [hfToken, setHfToken] = useState('');
  const [activeField, setActiveField] = useState('preset'); // 'preset' | 'customId' | 'hfToken'
  const [presetIdx, setPresetIdx] = useState(0);

  useInput((input, key) => {
    // Navigate fields
    if (key.tab) {
      if (activeField === 'preset') setActiveField('customId');
      else if (activeField === 'customId') setActiveField('hfToken');
      else setActiveField('preset');
      return;
    }

    // Submit
    if (key.return) {
      if (activeField === 'preset') {
        onConfirm(MODEL_PRESETS[presetIdx].id, hfToken.trim());
      } else if (activeField === 'customId') {
        if (modelId.trim()) setActiveField('hfToken');
      } else if (activeField === 'hfToken') {
        const finalModelId = modelId.trim() || MODEL_PRESETS[presetIdx].id;
        onConfirm(finalModelId, hfToken.trim());
      }
      return;
    }

    // Handle preset selection
    if (activeField === 'preset') {
      if (key.upArrow) setPresetIdx(Math.max(0, presetIdx - 1));
      if (key.downArrow) setPresetIdx(Math.min(MODEL_PRESETS.length - 1, presetIdx + 1));
      return;
    }

    // Backspace for custom fields
    if (key.backspace || key.delete) {
      if (activeField === 'customId') setModelId(prev => prev.slice(0, -1));
      else if (activeField === 'hfToken') setHfToken(prev => prev.slice(0, -1));
      return;
    }

    // Text input for custom fields
    if (input && !key.ctrl && !key.meta) {
      if (activeField === 'customId') setModelId(prev => prev + input);
      else if (activeField === 'hfToken') setHfToken(prev => prev + input);
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" padding={2}>
      <Box flexDirection="column" marginBottom={1}>
        {BANNER.map((line, i) => (
          <Text key={i} bold color={COLORS.primaryBright}>
            {line}
          </Text>
        ))}
      </Box>
      <Text color={COLORS.textDim}>
        Run massive LLMs in a terminal dashboard {ICONS.rocket}
      </Text>
      
      <Box marginTop={1} marginBottom={2}>
        <Text color={COLORS.textMuted}>
          Detected device: <Text bold color={COLORS.accentBright}>{device.toUpperCase()}</Text>
        </Text>
      </Box>

      {/* Preset selection */}
      <Box flexDirection="column" width={65} marginBottom={2}>
        <Text bold color={activeField === 'preset' ? COLORS.primaryBright : COLORS.textDim}>
          {activeField === 'preset' ? BOX.arrow : ' '} 1. Select a Model Preset
        </Text>
        <Box flexDirection="column" marginLeft={3} marginTop={1}>
          {MODEL_PRESETS.map((preset, idx) => {
            const isSelected = presetIdx === idx;
            return (
              <Box key={idx}>
                <Text color={isSelected && activeField === 'preset' ? COLORS.accent : COLORS.textDim}>
                  {isSelected ? `${BOX.arrow} ` : '  '}
                </Text>
                <Text bold={isSelected} color={isSelected ? COLORS.text : COLORS.textDim} minWidth={16}>
                  {preset.name}
                </Text>
                <Text color={COLORS.textMuted} minWidth={10}>
                  {preset.vram}
                </Text>
                <Text color={COLORS.textMuted} italic>
                  {preset.description}
                </Text>
                {preset.recommended && (
                  <Text color={COLORS.warning}> {ICONS.star}</Text>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Custom Model ID */}
      <Box flexDirection="column" width={65} marginBottom={2}>
        <Text bold color={activeField === 'customId' ? COLORS.primaryBright : COLORS.textDim}>
          {activeField === 'customId' ? BOX.arrow : ' '} 2. Or enter a custom HuggingFace ID
        </Text>
        <Box marginLeft={3} marginTop={1}>
          <Text color={COLORS.text}>
            {modelId || <Text color={COLORS.textMuted}>meta-llama/Llama-2-7b-hf</Text>}
          </Text>
          {activeField === 'customId' && <Text color={COLORS.accent}>█</Text>}
        </Box>
      </Box>

      {/* HF Token */}
      <Box flexDirection="column" width={65} marginBottom={2}>
        <Text bold color={activeField === 'hfToken' ? COLORS.primaryBright : COLORS.textDim}>
          {activeField === 'hfToken' ? BOX.arrow : ' '} 3. HuggingFace Token (if needed)
        </Text>
        <Box marginLeft={3} marginTop={1}>
          <Text color={COLORS.text}>
            {hfToken ? '*'.repeat(hfToken.length) : <Text color={COLORS.textMuted}>hf_...</Text>}
          </Text>
          {activeField === 'hfToken' && <Text color={COLORS.accent}>█</Text>}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={COLORS.textMuted} italic>
          [Tab] Switch Fields  •  [↑/↓] Select Preset  •  [Enter] Confirm & Launch
        </Text>
      </Box>
    </Box>
  );
}

export function App({ bridge, config: initialConfig }) {
  const { exit } = useApp();
  const [config, setConfig] = useState(initialConfig);
  const [focusedPane, setFocusedPane] = useState('chat'); // 'chat' | 'params' | 'telemetry'
  const [currentResponse, setCurrentResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [params, setParams] = useState(initialConfig.params);
  const [generationEmitter, setGenerationEmitter] = useState(null);
  const [needsModelInput, setNeedsModelInput] = useState(!initialConfig.model_id);
  const [systemPrompt, setSystemPrompt] = useState(initialConfig.system_prompt || '');
  
  // Overlay states
  const [showHelp, setShowHelp] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showSessionBrowser, setShowSessionBrowser] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);

  const engine = useEngine(bridge);
  const telemetry = useTelemetry(bridge);
  const { messages, addMessage, clearHistory, sessionFile, switchSession, deleteSession, listSessions } = useHistory(newSessionFilename());
  const { memories, addMemory, deleteMemory, togglePin, pinnedMemories } = useMemory();

  // ── Refs for stable handleSubmit (avoids re-creating callback on every message) ──
  const messagesRef = useRef(messages);
  const pinnedMemoriesRef = useRef(pinnedMemories);
  const systemPromptRef = useRef(systemPrompt);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { pinnedMemoriesRef.current = pinnedMemories; }, [pinnedMemories]);
  useEffect(() => { systemPromptRef.current = systemPrompt; }, [systemPrompt]);

  // ── Token throttle refs ──
  const tokenBufferRef = useRef('');
  const tokenFlushTimerRef = useRef(null);
  
  const [sessionsList, setSessionsList] = useState([]);

  // Load sessions when opening browser
  useEffect(() => {
    if (showSessionBrowser) {
      listSessions().then(setSessionsList);
    }
  }, [showSessionBrowser, listSessions]);

  // Handle model selection for first run
  const handleModelConfirm = useCallback(
    async (modelId, hfToken) => {
      const updatedConfig = { ...config, model_id: modelId, hf_token: hfToken, device: config.device };
      setConfig(updatedConfig);
      setNeedsModelInput(false);
      await saveConfig(updatedConfig);
      engine.loadModel(modelId, config.device, hfToken);
    },
    [config, engine]
  );

  // Load model on mount if model_id is set
  useEffect(() => {
    if (config.model_id && !needsModelInput) {
      engine.loadModel(config.model_id, config.device, config.hf_token);
    }
  }, []); // Only on mount

  // Surface model loading errors in the chat history
  useEffect(() => {
    if (engine.lastError) {
      addMessage('assistant', `⚠ Model Loading Error: ${engine.lastError}`);
    }
  }, [engine.lastError, addMessage]);

  // Surface device fallback warning
  useEffect(() => {
    if (engine.deviceFallback) {
      const { requested, actual, reason, fix_command, fix_url } = engine.deviceFallback;
      let msg = `⚠ Device Fallback: ${reason} Running on ${actual.toUpperCase()} instead of ${requested.toUpperCase()}.`;
      if (fix_command) {
        msg += `\n\n  To fix this, exit and run:\n    ${fix_command}`;
      }
      if (fix_url) {
        msg += `\n\n  More info: ${fix_url}`;
      }
      addMessage('assistant', msg);
      const updatedConfig = { ...config, device: actual };
      setConfig(updatedConfig);
      saveConfig(updatedConfig).catch(() => {});
    }
  }, [engine.deviceFallback]);

  // Handle generation
  const handleSubmit = useCallback(
    (prompt) => {
      if (!bridge || engine.status !== 'ready') return;

      addMessage('user', prompt);
      setCurrentResponse('');
      setIsGenerating(true);
      telemetry.reset();

      // Build full prompt with conversation history, system prompt, and pinned memories
      // Uses refs to avoid stale closure issues without needing them as dependencies
      const maxTurns = params.context_window ?? 20;
      const finalPrompt = buildPrompt({
        messages: messagesRef.current,
        systemPrompt: systemPromptRef.current,
        pinnedMemories: pinnedMemoriesRef.current,
        newUserPrompt: prompt,
        maxTurns,
      });

      const emitter = bridge.generate(finalPrompt, params);
      setGenerationEmitter(emitter);

      // Throttled token accumulation — batch updates every ~32ms (≈30fps)
      tokenBufferRef.current = '';
      emitter.on('token', (text) => {
        tokenBufferRef.current += text;
        if (!tokenFlushTimerRef.current) {
          tokenFlushTimerRef.current = setTimeout(() => {
            tokenFlushTimerRef.current = null;
            const buffered = tokenBufferRef.current;
            tokenBufferRef.current = '';
            if (buffered) {
              setCurrentResponse((prev) => prev + buffered);
            }
          }, 32);
        }
      });

      emitter.on('done', (stats) => {
        // Flush any remaining buffered tokens
        if (tokenFlushTimerRef.current) {
          clearTimeout(tokenFlushTimerRef.current);
          tokenFlushTimerRef.current = null;
        }
        const remaining = tokenBufferRef.current;
        tokenBufferRef.current = '';
        setCurrentResponse((prev) => {
          const final = prev + remaining;
          if (final) addMessage('assistant', final);
          return '';
        });
        setIsGenerating(false);
        setGenerationEmitter(null);
      });

      emitter.on('error', (payload) => {
        // Flush timer on error
        if (tokenFlushTimerRef.current) {
          clearTimeout(tokenFlushTimerRef.current);
          tokenFlushTimerRef.current = null;
        }
        tokenBufferRef.current = '';
        const hint = ERROR_HINTS[payload.code] || ERROR_HINTS.UNKNOWN;
        const hfHint =
          payload.code === 'MODEL_NOT_FOUND' &&
          !config.hf_token &&
          !process.env.HF_TOKEN
            ? ' Set HF_TOKEN in your shell environment or config for gated models.'
            : '';
        addMessage('assistant', `⚠ Error: ${payload.message || 'Unknown error'}. ${hint}${hfHint}`);
        setCurrentResponse('');
        setIsGenerating(false);
        setGenerationEmitter(null);
      });

      emitter.on('interrupted', () => {
        // Flush timer on interrupt
        if (tokenFlushTimerRef.current) {
          clearTimeout(tokenFlushTimerRef.current);
          tokenFlushTimerRef.current = null;
        }
        const remaining = tokenBufferRef.current;
        tokenBufferRef.current = '';
        setCurrentResponse((prev) => {
          const final = prev + remaining;
          if (final) addMessage('assistant', final + ' [interrupted]');
          return '';
        });
        setIsGenerating(false);
        setGenerationEmitter(null);
      });
    },
    [bridge, engine.status, params, addMessage, telemetry, config.hf_token]
  );

  const handleAbort = useCallback(() => {
    if (generationEmitter) {
      generationEmitter.abort();
    }
  }, [generationEmitter]);

  const handleParamsChange = useCallback(
    (newParams) => {
      setParams(newParams);
      bridge.send('update_params', newParams);
      saveConfig({ ...config, params: newParams }).catch(() => {});
    },
    [bridge, config]
  );

  const handleSystemPromptChange = useCallback(
    (newPrompt) => {
      setSystemPrompt(newPrompt);
      const updatedConfig = { ...config, system_prompt: newPrompt };
      setConfig(updatedConfig);
      saveConfig(updatedConfig).catch(() => {});
      setShowSystemPrompt(false);
    },
    [config]
  );

  // Handle restart on engine crash
  const handleRestart = useCallback(async () => {
    try {
      await bridge.start();
      if (config.model_id) {
        engine.loadModel(config.model_id, config.device, config.hf_token);
      }
    } catch {
      // Error will be surfaced by useEngine
    }
  }, [bridge, config, engine]);

  // Global key bindings
  useInput(
    (input, key) => {
      const overlayActive = showHelp || showSessionBrowser || showSystemPrompt || showMemoryPanel;
      
      // Close overlays
      if (overlayActive && (key.escape || (key.ctrl && input === 'w'))) {
        setShowHelp(false);
        setShowSessionBrowser(false);
        setShowSystemPrompt(false);
        setShowMemoryPanel(false);
        return;
      }

      if (overlayActive) return;

      // Pane switching
      if (key.tab) {
        setFocusedPane((prev) => {
          if (prev === 'chat') return 'params';
          if (prev === 'params') return 'telemetry';
          return 'chat';
        });
        return;
      }

      // Ctrl-based shortcuts work regardless of input focus
      if (key.ctrl && input === 'n') {
        switchSession(newSessionFilename());
        return;
      }
      if (key.ctrl && input === 'o') {
        setShowSessionBrowser(true);
        return;
      }
      if (key.ctrl && input === 'l') {
        clearHistory();
        return;
      }

      // ── Single-letter shortcuts ──────────────────────────────────────
      // Only fire when the user is NOT actively typing in the input bar.
      // The input bar is active when: chat pane focused + model ready + not generating.
      const isInputActive = focusedPane === 'chat' && engine.status === 'ready' && !isGenerating;
      if (isInputActive) return; // Let InputBar handle all keypresses

      // These only fire when NOT typing (sidebar focused, or model loading, etc.)
      if (input === '?' || key.f1) {
        setShowHelp(true);
        return;
      }
      if (input === 's' || input === 'S') {
        if (!isGenerating) setShowSystemPrompt(true);
        return;
      }
      if (input === 'm' || input === 'M') {
        if (!isGenerating) setShowMemoryPanel(true);
        return;
      }

      // Quit
      if (input === 'q' && !isGenerating) {
        bridge.shutdown().then(() => exit());
        return;
      }

      // Restart
      if (input === 'r' && engine.status === 'error') {
        handleRestart();
        return;
      }
    },
    { isActive: !needsModelInput }
  );

  // First-run model selection
  if (needsModelInput) {
    return <ModelInputView onConfirm={handleModelConfirm} device={config.device} />;
  }

  const modelId = config.model_id || engine.modelInfo?.model_id || null;
  const device = engine.modelInfo?.device || config.device;
  const isCpu = device === 'cpu';
  const isLoadingModel = engine.status === 'loading_model';

  const overlayActive = showHelp || showSessionBrowser || showSystemPrompt || showMemoryPanel;

  return (
    <Box flexDirection="column" height="100%">
      {/* Overlays */}
      {showHelp && <HelpOverlay visible={showHelp} onClose={() => setShowHelp(false)} />}
      
      {showSessionBrowser && (
        <SessionBrowser
          visible={showSessionBrowser}
          sessions={sessionsList}
          onSelect={(filename) => {
            switchSession(filename);
            setShowSessionBrowser(false);
          }}
          onDelete={async (filename) => {
            await deleteSession(filename);
            listSessions().then(setSessionsList);
          }}
          onNewSession={() => {
            switchSession(newSessionFilename());
            setShowSessionBrowser(false);
          }}
          onClose={() => setShowSessionBrowser(false)}
        />
      )}

      {showMemoryPanel && (
        <MemoryPanel
          visible={showMemoryPanel}
          memories={memories}
          onAdd={addMemory}
          onDelete={deleteMemory}
          onTogglePin={togglePin}
          onClose={() => setShowMemoryPanel(false)}
        />
      )}

      {showSystemPrompt && (
        <SystemPromptPanel
          visible={showSystemPrompt}
          systemPrompt={systemPrompt}
          onSystemPromptChange={handleSystemPromptChange}
          onClose={() => setShowSystemPrompt(false)}
        />
      )}

      {/* Main UI (hidden if overlay is active) */}
      {!overlayActive && (
        <Box flexDirection="column" flexGrow={1}>
          {/* Main layout: Chat | Sidebar */}
          <Box flexGrow={1} flexDirection="row">
            {/* Left: Chat */}
            <Box flexGrow={3} flexDirection="column" paddingRight={1}>
              <ChatPane
                messages={messages}
                currentResponse={currentResponse}
                isGenerating={isGenerating}
                sessionFile={sessionFile}
                isFocused={focusedPane === 'chat'}
              />
              <Box marginTop={1}>
                <InputBar
                  onSubmit={handleSubmit}
                  onAbort={handleAbort}
                  isGenerating={isGenerating}
                  modelReady={engine.status === 'ready'}
                />
              </Box>
            </Box>
            
            {/* Right: Sidebar */}
            <Box flexGrow={1} flexDirection="column" minWidth={30}>
              <Box flexGrow={0} marginBottom={1}>
                <TelemetryPane
                  telemetry={telemetry}
                  isFocused={focusedPane === 'telemetry'}
                />
              </Box>
              <Box flexGrow={1}>
                <ParamsPanel
                  params={params}
                  isFocused={focusedPane === 'params'}
                  onParamsChange={handleParamsChange}
                />
              </Box>
            </Box>
          </Box>
          
          {isLoadingModel && (
            <Box marginTop={1}>
              <DownloadBar
                downloadProgress={engine.downloadProgress}
                stage={engine.loadStage}
              />
            </Box>
          )}
          
          {isCpu && !isLoadingModel && (
            <Box paddingX={1} marginTop={1}>
              <Text color={COLORS.warning} bold>
                {ICONS.warning} Running on CPU — generation will be very slow
              </Text>
            </Box>
          )}
          
          <Box marginTop={1}>
            <StatusBar
              modelId={modelId}
              device={device}
              status={engine.status}
              focusedPane={focusedPane}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { useEngine } from './hooks/useEngine.js';
import { useTelemetry } from './hooks/useTelemetry.js';
import { useHistory } from './hooks/useHistory.js';
import { ChatPane } from './components/ChatPane.js';
import { InputBar } from './components/InputBar.js';
import { TelemetryPane } from './components/TelemetryPane.js';
import { ParamsPanel } from './components/ParamsPanel.js';
import { StatusBar } from './components/StatusBar.js';
import { DownloadBar } from './components/DownloadBar.js';
import { saveConfig, newSessionFilename } from '../utils/storage.js';

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
  const [activeField, setActiveField] = useState('modelId'); // 'modelId' | 'hfToken'

  useInput((input, key) => {
    if (key.upArrow || key.downArrow || key.tab) {
      setActiveField((prev) => (prev === 'modelId' ? 'hfToken' : 'modelId'));
      return;
    }
    if (key.return) {
      if (activeField === 'modelId') {
        if (modelId.trim()) {
          setActiveField('hfToken');
        }
        return;
      }
      // If we are on hfToken, confirm the load
      if (modelId.trim()) {
        onConfirm(modelId.trim(), hfToken.trim());
      }
      return;
    }
    if (key.backspace || key.delete) {
      if (activeField === 'modelId') {
        setModelId((prev) => prev.slice(0, -1));
      } else {
        setHfToken((prev) => prev.slice(0, -1));
      }
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      if (activeField === 'modelId') {
        setModelId((prev) => prev + input);
      } else {
        setHfToken((prev) => prev + input);
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={2}
    >
      <Text bold color="cyan">
        {'╔══════════════════════════════════════════╗'}
      </Text>
      <Text bold color="cyan">
        {'║          🚀 AirLLM TUI  v0.1.0          ║'}
      </Text>
      <Text bold color="cyan">
        {'║   Run massive LLMs on consumer hardware  ║'}
      </Text>
      <Text bold color="cyan">
        {'╚══════════════════════════════════════════╝'}
      </Text>
      <Box marginTop={1}>
        <Text dimColor>
          Detected device: <Text bold color="yellow">{device}</Text>
        </Text>
      </Box>

      {/* Model ID Field */}
      <Box marginTop={1} flexDirection="column" width={50}>
        <Text color={activeField === 'modelId' ? 'cyan' : 'white'} bold={activeField === 'modelId'}>
          {activeField === 'modelId' ? '❯ ' : '  '}1. HuggingFace Model ID:
        </Text>
        <Box marginLeft={4}>
          <Text>
            {modelId || <Text dimColor>meta-llama/Llama-2-7b-hf</Text>}
          </Text>
          {activeField === 'modelId' && <Text color="cyan">█</Text>}
        </Box>
      </Box>

      {/* HF Token Field */}
      <Box marginTop={1} flexDirection="column" width={50}>
        <Text color={activeField === 'hfToken' ? 'cyan' : 'white'} bold={activeField === 'hfToken'}>
          {activeField === 'hfToken' ? '❯ ' : '  '}2. HuggingFace Token (Optional):
        </Text>
        <Box marginLeft={4}>
          <Text>
            {hfToken ? '*'.repeat(hfToken.length) : <Text dimColor>hf_...</Text>}
          </Text>
          {activeField === 'hfToken' && <Text color="cyan">█</Text>}
        </Box>
      </Box>

      <Box marginTop={2}>
        <Text dimColor italic>
          [Tab/Arrow] Switch Fields  •  [Enter] Confirm & Launch
        </Text>
      </Box>
    </Box>
  );
}

export function App({ bridge, config: initialConfig }) {
  const { exit } = useApp();
  const [config, setConfig] = useState(initialConfig);
  const [focusedPane, setFocusedPane] = useState('chat');
  const [currentResponse, setCurrentResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [params, setParams] = useState(initialConfig.params);
  const [sessionFile] = useState(() => newSessionFilename());
  const [generationEmitter, setGenerationEmitter] = useState(null);
  const [needsModelInput, setNeedsModelInput] = useState(!initialConfig.model_id);

  const engine = useEngine(bridge);
  const telemetry = useTelemetry(bridge);
  const { messages, addMessage, clearHistory } = useHistory(sessionFile);

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

  // Surface device fallback warning in the chat history and persist to config
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
      // Persist the corrected device so we don't hit this every restart
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

      const emitter = bridge.generate(prompt, params);
      setGenerationEmitter(emitter);

      emitter.on('token', (text) => {
        setCurrentResponse((prev) => prev + text);
      });

      emitter.on('done', (stats) => {
        setCurrentResponse((prev) => {
          if (prev) addMessage('assistant', prev);
          return '';
        });
        setIsGenerating(false);
        setGenerationEmitter(null);
      });

      emitter.on('error', (payload) => {
        const hint = ERROR_HINTS[payload.code] || ERROR_HINTS.UNKNOWN;
        const hfHint =
          payload.code === 'MODEL_NOT_FOUND' &&
          !process.env.HF_TOKEN &&
          !process.env.HUGGING_FACE_HUB_TOKEN
            ? ' Set HF_TOKEN in your shell environment for gated models.'
            : '';
        addMessage('assistant', `⚠ Error: ${payload.message || 'Unknown error'}. ${hint}${hfHint}`);
        setCurrentResponse('');
        setIsGenerating(false);
        setGenerationEmitter(null);
      });

      emitter.on('interrupted', () => {
        setCurrentResponse((prev) => {
          if (prev) addMessage('assistant', prev + ' [interrupted]');
          return '';
        });
        setIsGenerating(false);
        setGenerationEmitter(null);
      });
    },
    [bridge, engine.status, params, addMessage, telemetry]
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

  // Handle restart on engine crash
  const handleRestart = useCallback(async () => {
    try {
      await bridge.start();
      if (config.model_id) {
        engine.loadModel(config.model_id, config.device);
      }
    } catch {
      // Error will be surfaced by useEngine
    }
  }, [bridge, config, engine]);

  // Global key bindings
  useInput(
    (input, key) => {
      if (key.tab) {
        setFocusedPane((prev) => (prev === 'chat' ? 'params' : 'chat'));
        return;
      }

      if (input === 'q' && !isGenerating && focusedPane !== 'params') {
        bridge.shutdown().then(() => exit());
        return;
      }

      if (input === 'r' && engine.status === 'error') {
        handleRestart();
        return;
      }
    },
    { isActive: focusedPane === 'chat' && !isGenerating }
  );

  // First-run model selection
  if (needsModelInput) {
    return <ModelInputView onConfirm={handleModelConfirm} device={config.device} />;
  }

  const modelId = config.model_id || engine.modelInfo?.model_id || null;
  const device = engine.modelInfo?.device || config.device;
  const isCpu = device === 'cpu';
  const isLoadingModel = engine.status === 'loading_model';

  return (
    <Box flexDirection="column">
      <Box flexGrow={1} flexDirection="row">
        <Box flexGrow={3} flexDirection="column">
          <ChatPane
            messages={messages}
            currentResponse={currentResponse}
            isGenerating={isGenerating}
            sessionFile={sessionFile}
          />
          <InputBar
            onSubmit={handleSubmit}
            onAbort={handleAbort}
            isGenerating={isGenerating}
            modelReady={engine.status === 'ready'}
          />
        </Box>
        <Box flexGrow={1} flexDirection="column">
          <TelemetryPane telemetry={telemetry} />
          <ParamsPanel
            params={params}
            isFocused={focusedPane === 'params'}
            onParamsChange={handleParamsChange}
          />
        </Box>
      </Box>
      {isLoadingModel && (
        <DownloadBar
          downloadProgress={engine.downloadProgress}
          stage={engine.loadStage}
        />
      )}
      {isCpu && !isLoadingModel && (
        <Box paddingX={1}>
          <Text color="yellow" bold>
            ⚠  Running on CPU — generation will be very slow
          </Text>
        </Box>
      )}
      <StatusBar
        modelId={modelId}
        device={device}
        status={engine.status}
      />
    </Box>
  );
}

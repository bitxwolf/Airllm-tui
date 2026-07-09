import { useState, useEffect, useCallback, useRef } from 'react';

export function useEngine(bridge) {
  const [status, setStatus] = useState('idle');
  const [modelInfo, setModelInfo] = useState(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStage, setLoadStage] = useState('');
  const [lastError, setLastError] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [deviceFallback, setDeviceFallback] = useState(null);

  // Track status in a ref so onToken doesn't cause needless re-renders
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    if (!bridge) return;

    const onModelLoading = (payload) => {
      setStatus('loading_model');
      setLoadProgress(payload.progress || 0);
      setLoadStage(payload.stage || 'Loading…');
    };

    const onDownloadProgress = (payload) => {
      setDownloadProgress({
        percent: payload.percent || 0,
        downloadedBytes: payload.downloaded_bytes || 0,
        totalBytes: payload.total_bytes || 0,
        files: payload.files || 0,
      });
    };

    const onModelReady = (payload) => {
      setStatus('ready');
      setModelInfo(payload);
      setLoadProgress(1);
      setLoadStage('Model loaded');
      setDownloadProgress(null);
      setDeviceFallback(null);
    };

    const onDeviceFallback = (payload) => {
      setDeviceFallback(payload); // { requested, actual, reason }
    };

    const onToken = () => {
      // Only update status if not already generating — avoids a setState
      // call (and full re-render) on every single token received.
      if (statusRef.current !== 'generating') {
        setStatus('generating');
      }
    };

    const onGenerationDone = () => {
      setStatus('ready');
    };

    const onError = (payload) => {
      setLastError(payload.message || 'Unknown error');
      setStatus('error');
      setDownloadProgress(null);
    };

    const onInterrupted = () => {
      setStatus('ready');
    };

    const onExit = () => {
      setStatus('error');
      setLastError('The AI engine exited unexpectedly');
      setDownloadProgress(null);
    };

    bridge.on('model_loading', onModelLoading);
    bridge.on('download_progress', onDownloadProgress);
    bridge.on('device_fallback', onDeviceFallback);
    bridge.on('model_ready', onModelReady);
    bridge.on('token', onToken);
    bridge.on('generation_done', onGenerationDone);
    bridge.on('error', onError);
    bridge.on('interrupted', onInterrupted);
    bridge.on('exit', onExit);

    return () => {
      bridge.removeListener('model_loading', onModelLoading);
      bridge.removeListener('download_progress', onDownloadProgress);
      bridge.removeListener('device_fallback', onDeviceFallback);
      bridge.removeListener('model_ready', onModelReady);
      bridge.removeListener('token', onToken);
      bridge.removeListener('generation_done', onGenerationDone);
      bridge.removeListener('error', onError);
      bridge.removeListener('interrupted', onInterrupted);
      bridge.removeListener('exit', onExit);
    };
  }, [bridge]);

  const loadModel = useCallback(
    async (modelId, device, hfToken) => {
      if (!bridge) return;
      setStatus('loading_model');
      setLoadProgress(0);
      setLoadStage('Starting model load…');
      setLastError(null);
      setDownloadProgress(null);
      try {
        await bridge.loadModel(modelId, device, undefined, hfToken);
      } catch (err) {
        setStatus('error');
        setLastError(err.message);
      }
    },
    [bridge]
  );

  const generate = useCallback(
    async (prompt, params) => {
      if (!bridge) return null;
      setStatus('generating');
      setLastError(null);
      return bridge.generate(prompt, params);
    },
    [bridge]
  );

  const abort = useCallback(() => {
    if (!bridge) return;
    bridge.send('interrupt');
  }, [bridge]);

  return {
    status,
    modelInfo,
    loadProgress,
    loadStage,
    downloadProgress,
    deviceFallback,
    loadModel,
    generate,
    abort,
    lastError,
  };
}

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const INITIAL_TELEMETRY = {
  vramUsedGb: 0,
  vramTotalGb: 0,
  vramPercent: 0,
  tokensPerSec: 0,
  currentLayer: 0,
  totalLayers: 0,
  layerPercent: 0,
  elapsedMs: 0,
};

const TELEMETRY_THROTTLE_MS = 200;

export function useTelemetry(bridge) {
  const [telemetry, setTelemetry] = useState(INITIAL_TELEMETRY);
  const lastUpdateRef = useRef(0);
  const pendingRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!bridge) return;

    const applyUpdate = (data) => {
      setTelemetry(data);
      lastUpdateRef.current = Date.now();
      pendingRef.current = null;
    };

    const onTelemetry = (payload) => {
      const data = {
        vramUsedGb: payload.vram_used_gb || 0,
        vramTotalGb: payload.vram_total_gb || 0,
        vramPercent:
          payload.vram_total_gb > 0
            ? Math.round((payload.vram_used_gb / payload.vram_total_gb) * 100)
            : 0,
        tokensPerSec: payload.tokens_per_sec || 0,
        currentLayer: payload.current_layer || 0,
        totalLayers: payload.total_layers || 0,
        layerPercent:
          payload.total_layers > 0
            ? Math.round((payload.current_layer / payload.total_layers) * 100)
            : 0,
        elapsedMs: payload.elapsed_ms || 0,
      };

      const now = Date.now();
      const elapsed = now - lastUpdateRef.current;

      if (elapsed >= TELEMETRY_THROTTLE_MS) {
        applyUpdate(data);
      } else {
        // Stash the latest and schedule a flush
        pendingRef.current = data;
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (pendingRef.current) {
              applyUpdate(pendingRef.current);
            }
          }, TELEMETRY_THROTTLE_MS - elapsed);
        }
      }
    };

    const onGenerationDone = () => {
      // Flush any pending telemetry on generation end
      if (pendingRef.current) {
        setTelemetry(pendingRef.current);
        pendingRef.current = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    bridge.on('telemetry', onTelemetry);
    bridge.on('generation_done', onGenerationDone);

    return () => {
      bridge.removeListener('telemetry', onTelemetry);
      bridge.removeListener('generation_done', onGenerationDone);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [bridge]);

  const reset = useCallback(() => {
    setTelemetry(INITIAL_TELEMETRY);
  }, []);

  // Return a stable memoized object — only changes when telemetry data changes
  return useMemo(
    () => ({ ...telemetry, reset }),
    [telemetry, reset]
  );
}

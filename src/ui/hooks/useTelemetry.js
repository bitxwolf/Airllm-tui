import { useState, useEffect, useCallback } from 'react';

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

export function useTelemetry(bridge) {
  const [telemetry, setTelemetry] = useState(INITIAL_TELEMETRY);

  useEffect(() => {
    if (!bridge) return;

    const onTelemetry = (payload) => {
      setTelemetry({
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
      });
    };

    const onGenerationDone = () => {
      // Keep last telemetry values but stop updating
    };

    bridge.on('telemetry', onTelemetry);
    bridge.on('generation_done', onGenerationDone);

    return () => {
      bridge.removeListener('telemetry', onTelemetry);
      bridge.removeListener('generation_done', onGenerationDone);
    };
  }, [bridge]);

  const reset = useCallback(() => {
    setTelemetry(INITIAL_TELEMETRY);
  }, []);

  return { ...telemetry, reset };
}

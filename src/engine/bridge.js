import { EventEmitter } from 'node:events';
import { ProtocolParser, encode } from './protocol.js';
import { spawnPythonEngine } from './spawn.js';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { getDataDir } from '../utils/platform.js';

const DEBUG = process.argv.includes('--debug');

async function debugLog(direction, msg) {
  if (!DEBUG) return;
  const logDir = getDataDir();
  await mkdir(logDir, { recursive: true });
  const logPath = path.join(logDir, 'debug.log');
  const ts = new Date().toISOString();
  const line = `[${ts}] ${direction} ${JSON.stringify(msg)}\n`;
  await appendFile(logPath, line, 'utf-8').catch(() => {});
}

export class EngineBridge extends EventEmitter {
  constructor({ pythonExe, scriptPath }) {
    super();
    this._pythonExe = pythonExe;
    this._scriptPath = scriptPath;
    this._process = null;
    this._parser = null;
    this._heartbeatInterval = null;
    this._ready = false;
    this._stderrBuffer = '';
  }

  async start() {
    this._process = spawnPythonEngine(this._pythonExe, this._scriptPath);
    this._parser = new ProtocolParser(this._process.stdout);

    // Collect stderr for debug
    this._process.stderr.on('data', (chunk) => {
      this._stderrBuffer += chunk.toString();
      debugLog('STDERR', chunk.toString().trim());
    });

    // Wire up message handling
    this._parser.on('message', (msg) => {
      debugLog('RECV', msg);
      this._handleMessage(msg);
    });

    // Handle process exit
    this._process.on('exit', (code, signal) => {
      this._ready = false;
      this._stopHeartbeat();
      this.emit('exit', { code, signal, stderr: this._stderrBuffer });
    });

    this._process.on('error', (err) => {
      this.emit('error', { code: 'ENGINE_CRASH', message: err.message });
    });

    // Wait for responsiveness with ping/pong
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Engine failed to respond within 15 seconds'));
      }, 15000);

      const onPong = () => {
        clearTimeout(timeout);
        this._startHeartbeat();
        resolve();
      };

      this.once('_pong', onPong);
      this.send('ping');
    });
  }

  send(type, payload) {
    if (!this._process || this._process.exitCode !== null) return;
    const msg = payload ? { type, payload } : { type };
    debugLog('SEND', msg);
    try {
      this._process.stdin.write(encode(msg));
    } catch {
      // Process may have exited
    }
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case 'pong':
        this.emit('_pong');
        break;
      case 'model_loading':
        this.emit('model_loading', msg.payload);
        break;
      case 'model_ready':
        this._ready = true;
        this.emit('model_ready', msg.payload);
        break;
      case 'token':
        this.emit('token', msg.payload);
        break;
      case 'telemetry':
        this.emit('telemetry', msg.payload);
        break;
      case 'generation_done':
        this.emit('generation_done', msg.payload);
        break;
      case 'error':
        this.emit('error', msg.payload);
        break;
      case 'device_fallback':
        this.emit('device_fallback', msg.payload);
        break;
      case 'download_progress':
        this.emit('download_progress', msg.payload);
        break;
      case 'interrupted':
        this.emit('interrupted');
        break;
      case 'parse_error':
        debugLog('PARSE_ERROR', msg.raw);
        break;
      default:
        debugLog('UNKNOWN_MSG', msg);
        break;
    }
  }

  async loadModel(modelId, device, compression, hfToken) {
    return new Promise((resolve, reject) => {
      const onReady = (payload) => {
        cleanup();
        resolve(payload);
      };

      const onError = (payload) => {
        cleanup();
        reject(new Error(payload.message || 'Model loading failed'));
      };

      const onExit = ({ code, signal }) => {
        cleanup();
        reject(new Error(`Engine process exited unexpectedly (code: ${code}, signal: ${signal})`));
      };

      const cleanup = () => {
        this.removeListener('model_ready', onReady);
        this.removeListener('error', onError);
        this.removeListener('exit', onExit);
      };

      this.once('model_ready', onReady);
      this.once('error', onError);
      this.once('exit', onExit);

      this.send('load_model', {
        model_id: modelId,
        device: device || 'cpu',
        compression: compression || '4bit',
        hf_token: hfToken,
      });
    });
  }

  generate(prompt, params) {
    const emitter = new EventEmitter();

    const onToken = (payload) => emitter.emit('token', payload.text);
    const onTelemetry = (payload) => emitter.emit('telemetry', payload);
    const onDone = (payload) => {
      cleanup();
      emitter.emit('done', payload);
    };
    const onError = (payload) => {
      cleanup();
      emitter.emit('error', payload);
    };
    const onInterrupted = () => {
      cleanup();
      emitter.emit('interrupted');
    };
    const onExit = ({ code, signal }) => {
      cleanup();
      emitter.emit('error', {
        code: 'ENGINE_CRASH',
        message: `Engine process exited unexpectedly (code: ${code}, signal: ${signal})`
      });
    };

    const cleanup = () => {
      this.removeListener('token', onToken);
      this.removeListener('telemetry', onTelemetry);
      this.removeListener('generation_done', onDone);
      this.removeListener('error', onError);
      this.removeListener('interrupted', onInterrupted);
      this.removeListener('exit', onExit);
    };

    this.on('token', onToken);
    this.on('telemetry', onTelemetry);
    this.once('generation_done', onDone);
    this.once('error', onError);
    this.once('interrupted', onInterrupted);
    this.once('exit', onExit);

    emitter.abort = () => {
      this.send('interrupt');
    };

    this.send('generate', { prompt, params });

    return emitter;
  }

  async shutdown() {
    this._stopHeartbeat();

    if (!this._process || this._process.exitCode !== null) return;

    this.send('shutdown');

    return new Promise((resolve) => {
      const forceKillTimeout = setTimeout(() => {
        try {
          this._process.kill('SIGKILL');
        } catch {
          // already exited
        }
        resolve();
      }, 3000);

      this._process.on('exit', () => {
        clearTimeout(forceKillTimeout);
        resolve();
      });
    });
  }

  isReady() {
    return this._ready;
  }

  _startHeartbeat() {
    this._heartbeatInterval = setInterval(() => {
      this.send('ping');
    }, 5000);
  }

  _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }
}

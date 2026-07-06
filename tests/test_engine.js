import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

// Import from the compiled dist directory
import { check } from '../dist/setup/checker.js';
import { ensureVenv } from '../dist/setup/environment.js';
import { installDependencies } from '../dist/setup/installer.js';
import { getPythonExe, getPythonScriptPath } from '../dist/utils/platform.js';
import { EngineBridge } from '../dist/engine/bridge.js';

const LOG_DIR = path.resolve('tests', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'engine-test.log');

// Ensure parent log directory exists
fs.mkdirSync(LOG_DIR, { recursive: true });

// Initialize/clear log file
fs.writeFileSync(LOG_FILE, '', 'utf-8');

function log(message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  const line = `[${timestamp}] INFO: ${message} ${formattedArgs}`.trim();
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8');
}

function logError(message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  const line = `[${timestamp}] ERROR: ${message} ${formattedArgs}`.trim();
  console.error(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8');
}

async function runTest() {
  // Set PYTHONPATH env variable so python uses our mock_airllm
  process.env.PYTHONPATH = path.resolve('tests', 'mock_airllm');

  let bridge = null;
  let exitCode = 0;

  // Track event occurrences
  let modelLoadingEventsCount = 0;
  let modelReadyReceived = false;
  let tokenEventsCount = 0;
  let telemetryEventsCount = 0;
  let generationDoneReceived = false;
  const capturedTokens = [];

  try {
    log('--- STARTING ENGINE INTEGRATION TEST ---');

    // 1. Environment checks
    log('Performing environment checks...');
    const envInfo = await check();
    log('Environment check result:', envInfo);

    // 2. Setup / virtual environment creation
    log('Ensuring virtual environment exists...');
    await ensureVenv(envInfo.pythonExe, (progress) => {
      log('Venv creation:', progress);
    });

    // 3. Install dependencies
    log('Ensuring dependencies are installed...');
    await installDependencies((progress) => {
      log('Dependency installer:', progress);
    });

    // 4. Retrieve Python environment paths
    const pythonExe = getPythonExe();
    const scriptPath = getPythonScriptPath();
    log(`Detected Python executable: ${pythonExe}`);
    log(`Detected Python script path: ${scriptPath}`);

    // 5. Instantiating and starting the Engine Bridge
    log('Starting the Engine Bridge...');
    bridge = new EngineBridge({ pythonExe, scriptPath });

    // Set up event listeners on bridge for verification
    bridge.on('model_loading', (payload) => {
      modelLoadingEventsCount++;
      log('Received event [model_loading]:', payload);
    });

    bridge.on('model_ready', (payload) => {
      modelReadyReceived = true;
      log('Received event [model_ready]:', payload);
    });

    bridge.on('token', (payload) => {
      tokenEventsCount++;
      capturedTokens.push(payload.text);
      log('Received event [token]:', payload);
    });

    bridge.on('telemetry', (payload) => {
      telemetryEventsCount++;
      log('Received event [telemetry]:', payload);

      // Assert telemetry properties
      assert.ok('vram_used_gb' in payload, "Telemetry event payload missing 'vram_used_gb'");
      assert.ok('vram_total_gb' in payload, "Telemetry event payload missing 'vram_total_gb'");
      assert.ok('tokens_per_sec' in payload, "Telemetry event payload missing 'tokens_per_sec'");
      assert.ok('current_layer' in payload, "Telemetry event payload missing 'current_layer'");
      assert.ok('total_layers' in payload, "Telemetry event payload missing 'total_layers'");
      assert.ok('elapsed_ms' in payload, "Telemetry event payload missing 'elapsed_ms'");

      // Assert parameter types
      assert.strictEqual(typeof payload.vram_used_gb, 'number', 'vram_used_gb is not a number');
      assert.strictEqual(typeof payload.vram_total_gb, 'number', 'vram_total_gb is not a number');
      assert.strictEqual(typeof payload.tokens_per_sec, 'number', 'tokens_per_sec is not a number');
      assert.strictEqual(typeof payload.current_layer, 'number', 'current_layer is not a number');
      assert.strictEqual(typeof payload.total_layers, 'number', 'total_layers is not a number');
      assert.strictEqual(typeof payload.elapsed_ms, 'number', 'elapsed_ms is not a number');
    });

    bridge.on('generation_done', (payload) => {
      generationDoneReceived = true;
      log('Received event [generation_done]:', payload);
    });

    bridge.on('error', (payload) => {
      logError('Received event [error]:', payload);
    });

    bridge.on('exit', ({ code, signal, stderr }) => {
      log(`Bridge process exited with code ${code}, signal ${signal}`);
      if (stderr) {
        log(`Stderr output: ${stderr}`);
      }
    });

    await bridge.start();
    log('Engine Bridge started successfully and pinged.');

    // 6. Load Model
    const modelId = 'TinyLlama/TinyLlama-1.1B-Chat-v1.0';
    log(`Loading model: ${modelId} on device: ${envInfo.device || 'cpu'}...`);
    // Wait for the model_ready event (loadModel resolves on model_ready)
    await bridge.loadModel(modelId, envInfo.device || 'cpu', '4bit');
    log('Model loading complete.');

    // 7. Generate Response
    const prompt = 'Explain gravity in one sentence.';
    log(`Generating response for prompt: "${prompt}"`);
    const genParams = {
      temperature: 0.7,
      max_new_tokens: 30,
      top_p: 0.9,
    };

    const genEmitter = bridge.generate(prompt, genParams);

    // Wait for the generation to complete
    await new Promise((resolve, reject) => {
      genEmitter.once('done', (payload) => {
        log('Generation finished successfully via emitter done.');
        resolve();
      });
      genEmitter.once('error', (errPayload) => {
        reject(new Error(errPayload.message || 'Generation failed'));
      });
    });

    // 8. Assert all required events and outcomes
    log('Performing assertions...');
    
    assert.ok(modelLoadingEventsCount > 0, 'No model_loading events were received.');
    assert.ok(modelReadyReceived, 'No model_ready event was received.');
    assert.ok(tokenEventsCount > 0, 'No token events were received.');
    assert.ok(capturedTokens.length > 0, 'No tokens were captured in stream.');
    assert.ok(telemetryEventsCount > 0, 'No telemetry events were received.');
    assert.ok(generationDoneReceived, 'No generation_done event was received.');

    log(`Total model_loading events: ${modelLoadingEventsCount}`);
    log(`Captured Response: "${capturedTokens.join('')}"`);
    log(`Total telemetry events: ${telemetryEventsCount}`);

    log('--- ALL ASSERTIONS PASSED SUCCESSFULLY ---');
  } catch (err) {
    logError('Test execution failed!', err.stack || err);
    exitCode = 1;
  } finally {
    if (bridge) {
      log('Cleaning up: shutting down the Engine Bridge...');
      try {
        await bridge.shutdown();
        log('Engine Bridge shutdown complete.');
      } catch (shutdownErr) {
        logError('Error during Engine Bridge shutdown:', shutdownErr);
        exitCode = 1;
      }
    }
    log(`Test finished. Exiting with code ${exitCode}`);
    process.exit(exitCode);
  }
}

runTest();

import path from 'node:path';
import assert from 'node:assert';
import { check } from '../dist/setup/checker.js';
import { getPythonExe, getPythonScriptPath } from '../dist/utils/platform.js';
import { EngineBridge } from '../dist/engine/bridge.js';

async function testCrashHandling() {
  process.env.PYTHONPATH = path.resolve('tests', 'mock_airllm');

  const envInfo = await check();
  const pythonExe = getPythonExe();
  const scriptPath = getPythonScriptPath();

  console.log('Starting Engine Bridge for crash handling test...');
  const bridge = new EngineBridge({ pythonExe, scriptPath });

  await bridge.start();
  console.log('Bridge started. Initiating loadModel...');

  // We expect loadModel to reject when the process exits.
  // We'll set a timeout of 4 seconds. If loadModel hasn't settled, we fail the test.
  let loadModelSettled = false;
  let loadModelError = null;

  const loadPromise = bridge.loadModel('TinyLlama/TinyLlama-1.1B-Chat-v1.0', envInfo.device || 'cpu', '4bit')
    .then(() => {
      loadModelSettled = true;
    })
    .catch((err) => {
      loadModelSettled = true;
      loadModelError = err;
    });

  // Wait 1 second to make sure model loading has started, then kill the process
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log('Force-killing the python process...');
  bridge._process.kill('SIGKILL');

  // Now wait for the loadPromise to settle, with a 3 second timeout
  await Promise.race([
    loadPromise,
    new Promise((resolve) => setTimeout(resolve, 3000))
  ]);

  console.log('Shutting down bridge...');
  await bridge.shutdown();

  if (!loadModelSettled) {
    console.log('FAILURE: loadModel hung forever after python process exit.');
    process.exit(1);
  } else {
    console.log('SUCCESS: loadModel rejected successfully with error:', loadModelError?.message);
    process.exit(0);
  }
}

testCrashHandling().catch((err) => {
  console.error('Crash handling test failed to run:', err);
  process.exit(1);
});

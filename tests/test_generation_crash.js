import path from 'node:path';
import assert from 'node:assert';
import { check } from '../dist/setup/checker.js';
import { getPythonExe } from '../dist/utils/platform.js';
import { EngineBridge } from '../dist/engine/bridge.js';

async function testGenerationCrash() {
  process.env.PYTHONPATH = path.resolve('tests', 'mock_airllm');

  const envInfo = await check();
  const pythonExe = getPythonExe();
  const scriptPath = path.resolve('tests', 'mock_engine_slow.py');

  console.log('Starting Engine Bridge for generation crash test...');
  const bridge = new EngineBridge({ pythonExe, scriptPath });

  await bridge.start();
  console.log('Bridge started. Loading model...');

  await bridge.loadModel('TinyLlama/TinyLlama-1.1B-Chat-v1.0', envInfo.device || 'cpu', '4bit');
  console.log('Model loaded. Starting generation...');

  const prompt = 'Explain gravity in one sentence.';
  const genEmitter = bridge.generate(prompt, {
    temperature: 0.7,
    max_new_tokens: 100,
  });

  let genSettled = false;
  let genError = null;

  const genPromise = new Promise((resolve, reject) => {
    genEmitter.on('done', () => {
      genSettled = true;
      resolve();
    });
    genEmitter.on('error', (err) => {
      genSettled = true;
      genError = err;
      resolve();
    });
    genEmitter.on('interrupted', () => {
      genSettled = true;
      resolve();
    });
  });

  // Wait for the first token, then kill the python process immediately
  genEmitter.once('token', (token) => {
    console.log(`Received token: ${JSON.stringify(token)}. Killing process now...`);
    bridge._process.kill('SIGKILL');
  });

  // Now wait for the genPromise to settle, with a 3 second timeout
  await Promise.race([
    genPromise,
    new Promise((resolve) => setTimeout(resolve, 3000))
  ]);

  console.log('Shutting down bridge...');
  await bridge.shutdown();

  if (!genSettled) {
    console.log('FAILURE: Generation emitter hung forever after python process exit.');
    process.exit(1);
  } else {
    console.log('SUCCESS: Generation emitter settled successfully with error:', genError);
    process.exit(0);
  }
}

testGenerationCrash().catch((err) => {
  console.error('Generation crash test failed to run:', err);
  process.exit(1);
});

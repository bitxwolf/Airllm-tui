import path from 'node:path';
import assert from 'node:assert';
import { check } from '../dist/setup/checker.js';
import { getPythonExe } from '../dist/utils/platform.js';
import { EngineBridge } from '../dist/engine/bridge.js';

async function testInterruption() {
  process.env.PYTHONPATH = path.resolve('tests', 'mock_airllm');

  const envInfo = await check();
  const pythonExe = getPythonExe();
  const scriptPath = path.resolve('tests', 'mock_engine_slow.py');

  console.log('Starting Engine Bridge for interruption test...');
  const bridge = new EngineBridge({ pythonExe, scriptPath });

  bridge.on('exit', ({ code, signal, stderr }) => {
    console.log(`[Bridge Exit] code=${code}, signal=${signal}`);
  });

  await bridge.start();
  console.log('Bridge started. Loading model...');

  await bridge.loadModel('TinyLlama/TinyLlama-1.1B-Chat-v1.0', envInfo.device || 'cpu', '4bit');
  console.log('Model loaded. Starting generation...');

  const prompt = 'Explain gravity in one sentence.';
  const genEmitter = bridge.generate(prompt, {
    temperature: 0.7,
    max_new_tokens: 100,
  });

  let tokensReceived = 0;
  let gotInterruptedEvent = false;
  let gotDoneEvent = false;

  await new Promise((resolve, reject) => {
    genEmitter.on('token', (token) => {
      tokensReceived++;
      console.log(`Received token: ${JSON.stringify(token)}`);
      
      // Interrupt on the very first token
      if (tokensReceived === 1) {
        console.log('Calling abort() now...');
        genEmitter.abort();
      }
    });

    genEmitter.once('interrupted', () => {
      console.log('SUCCESS: Received interrupted event from emitter!');
      gotInterruptedEvent = true;
      resolve();
    });

    genEmitter.once('done', (payload) => {
      console.log('WARNING/FAILURE: Received done event instead of interrupted!', payload);
      gotDoneEvent = true;
      resolve();
    });

    genEmitter.once('error', (err) => {
      console.log('Received error event:', err);
      reject(err);
    });

    // Timeout fallback after 6 seconds (enough for multiple tokens to generate if not interrupted)
    setTimeout(() => {
      resolve();
    }, 6000);
  });

  console.log('Shutting down bridge...');
  await bridge.shutdown();
  console.log('Bridge shut down.');

  assert.ok(gotInterruptedEvent, 'Should have received interrupted event');
  assert.ok(!gotDoneEvent, 'Should NOT have received done event');
  console.log('Interruption test PASSED.');
}

testInterruption().catch((err) => {
  console.error('Interruption test FAILED:', err);
  process.exit(1);
});

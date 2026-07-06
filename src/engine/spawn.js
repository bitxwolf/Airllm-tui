import { spawn } from 'node:child_process';
import { platform } from 'node:os';

export function spawnPythonEngine(pythonExe, scriptPath) {
  const isWin = platform() === 'win32';

  const env = {
    ...process.env,
    PYTHONUNBUFFERED: '1',
  };

  // Pass HuggingFace tokens if available
  if (process.env.HF_TOKEN) {
    env.HF_TOKEN = process.env.HF_TOKEN;
  }
  if (process.env.HUGGING_FACE_HUB_TOKEN) {
    env.HUGGING_FACE_HUB_TOKEN = process.env.HUGGING_FACE_HUB_TOKEN;
  }

  if (isWin) {
    env.PYTHONIOENCODING = 'utf-8';
  }

  const child = spawn(pythonExe, [scriptPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false,
    windowsHide: isWin,
    env,
  });

  return child;
}

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { getVenvDir, getDataDir, getPythonExe } from '../utils/platform.js';

export class VenvCreationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VenvCreationError';
    this.code = 'VENV_FAILED';
  }
}

export async function ensureVenv(systemPythonExe, onProgress) {
  const venvDir = getVenvDir();
  const venvPythonExe = getPythonExe();

  // Check if venv already exists
  if (existsSync(venvPythonExe)) {
    onProgress({ stage: 'Venv already exists', done: true });
    return;
  }

  // Create parent directories
  await mkdir(getDataDir(), { recursive: true });

  onProgress({ stage: 'Creating virtual environment…', done: false });

  return new Promise((resolve, reject) => {
    const proc = spawn(systemPythonExe, ['-m', 'venv', venvDir], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l) => l.trim());
      for (const line of lines) {
        onProgress({ stage: line.trim(), done: false });
      }
    });

    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l) => l.trim());
      for (const line of lines) {
        onProgress({ stage: line.trim(), done: false });
      }
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(
          new VenvCreationError(
            `Could not create Python virtual environment (exit code ${code}). Check available disk space.`
          )
        );
      } else {
        onProgress({ stage: 'Virtual environment created', done: true });
        resolve();
      }
    });

    proc.on('error', (err) => {
      reject(
        new VenvCreationError(
          `Failed to spawn Python for venv creation: ${err.message}`
        )
      );
    });
  });
}

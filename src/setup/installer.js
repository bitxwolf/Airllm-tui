import { spawn } from 'node:child_process';
import { getCudaWheelIndex, detectNvidiaDriver } from '../utils/cuda.js';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getPythonExe, getVenvDir, detectDevice } from '../utils/platform.js';

export class InstallError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InstallError';
    this.code = 'INSTALL_FAILED';
  }
}

function runPip(pythonExe, args, onProgress, label) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonExe, ['-m', 'pip', 'install', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let outputBuffer = '';

    function processLine(line) {
      const trimmed = line.trim();
      if (!trimmed) return;

      let percent = -1;

      // Try to parse pip download progress
      const pctMatch = trimmed.match(/(\d+)%/);
      if (pctMatch) {
        percent = parseInt(pctMatch[1], 10);
      } else if (trimmed.toLowerCase().includes('downloading')) {
        percent = 25;
      } else if (trimmed.toLowerCase().includes('installing')) {
        percent = 75;
      } else if (trimmed.toLowerCase().includes('successfully installed')) {
        percent = 100;
      }

      onProgress({
        package: label,
        percent: percent >= 0 ? percent : -1,
        line: trimmed,
      });
    }

    proc.stdout.on('data', (data) => {
      outputBuffer += data.toString();
      const lines = outputBuffer.split('\n');
      outputBuffer = lines.pop() || '';
      for (const line of lines) {
        processLine(line);
      }
    });

    proc.stderr.on('data', (data) => {
      outputBuffer += data.toString();
      const lines = outputBuffer.split('\n');
      outputBuffer = lines.pop() || '';
      for (const line of lines) {
        processLine(line);
      }
    });

    proc.on('close', (code) => {
      if (outputBuffer.trim()) processLine(outputBuffer);
      if (code !== 0) {
        reject(
          new InstallError(
            `pip install failed for ${label} (exit code ${code}). Check your internet connection.`
          )
        );
      } else {
        resolve();
      }
    });

    proc.on('error', (err) => {
      reject(
        new InstallError(
          `Failed to run pip for ${label}: ${err.message}`
        )
      );
    });
  });
}



export async function installDependencies(onProgress) {
  const venvDir = getVenvDir();
  const markerFile = path.join(venvDir, '.airllm_deps_installed');

  // Check marker file
  if (existsSync(markerFile)) {
    onProgress({
      package: 'all',
      percent: 100,
      line: 'Dependencies already installed',
    });
    return;
  }

  const pythonExe = getPythonExe();
  const device = await detectDevice();

  // Upgrade pip first
  onProgress({ package: 'pip', percent: 0, line: 'Upgrading pip…' });
  await runPip(pythonExe, ['--upgrade', 'pip'], onProgress, 'pip');

  // Install torch with the right CUDA wheel
  onProgress({ package: 'torch', percent: 0, line: 'Installing PyTorch…' });
  if (device === 'cuda') {
    const driverVersion = await detectNvidiaDriver();
    const wheelIndex = getCudaWheelIndex(driverVersion);

    onProgress({
      package: 'torch',
      percent: 5,
      line: driverVersion
        ? `Detected driver ${driverVersion} → using ${wheelIndex || 'default PyPI'}`
        : 'Could not detect driver version, using default PyPI',
    });

    let installed = false;
    if (wheelIndex) {
      try {
        await runPip(
          pythonExe,
          ['torch', 'torchvision', '--index-url', wheelIndex],
          onProgress,
          'torch'
        );
        installed = true;
      } catch {
        onProgress({ package: 'torch', percent: 0, line: `${wheelIndex} failed, trying cu121 fallback…` });
      }
    }

    // Fallback chain: cu121 → cu118 → default PyPI
    if (!installed) {
      const fallbacks = [
        'https://download.pytorch.org/whl/cu121',
        'https://download.pytorch.org/whl/cu118',
      ];
      for (const fb of fallbacks) {
        try {
          await runPip(pythonExe, ['torch', 'torchvision', '--index-url', fb], onProgress, 'torch');
          installed = true;
          break;
        } catch {
          onProgress({ package: 'torch', percent: 0, line: `${fb} failed, trying next…` });
        }
      }
    }

    if (!installed) {
      onProgress({ package: 'torch', percent: 0, line: 'All CUDA indexes failed, installing CPU-only torch…' });
      await runPip(pythonExe, ['torch', 'torchvision'], onProgress, 'torch');
    }
  } else {
    await runPip(pythonExe, ['torch', 'torchvision'], onProgress, 'torch');
  }

  // Install AI dependencies
  onProgress({ package: 'airllm', percent: 0, line: 'Installing AI dependencies…' });
  await runPip(
    pythonExe,
    ['airllm', 'bitsandbytes', 'transformers', 'accelerate'],
    onProgress,
    'airllm'
  );

  // Write marker file
  await writeFile(markerFile, new Date().toISOString(), 'utf-8');
  onProgress({ package: 'all', percent: 100, line: 'All dependencies installed' });
}

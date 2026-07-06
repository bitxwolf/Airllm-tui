import { homedir, platform, arch } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { access, constants } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getOS() {
  return platform();
}

export function getVenvDir() {
  return path.join(homedir(), '.airllm-tui', '.venv');
}

export function getDataDir() {
  return path.join(homedir(), '.airllm-tui');
}

export function getHistoryDir() {
  return path.join(getDataDir(), 'history');
}

export function getConfigPath() {
  return path.join(getDataDir(), 'config.json');
}

export function getPythonExe() {
  const venvDir = getVenvDir();
  if (platform() === 'win32') {
    return path.join(venvDir, 'Scripts', 'python.exe');
  }
  return path.join(venvDir, 'bin', 'python3');
}

export function getPythonScriptPath() {
  return path.resolve(__dirname, '..', '..', 'python', 'engine.py');
}

export async function detectDevice(pythonExe = null) {
  // If pythonExe is provided, check if PyTorch is installed and has CUDA/MPS available
  if (pythonExe) {
    try {
      const { stdout } = await execCommand(pythonExe, [
        '-c',
        'import torch; print("cuda" if torch.cuda.is_available() else "mps" if hasattr(torch.backends, "mps") and torch.backends.mps.is_available() else "cpu")'
      ]);
      const detected = stdout.trim();
      if (['cuda', 'mps', 'cpu'].includes(detected)) {
        return detected;
      }
    } catch {
      // torch not installed yet, or execution failed. Fallback to system-level check.
    }
  }

  // Try CUDA via nvidia-smi
  try {
    await new Promise((resolve, reject) => {
      execFile('nvidia-smi', [], { timeout: 5000 }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    return 'cuda';
  } catch {
    // nvidia-smi not found or failed
  }

  // Try MPS (macOS Apple Silicon)
  if (platform() === 'darwin' && arch() === 'arm64') {
    return 'mps';
  }

  return 'cpu';
}

export class NoPythonError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoPythonError';
    this.code = 'NO_PYTHON';
  }
}

function execCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function parseVersion(versionStr) {
  const match = versionStr.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw: match[0],
  };
}

export async function findSystemPython() {
  const os = getOS();
  const candidates = os === 'win32'
    ? ['python', 'python3']
    : ['python3', 'python'];

  for (const exe of candidates) {
    try {
      const { stdout } = await execCommand(exe, ['--version']);
      const version = parseVersion(stdout);
      if (version && (version.major > 3 || (version.major === 3 && version.minor >= 8))) {
        return { exe, version: version.raw };
      }
    } catch {
      // candidate not found, try next
    }
  }

  throw new NoPythonError(
    'Python 3.8+ is required but was not found on your system. '
    + 'Install it from https://python.org and ensure it is on your PATH.'
  );
}

import { execFile } from 'node:child_process';

/**
 * Map NVIDIA driver version to the best PyTorch CUDA wheel index URL.
 * @param {string|null} driverVersion - NVIDIA driver version string (e.g., '555.42')
 * @returns {string|null} PyTorch wheel index URL, or null if unknown
 */
export function getCudaWheelIndex(driverVersion) {
  if (!driverVersion) return null;
  const major = parseInt(driverVersion.split('.')[0], 10);
  if (isNaN(major)) return null;

  if (major >= 570) return 'https://download.pytorch.org/whl/cu128';
  if (major >= 520) return 'https://download.pytorch.org/whl/cu121';
  if (major >= 450) return 'https://download.pytorch.org/whl/cu118';
  return null;
}

/**
 * CUDA wheel fallback chain — tried in order when the primary wheel fails.
 */
export const CUDA_FALLBACK_URLS = [
  'https://download.pytorch.org/whl/cu121',
  'https://download.pytorch.org/whl/cu118',
];

/**
 * Detect the NVIDIA driver version via nvidia-smi.
 * @returns {Promise<string|null>} Driver version string, or null if not available
 */
export async function detectNvidiaDriver() {
  return new Promise((resolve) => {
    execFile(
      'nvidia-smi',
      ['--query-gpu=driver_version', '--format=csv,noheader'],
      { timeout: 5000 },
      (err, stdout) => {
        if (err) { resolve(null); return; }
        resolve(stdout.trim().split('\n')[0].trim() || null);
      }
    );
  });
}

/**
 * Detect the GPU name via nvidia-smi.
 * @returns {Promise<string|null>} GPU name, or null if not available
 */
export async function detectGpuName() {
  return new Promise((resolve) => {
    execFile(
      'nvidia-smi',
      ['--query-gpu=name', '--format=csv,noheader'],
      { timeout: 5000 },
      (err, stdout) => {
        if (err) { resolve(null); return; }
        resolve(stdout.trim().split('\n')[0].trim() || null);
      }
    );
  });
}

/**
 * Detect CUDA version from nvidia-smi header output.
 * @returns {Promise<string|null>} CUDA version string, or null
 */
export async function detectCudaVersion() {
  return new Promise((resolve) => {
    execFile('nvidia-smi', [], { timeout: 5000 }, (err, stdout) => {
      if (err) { resolve(null); return; }
      const match = stdout.match(/CUDA Version:\s*([\d.]+)/);
      resolve(match ? match[1] : null);
    });
  });
}

/**
 * Check if PyTorch has CUDA support by running a Python snippet.
 * @param {string} pythonExe - Path to the Python executable
 * @returns {Promise<{available: boolean, cudaVersion: string|null, gpuName: string|null}>}
 */
export async function checkPytorchCuda(pythonExe) {
  return new Promise((resolve) => {
    const script = `
import json, sys
try:
    import torch
    info = {
        "available": torch.cuda.is_available(),
        "cuda_version": torch.version.cuda,
        "torch_version": torch.__version__,
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
    }
except ImportError:
    info = {"available": False, "cuda_version": None, "torch_version": None, "gpu_name": None, "gpu_count": 0, "error": "torch_not_installed"}
except Exception as e:
    info = {"available": False, "cuda_version": None, "torch_version": None, "gpu_name": None, "gpu_count": 0, "error": str(e)}
print(json.dumps(info))
`;
    execFile(pythonExe, ['-c', script], { timeout: 15000 }, (err, stdout) => {
      if (err) {
        resolve({ available: false, cudaVersion: null, torchVersion: null, gpuName: null, gpuCount: 0 });
        return;
      }
      try {
        const info = JSON.parse(stdout.trim());
        resolve({
          available: info.available,
          cudaVersion: info.cuda_version,
          torchVersion: info.torch_version,
          gpuName: info.gpu_name,
          gpuCount: info.gpu_count,
          error: info.error || null,
        });
      } catch {
        resolve({ available: false, cudaVersion: null, torchVersion: null, gpuName: null, gpuCount: 0 });
      }
    });
  });
}

/**
 * airllm-tui doctor — System diagnostic and auto-fix tool.
 *
 * Usage:
 *   airllm-tui doctor          Run full diagnostic
 *   airllm-tui doctor --fix    Auto-fix common issues (CUDA, venv, etc.)
 */

import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import path from 'node:path';
import {
  findSystemPython,
  getPythonExe,
  getVenvDir,
  getDataDir,
  detectDevice,
} from './utils/platform.js';
import {
  getCudaWheelIndex,
  CUDA_FALLBACK_URLS,
  detectNvidiaDriver,
  detectGpuName,
  detectCudaVersion,
  checkPytorchCuda,
} from './utils/cuda.js';

// ── Formatting helpers ──────────────────────────────────────────────────────

const PASS = chalk.green('✅');
const FAIL = chalk.red('❌');
const WARN = chalk.yellow('⚠️');
const SKIP = chalk.dim('⏭️');

function padLabel(label, width = 16) {
  return label.padEnd(width);
}

function printHeader(title) {
  console.log();
  console.log(chalk.cyan.bold(`🔍 AirLLM TUI — ${title}`));
  console.log(chalk.cyan('═'.repeat(45)));
  console.log();
}

function printFixBox(lines) {
  const maxLen = Math.max(...lines.map((l) => l.length));
  const border = '─'.repeat(maxLen + 4);
  console.log(chalk.yellow(`   ╭${border}╮`));
  for (const line of lines) {
    console.log(chalk.yellow(`   │  ${line.padEnd(maxLen + 2)}│`));
  }
  console.log(chalk.yellow(`   ╰${border}╯`));
}

// ── Check functions ─────────────────────────────────────────────────────────

async function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  const ok = major >= 18;
  console.log(
    `${ok ? PASS : FAIL} ${padLabel('Node.js')} ${version} ${ok ? '' : chalk.red('(>=18 required)')}`
  );
  return ok;
}

async function checkPython() {
  try {
    const { exe, version } = await findSystemPython();
    console.log(`${PASS} ${padLabel('Python')} ${version} (${exe})`);
    return { ok: true, exe, version };
  } catch {
    console.log(`${FAIL} ${padLabel('Python')} ${chalk.red('Not found — install from https://python.org')}`);
    return { ok: false, exe: null, version: null };
  }
}

async function checkVenv() {
  const venvDir = getVenvDir();
  const pythonExe = getPythonExe();
  if (existsSync(pythonExe)) {
    console.log(`${PASS} ${padLabel('Venv')} ${venvDir}`);
    return { ok: true, pythonExe };
  }
  console.log(`${WARN} ${padLabel('Venv')} Not created yet (will be created on first run)`);
  return { ok: false, pythonExe: null };
}

async function checkNvidiaDriver() {
  const driver = await detectNvidiaDriver();
  if (driver) {
    console.log(`${PASS} ${padLabel('NVIDIA Driver')} ${driver}`);
    return { ok: true, driver };
  }
  console.log(`${SKIP} ${padLabel('NVIDIA Driver')} Not found (no NVIDIA GPU, or drivers not installed)`);
  return { ok: false, driver: null };
}

async function checkNvidiaSmi() {
  const cuda = await detectCudaVersion();
  if (cuda) {
    console.log(`${PASS} ${padLabel('CUDA (driver)')} ${cuda}`);
    return { ok: true, cuda };
  }
  console.log(`${SKIP} ${padLabel('CUDA (driver)')} Not detected`);
  return { ok: false, cuda: null };
}

async function checkGpuName() {
  const name = await detectGpuName();
  if (name) {
    console.log(`${PASS} ${padLabel('GPU')} ${name}`);
    return name;
  }
  console.log(`${SKIP} ${padLabel('GPU')} Not detected`);
  return null;
}

async function checkPytorch(pythonExe) {
  if (!pythonExe) {
    console.log(`${SKIP} ${padLabel('PyTorch')} Skipped (no venv)`);
    return { ok: false, info: null };
  }

  const info = await checkPytorchCuda(pythonExe);

  if (info.error === 'torch_not_installed') {
    console.log(`${WARN} ${padLabel('PyTorch')} Not installed yet (will be installed on first run)`);
    return { ok: false, info };
  }

  if (info.torchVersion) {
    const cudaSuffix = info.cudaVersion ? `+cu${info.cudaVersion.replace('.', '')}` : ' (CPU-only)';
    const icon = info.available ? PASS : (info.cudaVersion ? WARN : FAIL);
    console.log(`${icon} ${padLabel('PyTorch')} ${info.torchVersion}${info.cudaVersion ? '' : cudaSuffix}`);
  }

  if (info.available) {
    console.log(
      `${PASS} ${padLabel('torch.cuda')} Available ✓ ${info.gpuName ? `(${info.gpuName})` : ''}`
    );
  } else if (info.cudaVersion === null && info.torchVersion) {
    console.log(
      `${FAIL} ${padLabel('torch.cuda')} ${chalk.red('Not available — CPU-only PyTorch installed')}`
    );
  } else if (info.torchVersion) {
    console.log(
      `${FAIL} ${padLabel('torch.cuda')} ${chalk.red('Not available (CUDA mismatch?)')}`
    );
  }

  return { ok: info.available, info };
}

async function checkAirllm(pythonExe) {
  if (!pythonExe) {
    console.log(`${SKIP} ${padLabel('AirLLM')} Skipped (no venv)`);
    return false;
  }

  return new Promise((resolve) => {
    execFile(
      pythonExe,
      ['-c', 'import airllm; print(airllm.__version__)'],
      { timeout: 10000 },
      (err, stdout) => {
        if (err) {
          console.log(`${WARN} ${padLabel('AirLLM')} Not installed yet`);
          resolve(false);
        } else {
          console.log(`${PASS} ${padLabel('AirLLM')} ${stdout.trim()}`);
          resolve(true);
        }
      }
    );
  });
}

async function checkDiskSpace() {
  const dataDir = getDataDir();
  try {
    const { execSync } = await import('node:child_process');
    const os = (await import('node:os')).default;

    if (os.platform() === 'win32') {
      const drive = dataDir.charAt(0);
      try {
        const output = execSync(
          `powershell -NoProfile -Command "(Get-PSDrive ${drive}).Free"`,
          { timeout: 5000 }
        ).toString().trim();
        const freeBytes = parseInt(output, 10);
        if (!isNaN(freeBytes)) {
          const freeGB = freeBytes / (1024 ** 3);
          const icon = freeGB > 10 ? PASS : (freeGB > 2 ? WARN : FAIL);
          console.log(`${icon} ${padLabel('Disk Space')} ${freeGB.toFixed(1)} GB free on ${drive}:`);
          return;
        }
      } catch {
        // PowerShell not available, fall through
      }
    } else {
      const output = execSync(`df -BG "${dataDir}" 2>/dev/null || df -g "${dataDir}" 2>/dev/null`, {
        timeout: 5000,
      }).toString();
      const lines = output.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        const available = parts[3] || 'unknown';
        console.log(`${PASS} ${padLabel('Disk Space')} ${available} free`);
        return;
      }
    }
  } catch {
    // fallthrough
  }
  console.log(`${SKIP} ${padLabel('Disk Space')} Could not determine`);
}

// ── Main diagnostic ─────────────────────────────────────────────────────────

export async function runDoctor() {
  printHeader('Environment Diagnostic');

  let allGood = true;

  // Node.js
  const nodeOk = await checkNodeVersion();
  if (!nodeOk) allGood = false;

  // Python
  const python = await checkPython();
  if (!python.ok) allGood = false;

  // Venv
  const venv = await checkVenv();

  // NVIDIA driver & GPU
  const driver = await checkNvidiaDriver();
  const cuda = await checkNvidiaSmi();
  const gpuName = await checkGpuName();

  // PyTorch
  const pytorch = await checkPytorch(venv.pythonExe);

  // AirLLM
  await checkAirllm(venv.pythonExe);

  // Disk Space
  await checkDiskSpace();

  // Summary
  console.log();

  // Detect the main problem scenario: NVIDIA GPU present but PyTorch has no CUDA
  const hasGpu = driver.ok;
  const torchHasCuda = pytorch.ok;
  const torchInstalled = pytorch.info && pytorch.info.torchVersion;

  if (hasGpu && torchInstalled && !torchHasCuda) {
    allGood = false;
    console.log(chalk.red.bold('⚠  Problem detected: GPU available but PyTorch has no CUDA support'));
    console.log();
    printFixBox([
      'FIX: Your PyTorch doesn\'t include CUDA support.',
      '',
      'Run this command to fix it automatically:',
      '',
      '  airllm-tui doctor --fix',
      '',
      'Or manually reinstall PyTorch from:',
      '  https://pytorch.org/get-started/locally/',
    ]);
    console.log();
  } else if (allGood) {
    console.log(chalk.green.bold('🎉 Everything looks good! Run `airllm-tui` to start.'));
  } else {
    console.log(chalk.yellow.bold('⚠  Some issues detected. See above for details.'));
  }

  console.log();
}

// ── Auto-fix ────────────────────────────────────────────────────────────────

function runPipCommand(pythonExe, args, label) {
  return new Promise((resolve, reject) => {
    console.log(chalk.dim(`      Running: ${pythonExe} -m pip ${args.join(' ')}`));
    const proc = spawn(pythonExe, ['-m', 'pip', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let output = '';
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.stderr.on('data', (d) => { output += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${label} failed (exit ${code}):\n${output.slice(-500)}`));
      } else {
        resolve(output);
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`${label} error: ${err.message}`));
    });
  });
}

export async function runFix() {
  printHeader('Auto-Fix');

  // Step 1: Check GPU
  console.log(chalk.bold('[1/4] Detecting GPU...'));
  const driverVersion = await detectNvidiaDriver();
  const gpuName = await detectGpuName();

  if (!driverVersion) {
    console.log(chalk.red('      No NVIDIA GPU/driver detected.'));
    console.log(chalk.red('      Install drivers from https://nvidia.com/drivers'));
    console.log(chalk.red('      Then run this command again.'));
    process.exit(1);
  }
  console.log(chalk.green(`      ${gpuName || 'NVIDIA GPU'} | Driver ${driverVersion}`));
  console.log();

  // Step 2: Check venv
  const pythonExe = getPythonExe();
  if (!existsSync(pythonExe)) {
    console.log(chalk.yellow('      Venv not found. Run `airllm-tui` first to create it,'));
    console.log(chalk.yellow('      then run `airllm-tui doctor --fix` again.'));
    process.exit(1);
  }

  // Step 3: Uninstall CPU-only PyTorch
  console.log(chalk.bold('[2/4] Removing CPU-only PyTorch...'));
  try {
    await runPipCommand(pythonExe, ['uninstall', 'torch', 'torchvision', '-y'], 'uninstall');
    console.log(chalk.green('      ✓ Uninstalled torch, torchvision'));
  } catch {
    console.log(chalk.yellow('      Skipped (not installed or already removed)'));
  }
  console.log();

  // Step 4: Install correct CUDA PyTorch
  console.log(chalk.bold('[3/4] Installing CUDA-enabled PyTorch...'));
  const wheelIndex = getCudaWheelIndex(driverVersion);
  const indexUrl = wheelIndex || CUDA_FALLBACK_URLS[0];
  console.log(chalk.dim(`      Using: ${indexUrl}`));

  let installed = false;
  const urls = [indexUrl, ...CUDA_FALLBACK_URLS.filter((u) => u !== indexUrl)];

  for (const url of urls) {
    try {
      await runPipCommand(
        pythonExe,
        ['install', 'torch', 'torchvision', '--index-url', url],
        'install torch'
      );
      console.log(chalk.green(`      ✓ Installed PyTorch from ${url}`));
      installed = true;
      break;
    } catch (err) {
      console.log(chalk.yellow(`      ${url} failed, trying next...`));
    }
  }

  if (!installed) {
    console.log(chalk.red('      ✗ All CUDA wheel sources failed.'));
    console.log(chalk.red('      Visit https://pytorch.org/get-started/locally/ for manual install.'));
    process.exit(1);
  }

  // Remove the deps marker so the TUI re-validates on next launch
  const markerFile = path.join(getVenvDir(), '.airllm_deps_installed');
  try {
    await unlink(markerFile);
  } catch {
    // doesn't exist — that's fine
  }

  console.log();

  // Step 5: Verify
  console.log(chalk.bold('[4/4] Verifying...'));
  const torchInfo = await checkPytorchCuda(pythonExe);

  if (torchInfo.available) {
    console.log(chalk.green(`      torch.cuda.is_available() = True ✓`));
    if (torchInfo.gpuName) {
      console.log(chalk.green(`      GPU: ${torchInfo.gpuName}`));
    }
    console.log();
    console.log(chalk.green.bold('🎉 Fixed! Run `airllm-tui` to start with GPU acceleration.'));
  } else {
    console.log(chalk.red(`      torch.cuda.is_available() = False ✗`));
    console.log();
    console.log(chalk.red('      Auto-fix did not resolve the issue.'));
    console.log(chalk.red('      Visit https://pytorch.org/get-started/locally/ for manual install.'));
    console.log(chalk.red('      Or open an issue: https://github.com/AirLLM/airllm-tui/issues'));
    process.exit(1);
  }

  console.log();
}

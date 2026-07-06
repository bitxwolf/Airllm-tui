#!/usr/bin/env node

import chalk from 'chalk';

const args = process.argv.slice(2);
const command = args[0];

// ── Subcommand routing ──────────────────────────────────────────────────────

if (command === '--version' || command === '-v') {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const pkg = require('../package.json');
  console.log(`airllm-tui v${pkg.version}`);
  process.exit(0);
}

if (command === '--help' || command === '-h') {
  console.log(`
${chalk.cyan.bold('AirLLM TUI')} — Run massive LLMs in your terminal

${chalk.bold('Usage:')}
  airllm-tui                  Launch the interactive dashboard
  airllm-tui doctor           Run system diagnostics
  airllm-tui doctor --fix     Auto-fix common issues (CUDA, etc.)

${chalk.bold('Options:')}
  --debug                     Enable debug logging
  --version, -v               Show version number
  --help, -h                  Show this help message

${chalk.bold('Environment:')}
  HF_TOKEN                    HuggingFace token for gated models

${chalk.bold('More info:')}  https://github.com/AirLLM/airllm-tui
`);
  process.exit(0);
}

if (command === 'doctor') {
  try {
    const { runDoctor, runFix } = await import('../dist/doctor.js');
    if (args.includes('--fix')) {
      await runFix();
    } else {
      await runDoctor();
    }
  } catch (error) {
    console.error(chalk.red.bold('\n✖ Doctor command failed:'), chalk.red(error.message));
    if (process.argv.includes('--debug') && error.stack) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(1);
  }
  process.exit(0);
}

// ── Default: launch TUI ─────────────────────────────────────────────────────

try {
  const { run } = await import('../dist/index.js');
  await run();
} catch (error) {
  console.error(chalk.red.bold('\n✖ Fatal Error:'), chalk.red(error.message));
  if (error.code) {
    console.error(chalk.dim(`  Error code: ${error.code}`));
  }
  if (error.stack && process.argv.includes('--debug')) {
    console.error(chalk.dim(error.stack));
  }
  process.exit(1);
}

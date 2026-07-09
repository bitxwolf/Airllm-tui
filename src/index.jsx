import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { check } from './setup/checker.js';
import { ensureVenv } from './setup/environment.js';
import { installDependencies } from './setup/installer.js';
import { loadConfig } from './utils/storage.js';
import { getPythonExe, getPythonScriptPath } from './utils/platform.js';
import { EngineBridge } from './engine/bridge.js';
import { App } from './ui/App.js';
import { BANNER, VERSION, COLORS, ICONS } from './ui/theme.js';
import chalk from 'chalk';

function LoadingScreen({ phase, detail, progressLines }) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="column" marginBottom={1}>
        {BANNER.map((line, i) => (
          <Text key={i} bold color={COLORS.primaryBright}>
            {line}
          </Text>
        ))}
      </Box>
      <Text color={COLORS.textDim}>
        Run massive LLMs in a terminal dashboard {ICONS.rocket}  v{VERSION}
      </Text>
      
      <Box marginTop={2}>
        <Text color={COLORS.accent}>
          <Spinner type="dots" />
        </Text>
        <Text color={COLORS.text}> {phase}</Text>
      </Box>
      {detail && (
        <Box marginLeft={3}>
          <Text color={COLORS.textDim}>{detail}</Text>
        </Box>
      )}
      {progressLines && progressLines.length > 0 && (
        <Box marginTop={1} flexDirection="column" marginLeft={3}>
          {progressLines.slice(-3).map((line, idx) => (
            <Text key={idx} color={COLORS.textMuted}>
              {line}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

export async function run() {
  let bridge = null;

  // Register signal handlers early
  const cleanup = async () => {
    if (bridge) {
      await bridge.shutdown();
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  let loadingApp = null;
  let currentPhase = '';
  let currentDetail = '';
  let currentLines = [];

  function updateLoading(phase, detail = '', lines = null) {
    currentPhase = phase;
    currentDetail = detail;
    if (lines) currentLines = lines;

    if (loadingApp) {
      loadingApp.rerender(
        <LoadingScreen
          phase={currentPhase}
          detail={currentDetail}
          progressLines={currentLines}
        />
      );
    }
  }

  // Mount loading screen
  loadingApp = render(
    <LoadingScreen phase="Starting…" detail="" progressLines={[]} />
  );

  try {
    // Phase 1: Check Python environment
    updateLoading('Checking Python environment…');
    const envInfo = await check();
    updateLoading(
      'Checking Python environment…',
      `Found Python ${envInfo.pythonVersion} | Device: ${envInfo.device}`
    );

    // Phase 2: Create virtual environment
    updateLoading('Creating virtual environment…');
    await ensureVenv(envInfo.pythonExe, (progress) => {
      updateLoading('Creating virtual environment…', progress.stage);
    });

    // Phase 3: Install dependencies
    updateLoading('Installing AI dependencies…');
    const installLines = [];
    await installDependencies((progress) => {
      if (progress.line) {
        installLines.push(progress.line);
      }
      updateLoading(
        'Installing AI dependencies…',
        progress.package ? `[${progress.package}]` : '',
        installLines
      );
    });

    // Phase 4: Load configuration
    updateLoading('Loading configuration…');
    const config = await loadConfig();
    if (envInfo.device && config.device === 'cpu' && envInfo.device !== 'cpu') {
      config.device = envInfo.device;
    }

    // Phase 5: Start inference engine
    updateLoading('Starting inference engine…');
    const pythonExe = getPythonExe();
    const scriptPath = getPythonScriptPath();
    bridge = new EngineBridge({ pythonExe, scriptPath });
    await bridge.start();

    updateLoading('Ready!', 'Launching dashboard…');

    // Phase 6: Unmount loading UI, render main app
    loadingApp.unmount();

    render(<App bridge={bridge} config={config} />);
  } catch (error) {
    if (loadingApp) {
      loadingApp.unmount();
    }

    const errorMessages = {
      NO_PYTHON:
        '  Python 3.8+ is required.\n  Install from https://python.org',
      VENV_FAILED:
        '  Could not create Python environment.\n  Check available disk space.',
      INSTALL_FAILED:
        '  Dependency install failed.\n  Check your internet connection.',
      ENGINE_CRASH:
        '  The AI engine crashed unexpectedly.\n  Try running again.',
    };

    const hint = errorMessages[error.code] || `  ${error.message}`;

    console.error(chalk.red.bold('\n✖ Setup Failed'));
    console.error(chalk.red(hint));

    if (process.argv.includes('--debug') && error.stack) {
      console.error(chalk.dim('\nStack trace:'));
      console.error(chalk.dim(error.stack));
    }

    process.exit(1);
  }
}

import { readFile, writeFile, rename, mkdir, readdir, truncate } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getConfigPath, getHistoryDir } from './platform.js';

const DEFAULT_CONFIG = {
  model_id: null,
  device: 'cpu',
  params: {
    temperature: 0.7,
    max_new_tokens: 512,
    top_p: 0.9,
  },
};

export async function loadConfig() {
  const configPath = getConfigPath();
  try {
    const raw = await readFile(configPath, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config) {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  await mkdir(dir, { recursive: true });
  const tmpPath = configPath + '.tmp';
  await writeFile(tmpPath, JSON.stringify(config, null, 2), 'utf-8');
  await rename(tmpPath, configPath);
}

export async function appendHistory(sessionFile, message) {
  const historyDir = getHistoryDir();
  await mkdir(historyDir, { recursive: true });
  const filePath = path.join(historyDir, sessionFile);
  await writeFile(filePath, JSON.stringify(message) + '\n', {
    flag: 'a',
    encoding: 'utf-8',
  });
}

export async function loadHistory(sessionFile) {
  const filePath = path.join(getHistoryDir(), sessionFile);
  try {
    const raw = await readFile(filePath, 'utf-8');
    const lines = raw.split('\n').filter((line) => line.trim());
    return lines.map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

export function newSessionFilename() {
  const now = new Date();
  const ts = now.toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, '');
  return `session-${ts}.jsonl`;
}

export async function listSessions() {
  const historyDir = getHistoryDir();
  try {
    const files = await readdir(historyDir);
    return files
      .filter((f) => f.startsWith('session-') && f.endsWith('.jsonl'))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export async function clearSessionFile(sessionFile) {
  const filePath = path.join(getHistoryDir(), sessionFile);
  try {
    await truncate(filePath, 0);
  } catch {
    // File may not exist, that's fine
  }
}

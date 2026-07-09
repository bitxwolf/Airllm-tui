import { readFile, writeFile, rename, mkdir, readdir, truncate, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getConfigPath, getDataDir, getHistoryDir } from './platform.js';

const DEFAULT_CONFIG = {
  model_id: null,
  device: 'cpu',
  system_prompt: '',
  hf_token: null,
  params: {
    temperature: 0.7,
    max_new_tokens: 512,
    top_p: 0.9,
    context_window: 20,
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

export async function deleteSession(sessionFile) {
  const filePath = path.join(getHistoryDir(), sessionFile);
  try {
    await unlink(filePath);
  } catch {
    // File may not exist, that's fine
  }
}

export async function getSessionMeta(sessionFile) {
  try {
    const messages = await loadHistory(sessionFile);
    const messageCount = messages.length;
    const firstUserMsg = messages.find((m) => m.role === 'user');
    const preview = firstUserMsg
      ? firstUserMsg.content.slice(0, 60)
      : '(empty session)';
    const match = sessionFile.match(/^session-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})\.jsonl$/);
    let date = 'Unknown date';
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      const d = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      date = d.toLocaleString();
    }
    return { filename: sessionFile, messageCount, preview, date };
  } catch {
    return null;
  }
}

export async function listSessionsWithMeta() {
  const sessions = await listSessions();
  const metas = await Promise.all(sessions.map((s) => getSessionMeta(s)));
  return metas.filter((m) => m !== null);
}

// ── Memory CRUD ──────────────────────────────────────────────────────────

export function getMemoryPath() {
  return path.join(getDataDir(), 'memory.json');
}

export async function loadMemory() {
  const memPath = getMemoryPath();
  try {
    const raw = await readFile(memPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveMemory(entries) {
  const memPath = getMemoryPath();
  const dir = path.dirname(memPath);
  await mkdir(dir, { recursive: true });
  const tmpPath = memPath + '.tmp';
  await writeFile(tmpPath, JSON.stringify(entries, null, 2), 'utf-8');
  await rename(tmpPath, memPath);
}

export async function addMemoryEntry({ key, value, pinned = false }) {
  const entries = await loadMemory();
  const entry = {
    id: crypto.randomUUID(),
    key,
    value,
    pinned,
    createdAt: Date.now(),
  };
  entries.push(entry);
  await saveMemory(entries);
  return entry;
}

export async function deleteMemoryEntry(id) {
  const entries = await loadMemory();
  const filtered = entries.filter((e) => e.id !== id);
  await saveMemory(filtered);
}

export async function toggleMemoryPin(id) {
  const entries = await loadMemory();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  entry.pinned = !entry.pinned;
  await saveMemory(entries);
  return entry;
}

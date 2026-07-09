// ── AirLLM TUI Design System ──────────────────────────────────────────────
// Central theme constants used across all UI components.

// ── Color Palette ─────────────────────────────────────────────────────────
// All colors are Ink-compatible (named colors, hex, or rgb).
export const COLORS = {
  // Primary brand
  primary: '#7C3AED',       // Deep violet
  primaryDim: '#6D28D9',
  primaryBright: '#A78BFA',

  // Accent
  accent: '#14B8A6',        // Teal
  accentDim: '#0D9488',
  accentBright: '#2DD4BF',

  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  errorDim: '#DC2626',
  info: '#3B82F6',

  // Neutrals
  text: 'white',
  textDim: 'gray',
  textMuted: '#6B7280',
  border: '#4B5563',
  borderDim: '#374151',
  borderFocused: '#7C3AED',

  // Semantic roles
  user: '#60A5FA',          // Soft blue for user messages
  userLabel: '#93C5FD',
  ai: '#34D399',            // Emerald for AI messages
  aiLabel: '#6EE7B7',

  // Telemetry
  vramLow: '#22C55E',       // Green
  vramMid: '#F59E0B',       // Amber
  vramHigh: '#EF4444',      // Red
  layerProgress: '#818CF8', // Indigo
  speed: '#2DD4BF',         // Teal

  // Background accents (for future use with chalk.bgHex)
  bgSubtle: '#1F2937',
};

// ── Box Drawing ───────────────────────────────────────────────────────────
export const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  teeRight: '├',
  teeLeft: '┤',
  cross: '┼',
  // Thick variants
  thickHorizontal: '━',
  thickVertical: '┃',
  // Decorative
  bullet: '●',
  bulletOpen: '○',
  diamond: '◆',
  diamondOpen: '◇',
  arrow: '▸',
  arrowLeft: '◂',
  block: '█',
  blockLight: '░',
  blockMed: '▒',
  separator: '─',
};

// ── Icons ─────────────────────────────────────────────────────────────────
export const ICONS = {
  user: '🧑',
  ai: '🤖',
  chat: '💬',
  params: '⚙',
  telemetry: '📊',
  model: '🧠',
  speed: '⚡',
  time: '⏱',
  vram: '💾',
  layer: '📦',
  download: '⬇',
  check: '✓',
  cross: '✗',
  warning: '⚠',
  info: 'ℹ',
  help: '?',
  session: '📋',
  prompt: '✎',
  rocket: '🚀',
  star: '⭐',
  lock: '🔒',
  globe: '🌐',
  memory: '📌',
};

// ── Status Indicators ─────────────────────────────────────────────────────
export const STATUS = {
  ready: { icon: '●', color: COLORS.success, label: 'Ready' },
  generating: { icon: '◌', color: COLORS.warning, label: 'Generating…' },
  error: { icon: '✖', color: COLORS.error, label: 'Error' },
  loading_model: { icon: '◎', color: COLORS.accent, label: 'Loading Model…' },
  idle: { icon: '○', color: COLORS.textDim, label: 'Idle' },
};

// ── ASCII Banner ──────────────────────────────────────────────────────────
export const BANNER = [
  '   ___    _       __    __    __  ___   ______  __  __ __',
  '  / _ |  (_)____ / /   / /   /  |/  /  /_  __/ / / / // /',
  ' / __ | / / __/ / /__ / /__ / /|_/ /    / /   / /_/ // /',
  '/_/ |_|/_/_/   /____//____//_/  /_/    /_/    \\____//_/',
];

export const BANNER_COMPACT = 'AirLLM TUI';

// ── Version ───────────────────────────────────────────────────────────────
export const VERSION = '1.0.0';

// ── Model Presets ─────────────────────────────────────────────────────────
export const MODEL_PRESETS = [
  {
    id: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
    name: 'TinyLlama 1.1B',
    params: '1.1B',
    vram: '~1 GB',
    description: 'Small, fast — perfect for testing',
    needsToken: false,
    recommended: true,
  },
  {
    id: 'mistralai/Mistral-7B-v0.1',
    name: 'Mistral 7B',
    params: '7B',
    vram: '~2 GB',
    description: 'Strong general-purpose model',
    needsToken: false,
  },
  {
    id: 'meta-llama/Llama-2-7b-hf',
    name: 'Llama 2 7B',
    params: '7B',
    vram: '~2 GB',
    description: 'Meta\'s foundational model',
    needsToken: true,
  },
  {
    id: 'meta-llama/Llama-2-13b-hf',
    name: 'Llama 2 13B',
    params: '13B',
    vram: '~4 GB',
    description: 'Balanced quality and speed',
    needsToken: true,
  },
  {
    id: 'meta-llama/Llama-2-70b-hf',
    name: 'Llama 2 70B',
    params: '70B',
    vram: '~4 GB',
    description: 'Maximum quality, slower generation',
    needsToken: true,
  },
];

// ── System Prompt Presets ─────────────────────────────────────────────────
export const SYSTEM_PROMPT_PRESETS = [
  {
    name: 'Default Assistant',
    prompt: 'You are a helpful, harmless, and honest AI assistant.',
  },
  {
    name: 'Code Expert',
    prompt: 'You are an expert software engineer. Provide clear, concise code with explanations. Use best practices and modern patterns.',
  },
  {
    name: 'Creative Writer',
    prompt: 'You are a creative writing assistant. Help with stories, poetry, and creative content. Be imaginative and expressive.',
  },
  {
    name: 'Concise Responder',
    prompt: 'You are a concise assistant. Answer in as few words as possible while still being accurate and helpful.',
  },
  {
    name: 'None',
    prompt: '',
  },
];

// ── Keyboard Shortcut Definitions ─────────────────────────────────────────
export const SHORTCUTS = {
  global: [
    { key: 'Tab', action: 'Switch pane' },
    { key: 'Ctrl+N', action: 'New session' },
    { key: 'Ctrl+O', action: 'Open session' },
    { key: 'Ctrl+L', action: 'Clear chat' },
    { key: 'Ctrl+C', action: 'Force quit' },
  ],
  chat: [
    { key: 'Enter', action: 'Send prompt' },
    { key: 'Esc', action: 'Abort generation' },
    { key: '↑/↓', action: 'Scroll messages' },
    { key: 'PgUp/PgDn', action: 'Fast scroll' },
  ],
  params: [
    { key: '↑/↓', action: 'Navigate params' },
    { key: '←/→', action: 'Adjust value' },
  ],
  system: [
    { key: 'S', action: 'System prompt' },
    { key: 'M', action: 'Memory panel' },
    { key: 'Q', action: 'Quit' },
    { key: '?', action: 'Help' },
    { key: 'R', action: 'Restart engine' },
  ],
};

// ── Helper: Get VRAM bar color ────────────────────────────────────────────
export function getVramColor(percent) {
  if (percent > 90) return COLORS.vramHigh;
  if (percent > 70) return COLORS.vramMid;
  return COLORS.vramLow;
}

// ── Helper: Truncate model ID for display ─────────────────────────────────
export function shortModelName(modelId) {
  if (!modelId) return 'None';
  const parts = modelId.split('/');
  return parts[parts.length - 1] || modelId;
}

// ── Helper: Format timestamp ──────────────────────────────────────────────
export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ── Helper: Render a horizontal rule ──────────────────────────────────────
export function hrule(width = 40) {
  return BOX.separator.repeat(width);
}

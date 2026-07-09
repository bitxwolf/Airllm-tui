<p align="center">
  <pre align="center">
   ___    _       __    __    __  ___   ______  __  __ __
  / _ |  (_)____ / /   / /   /  |/  /  /_  __/ / / / // /
 / __ | / / __/ / /__ / /__ / /|_/ /    / /   / /_/ // /
/_/ |_|/_/_/   /____//____//_/  /_/    /_/    \____//_/
  </pre>
</p>

<h1 align="center">AirLLM TUI</h1>

<p align="center">
  <strong>Run massive open-source LLMs (70B+ parameters) in your terminal on consumer hardware.</strong>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-troubleshooting">Troubleshooting</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/airllm-tui?color=blue&label=npm" alt="npm version" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node.js" />
  <img src="https://img.shields.io/badge/python-%3E%3D3.8-blue" alt="Python" />
  <img src="https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

---

AirLLM TUI is a **terminal dashboard** that lets you chat with large language models using [AirLLM's](https://github.com/lyogavin/Anima/tree/main/air_benchmark) revolutionary layer-swapping inference technique. It wraps the Python [`airllm`](https://github.com/lyogavin/Anima/tree/main/air_benchmark) library in a beautiful, interactive terminal UI built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs).

> **💡 Built on top of [AirLLM](https://github.com/lyogavin/Anima/tree/main/air_benchmark)** — the original layer-swapping inference engine created by [Gavin Li (@lyogavin)](https://github.com/lyogavin) and the Anima team. Their breakthrough research makes it possible to run 70B+ parameter models on consumer GPUs with as little as 4GB VRAM. This TUI is a community wrapper that provides an accessible terminal interface on top of their incredible work. All credit for the core inference technology goes to the AirLLM/Anima team. 🙏

<!-- TODO: Replace with an actual screenshot or asciinema recording -->
<!-- ![AirLLM TUI Demo](./docs/demo.gif) -->

---

## ⚡ Quick Start

```bash
npx airllm-tui
```

**That's it. One command.** Works on Linux, macOS, and Windows.

On first run, the tool will automatically:

1. ✅ Detect your Python installation
2. ✅ Create an isolated virtual environment (nothing touches your system Python)
3. ✅ Install PyTorch (with GPU support if available), AirLLM, and all dependencies
4. ✅ Prompt you for a HuggingFace model ID
5. ✅ Launch the interactive dashboard

### Install Globally (Optional)

```bash
npm install -g airllm-tui
airllm-tui
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🚀 **One-command install** | `npx airllm-tui` — no Python setup, no pip, no config files |
| 🧠 **Run 70B models on 4GB VRAM** | Layer-swapping loads one layer at a time — powered by [AirLLM](https://github.com/lyogavin/Anima/tree/main/air_benchmark) |
| 📊 **Live telemetry** | Real-time VRAM usage, layer progress, tokens/sec |
| 💬 **Multi-turn conversations** | Full chat history context with sliding history turn settings (0-50 prior turns) |
| 📌 **Persistent Memory System** | Save key facts locally that persist across sessions, pin/inject them into prompts |
| ⚙️ **Interactive parameter tuning** Live temperature, top-p, max tokens, and context turn parameters |
| 🖥️ **Cross-platform** | Linux, macOS, and Windows |
| 🎯 **GPU auto-detection** | NVIDIA CUDA, Apple MPS, and CPU fallback |
| 🔧 **Built-in diagnostics** | `airllm-tui doctor` detects and fixes issues automatically |
| 📝 **Session history** | Conversations saved as JSONL files |
| 🔄 **Smart CUDA handling** | Auto-detects driver version and installs the correct PyTorch |

---

## 🧠 How It Works

Traditional LLM inference loads the **entire model** into GPU memory. A 70B model needs ~140GB of VRAM — far beyond consumer hardware.

**AirLLM changes the game** with *layer-swapping*:

```
┌─────────────────────────────────────────────────┐
│  Traditional: Load ALL 80 layers into VRAM      │
│  ➜ Requires 140GB+ VRAM ❌                      │
├─────────────────────────────────────────────────┤
│  AirLLM: Load ONE layer at a time               │
│  ➜ Process layer 1 → swap out → load layer 2    │
│  ➜ Requires only ~4GB VRAM ✅                    │
└─────────────────────────────────────────────────┘
```

It loads one transformer layer at a time into GPU memory, processes it, then swaps in the next. This means even massive models can run on consumer hardware — your gaming laptop, your desktop, or even a machine with a modest GPU.

> **Trade-off**: Layer-swapping trades speed for accessibility. Generation is slower than keeping the whole model in VRAM, but it makes running models that would otherwise be impossible on your hardware… possible.

---

## 📋 Prerequisites

| You need... | How to get it | Why |
|---|---|---|
| **Node.js 18+** | [nodejs.org](https://nodejs.org) | Runs the terminal UI |
| **Python 3.8+** | [python.org](https://python.org) | Runs the AI inference engine |
| **NVIDIA GPU** *(optional)* | [nvidia.com/drivers](https://nvidia.com/drivers) | GPU acceleration (10-50x faster) |

> **🍎 Apple Silicon?** Supported via MPS — no extra setup needed.
>
> **No GPU at all?** AirLLM works on CPU too — it's just slower. Great for testing.

### Detailed System Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| Node.js | 18.0+ | 20.0+ |
| Python | 3.8+ | 3.11+ |
| GPU | None (CPU works) | NVIDIA with 4GB+ VRAM |
| Disk Space | 2 GB | 10 GB+ (for model weights) |
| RAM | 8 GB | 16 GB+ |
| OS | Linux, macOS, Windows | Any |

---

## 🤖 Supported Models

Any HuggingFace model compatible with AirLLM works. Here are some tested ones:

| Model | Parameters | Min VRAM | Model ID | Token Required? |
|---|---|---|---|---|
| **TinyLlama 1.1B** ⭐ | 1.1B | ~1 GB | `TinyLlama/TinyLlama-1.1B-Chat-v1.0` | No |
| Mistral 7B | 7B | ~2 GB | `mistralai/Mistral-7B-v0.1` | No |
| Llama 2 7B | 7B | ~2 GB | `meta-llama/Llama-2-7b-hf` | Yes |
| Llama 2 13B | 13B | ~4 GB | `meta-llama/Llama-2-13b-hf` | Yes |
| Llama 2 70B | 70B | ~4 GB | `meta-llama/Llama-2-70b-hf` | Yes |

> **⭐ First time?** Start with `TinyLlama/TinyLlama-1.1B-Chat-v1.0` — it's small (~2GB download), fast, and doesn't need a HuggingFace token. Perfect for testing your setup.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `Enter` | Send prompt (in chat) |
| `Esc` | Abort generation (in chat) |
| `Tab` | Switch active pane (Chat ↔ Parameters ↔ Telemetry) |
| `↑` `↓` | Scroll messages (Chat pane) / Navigate settings (Parameters pane) |
| `←` `→` | Adjust parameters / Context Turns slider (Parameters pane) |
| `Ctrl+C` | Force quit |

### Sidebar Shortcuts (Press `Tab` to leave Chat input to use these)

| Key | Action |
|---|---|
| `M` | Open Memory Panel |
| `S` | System prompt editor |
| `?` / `F1` | Help overlay |
| `Ctrl+N` | New session |
| `Ctrl+O` | Open session browser |
| `Ctrl+L` | Clear chat |
| `R` | Restart engine (if in error state) |
| `Q` | Quit gracefully |

### Memory Panel Controls

| Key | Action |
|---|---|
| `Enter` (on "+ Add Memory") | Add a new memory entry (enters key then value inputs) |
| `P` | Toggle Pin on selected memory (pinned memories are injected into prompts) |
| `Delete` / `Backspace` | Delete selected memory |
| `Esc` | Close panel |

---

## 🏗️ CLI Reference

```bash
airllm-tui                   # Launch the interactive dashboard
airllm-tui doctor            # Run full system diagnostics
airllm-tui doctor --fix      # Auto-fix common issues (CUDA, PyTorch)
airllm-tui --debug           # Launch with debug logging enabled
airllm-tui --version         # Show version number
airllm-tui --help            # Show help
```

---

## 🔧 Troubleshooting

### 🩺 Quick Diagnostic — `airllm-tui doctor`

**Before anything else**, run the built-in diagnostic tool:

```bash
airllm-tui doctor
```

It checks your **entire stack** — Node.js, Python, NVIDIA drivers, CUDA toolkit, PyTorch, AirLLM, and disk space — then tells you exactly what's wrong with clear ✅/❌ indicators:

```
🔍 AirLLM TUI — Environment Diagnostic
═════════════════════════════════════════════

✅ Node.js          v24.15.0
✅ Python           3.14.4
✅ NVIDIA Driver    595.79
✅ CUDA (driver)    13.2
✅ GPU              NVIDIA GeForce RTX 5050 Laptop GPU
✅ PyTorch          2.11.0+cu128
✅ torch.cuda       Available ✓ (NVIDIA GeForce RTX 5050 Laptop GPU)
✅ AirLLM           2.10.0
✅ Disk Space       137.6 GB free on C:

🎉 Everything looks good! Run `airllm-tui` to start.
```

---

### 🔥 #1 Issue: "Torch not compiled with CUDA enabled"

This is the **most common problem**. It means PyTorch was installed without GPU support, so everything runs on CPU (extremely slow).

**Why does this happen?**
When the tool auto-installs PyTorch, it sometimes picks the CPU-only version instead of the CUDA (GPU) version — this depends on your system's CUDA setup and network conditions.

#### ✅ Automatic Fix (Recommended)

```bash
airllm-tui doctor --fix
```

This command will:
1. 🔍 Detect your NVIDIA GPU and driver version
2. 🗑️ Uninstall the CPU-only PyTorch
3. 📦 Install the correct CUDA-enabled PyTorch that matches your driver
4. ✅ Verify that GPU acceleration is now working

```
🔧 AirLLM TUI — Auto-Fix
═════════════════════════

[1/4] Detecting GPU...
      NVIDIA GeForce RTX 5050 Laptop GPU | Driver 595.79

[2/4] Removing CPU-only PyTorch...
      ✓ Uninstalled torch, torchvision

[3/4] Installing CUDA-enabled PyTorch...
      Using: https://download.pytorch.org/whl/cu128
      ✓ Installed PyTorch from https://download.pytorch.org/whl/cu128

[4/4] Verifying...
      torch.cuda.is_available() = True ✓
      GPU: NVIDIA GeForce RTX 5050 Laptop GPU

🎉 Fixed! Run `airllm-tui` to start with GPU acceleration.
```

#### 🔧 Manual Fix (If `--fix` Doesn't Work)

If the automatic fix doesn't resolve it, follow these steps:

1. **Check your GPU is detected:**
   ```bash
   nvidia-smi
   ```
   You should see your GPU listed. If this command fails → you need to install [NVIDIA drivers](https://nvidia.com/drivers) first.

2. **Note the CUDA Version** shown in the top-right corner of the `nvidia-smi` output (e.g., `CUDA Version: 12.1`).

3. **Go to [pytorch.org/get-started/locally](https://pytorch.org/get-started/locally/)**

4. **Select your configuration:**
   - Build: `Stable`
   - Your OS: `Linux` / `Mac` / `Windows`
   - Package: `Pip`
   - Language: `Python`
   - Compute Platform: The CUDA version from step 2

5. **Copy the generated command** and run it inside the AirLLM virtual environment:
   ```bash
   # Activate the venv first
   # Linux/macOS:
   source ~/.airllm-tui/.venv/bin/activate
   # Windows:
   ~\.airllm-tui\.venv\Scripts\activate

   # Then paste the pip install command from pytorch.org
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
   ```

6. **Verify it worked:**
   ```bash
   airllm-tui doctor
   ```

---

### 🐍 "Python not found"

Python 3.8+ must be installed and available on your system PATH.

<details>
<summary><strong>Windows</strong></summary>

1. Download Python from [python.org](https://python.org)
2. **⚠️ Important:** During installation, check **"Add Python to PATH"**
3. Restart your terminal after installing
4. Verify: `python --version`
</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install python
```
Or download from [python.org](https://python.org). Verify: `python3 --version`
</details>

<details>
<summary><strong>Linux (Ubuntu/Debian)</strong></summary>

```bash
sudo apt update
sudo apt install python3 python3-venv python3-pip
```
Verify: `python3 --version`
</details>

---

### 💾 "CUDA out of memory" (OOM)

Even with layer-swapping, some situations can cause OOM errors:

- **Close other GPU apps** — games, other AI tools, browsers with hardware acceleration
- **Try a smaller model first** — start with `TinyLlama/TinyLlama-1.1B-Chat-v1.0`
- **Reduce max tokens** — lower the `max_new_tokens` parameter in the Parameters pane

---

### 🌐 "Model download is slow / stuck"

- Large models take time: 70B ≈ 140 GB download
- Ensure a stable internet connection
- Models are **cached locally** by HuggingFace — subsequent launches are instant
- You can check download progress in the TUI's loading bar

---

### 📋 Error Code Reference

| Code | Meaning | Fix |
|---|---|---|
| `NO_PYTHON` | Python 3.8+ not found | Install Python, ensure it's on PATH |
| `VENV_FAILED` | Can't create virtual environment | Check disk space. Delete `~/.airllm-tui/.venv` and retry |
| `INSTALL_FAILED` | pip install failed | Check internet. Run `airllm-tui --debug` for details |
| `MODEL_NOT_FOUND` | Model not on HuggingFace | Verify model ID. Set `HF_TOKEN` for gated models |
| `OOM` | GPU out of memory | Close other apps. Try a smaller model |
| `ENGINE_CRASH` | Engine crashed | Press `R` to restart. Run `airllm-tui doctor` |

---

## 🔑 HuggingFace Token (for Gated Models)

Some models (like Llama 2/3) are *gated* — you need to accept the license on HuggingFace and provide an access token.

**Steps:**

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) and create a token
2. Accept the model's license on its HuggingFace page
3. Set the token in your terminal:

```bash
# Linux / macOS
export HF_TOKEN=hf_your_token_here

# Windows (PowerShell)
$env:HF_TOKEN = "hf_your_token_here"

# Windows (CMD)
set HF_TOKEN=hf_your_token_here
```

You can also use `HUGGING_FACE_HUB_TOKEN` as an alternative environment variable.

> **💡 Tip:** Non-gated models like **TinyLlama** and **Mistral 7B** don't need a token at all.

---

## 🐛 Debug Mode

```bash
airllm-tui --debug
```

This logs all internal IPC messages between the Node.js UI and the Python engine to `~/.airllm-tui/debug.log`. Very useful for filing bug reports.

---

## 📁 Data Storage

All data is stored locally in `~/.airllm-tui/`:

```
~/.airllm-tui/
├── config.json               # Model ID, device, parameter, and context window settings
├── memory.json               # Key-value memories database
├── history/                  # Conversation sessions
│   ├── session-2026-07-06T14-22-00.jsonl
│   └── ...
├── .venv/                    # Isolated Python virtual environment
└── debug.log                 # Debug logs (when --debug is used)
```

Model weights are cached by HuggingFace in the standard `~/.cache/huggingface/` directory.

To **completely reset** the tool, delete the `~/.airllm-tui/` folder:

```bash
# Linux / macOS
rm -rf ~/.airllm-tui

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:USERPROFILE\.airllm-tui"
```

---

## 🏛️ Architecture

```
airllm-tui
├── bin/airllm-tui.js          # CLI entry point & subcommand routing
├── src/
│   ├── index.jsx              # App bootstrap & loading screen
│   ├── doctor.js              # `airllm-tui doctor` diagnostic tool
│   ├── engine/
│   │   ├── bridge.js          # Node.js ↔ Python IPC bridge
│   │   ├── protocol.js        # JSON Lines protocol encoder/decoder
│   │   └── spawn.js           # Python process spawner
│   ├── setup/
│   │   ├── checker.js         # Environment checker (Python, GPU)
│   │   ├── environment.js     # Virtual environment creation
│   │   └── installer.js       # PyTorch & AirLLM installer with CUDA detection
│   ├── ui/
│   │   ├── App.jsx            # Main application component
│   │   ├── components/
│   │   │   ├── ChatPane.jsx   # Chat message display
│   │   │   ├── DownloadBar.jsx# Model download progress
│   │   │   ├── InputBar.jsx   # User input field
│   │   │   ├── ParamsPanel.jsx# Parameter adjustment panel
│   │   │   ├── StatusBar.jsx  # Bottom status bar
│   │   │   └── TelemetryPane.jsx # VRAM & performance metrics
│   │   └── hooks/
│   │       ├── useEngine.js   # Engine state management
│   │       ├── useHistory.js  # Chat history persistence
│   │       └── useTelemetry.js# Telemetry data aggregation
│   └── utils/
│       ├── cuda.js            # Shared CUDA detection & wheel mapping
│       ├── platform.js        # Cross-platform path & device utilities
│       └── storage.js         # Config & history file I/O
└── python/
    └── engine.py              # Python inference engine (AirLLM wrapper)
```

The TUI uses a **two-process architecture**:
- **Node.js process** — Renders the terminal UI using React/Ink, handles user input
- **Python process** — Runs the AirLLM inference engine, communicates via JSON Lines over stdio

---

## 🤝 Contributing

Contributions are welcome! Whether it's a bug fix, new feature, or documentation improvement — we'd love your help.

### Development Setup

```bash
# Clone the repo
git clone https://github.com/AirLLM/airllm-tui.git
cd airllm-tui

# Install dependencies
npm install

# Build the project
npm run build

# Run from source
node bin/airllm-tui.js

# Run the doctor (useful for testing)
node bin/airllm-tui.js doctor
```

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes
4. **Test** locally: `npm run build && node bin/airllm-tui.js doctor`
5. **Commit**: `git commit -m 'Add amazing feature'`
6. **Push**: `git push origin feature/amazing-feature`
7. **Open** a Pull Request

### Filing Issues

When reporting a bug, please include the output of:

```bash
airllm-tui doctor
```

This gives us all the system information we need. Use our [bug report template](https://github.com/AirLLM/airllm-tui/issues/new?template=bug_report.md) for best results.

---

## 🙏 Acknowledgments

This project would not be possible without:

- **[AirLLM](https://github.com/lyogavin/Anima/tree/main/air_benchmark)** by [Gavin Li (@lyogavin)](https://github.com/lyogavin) and the **Anima team** — The core layer-swapping inference engine that makes running 70B+ models on consumer hardware a reality. The foundational research and implementation behind AirLLM is what powers this entire tool. Thank you for making large language models accessible to everyone. 🎉
- **[Ink](https://github.com/vadimdemedes/ink)** by [Vadim Demedes](https://github.com/vadimdemedes) — React for interactive command-line apps, which powers the TUI rendering
- **[PyTorch](https://pytorch.org/)** — The deep learning framework underlying the inference
- **[HuggingFace](https://huggingface.co/)** — Model hosting, tokenizers, and the Transformers library
- **[Meta AI](https://ai.meta.com/)** — For open-sourcing the Llama model family
- **[Mistral AI](https://mistral.ai/)** — For open-sourcing the Mistral model family

---

## 📄 License

MIT — see [LICENSE](./LICENSE)

---

<p align="center">
  <sub>Made with ❤️ for the open-source AI community</sub>
  <br/>
  <sub>Powered by <a href="https://github.com/lyogavin/Anima/tree/main/air_benchmark">AirLLM</a></sub>
</p>

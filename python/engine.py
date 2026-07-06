#!/usr/bin/env python3
"""AirLLM inference engine — communicates with Node.js TUI via JSON Lines over stdio."""

import json
import os
import sys
import time
import threading
import traceback
import subprocess
import shutil
import contextlib
import queue

# Module-level globals for model state
model = None
tokenizer = None
model_info = {}
conversation_history = []
interrupt_event = threading.Event()
current_params = {
    "temperature": 0.7,
    "max_new_tokens": 512,
    "top_p": 0.9,
}

input_queue = queue.Queue()

def stdin_reader():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
            # Handle interrupt immediately on reader thread to be responsive
            if msg.get("type") == "interrupt":
                handle_interrupt()
            else:
                input_queue.put(msg)
        except Exception:
            pass

# Start the stdin reader thread
threading.Thread(target=stdin_reader, daemon=True).start()


def send(msg_type, payload=None):
    """Send a JSON Lines message to stdout."""
    msg = {"type": msg_type}
    if payload is not None:
        msg["payload"] = payload
    sys.stdout.write(json.dumps(msg) + "\n")
    sys.stdout.flush()


def get_telemetry(start_time, tokens_so_far, current_layer=0, total_layers=0):
    """Collect telemetry data based on available device."""
    elapsed_ms = (time.time() - start_time) * 1000
    tps = tokens_so_far / ((time.time() - start_time) or 1)

    vram_used = 0.0
    vram_total = 0.0

    try:
        import torch

        if torch.cuda.is_available():
            vram_used = torch.cuda.memory_allocated() / (1024 ** 3)
            props = torch.cuda.get_device_properties(0)
            vram_total = props.total_mem / (1024 ** 3)
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            vram_used = torch.mps.current_allocated_memory() / (1024 ** 3)
            vram_total = 0  # MPS total not exposed
    except Exception:
        pass

    return {
        "vram_used_gb": round(vram_used, 2),
        "vram_total_gb": round(vram_total, 2),
        "tokens_per_sec": round(tps, 2),
        "current_layer": current_layer,
        "total_layers": total_layers,
        "elapsed_ms": round(elapsed_ms, 1),
    }


# ── Download-progress tracking via tqdm patch ────────────────────────────────
_download_lock = threading.Lock()
_active_downloads = {}   # filename -> {downloaded, total}


def _make_tqdm_patch():
    """Return a tqdm subclass that forwards progress to the TUI."""
    try:
        from tqdm import tqdm as _RealTqdm
    except ImportError:
        return None

    class _TuiTqdm(_RealTqdm):
        def __init__(self, *args, **kwargs):
            # Suppress terminal output from tqdm itself
            kwargs.setdefault("file", open(os.devnull, "w", errors="replace"))
            super().__init__(*args, **kwargs)
            self._tui_key = kwargs.get("desc") or str(id(self))
            with _download_lock:
                _active_downloads[self._tui_key] = {"downloaded": 0, "total": self.total or 0}
            _emit_download_progress()

        def update(self, n=1):
            super().update(n)
            with _download_lock:
                entry = _active_downloads.get(self._tui_key)
                if entry is not None:
                    entry["downloaded"] = self.n or 0
                    if self.total:
                        entry["total"] = self.total
            _emit_download_progress()

        def close(self):
            with _download_lock:
                _active_downloads.pop(self._tui_key, None)
            super().close()
            _emit_download_progress()

    return _TuiTqdm


def _emit_download_progress():
    """Compute aggregate download progress and send event."""
    with _download_lock:
        entries = list(_active_downloads.values())
    if not entries:
        return
    total_bytes = sum(e["total"] for e in entries)
    downloaded_bytes = sum(e["downloaded"] for e in entries)
    pct = (downloaded_bytes / total_bytes) if total_bytes > 0 else 0.0
    send("download_progress", {
        "downloaded_bytes": downloaded_bytes,
        "total_bytes": total_bytes,
        "percent": round(pct * 100, 1),
        "files": len(entries),
    })


@contextlib.contextmanager
def _patch_tqdm():
    """Context manager that temporarily replaces tqdm with our progress-tracking version."""
    tui_cls = _make_tqdm_patch()
    if tui_cls is None:
        yield
        return

    # Patch the tqdm used by huggingface_hub internally
    patched_modules = []
    try:
        import tqdm as tqdm_pkg
        import tqdm.auto as tqdm_auto
        import tqdm.std as tqdm_std

        _orig_tqdm = tqdm_pkg.tqdm
        _orig_auto = tqdm_auto.tqdm
        _orig_std = tqdm_std.tqdm

        tqdm_pkg.tqdm = tui_cls
        tqdm_auto.tqdm = tui_cls
        tqdm_std.tqdm = tui_cls
        patched_modules = [tqdm_pkg, tqdm_auto, tqdm_std]
        yield
    finally:
        if patched_modules:
            tqdm_pkg.tqdm = _orig_tqdm
            tqdm_auto.tqdm = _orig_auto
            tqdm_std.tqdm = _orig_std
        with _download_lock:
            _active_downloads.clear()

# ─────────────────────────────────────────────────────────────────────────────


def diagnose_cuda_failure():
    """Diagnose why torch.cuda.is_available() returned False on a system
    that may have an NVIDIA GPU. Returns a dict with reason, fix_command,
    and fix_url."""
    import torch

    result = {
        "reason": "CUDA not available.",
        "fix_command": "airllm-tui doctor --fix",
        "fix_url": "https://pytorch.org/get-started/locally/",
    }

    # Check 1: Is nvidia-smi available?
    has_nvidia_smi = shutil.which("nvidia-smi") is not None
    if not has_nvidia_smi:
        result["reason"] = (
            "No NVIDIA GPU driver detected (nvidia-smi not found). "
            "Install NVIDIA drivers from https://nvidia.com/drivers "
            "or run on CPU."
        )
        result["fix_command"] = None
        result["fix_url"] = "https://nvidia.com/drivers"
        return result

    # Check 2: Is PyTorch compiled without CUDA?
    torch_cuda_version = getattr(torch.version, "cuda", None)
    if torch_cuda_version is None:
        result["reason"] = (
            "PyTorch is installed as a CPU-only build (no CUDA compiled in). "
            "Falling back to CPU. Run 'airllm-tui doctor --fix' to "
            "auto-install the correct GPU-enabled PyTorch."
        )
        return result

    # Check 3: CUDA version mismatch
    try:
        smi_output = subprocess.check_output(
            ["nvidia-smi"], timeout=5, text=True, stderr=subprocess.DEVNULL
        )
        import re
        match = re.search(r"CUDA Version:\s*([\d.]+)", smi_output)
        if match:
            driver_cuda = match.group(1)
            result["reason"] = (
                f"PyTorch was built for CUDA {torch_cuda_version} but your "
                f"driver supports CUDA {driver_cuda}. This mismatch may cause "
                f"issues. Run 'airllm-tui doctor --fix' to reinstall the "
                f"correct version."
            )
            return result
    except Exception:
        pass

    # Fallback: unknown reason
    result["reason"] = (
        "CUDA is not available for an unknown reason. "
        "Run 'airllm-tui doctor' for a full diagnostic."
    )
    return result


def handle_load_model(payload):
    """Load an AirLLM model."""
    global model, tokenizer, model_info, conversation_history

    model_id = payload.get("model_id", "")
    device = payload.get("device", "cpu")
    compression = payload.get("compression", "4bit")
    hf_token = payload.get("hf_token", "")

    # Set HF token in environment if provided so HF hub libraries pick it up
    if hf_token:
        os.environ["HF_TOKEN"] = hf_token

    try:
        send("model_loading", {"progress": 0.0, "stage": "Importing dependencies"})

        import torch
        from transformers import AutoTokenizer

        # ── Device capability check & auto-fallback ──────────────────────────
        actual_device = device
        fallback_reason = None

        if device == "cuda":
            if not torch.cuda.is_available():
                actual_device = "cpu"
                diagnosis = diagnose_cuda_failure()
                fallback_reason = diagnosis["reason"]
        elif device == "mps":
            if not (hasattr(torch.backends, "mps") and torch.backends.mps.is_available()):
                actual_device = "cpu"
                fallback_reason = "MPS not available. Falling back to CPU."

        if fallback_reason:
            fallback_payload = {
                "requested": device,
                "actual": actual_device,
                "reason": fallback_reason,
            }
            # Include fix hints if available (from CUDA diagnosis)
            if device == "cuda" and 'diagnosis' in locals():
                fallback_payload["fix_command"] = diagnosis.get("fix_command")
                fallback_payload["fix_url"] = diagnosis.get("fix_url")
            send("device_fallback", fallback_payload)
            send("model_loading", {
                "progress": 0.05,
                "stage": f"⚠ {fallback_reason}",
            })

        device = actual_device

        send("model_loading", {"progress": 0.15, "stage": "Checking model cache…"})

        # Determine dtype and compression
        use_compression = False
        torch_dtype = torch.float16 if device in ("cuda", "mps") else torch.float32

        if device == "cuda" and compression == "4bit":
            use_compression = True

        # ── Auto VRAM Optimizer ──
        # If running on CUDA/MPS, first try to load the entire model into VRAM
        # so it runs at maximum native speed. If it's too big, fall back to AirLLM.
        loaded_directly = False
        if device in ("cuda", "mps"):
            try:
                send("model_loading", {"progress": 0.20, "stage": "Attempting direct VRAM load for maximum speed…"})
                from transformers import AutoModelForCausalLM

                # Load directly to GPU
                model = AutoModelForCausalLM.from_pretrained(
                    model_id,
                    torch_dtype=torch_dtype,
                    device_map="auto",
                    low_cpu_mem_usage=True
                )
                loaded_directly = True
                send("model_loading", {"progress": 0.70, "stage": "VRAM load successful!"})
            except Exception as e:
                # If we fail (e.g. OOM), fall back to AirLLM layer swapping
                send("model_loading", {
                    "progress": 0.25,
                    "stage": "Model too big for VRAM. Falling back to AirLLM layer-swapping…"
                })

        if not loaded_directly:
            # Select model class based on model_id
            model_id_lower = model_id.lower()
            if "llama" in model_id_lower:
                from airllm import AutoModel as AirModel

                try:
                    from airllm import LlamaModel as AirModel
                except ImportError:
                    pass
            elif "mistral" in model_id_lower:
                from airllm import AutoModel as AirModel

                try:
                    from airllm import MistralModel as AirModel
                except ImportError:
                    pass
            else:
                from airllm import AutoModel as AirModel

            send("model_loading", {"progress": 0.30, "stage": "Loading model weights via AirLLM…"})

            # Load model (with download progress tracking)
            model_kwargs = {
                "pretrained_model_name_or_path": model_id,
                "device": device,
            }

            if use_compression:
                model_kwargs["compression"] = compression

            try:
                with _patch_tqdm():
                    model = AirModel.from_pretrained(**model_kwargs)
            except Exception as e:
                error_msg = str(e).lower()
                if "not found" in error_msg or "404" in error_msg or "does not exist" in error_msg:
                    send("error", {"code": "MODEL_NOT_FOUND", "message": f"Model '{model_id}' not found on HuggingFace."})
                    return
                raise

        send("model_loading", {"progress": 0.75, "stage": "Loading tokenizer"})

        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        send("model_loading", {"progress": 1.0, "stage": "Model loaded"})

        # Detect layer count
        total_layers = 0
        try:
            if hasattr(model, "config") and hasattr(model.config, "num_hidden_layers"):
                total_layers = model.config.num_hidden_layers
            elif hasattr(model, "model") and hasattr(model.model, "layers"):
                total_layers = len(model.model.layers)
        except Exception:
            total_layers = 0

        model_info.update({
            "model_id": model_id,
            "device": device,
            "layers": total_layers,
        })

        conversation_history = []

        send("model_ready", {
            "model_id": model_id,
            "device": device,
            "layers": total_layers,
        })

    except Exception as e:
        error_str = str(e)
        if "out of memory" in error_str.lower() or "oom" in error_str.lower():
            send("error", {"code": "OOM", "message": f"Out of GPU memory: {error_str}"})
        else:
            send("error", {"code": "UNKNOWN", "message": f"Failed to load model: {error_str}"})
        traceback.print_exc(file=sys.stderr)


def format_prompt(prompt):
    """Format prompt with conversation history."""
    global conversation_history

    # Try to use chat template if available
    if tokenizer and hasattr(tokenizer, "apply_chat_template"):
        messages = []
        for turn in conversation_history:
            messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": prompt})
        try:
            formatted = tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            return formatted
        except Exception:
            pass

    # Fallback: simple format
    parts = []
    for turn in conversation_history:
        role = "User" if turn["role"] == "user" else "Assistant"
        parts.append(f"{role}: {turn['content']}")
    parts.append(f"User: {prompt}")
    parts.append("Assistant:")
    return "\n".join(parts)


def handle_generate(payload):
    """Generate text from a prompt."""
    global model, tokenizer, conversation_history, interrupt_event, current_params

    if model is None or tokenizer is None:
        send("error", {"code": "GENERATION_FAILED", "message": "No model loaded. Load a model first."})
        return

    interrupt_event.clear()

    prompt = payload.get("prompt", "")
    gen_params = payload.get("params", current_params)
    temperature = gen_params.get("temperature", 0.7)
    max_new_tokens = gen_params.get("max_new_tokens", 512)
    top_p = gen_params.get("top_p", 0.9)

    try:
        import torch

        full_prompt = format_prompt(prompt)

        # Tokenize
        input_ids = tokenizer(
            full_prompt,
            return_tensors="pt",
            return_attention_mask=False,
            truncation=True,
            max_length=4096,
        )

        # Move input tensors to the model device
        device = model_info.get("device", "cpu")
        input_ids_tensor = input_ids.input_ids.to(device)

        start_time = time.time()
        total_layers = model_info.get("layers", 0)
        tokens_generated = 0
        generated_text = ""

        # Telemetry thread
        telemetry_stop = threading.Event()
        tokens_generated = 0
        generated_text = ""

        def telemetry_loop():
            while not telemetry_stop.is_set():
                telem = get_telemetry(
                    start_time, tokens_generated, 0, total_layers
                )
                send("telemetry", telem)
                telemetry_stop.wait(0.5)

        telem_thread = threading.Thread(target=telemetry_loop, daemon=True)
        telem_thread.start()

        # Generate with TextIteratorStreamer for true real-time streaming
        try:
            from transformers import TextIteratorStreamer

            streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

            generation_kwargs = dict(
                input_ids=input_ids_tensor,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=top_p,
                do_sample=temperature > 0,
                streamer=streamer,
            )

            gen_error = []

            def run_generation():
                try:
                    model.generate(**generation_kwargs)
                except Exception as e:
                    gen_error.append(e)

            gen_thread = threading.Thread(target=run_generation, daemon=True)
            gen_thread.start()

            # Read tokens from streamer as they are generated
            for new_text in streamer:
                if interrupt_event.is_set():
                    send("interrupted")
                    break

                if new_text:
                    generated_text += new_text
                    tokens_generated += 1
                    send("token", {"text": new_text})

            # Wait for the generation thread to finish
            gen_thread.join(timeout=5)

            if gen_error:
                raise gen_error[0]

            if not interrupt_event.is_set():
                elapsed = (time.time() - start_time) * 1000
                send("generation_done", {
                    "tokens_generated": tokens_generated,
                    "total_ms": round(elapsed, 1),
                })

        finally:
            telemetry_stop.set()
            telem_thread.join(timeout=2)

        # Store in conversation history
        if generated_text and not interrupt_event.is_set():
            conversation_history.append({"role": "user", "content": prompt})
            conversation_history.append({"role": "assistant", "content": generated_text})

    except Exception as e:
        error_str = str(e)
        if "out of memory" in error_str.lower() or "oom" in error_str.lower():
            send("error", {"code": "OOM", "message": f"Out of GPU memory during generation: {error_str}"})
        else:
            send("error", {"code": "GENERATION_FAILED", "message": f"Generation failed: {error_str}"})
        traceback.print_exc(file=sys.stderr)


def handle_interrupt():
    """Set the interrupt flag."""
    interrupt_event.set()


def handle_clear_history():
    """Clear conversation history."""
    global conversation_history
    conversation_history = []


def handle_update_params(payload):
    """Update generation parameters."""
    global current_params
    current_params.update(payload)


def handle_ping():
    """Respond to ping."""
    send("pong")


def handle_shutdown():
    """Gracefully shut down."""
    sys.exit(0)


def dispatch(msg):
    """Dispatch a message to the appropriate handler."""
    msg_type = msg.get("type", "")
    payload = msg.get("payload", {})

    handlers = {
        "load_model": lambda: handle_load_model(payload),
        "generate": lambda: handle_generate(payload),
        "interrupt": handle_interrupt,
        "clear_history": handle_clear_history,
        "update_params": lambda: handle_update_params(payload),
        "ping": handle_ping,
        "shutdown": handle_shutdown,
    }

    handler = handlers.get(msg_type)
    if handler:
        handler()
    else:
        send("error", {"code": "UNKNOWN", "message": f"Unknown message type: {msg_type}"})


def main():
    """Main loop — read messages from input_queue, dispatch messages."""
    while True:
        try:
            msg = input_queue.get(timeout=0.1)
            dispatch(msg)
        except queue.Empty:
            continue
        except SystemExit:
            raise
        except Exception as e:
            send("error", {"code": "UNKNOWN", "message": str(e)})
            traceback.print_exc(file=sys.stderr)


if __name__ == "__main__":
    main()

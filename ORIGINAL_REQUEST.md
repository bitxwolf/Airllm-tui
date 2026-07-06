# Original User Request

## Initial Request — 2026-07-05T20:22:51Z

Automate the testing of the `airllm-tui` engine by downloading `TinyLlama/TinyLlama-1.1B-Chat-v1.0` and verifying that the inference engine can initialize, load the model, and stream generated tokens.

Working directory: `C:\Users\vantr\Documents\antigravity\goofy-hawking`

## Requirements

### R1. Automated Test Script
A script must be created to programmatically invoke the `python/engine.py` interface or use the Node.js bridge to download `TinyLlama/TinyLlama-1.1B-Chat-v1.0` (non-gated, ~2.2 GB) and run a basic chat generation test.

### R2. Output Logging & Verification
The test execution must log the stdout/stderr of the engine to verify that the correct lifecycle events are received (such as `model_loading` progress, `model_ready`, `token` emissions, and `generation_done`).

## Acceptance Criteria

### Test Execution
- [ ] The test script downloads and initializes `TinyLlama/TinyLlama-1.1B-Chat-v1.0` successfully.
- [ ] At least one prompt is successfully run through the model, and streamed output tokens are captured.
- [ ] The telemetry data (VRAM, layers parsed) is successfully received and parsed.
- [ ] The script finishes with exit code 0 on success, and logs all test outputs to a file.

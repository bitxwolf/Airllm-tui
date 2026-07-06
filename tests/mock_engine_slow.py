import sys
import json
import time
import threading
import queue

msg_queue = queue.Queue()
interrupt_event = threading.Event()

def stdin_reader():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
            if msg.get("type") == "interrupt":
                interrupt_event.set()
            else:
                msg_queue.put(msg)
        except Exception:
            pass

# Start the reader thread
threading.Thread(target=stdin_reader, daemon=True).start()

def send(msg_type, payload=None):
    msg = {"type": msg_type}
    if payload is not None:
        msg["payload"] = payload
    sys.stdout.write(json.dumps(msg) + "\n")
    sys.stdout.flush()

def main():
    while True:
        try:
            msg = msg_queue.get(timeout=0.1)
            msg_type = msg.get("type", "")
            payload = msg.get("payload", {})

            if msg_type == "ping":
                send("pong")
            elif msg_type == "load_model":
                send("model_loading", {"progress": 0.5, "stage": "Loading"})
                time.sleep(0.5)
                send("model_ready", {"model_id": payload.get("model_id"), "device": "cpu", "layers": 10})
            elif msg_type == "generate":
                interrupt_event.clear()
                # Print tokens slowly
                for i in range(5):
                    if interrupt_event.is_set():
                        send("interrupted")
                        break
                    send("token", {"text": f"token_{i}"})
                    time.sleep(1.0)
                else:
                    send("generation_done", {"tokens_generated": 5, "total_ms": 5000})
            elif msg_type == "shutdown":
                sys.exit(0)
        except queue.Empty:
            continue
        except SystemExit:
            raise
        except Exception as e:
            send("error", {"code": "UNKNOWN", "message": str(e)})

if __name__ == "__main__":
    main()

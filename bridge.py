"""
Local log bridge for SENTINEL Live Lab.
Reads Cowrie JSONL events and sends a sanitized subset to your hosted dashboard.
Run this only for your own authorized lab. It never opens network ports.
"""
import json
import os
import time
import urllib.request
import urllib.error

DASHBOARD_URL = os.environ.get("SENTINEL_URL", "").rstrip("/")
INGEST_TOKEN = os.environ.get("SENTINEL_INGEST_TOKEN", "")
COWRIE_LOG = os.environ.get("COWRIE_JSON_LOG", "./cowrie.json")
POLL_SECONDS = 2

if not DASHBOARD_URL.startswith("https://"):
    raise SystemExit("Set SENTINEL_URL to your HTTPS hosted dashboard URL.")
if not INGEST_TOKEN:
    raise SystemExit("Set SENTINEL_INGEST_TOKEN in your local environment.")
if not os.path.isfile(COWRIE_LOG):
    raise SystemExit("Cowrie JSON log not found. Set COWRIE_JSON_LOG to the real log path.")

def send_event(event):
    # Only send fields needed for the dashboard. The server masks source IPs.
    payload = {
        "eventid": event.get("eventid", "cowrie.event"),
        "timestamp": event.get("timestamp"),
        "src_ip": event.get("src_ip"),
        "protocol": event.get("protocol"),
        "message": event.get("message", "")
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        DASHBOARD_URL + "/api/ingest",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + INGEST_TOKEN
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            return response.status in (200, 201)
    except (urllib.error.URLError, TimeoutError) as exc:
        print("Upload failed:", exc)
        return False

print("SENTINEL bridge started. Watching:", COWRIE_LOG)
print("Stop with Ctrl+C. Only sanitized event fields are uploaded.")
# Tail a JSON-lines log. Existing lines are skipped so old events aren't re-uploaded.
with open(COWRIE_LOG, "r", encoding="utf-8", errors="replace") as log:
    log.seek(0, os.SEEK_END)
    while True:
        line = log.readline()
        if not line:
            time.sleep(POLL_SECONDS)
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if send_event(event):
            print("Uploaded:", event.get("eventid", "event"), event.get("timestamp", ""))

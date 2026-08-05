import json, os, subprocess, tempfile
from pathlib import Path
from urllib.request import Request, urlopen
import websocket

MAIN_URL = os.environ.get("MAIN_URL", "ws://127.0.0.1:8081")
MASTER_HTTP = os.environ.get("MASTER_HTTP", MAIN_URL.replace("ws://", "http://").replace("wss://", "https://"))
TOKEN = os.environ["RENDER_TOKEN"]
BLEND = os.environ.get("BLEND_FILE", "synaptic_garden.blend")

def upload(frame, filename):
    req = Request(f"{MASTER_HTTP}/frames/{frame}", data=Path(filename).read_bytes(), method="PUT", headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "image/png"})
    with urlopen(req, timeout=120) as response:
        if response.status not in (200, 201): raise RuntimeError(f"upload failed: {response.status}")

def on_message(ws, raw):
    data = json.loads(raw)
    if data["type"] == "WAIT": ws.send(json.dumps({"type": "READY_FOR_TASK"})); return
    if data["type"] != "RENDER_CHUNK": return
    start, end = data["start"], data["end"]
    with tempfile.TemporaryDirectory(prefix="m3on-render-") as directory:
        prefix = str(Path(directory) / "frame_")
        cmd = ["blender", "-b", BLEND, "-s", str(start), "-e", str(end), "-o", prefix, "-F", "PNG", "-a"]
        result = subprocess.run(cmd, check=False)
        if result.returncode != 0: raise RuntimeError(f"Blender failed: {result.returncode}")
        for frame in range(start, end + 1): upload(frame, f"{prefix}{frame:04d}.png")
    ws.send(json.dumps({"type": "CHUNK_COMPLETED", "startFrame": start, "endFrame": end}))
    ws.send(json.dumps({"type": "READY_FOR_TASK"}))

def on_open(ws): ws.send(json.dumps({"type": "READY_FOR_TASK"}))
headers = [f"Authorization: Bearer {TOKEN}"]
websocket.WebSocketApp(MAIN_URL, header=headers, on_open=on_open, on_message=on_message).run_forever()

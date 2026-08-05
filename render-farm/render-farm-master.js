"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT || 8081);
const TOKEN = process.env.RENDER_TOKEN;
const TOTAL_FRAMES = Number(process.env.TOTAL_FRAMES || 3600);
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE || 60);
const LEASE_MS = Number(process.env.LEASE_MS || 10 * 60 * 1000);
const ROOT = path.resolve(process.env.FRAME_DIR || "./frames");
const OUTPUT = path.resolve(process.env.OUTPUT || "./output/Synaptic_Garden_Tech_Dancer.mp4");
const AUDIO = process.env.AUDIO_FILE ? path.resolve(process.env.AUDIO_FILE) : null;

if (!TOKEN) throw new Error("Set RENDER_TOKEN before starting the master");
fs.mkdirSync(ROOT, { recursive: true });
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

const tasks = new Map();
for (let start = 1; start <= TOTAL_FRAMES; start += CHUNK_SIZE) {
  const end = Math.min(start + CHUNK_SIZE - 1, TOTAL_FRAMES);
  tasks.set(`${start}-${end}`, { start, end, state: "queued", worker: null, leaseUntil: 0 });
}

function authorized(req) {
  return req.headers.authorization === `Bearer ${TOKEN}`;
}
function framePath(n) { return path.join(ROOT, `frame_${String(n).padStart(4, "0")}.png`); }
function taskFor(start, end) { return tasks.get(`${start}-${end}`); }
function nextTask(worker) {
  const now = Date.now();
  for (const task of tasks.values()) {
    if (task.state === "queued" || (task.state === "running" && task.leaseUntil < now)) {
      task.state = "running"; task.worker = worker; task.leaseUntil = now + LEASE_MS; return task;
    }
  }
  return null;
}
function allComplete() { return [...tasks.values()].every(t => t.state === "completed"); }
function framesPresent(task) {
  for (let n = task.start; n <= task.end; n++) if (!fs.existsSync(framePath(n))) return false;
  return true;
}
function renderVideo() {
  const args = ["-y", "-framerate", "60", "-start_number", "1", "-i", path.join(ROOT, "frame_%04d.png")];
  if (AUDIO) args.push("-i", AUDIO);
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p");
  if (AUDIO) args.push("-c:a", "aac", "-shortest");
  args.push(OUTPUT);
  const child = spawn("ffmpeg", args, { stdio: "inherit" });
  child.on("close", code => {
    if (code !== 0) return console.error(`FFmpeg failed with exit code ${code}`);
    const hash = crypto.createHash("sha256").update(fs.readFileSync(OUTPUT)).digest("hex");
    fs.writeFileSync(`${OUTPUT}.sha256`, `${hash}  ${path.basename(OUTPUT)}\n`);
    console.log(`Rendered: ${OUTPUT}\nSHA-256: ${hash}`);
  });
}

const server = http.createServer((req, res) => {
  if (!authorized(req)) { res.writeHead(401); return res.end("Unauthorized\n"); }
  const match = req.url.match(/^\/frames\/(\d+)$/);
  if (req.method !== "PUT" || !match) { res.writeHead(404); return res.end("Not found\n"); }
  const n = Number(match[1]);
  if (n < 1 || n > TOTAL_FRAMES) { res.writeHead(400); return res.end("Invalid frame\n"); }
  const tmp = `${framePath(n)}.${crypto.randomUUID()}.tmp`;
  const out = fs.createWriteStream(tmp);
  req.pipe(out);
  out.on("finish", () => { fs.renameSync(tmp, framePath(n)); res.writeHead(201); res.end("stored\n"); });
  out.on("error", err => { try { fs.unlinkSync(tmp); } catch {} res.writeHead(500); res.end(`${err}\n`); });
});

const wss = new WebSocket.Server({ noServer: true, maxPayload: 1024 * 1024 });
server.on("upgrade", (req, socket, head) => {
  if (!authorized(req)) return socket.destroy();
  wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
});
wss.on("connection", ws => {
  const worker = crypto.randomUUID();
  ws.on("message", raw => {
    let data; try { data = JSON.parse(raw); } catch { return ws.close(1003, "Invalid JSON"); }
    if (data.type === "READY_FOR_TASK") {
      const task = nextTask(worker);
      ws.send(JSON.stringify(task ? { type: "RENDER_CHUNK", ...task } : { type: allComplete() ? "ALL_TASKS_COMPLETED" : "WAIT" }));
    } else if (data.type === "CHUNK_COMPLETED") {
      const task = taskFor(Number(data.startFrame), Number(data.endFrame));
      if (!task || task.worker !== worker || !framesPresent(task)) return ws.close(1008, "Invalid task completion");
      task.state = "completed"; task.leaseUntil = 0;
      console.log(`Completed ${task.start}-${task.end} by ${worker}`);
      if (allComplete()) renderVideo();
    }
  });
});
server.listen(PORT, "0.0.0.0", () => console.log(`Render master listening on ${PORT}`));

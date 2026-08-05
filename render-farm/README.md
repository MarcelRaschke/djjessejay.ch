# M3•0N Render Farm

## Master

```bash
npm install ws
export RENDER_TOKEN='replace-with-a-long-random-token'
export AUDIO_FILE=/path/to/audio.wav   # optional
node render-farm-master.js
```

## Worker

```bash
pip install websocket-client
export RENDER_TOKEN='same-token-as-master'
export MAIN_URL='ws://MASTER_HOST:8081'
export MASTER_HTTP='http://MASTER_HOST:8081'
export BLEND_FILE=/path/to/synaptic_garden.blend
python3 render-worker.py
```

Use a VPN/private network or TLS reverse proxy for production. Do not expose the plain `ws://` endpoint directly to the Internet.

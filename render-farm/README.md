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

## Production: TLS reverse proxy (wss://) with token injection

The master authorizes every HTTP and WebSocket upgrade with a bearer token
(`Authorization: Bearer $RENDER_TOKEN`). Browsers cannot set the
`Authorization` header on a `WebSocket`, so for browser/frontend access you
must terminate TLS in a reverse proxy that injects the token on the proxied
request. The browser then connects to `wss://` and never sees the token.

1. Start the master bound to localhost (recommended in production):

   ```bash
   npm install ws
   export RENDER_TOKEN='replace-with-a-long-random-token'
   node render-farm/render-farm-master.js
   # Note: render-farm-master.js listens on 0.0.0.0 by default. In production,
   # bind it to 127.0.0.1 (e.g. patch the listen() call or run it behind a
   # firewall) so only the reverse proxy can reach it.
   ```

2. Install and configure nginx from the included example:

   ```bash
   sudo cp render-farm/nginx/wss-proxy.conf.example /etc/nginx/conf.d/render-farm.conf
   ```

3. Create the token file (NOT committed to the repo) defining the
   `$render_token` nginx variable, using the SAME value as `RENDER_TOKEN`:

   ```bash
   TOKEN="$(head -c 32 /dev/urandom | base64)"
   echo "map \$http_host \$render_token { default "$TOKEN"; }"      | sudo tee /etc/nginx/render_farm_token.conf
   sudo chown root:root /etc/nginx/render_farm_token.conf
   sudo chmod 0400 /etc/nginx/render_farm_token.conf
   # Start the master with the matching token:
   export RENDER_TOKEN="$TOKEN"
   ```

4. Provide a TLS certificate (e.g. via Let's Encrypt / certbot) at the paths in
   the config, set `server_name`, then:

   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

5. Point the frontend at the public `wss://` endpoint by setting
   `window.RENDER_FARM_WS_URL` BEFORE `js/render-farm-client.js` loads, e.g. in
   `index.html`:

   ```html
   <script>window.RENDER_FARM_WS_URL = 'wss://render.example.com';</script>
   <script src="js/render-farm-client.js" defer></script>
   ```

If unset, the client defaults to `ws://127.0.0.1:8081`, which is only
reachable on the visitor's own machine (useful for local development).

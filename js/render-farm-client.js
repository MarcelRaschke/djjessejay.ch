// DJ Jesse Jay Website Scripts
// Since 1997 the progressive music attack from Zürich
//
// Render farm monitor client.
// Connects the browser to the local render-farm master WebSocket
// (ws://127.0.0.1:8081) so the page can observe live render progress when the
// master is running locally. The connection is best-effort: if the master is
// not running the client silently retries in the background and never throws,
// so the public website keeps working unchanged.
//
// NOTE: the render-farm master authorizes WebSocket upgrades with a bearer
// token, and the browser WebSocket API cannot set the Authorization header.
// This client therefore only opens an unauthenticated observation channel;
// it does not request or accept render tasks. Production deployments must
// front the master with a TLS reverse proxy that injects the token and exposes
// wss:// (see render-farm/README.md).
(function () {
    'use strict';

    // Only run in a browser environment with WebSocket support.
    if (typeof window === 'undefined' || typeof window.WebSocket !== 'function') {
        return;
    }

    // Avoid duplicate clients if the script is included more than once.
    if (window.__renderFarmClient) {
        return;
    }
    window.__renderFarmClient = true;

    // The WebSocket endpoint of the render-farm master.
    //
    // Local development: ws://127.0.0.1:8081 (only reachable on the
    // visitor's own machine). For production, set
    // window.RENDER_FARM_WS_URL = 'wss://render.example.com' BEFORE this
    // script loads (e.g. in an inline <script> in index.html), pointing at
    // the TLS reverse proxy that injects the bearer token. See
    // render-farm/README.md and render-farm/nginx/wss-proxy.conf.example.
    var RENDER_WS_URL = window.RENDER_FARM_WS_URL || 'ws://127.0.0.1:8081';
    var CONNECT_DELAY_MS = 2000;   // initial delay before first attempt
    var MAX_BACKOFF_MS = 30000;    // cap exponential reconnect backoff
    var backoff = CONNECT_DELAY_MS;
    var reconnectTimer = null;
    var socket = null;
    var stopped = false;

    function scheduleReconnect() {
        if (stopped || reconnectTimer) {
            return;
        }
        reconnectTimer = window.setTimeout(connect, backoff);
        // Exponential backoff with jitter, capped.
        backoff = Math.min(MAX_BACKOFF_MS, Math.round(backoff * 1.5));
    }

    function connect() {
        reconnectTimer = null;

        try {
            socket = new WebSocket(RENDER_WS_URL);
        } catch (err) {
            scheduleReconnect();
            return;
        }

        socket.onopen = function () {
            // Connection established to the local render master.
            backoff = CONNECT_DELAY_MS;
            window.dispatchEvent(new CustomEvent('renderfarm:connect'));
        };

        socket.onmessage = function (event) {
            var data;
            try {
                data = JSON.parse(event.data);
            } catch (err) {
                return; // ignore non-JSON frames
            }
            window.dispatchEvent(new CustomEvent('renderfarm:message', { detail: data }));
        };

        socket.onerror = function () {
            // Errors are expected when the master is offline; onclose handles retry.
            window.dispatchEvent(new CustomEvent('renderfarm:error'));
        };

        socket.onclose = function () {
            socket = null;
            window.dispatchEvent(new CustomEvent('renderfarm:disconnect'));
            scheduleReconnect();
        };
    }

    // Defer the first connection until the document is interactive so the
    // client never blocks initial page rendering.
    function start() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                window.setTimeout(connect, CONNECT_DELAY_MS);
            });
        } else {
            window.setTimeout(connect, CONNECT_DELAY_MS);
        }
    }

    // Public, minimal API for the page to opt out (e.g. on pagehide).
    window.renderFarmClient = {
        url: RENDER_WS_URL,
        stop: function () {
            stopped = true;
            if (reconnectTimer) {
                window.clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            if (socket) {
                try { socket.close(); } catch (err) { /* noop */ }
                socket = null;
            }
        }
    };

    // Stop reconnecting when the page is being discarded.
    window.addEventListener('pagehide', function () {
        if (window.renderFarmClient) {
            window.renderFarmClient.stop();
        }
    });

    start();
})();

// vercel-admin/api/_pairHandler.js
// 👑 AWAIS CYBER — Vercel reverse-proxy for the Pairing Dashboard (pair.html).
//
// The pairing page needs a LIVE socket.io connection to show the QR /
// pairing code updating in real time. Vercel serverless functions can't
// hold that kind of persistent connection open themselves, so instead:
// this proxy serves the page's HTML/CSS/JS through Vercel (so you get a
// nice Vercel URL), but rewrites the page's socket.io client to connect
// DIRECTLY (browser → your real backend, cross-origin) for the live
// data — that part genuinely needs to talk straight to a real always-on
// server. Your backend's socket.io already allows cross-origin (CORS
// is open) so this works out of the box.
//
// Multi-server: which backend this proxies to is resolved per-request
// (via the ?server= query param, or the cookie set on the picker page)
// — see _resolveBackend.js — so one Vercel deployment can front any
// number of separately-hosted bots.

const { resolveBackend } = require('./_resolveBackend');

function switcherBadge(servers, currentIndex) {
    if (servers.length <= 1) return '';
    const name = servers[currentIndex]?.name || 'Unknown';
    return `<div style="position:fixed;bottom:14px;right:14px;z-index:9999;font-family:monospace;font-size:11px;background:#0c0f18;border:1px solid rgba(120,150,255,0.3);color:#eaf0ff;padding:8px 12px;border-radius:20px;">
        🖥️ ${name} · <a href="/switch" style="color:#00ffb3;">switch</a>
    </div>`;
}

module.exports = async function pairHandler(req, res) {
    const { servers, index, url: backend } = resolveBackend(req);

    if (!backend) {
        if (servers.length === 0) {
            res.status(500).send('No backend servers configured. Set BACKEND_URL or BACKEND_SERVERS in your Vercel project\'s Environment Variables.');
        } else {
            res.writeHead(302, { Location: '/' }); // multiple servers, none selected — send to picker
            res.end();
        }
        return;
    }
    const cleanBackend = backend.replace(/\/$/, '');

    const segments = req.query.path
        ? (Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path)
        : '';
    const search = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrl = `${cleanBackend}${segments ? '/' + segments : '/'}${search}`;

    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];
    delete headers.connection;

    const fetchOpts = { method: req.method, headers, redirect: 'manual' };
    if (!['GET', 'HEAD'].includes(req.method)) {
        fetchOpts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    try {
        const backendRes = await fetch(targetUrl, fetchOpts);
        const contentType = backendRes.headers.get('content-type') || 'text/plain';
        res.status(backendRes.status);

        if (contentType.includes('text/html')) {
            let html = await backendRes.text();
            // Point the live pairing socket straight at the real backend.
            html = html.replace(
                'const socket = io();',
                `const socket = io("${cleanBackend}", { transports: ["websocket", "polling"] });`
            );
            html = html.replace('</body>', switcherBadge(servers, index) + '</body>');
            res.setHeader('Content-Type', contentType);
            res.send(html);
        } else {
            res.setHeader('Content-Type', contentType);
            res.send(await backendRes.text());
        }
    } catch (err) {
        res.status(502).send('Could not reach backend at ' + backend + '. Error: ' + err.message);
    }
};

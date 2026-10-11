// vercel-admin/api/_proxyHandler.js
// 👑 AWAIS CYBER — Vercel reverse-proxy for the Admin Panel.
//
// IMPORTANT: The WhatsApp bot itself (Baileys socket) CANNOT run on
// Vercel — Vercel functions are serverless and stateless, they can't
// hold a persistent WhatsApp connection open. The bot must run on a
// real always-on host (Railway, Replit, Heroku, Katabump, Termux, a VPS...).
//
// What THIS does: it lets you open your Admin Panel at a nice Vercel
// URL. Every request to /admin/* on this Vercel deployment is
// transparently forwarded to your real bot backend's /admin/* route
// (cookies, method, and body included), so the exact same login +
// dashboard pages work here too — no duplicate code to maintain.
//
// Multi-server: which backend this proxies to is resolved per-request
// (via the ?server= query param, or the cookie set on the picker page)
// — see _resolveBackend.js — so one Vercel deployment can front any
// number of separately-hosted bots' admin panels.

const { resolveBackend } = require('./_resolveBackend');

function switcherBadge(servers, currentIndex) {
    if (servers.length <= 1) return '';
    const name = servers[currentIndex]?.name || 'Unknown';
    return `<div style="position:fixed;bottom:14px;right:14px;z-index:9999;font-family:monospace;font-size:11px;background:#0c0f18;border:1px solid rgba(120,150,255,0.3);color:#eaf0ff;padding:8px 12px;border-radius:20px;">
        🖥️ ${name} · <a href="/switch" style="color:#00ffb3;">switch</a>
    </div>`;
}

module.exports = async function proxyHandler(req, res) {
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

    const segments = req.query.path
        ? (Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path)
        : '';
    const search = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrl = `${backend.replace(/\/$/, '')}/admin${segments ? '/' + segments : ''}${search}`;

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
        const setCookie = backendRes.headers.get('set-cookie');
        if (setCookie) res.setHeader('Set-Cookie', setCookie);

        const contentType = backendRes.headers.get('content-type') || 'text/plain';
        res.setHeader('Content-Type', contentType);
        res.status(backendRes.status);

        if (contentType.includes('text/html')) {
            let html = await backendRes.text();
            html = html.replace('</body>', switcherBadge(servers, index) + '</body>');
            res.send(html);
        } else {
            const data = await backendRes.text();
            res.send(data);
        }
    } catch (err) {
        res.status(502).send('Could not reach backend at ' + backend + '. Is your bot host running? Error: ' + err.message);
    }
};

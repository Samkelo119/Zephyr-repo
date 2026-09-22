const cookie = require('./_cookie');
const { getServers } = require('./_servers');
const { resolveBackend, COOKIE_NAME } = require('./_resolveBackend');
const { renderSelectorHtml } = require('./_selectorPage');

module.exports = async function (req, res) {
    const servers = getServers();

    if (servers.length === 0) {
        res.status(500).send('No backend servers configured. Set BACKEND_URL (single server) or BACKEND_SERVERS (JSON array, multiple servers) in your Vercel project\'s Environment Variables.');
        return;
    }

    const { index } = resolveBackend(req);

    if (index !== null) {
        // Already have a selection (cookie, or the only server) — go straight to pairing.
        res.writeHead(302, { Location: '/pair' });
        res.end();
        return;
    }

    if (servers.length === 1) {
        res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '0', { maxAge: 60 * 60 * 24 * 365 }));
        res.writeHead(302, { Location: '/pair' });
        res.end();
        return;
    }

    // Multiple servers, none selected yet — show the picker.
    res.setHeader('Content-Type', 'text/html');
    res.send(renderSelectorHtml(servers));
};

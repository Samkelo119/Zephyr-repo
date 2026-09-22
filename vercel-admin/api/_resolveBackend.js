// vercel-admin/api/_resolveBackend.js
// 👑 AWAIS CYBER — Decides which configured backend server a given
// request should use: an explicit ?server= query param wins, then a
// previously-saved cookie (from picking one on the selector page),
// then — if only one server is configured — that one automatically.
// Returns null if nothing can be resolved (caller should show the
// server picker in that case).

const cookie = require('./_cookie');
const { getServers } = require('./_servers');

const COOKIE_NAME = 'awais_selected_server';

function resolveBackend(req) {
    const servers = getServers();
    if (servers.length === 0) return { servers, index: null, url: null };

    let idx = req.query && req.query.server !== undefined ? String(req.query.server) : undefined;
    if (idx === undefined) {
        const cookies = cookie.parse(req.headers.cookie || '');
        idx = cookies[COOKIE_NAME];
    }
    if (idx === undefined && servers.length === 1) idx = '0';

    const i = parseInt(idx, 10);
    const server = Number.isInteger(i) && servers[i] ? servers[i] : null;
    return { servers, index: server ? i : null, url: server ? server.url : null };
}

module.exports = { resolveBackend, COOKIE_NAME };

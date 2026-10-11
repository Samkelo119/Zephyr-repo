// vercel-admin/api/_servers.js
// 👑 AWAIS CYBER — Multi-server config for the Vercel proxy.
//
// Lets you register more than one bot backend (e.g. one deployed on
// Railway, another on Replit, another on Heroku) and pick which one
// this Vercel deployment talks to, right from the browser — no
// redeploying, no editing code.
//
// Configure via Vercel environment variables, ONE of:
//
//   BACKEND_SERVERS = [{"name":"Railway Main","url":"https://mybot.up.railway.app"},{"name":"Replit Backup","url":"https://mybot.username.repl.co"}]
//
//   — a JSON array, any number of servers, each needs "name" and "url".
//
// OR, for just one server (simplest case), plain:
//
//   BACKEND_URL = https://mybot.up.railway.app

function getServers() {
    if (process.env.BACKEND_SERVERS) {
        try {
            const parsed = JSON.parse(process.env.BACKEND_SERVERS);
            if (Array.isArray(parsed) && parsed.length) {
                return parsed
                    .filter(s => s && s.url)
                    .map((s, i) => ({ name: s.name || `Server ${i + 1}`, url: String(s.url).replace(/\/+$/, '') }));
            }
        } catch (e) { /* fall through to single-server / empty */ }
    }
    if (process.env.BACKEND_URL) {
        return [{ name: 'Default', url: process.env.BACKEND_URL.replace(/\/+$/, '') }];
    }
    return [];
}

module.exports = { getServers };

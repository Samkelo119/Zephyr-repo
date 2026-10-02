// lib/pairAdmin.js
// Admin panel for the public pairing website (pair.html).
//
// Login is fixed (overridable via env PAIR_ADMIN_USER / PAIR_ADMIN_PASS) and
// guarded by an httpOnly session cookie. Once logged in the panel lists every
// paired number and lets the operator drill into a single WhatsApp account to
// see its live status, settings, groups, stats and activity log.

const crypto = require('crypto');
const cookie = require('./cookie');

const COOKIE_NAME = 'zephyr_pair_admin';
const ADMIN_USER = process.env.PAIR_ADMIN_USER || 'SAMKELO';
const ADMIN_PASS = process.env.PAIR_ADMIN_PASS || 'MRDIEHARD';
const SESSION_TTL = 12 * 60 * 60 * 1000; // 12h

const tokens = new Map(); // token -> expiry ms

function makeToken() {
    const t = crypto.randomBytes(24).toString('hex');
    tokens.set(t, Date.now() + SESSION_TTL);
    return t;
}

function tokenValid(t) {
    const exp = tokens.get(t);
    if (!exp) return false;
    if (exp < Date.now()) { tokens.delete(t); return false; }
    return true;
}

function requireAuth(req, res, next) {
    const cookies = cookie.parse(req.headers.cookie || '');
    if (!tokenValid(cookies[COOKIE_NAME])) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    next();
}

function noCache(req, res, next) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('X-Content-Type-Options', 'nosniff');
    next();
}

function cleanNum(v) {
    let s = String(v || '');
    if (s.startsWith('zephyr_')) s = s.slice('zephyr_'.length);
    return s.split('@')[0].split(':')[0].split('_')[0];
}

function groupCount(data) {
    const set = new Set();
    for (const key of ['welcomeGroups', 'goodbyeGroups', 'antilinkGroups', 'groupRules',
        'mutedUsers', 'filterWords', 'slowMode', 'autoResponders', 'antiSticker',
        'antiPicture', 'antiVideo', 'antiText', 'antiBadword', 'knownGroups']) {
        const obj = data && data[key];
        if (obj && typeof obj === 'object') {
            for (const k of Object.keys(obj)) set.add(k);
        }
    }
    return set.size;
}

function safeSlice(obj, max) {
    if (!obj || typeof obj !== 'object') return {};
    const keys = Object.keys(obj);
    const out = {};
    for (const k of keys.slice(0, max)) out[k] = obj[k];
    return out;
}

function registerPairAdmin(app, ctx) {
    const { sessions, botData, userLogs, globalLogBuffer } = ctx;

    function summary(id) {
        const s = sessions[id];
        const d = (s && s.data) || {};
        const rt = (botData.sessionRuntime && botData.sessionRuntime[id]) || {};
        return {
            id,
            number: cleanNum((s && s.pairedNumber) || rt.number || id),
            connected: !!(s && s.isConnected),
            isPublic: s ? s.isPublic : null,
            autoReact: s ? s.autoReact : null,
            aiEnabled: s ? s.aiEnabled : null,
            pairedAt: (s && s.pairedAt) || rt.pairedAt || null,
            runtimeMs: s && typeof s.getRuntimeMs === 'function' ? s.getRuntimeMs() : 0,
            groups: groupCount(d),
            warnings: Object.keys(d.warnings || {}).length,
            commandsRun: Object.keys(d.commandStats || {}).length
        };
    }

    function detail(id) {
        const base = summary(id);
        const s = sessions[id];
        const d = (s && s.data) || {};
        return {
            ...base,
            settings: d.settings || {},
            channelReact: d.channelReact || null,
            welcomeGroups: safeSlice(d.welcomeGroups, 200),
            goodbyeGroups: safeSlice(d.goodbyeGroups, 200),
            antilinkGroups: safeSlice(d.antilinkGroups, 200),
            groupRules: safeSlice(d.groupRules, 200),
            warnings: safeSlice(d.warnings, 200),
            commandStats: safeSlice(d.commandStats, 300),
            chatStats: safeSlice(d.chatStats, 300),
            premiumUsers: safeSlice(d.premiumUsers, 200),
            statusSettings: (botData.statusSettings && botData.statusSettings[id]) || {},
            logs: (userLogs && userLogs[id]) ? userLogs[id].slice(-300) : []
        };
    }

    app.use('/api/admin', noCache);

    app.post('/api/admin/login', (req, res) => {
        const { username, password } = req.body || {};
        if (String(username || '').trim() !== ADMIN_USER || String(password || '') !== ADMIN_PASS) {
            return res.status(401).json({ ok: false, error: 'Invalid username or password.' });
        }
        const token = makeToken();
        res.set('Set-Cookie', cookie.serialize(COOKIE_NAME, token, {
            httpOnly: true, sameSite: 'Lax', maxAge: Math.floor(SESSION_TTL / 1000), path: '/'
        }));
        res.json({ ok: true });
    });

    app.post('/api/admin/logout', (req, res) => {
        const cookies = cookie.parse(req.headers.cookie || '');
        tokens.delete(cookies[COOKIE_NAME]);
        res.set('Set-Cookie', cookie.serialize(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 }));
        res.json({ ok: true });
    });

    app.get('/api/admin/check', requireAuth, (req, res) => res.json({ ok: true }));

    app.use('/api/admin', requireAuth);

    app.get('/api/admin/sessions', (req, res) => {
        const list = Object.keys(sessions).map(summary);
        list.sort((a, b) => (b.connected - a.connected) || (b.pairedAt || 0) - (a.pairedAt || 0));
        res.json({
            ok: true,
            total: list.length,
            connected: list.filter(x => x.connected).length,
            sessions: list
        });
    });

    app.get('/api/admin/session/:id', (req, res) => {
        const id = req.params.id;
        if (!sessions[id]) return res.status(404).json({ ok: false, error: 'not found' });
        res.json({ ok: true, account: detail(id) });
    });

    app.get('/api/admin/session/:id/logs', (req, res) => {
        const id = req.params.id;
        const logs = (userLogs && userLogs[id]) ? userLogs[id].slice(-300) : [];
        if (logs.length === 0 && globalLogBuffer) {
            return res.json({ ok: true, logs: globalLogBuffer.filter(l => l.userId === id).slice(-300) });
        }
        res.json({ ok: true, logs });
    });

    // Allow the socket layer to know an admin is connected (used for live logs).
    return { isAdminToken: tokenValid };
}

module.exports = { registerPairAdmin };

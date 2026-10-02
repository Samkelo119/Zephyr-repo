// lib/adminPanel.js
// 👑 AWAIS CYBER — Admin Panel backend.
// Password-protected control center: ban/unban, feature toggles,
// menu images, and API key management — all live, no redeploy needed.

const path = require('path');
const multer = require('multer');
const cookie = require('./cookie');
const auth = require('./adminAuth');
const apiKeys = require('./apiKeys');
const commandConfig = require('./commandConfig');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 64 * 1024 * 1024 } }); // 64MB cap

const COOKIE_NAME = 'awais_admin_session';

function getClientIp(req) {
    return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString().split(',')[0].trim();
}

function noCache(req, res, next) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-Content-Type-Options', 'nosniff');
    next();
}

function requireAuth(req, res, next) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies[COOKIE_NAME];
    if (!auth.verifySession(token)) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    next();
}

function maskKey(v) {
    if (!v) return '';
    if (v.length <= 4) return '****';
    return '*'.repeat(Math.max(0, v.length - 4)) + v.slice(-4);
}

function registerAdminPanel(app, ctx) {
    const { botData, saveBotData, sessions, onApiKeyChange, customCommands, globalLogBuffer, sock: getSock } = ctx;
    const publicDir = path.join(__dirname, '..', 'admin-panel');

    app.use('/admin', noCache);

    // ---- pages ----
    app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
    app.get('/admin/dashboard', (req, res) => res.sendFile(path.join(publicDir, 'dashboard.html')));

    // ---- auth ----
    app.post('/admin/api/login', (req, res) => {
        const ip = getClientIp(req);
        if (auth.isLocked(ip)) {
            return res.status(429).json({ ok: false, error: `Too many attempts. Try again in a few minutes.` });
        }
        const { password } = req.body || {};
        if (!auth.verifyPassword(password)) {
            auth.recordFailure(ip);
            return res.status(401).json({ ok: false, error: 'Wrong password.' });
        }
        auth.recordSuccess(ip);
        const token = auth.createSession();
        res.set('Set-Cookie', cookie.serialize(COOKIE_NAME, token, {
            httpOnly: true, sameSite: 'Lax', maxAge: 12 * 60 * 60, path: '/'
        }));
        res.json({ ok: true });
    });

    app.post('/admin/api/logout', (req, res) => {
        const cookies = cookie.parse(req.headers.cookie || '');
        auth.destroySession(cookies[COOKIE_NAME]);
        res.set('Set-Cookie', cookie.serialize(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 }));
        res.json({ ok: true });
    });

    app.get('/admin/api/me', requireAuth, (req, res) => res.json({ ok: true }));

    // everything below requires a valid session
    app.use('/admin/api', requireAuth);

    // ---- overview ----
    app.get('/admin/api/overview', (req, res) => {
        const sessionIds = Object.keys(sessions);
        const connected = sessionIds.filter(id => sessions[id] && sessions[id].sock).length;
        res.json({
            ok: true,
            botName: require('../settings').botName,
            version: require('../settings').version,
            totalSessions: sessionIds.length,
            connectedSessions: connected,
            startedAt: botData.startedAt,
            uptimeSeconds: Math.floor((Date.now() - (botData.startedAt || Date.now())) / 1000),
            knownGroups: Object.keys(botData.knownGroups || {}).length,
            knownUsers: Object.keys(botData.knownUsers || {}).length,
            bannedUsers: Object.keys(botData.appBannedUsers || {}).length
        });
    });

    // ---- users / bans ----
    app.get('/admin/api/users', (req, res) => {
        const sessionIds = Object.keys(sessions);
        const users = sessionIds.map(id => ({
            userId: id,
            connected: !!(sessions[id] && sessions[id].sock),
            isPublic: sessions[id] ? sessions[id].isPublic : null,
            autoReact: sessions[id] ? sessions[id].autoReact : null,
            aiEnabled: sessions[id] ? sessions[id].aiEnabled : null,
            keepAliveDM: botData.statusSettings?.[id]?.keepAliveDM !== false,
            banned: !!(botData.appBannedUsers && botData.appBannedUsers[id])
        }));
        res.json({ ok: true, users, bannedList: Object.keys(botData.appBannedUsers || {}) });
    });

    app.post('/admin/api/ban', (req, res) => {
        const { jid } = req.body || {};
        if (!jid) return res.status(400).json({ ok: false, error: 'jid required' });
        if (!botData.appBannedUsers) botData.appBannedUsers = {};
        botData.appBannedUsers[jid] = true;
        saveBotData();
        res.json({ ok: true });
    });

    app.post('/admin/api/unban', (req, res) => {
        const { jid } = req.body || {};
        if (!jid) return res.status(400).json({ ok: false, error: 'jid required' });
        if (botData.appBannedUsers) delete botData.appBannedUsers[jid];
        saveBotData();
        res.json({ ok: true });
    });

    // ---- feature toggles (per connected session) ----
    app.post('/admin/api/features', (req, res) => {
        const { userId, key, value } = req.body || {};
        const allowedKeys = ['autoReact', 'aiEnabled', 'isPublic', 'keepAliveDM'];
        if (!userId || !allowedKeys.includes(key)) return res.status(400).json({ ok: false, error: 'invalid key' });
        if (!sessions[userId]) return res.status(404).json({ ok: false, error: 'session not found' });
        if (key !== 'keepAliveDM') sessions[userId][key] = !!value;
        if (!botData.statusSettings) botData.statusSettings = {};
        if (!botData.statusSettings[userId]) botData.statusSettings[userId] = {};
        botData.statusSettings[userId][key] = !!value;
        saveBotData();
        res.json({ ok: true });
    });

    // ---- global auto-typing / auto-recording / anti-call / anti-delete defaults ----
    app.get('/admin/api/global-settings', (req, res) => {
        res.json({ ok: true, settings: botData.globalFeatureDefaults || {} });
    });

    app.post('/admin/api/global-settings', (req, res) => {
        const { key, value } = req.body || {};
        if (!key) return res.status(400).json({ ok: false, error: 'key required' });
        if (!botData.globalFeatureDefaults) botData.globalFeatureDefaults = {};
        botData.globalFeatureDefaults[key] = value;
        saveBotData();
        res.json({ ok: true });
    });

    // ---- menu images ----
    app.get('/admin/api/menu-images', (req, res) => {
        res.json({ ok: true, images: botData.menuImages || [] });
    });

    app.post('/admin/api/menu-images', (req, res) => {
        const { url } = req.body || {};
        if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ ok: false, error: 'valid url required' });
        if (!botData.menuImages) botData.menuImages = [];
        botData.menuImages.push(url);
        saveBotData();
        res.json({ ok: true, images: botData.menuImages });
    });

    app.post('/admin/api/menu-images/delete', (req, res) => {
        const { url } = req.body || {};
        botData.menuImages = (botData.menuImages || []).filter(u => u !== url);
        saveBotData();
        res.json({ ok: true, images: botData.menuImages });
    });

    // ---- command usage stats ----
    app.get('/admin/api/stats', (req, res) => {
        const stats = botData.commandStats || {};
        const top = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 20);
        res.json({ ok: true, top, totalCommandsRun: Object.values(stats).reduce((a, b) => a + b, 0) });
    });

    // ---- backup / restore ----
    app.get('/admin/api/backup', (req, res) => {
        res.setHeader('Content-Disposition', `attachment; filename="botdata-backup-${Date.now()}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(botData, null, 2));
    });

    app.post('/admin/api/restore', (req, res) => {
        const incoming = req.body;
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
            return res.status(400).json({ ok: false, error: 'Invalid backup file — expected a JSON object.' });
        }
        Object.keys(botData).forEach(k => delete botData[k]);
        Object.assign(botData, incoming);
        saveBotData();
        res.json({ ok: true });
    });

    // ---- broadcast to all known groups ----
    app.post('/admin/api/broadcast', async (req, res) => {
        const { text } = req.body || {};
        if (!text) return res.status(400).json({ ok: false, error: 'text required' });
        const groupIds = Object.keys(botData.knownGroups || {});
        const activeSessionId = Object.keys(sessions).find(id => sessions[id] && sessions[id].sock);
        if (!activeSessionId) return res.status(400).json({ ok: false, error: 'No connected bot session to broadcast from.' });
        const sock = sessions[activeSessionId].sock;
        let sent = 0, failed = 0;
        for (const gid of groupIds) {
            try {
                await sock.sendMessage(gid, { text: `Announcement\n\n${text}\n\nPowered by 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋` });
                sent++;
            } catch (e) { failed++; }
            await new Promise(r => setTimeout(r, 1200)); // gentle pacing, avoid rate limits
        }
        res.json({ ok: true, sent, failed, total: groupIds.length });
    });

    // ---- API keys ----
    const KEY_INFO = {
        openaiApiKey: 'Used by: .ai (AI chat replies)',
        giphyApiKey: 'Reserved for future GIF commands',
        omdbApiKey: 'Used by: .movie',
        memeApiKey: 'Used by: .meme',
        songApiKey: 'Used by: .song (YouTube → MP3)'
    };

    app.get('/admin/api/apikeys', (req, res) => {
        const all = apiKeys.getAll();
        const keys = Object.keys(all).map(k => ({
            name: k,
            value: all[k] || '',
            info: KEY_INFO[k] || 'Custom key'
        }));
        res.json({ ok: true, keys });
    });

    app.post('/admin/api/apikeys', (req, res) => {
        const { key, value } = req.body || {};
        if (!key || typeof value !== 'string') return res.status(400).json({ ok: false, error: 'key and value required' });
        apiKeys.set(key, value);
        if (typeof onApiKeyChange === 'function') { try { onApiKeyChange(key, value); } catch (e) {} }
        res.json({ ok: true });
    });

    app.delete('/admin/api/apikeys/:key', (req, res) => {
        apiKeys.remove(req.params.key);
        res.json({ ok: true });
    });
    // ---- custom commands (Admin Panel "add your own command") ----
    app.get('/admin/api/custom-commands', (req, res) => {
        if (!customCommands) return res.json({ ok: true, commands: [] });
        res.json({ ok: true, commands: customCommands.list() });
    });

    app.post('/admin/api/custom-commands', (req, res) => {
        if (!customCommands) return res.status(500).json({ ok: false, error: 'Custom commands engine not available.' });
        const { name, code } = req.body || {};
        const result = customCommands.save(name, code);
        if (!result.ok) return res.status(400).json({ ok: false, error: result.error });
        res.json({ ok: true });
    });

    app.post('/admin/api/custom-commands/toggle', (req, res) => {
        if (!customCommands) return res.status(500).json({ ok: false, error: 'Custom commands engine not available.' });
        const { name, enabled } = req.body || {};
        const ok = customCommands.setEnabled(name, enabled);
        res.json({ ok });
    });

    app.delete('/admin/api/custom-commands/:name', (req, res) => {
        if (!customCommands) return res.status(500).json({ ok: false, error: 'Custom commands engine not available.' });
        customCommands.remove(req.params.name);
        res.json({ ok: true });
    });

    app.post('/admin/api/custom-commands/validate', (req, res) => {
        if (!customCommands) return res.status(500).json({ ok: false, error: 'Custom commands engine not available.' });
        const { code } = req.body || {};
        const result = customCommands.validateSyntax(code || '');
        res.json({ ok: true, valid: result.ok, error: result.error || null });
    });

    // ---- live logs ----
    app.get('/admin/api/logs', (req, res) => {
        res.json({ ok: true, logs: globalLogBuffer || [] });
    });

    // ---- group management ----
    app.get('/admin/api/groups', async (req, res) => {
        try {
            const activeId = Object.keys(sessions).find(id => sessions[id] && sessions[id].sock);
            if (!activeId) return res.json({ ok: true, groups: [] });
            const sock = sessions[activeId].sock;
            const groupIds = Object.keys(botData.knownGroups || {});
            const groups = [];
            for (const gid of groupIds) {
                try {
                    const meta = await sock.groupMetadata(gid);
                    groups.push({ id: gid, subject: meta.subject, participants: meta.participants.length });
                } catch (e) {
                    groups.push({ id: gid, subject: '(unavailable)', participants: 0 });
                }
            }
            res.json({ ok: true, groups });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    app.post('/admin/api/groups/leave', async (req, res) => {
        try {
            const { groupId } = req.body || {};
            const activeId = Object.keys(sessions).find(id => sessions[id] && sessions[id].sock);
            if (!activeId) return res.status(400).json({ ok: false, error: 'No connected session.' });
            await sessions[activeId].sock.groupLeave(groupId);
            if (botData.knownGroups) delete botData.knownGroups[groupId];
            saveBotData();
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ---- change admin panel password (persists across restarts) ----
    app.post('/admin/api/change-password', (req, res) => {
        const { newPassword } = req.body || {};
        if (!newPassword || newPassword.length < 6) return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters.' });
        auth.setPassword(newPassword);
        res.json({ ok: true });
    });

    // ---- restart the bot process ----
    // Works on hosts with a process manager that auto-restarts on exit
    // (Railway, Replit deployments, PM2, Docker restart policies). On
    // a bare `node index.js` with no supervisor, the process will just
    // stop — the panel explains this in the UI so it's not a surprise.
    app.post('/admin/api/restart', (req, res) => {
        res.json({ ok: true, note: 'Restarting — reconnect in a few seconds. If nothing comes back up, your host may not auto-restart the process.' });
        setTimeout(() => process.exit(0), 800);
    });

    // ---- DM broadcast — send text/photo/video/any file straight to
    // every individual user who has ever DM'd the bot (not groups —
    // see the Broadcast tab for that). This goes to people's private
    // chats, so use it sparingly; sending it is paced the same way as
    // the group broadcast to avoid hammering WhatsApp's rate limits.
    function getActiveSock() {
        const activeId = Object.keys(sessions).find(id => sessions[id] && sessions[id].sock);
        return activeId ? sessions[activeId].sock : null;
    }

    app.get('/admin/api/dm-users', (req, res) => {
        const users = Object.keys(botData.knownUsers || {});
        res.json({ ok: true, count: users.length, users });
    });

    app.post('/admin/api/dm-broadcast/text', async (req, res) => {
        const { text } = req.body || {};
        if (!text) return res.status(400).json({ ok: false, error: 'text required' });
        const sock = getActiveSock();
        if (!sock) return res.status(400).json({ ok: false, error: 'No connected bot session to send from.' });
        const users = Object.keys(botData.knownUsers || {});
        let sent = 0, failed = 0;
        for (const jid of users) {
            try { await sock.sendMessage(jid, { text }); sent++; }
            catch (e) { failed++; }
            await new Promise(r => setTimeout(r, 1200));
        }
        res.json({ ok: true, sent, failed, total: users.length });
    });

    app.post('/admin/api/dm-broadcast/media', upload.single('file'), async (req, res) => {
        const sock = getActiveSock();
        if (!sock) return res.status(400).json({ ok: false, error: 'No connected bot session to send from.' });
        if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded.' });

        const caption = req.body?.caption || '';
        const mimetype = req.file.mimetype || 'application/octet-stream';
        const buffer = req.file.buffer;
        const fileName = req.file.originalname;

        let content;
        if (mimetype.startsWith('image/')) content = { image: buffer, caption };
        else if (mimetype.startsWith('video/')) content = { video: buffer, caption, mimetype };
        else content = { document: buffer, mimetype, fileName, caption };

        const users = Object.keys(botData.knownUsers || {});
        let sent = 0, failed = 0;
        for (const jid of users) {
            try { await sock.sendMessage(jid, content); sent++; }
            catch (e) { failed++; }
            await new Promise(r => setTimeout(r, 1500));
        }
        res.json({ ok: true, sent, failed, total: users.length });
    });

    // ---- command control center: prefix, prefixless mode, per-command
    //      enable/disable + premium lock (lib/commandConfig.js) ----
    app.get('/admin/api/commands', (req, res) => {
        res.json({ ok: true, ...commandConfig.listAll() });
    });

    app.post('/admin/api/commands/prefix', (req, res) => {
        const { prefix } = req.body || {};
        try {
            commandConfig.setPrefix(prefix);
            res.json({ ok: true, prefix: commandConfig.getPrefix() });
        } catch (e) {
            res.status(400).json({ ok: false, error: e.message });
        }
    });

    app.post('/admin/api/commands/prefixless', (req, res) => {
        const { enabled } = req.body || {};
        commandConfig.setPrefixlessMode(!!enabled);
        res.json({ ok: true, prefixlessMode: commandConfig.getPrefixlessMode() });
    });

    app.post('/admin/api/commands/toggle', (req, res) => {
        const { name, enabled } = req.body || {};
        if (!name) return res.status(400).json({ ok: false, error: 'name required' });
        try {
            commandConfig.setCommandEnabled(name, !!enabled);
            res.json({ ok: true });
        } catch (e) {
            res.status(400).json({ ok: false, error: e.message });
        }
    });

    app.post('/admin/api/commands/premium', (req, res) => {
        const { name, premium } = req.body || {};
        if (!name) return res.status(400).json({ ok: false, error: 'name required' });
        try {
            commandConfig.setCommandPremium(name, !!premium);
            res.json({ ok: true });
        } catch (e) {
            res.status(400).json({ ok: false, error: e.message });
        }
    });

    // ---- premium users (who premium-locked commands are unlocked for) ----
    app.get('/admin/api/premium-users', (req, res) => {
        res.json({ ok: true, users: Object.keys(botData.premiumUsers || {}) });
    });

    app.post('/admin/api/premium-users', (req, res) => {
        let { jid } = req.body || {};
        if (!jid) return res.status(400).json({ ok: false, error: 'jid required' });
        jid = String(jid).trim();
        if (!jid.includes('@')) jid = jid.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (!botData.premiumUsers) botData.premiumUsers = {};
        botData.premiumUsers[jid] = true;
        saveBotData();
        res.json({ ok: true, jid });
    });

    app.delete('/admin/api/premium-users/:jid', (req, res) => {
        const jid = decodeURIComponent(req.params.jid);
        if (botData.premiumUsers) delete botData.premiumUsers[jid];
        saveBotData();
        res.json({ ok: true });
    });
}

module.exports = { registerAdminPanel };

// lib/customCommands.js
// 👑 AWAIS CYBER — Admin Panel "add your own command" engine.
//
// Lets the bot owner add brand-new WhatsApp commands from the Admin
// Panel — name + JS code — with NO restart needed. Each custom command
// is stored as its own JSON file so it survives restarts, and is
// syntax-checked before being saved (so a typo can't silently break
// anything). At runtime each custom command runs inside its own
// try/catch, so even a command that throws at runtime can never crash
// the whole bot — the user just sees an error message instead.
//
// Power level: intentionally the SAME as any hand-written file in
// /commands — custom code gets `require`, so it can call APIs, use
// npm packages already installed, etc. That's what makes it capable
// of building genuinely useful commands, not a toy. This is explained
// clearly in the Admin Panel UI so the owner knows what they're pasting.

const fs = require('fs-extra');
const path = require('path');
const vm = require('vm');

const CUSTOM_DIR = path.join(__dirname, '..', 'custom-commands');
fs.ensureDirSync(CUSTOM_DIR);

let registry = {}; // name -> { name, code, enabled, addedAt, updatedAt }

function validateSyntax(code) {
    try {
        // Compile-check only (never executes) — catches typos/syntax
        // errors immediately when saving, with the exact same wrapper
        // shape used at real execution time.
        new vm.Script(`(async function(sock, from, msg, args, q, botData, saveBotData, sender, isGroup, isAdmin, isOwner, require) {\n${code}\n})`);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

function loadAll() {
    registry = {};
    const files = fs.readdirSync(CUSTOM_DIR).filter(f => f.endsWith('.json'));
    for (const f of files) {
        try {
            const meta = fs.readJsonSync(path.join(CUSTOM_DIR, f));
            if (meta && meta.name) registry[meta.name] = meta;
        } catch (e) { /* skip a corrupt file rather than crash boot */ }
    }
}
loadAll();

function list() {
    return Object.values(registry)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .map(c => ({ name: c.name, enabled: c.enabled, addedAt: c.addedAt, updatedAt: c.updatedAt, code: c.code }));
}

function get(name) { return registry[name]; }
function has(name) { return !!registry[name]; }

const RESERVED_NAME_PATTERN = /^[a-z0-9]+$/;

function save(name, code) {
    const clean = (name || '').trim().toLowerCase();
    if (!clean || !RESERVED_NAME_PATTERN.test(clean)) {
        return { ok: false, error: 'Command name must be lowercase letters/numbers only, no spaces or symbols.' };
    }
    if (!code || !code.trim()) {
        return { ok: false, error: 'Code cannot be empty.' };
    }
    const check = validateSyntax(code);
    if (!check.ok) return { ok: false, error: `Syntax error: ${check.error}` };

    const existing = registry[clean];
    const meta = {
        name: clean, code,
        enabled: existing ? existing.enabled : true,
        addedAt: existing ? existing.addedAt : Date.now(),
        updatedAt: Date.now()
    };
    fs.writeJsonSync(path.join(CUSTOM_DIR, `${clean}.json`), meta);
    registry[clean] = meta;
    return { ok: true, meta };
}

function remove(name) {
    const clean = (name || '').trim().toLowerCase();
    const p = path.join(CUSTOM_DIR, `${clean}.json`);
    if (fs.existsSync(p)) fs.removeSync(p);
    delete registry[clean];
    return true;
}

function setEnabled(name, enabled) {
    const clean = (name || '').trim().toLowerCase();
    if (!registry[clean]) return false;
    registry[clean].enabled = !!enabled;
    registry[clean].updatedAt = Date.now();
    fs.writeJsonSync(path.join(CUSTOM_DIR, `${clean}.json`), registry[clean]);
    return true;
}

// Executed from the main command switch's default case. Returns true
// if a custom command handled it (whether it succeeded or threw),
// false if there's no such custom command (so the caller can show its
// normal "unknown command" behavior instead).
async function execute(name, ctx) {
    const meta = registry[name];
    if (!meta || !meta.enabled) return false;
    try {
        const fn = new Function(
            'sock', 'from', 'msg', 'args', 'q', 'botData', 'saveBotData', 'sender', 'isGroup', 'isAdmin', 'isOwner', 'require',
            `return (async () => {\n${meta.code}\n})();`
        );
        await fn(ctx.sock, ctx.from, ctx.msg, ctx.args, ctx.q, ctx.botData, ctx.saveBotData, ctx.sender, ctx.isGroup, ctx.isAdmin, ctx.isOwner, require);
    } catch (e) {
        try {
            await ctx.sock.sendMessage(ctx.from, { text: `❌ Custom command ".${name}" hit an error:\n${e.message}` }, { quoted: ctx.msg });
        } catch (_) { /* even the error reply failed — nothing more we can safely do */ }
    }
    return true;
}

module.exports = { list, get, has, save, remove, setEnabled, execute, validateSyntax, loadAll };

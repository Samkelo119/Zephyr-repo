'use strict';

// commands/newpack.js
// Loader + dispatcher for the "ADD NEW COMMAND" pack (ai / owner / religion /
// general / group / tools). Every module in this pack uses the signature
//   module = { name, aliases, category, description, ownerOnly, react,
//              async execute(conn, mek, args, chatId, isOwner) }
// so this loader normalises them into the bot's dispatch pipeline.
//
// These commands intentionally take precedence over the legacy handlers with
// the same name (the user asked for repeated commands to be replaced by the
// newer version).

const fs = require('fs');
const path = require('path');

const SUBDIRS = ['ai', 'owner', 'religion', 'general', 'group', 'tools'];
const ROOT_FILES = ['anticallmsg.js', 'channelreact.js', 'imagine.js', 'phone.js',
    'unblock.js', 'wipe.js', 'wipeall.js'];
const SKIP = new Set(['checkadmin.js']);

function loadModules() {
    const out = [];
    const load = (full) => {
        try {
            const mod = require(full);
            if (mod && mod.name && typeof mod.execute === 'function') out.push(mod);
        } catch (e) {
            console.error('[newpack] failed to load', path.basename(full), '-', e.message);
        }
    };

    for (const dir of SUBDIRS) {
        const full = path.join(__dirname, dir);
        if (!fs.existsSync(full)) continue;
        for (const f of fs.readdirSync(full)) {
            if (!f.endsWith('.js') || SKIP.has(f)) continue;
            load(path.join(full, f));
        }
    }
    for (const f of ROOT_FILES) {
        const full = path.join(__dirname, f);
        if (fs.existsSync(full)) load(full);
    }
    return out;
}

const MODULES = loadModules();

const byName = new Map();
const byAlias = new Map();
for (const mod of MODULES) {
    if (!byName.has(mod.name)) byName.set(mod.name, mod);
    for (const a of (mod.aliases || [])) {
        if (!byAlias.has(a) && !byName.has(a)) byAlias.set(a, mod);
    }
}

function resolve(name) {
    return byName.get(name) || byAlias.get(name) || null;
}

function has(name) {
    return byName.has(name) || byAlias.has(name);
}

async function run(name, sock, from, msg, ctx) {
    const mod = resolve(name);
    if (!mod) return false;

    if (mod.ownerOnly && !ctx.isOwner) {
        // If a legacy handler with the same name exists, let it take over so
        // public commands (e.g. .status settings) keep working for everyone.
        if (ctx.legacyFallthrough) return false;
        await sock.sendMessage(from, {
            text: '🔒 *Owner only*\n\nThis command can only be used by the owner of this paired number.'
        }, { quoted: msg });
        return true;
    }

    if (mod.react) {
        try { await sock.sendMessage(from, { react: { text: mod.react, key: msg.key } }); } catch (e) {}
    }

    try {
        await mod.execute(sock, msg, ctx.args || [], from, !!ctx.isOwner, ctx);
    } catch (e) {
        console.error('[newpack]', mod.name, 'error:', e.message);
        try {
            await sock.sendMessage(from, { text: `❌ Command error: ${e.message}` }, { quoted: msg });
        } catch (_) {}
    }
    return true;
}

// All dispatchable names (primary names first, then aliases) for the menu and
// command-config registry.
const names = [...byName.keys()];
const aliases = [...byAlias.keys()];

module.exports = { run, has, resolve, names, aliases, modules: MODULES };

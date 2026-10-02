// lib/sessionConfig.js
// Per-paired-number command configuration (prefix, prefixless mode, and
// per-command enable/premium overrides).
//
// Every paired number gets its OWN config file under data/session_config/.
// Anything a session has not overridden falls back to the global defaults in
// lib/commandConfig.js, so behaviour is unchanged until a number changes
// something. index.js resolves `sessionConfig.forSession(userId)` per message
// so changing the prefix on one number never leaks to another.

const fs = require('fs-extra');
const path = require('path');
const base = require('./commandConfig');

const DIR = path.join(__dirname, '..', 'data', 'session_config');
fs.ensureDirSync(DIR);

const cache = {};

function fileFor(key) {
    const safe = String(key || 'default').replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(DIR, `${safe}.json`);
}

function load(key) {
    try {
        const file = fileFor(key);
        if (fs.existsSync(file)) return fs.readJsonSync(file);
    } catch (e) {}
    return {};
}

function persist(key) {
    try {
        fs.ensureDirSync(DIR);
        fs.writeJsonSync(fileFor(key), cache[key] || {});
    } catch (e) {
        console.error('[sessionConfig] failed to save for', key, e.message);
    }
}

function stateFor(key) {
    const k = String(key || 'default');
    if (!cache[k]) cache[k] = load(k);
    return cache[k];
}

function forSession(key) {
    return {
        key,
        ALL_COMMANDS: base.ALL_COMMANDS,

        getPrefix() {
            const s = stateFor(key);
            return (typeof s.prefix === 'string' && s.prefix.length > 0) ? s.prefix : base.getPrefix();
        },
        setPrefix(newPrefix) {
            if (typeof newPrefix !== 'string' || newPrefix.length === 0 || newPrefix.length > 3) {
                throw new Error('Prefix must be 1-3 characters.');
            }
            const s = stateFor(key);
            s.prefix = newPrefix;
            persist(key);
        },

        getPrefixlessMode() {
            const s = stateFor(key);
            return s.prefixlessMode !== undefined ? !!s.prefixlessMode : base.getPrefixlessMode();
        },
        setPrefixlessMode(enabled) {
            const s = stateFor(key);
            s.prefixlessMode = !!enabled;
            persist(key);
        },

        isKnownCommand(name) {
            return base.isKnownCommand(name);
        },
        isCommandEnabled(name) {
            const s = stateFor(key);
            const entry = s.commands && s.commands[name];
            if (entry && entry.enabled !== undefined) return entry.enabled !== false;
            return base.isCommandEnabled(name);
        },
        setCommandEnabled(name, enabled) {
            if (!base.isKnownCommand(name)) throw new Error('Unknown command: ' + name);
            const s = stateFor(key);
            if (!s.commands) s.commands = {};
            s.commands[name] = { ...(s.commands[name] || {}), enabled: !!enabled };
            persist(key);
        },

        isPremium(name) {
            const s = stateFor(key);
            const entry = s.commands && s.commands[name];
            if (entry && entry.premium !== undefined) return !!entry.premium;
            return base.isPremium(name);
        },
        setCommandPremium(name, premium) {
            if (!base.isKnownCommand(name)) throw new Error('Unknown command: ' + name);
            if (base.isAlwaysOwnerOnly(name)) throw new Error('This command is owner-only and cannot be made premium/public.');
            const s = stateFor(key);
            if (!s.commands) s.commands = {};
            s.commands[name] = { ...(s.commands[name] || {}), premium: !!premium };
            persist(key);
        },
        isAlwaysOwnerOnly(name) {
            return base.isAlwaysOwnerOnly(name);
        },

        extractCommand(text) {
            if (typeof text !== 'string' || !text.trim()) return null;
            const lower = text.toLowerCase();
            const prefix = this.getPrefix();
            let commandName = null;
            if (prefix && lower.startsWith(prefix)) {
                commandName = lower.slice(prefix.length).split(' ')[0];
            } else if (this.getPrefixlessMode()) {
                const firstWord = lower.split(' ')[0];
                if (firstWord && base.isKnownCommand(firstWord)) commandName = firstWord;
            }
            if (!commandName) return null;
            const args = text.split(' ').slice(1);
            return { commandName, args, q: args.join(' ') };
        },
        isCommandText(text) {
            return this.extractCommand(text) !== null;
        },

        listAll() {
            return {
                prefix: this.getPrefix(),
                prefixlessMode: this.getPrefixlessMode(),
                commands: base.ALL_COMMANDS.map(name => ({
                    name,
                    enabled: this.isCommandEnabled(name),
                    premium: this.isPremium(name),
                    ownerOnly: base.isAlwaysOwnerOnly(name)
                }))
            };
        }
    };
}

module.exports = { forSession };

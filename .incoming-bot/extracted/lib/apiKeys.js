// lib/apiKeys.js
// 👑 AWAIS CYBER — Centralized, hot-swappable API key store.
// Admin Panel reads/writes here. Falls back to env vars / built-in
// free-tier defaults so the bot still works out of the box.

const fs = require('fs-extra');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'api_keys.json');

const DEFAULTS = {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    giphyApiKey: process.env.GIPHY_API_KEY || 'dc6zaTOxFJmzC',
    omdbApiKey: process.env.OMDB_API_KEY || '63234919',
    memeApiKey: process.env.MEME_API_KEY || 'shizo',
    songApiKey: process.env.SONG_API_KEY || 'G7I6X7'
};

let cache = null;

function load() {
    if (cache) return cache;
    fs.ensureDirSync(path.dirname(FILE));
    if (fs.existsSync(FILE)) {
        try {
            cache = { ...DEFAULTS, ...fs.readJsonSync(FILE) };
            return cache;
        } catch (e) { /* fall through to defaults */ }
    }
    cache = { ...DEFAULTS };
    return cache;
}

function getAll() {
    return { ...load() };
}

function get(key) {
    return load()[key];
}

// Any extra custom key/value pair the user wants to store (for
// commands not centrally wired here yet) also lands in the same file.
function set(key, value) {
    const data = load();
    data[key] = value;
    cache = data;
    fs.writeJsonSync(FILE, data);
    return { ...data };
}

function remove(key) {
    const data = load();
    delete data[key];
    cache = data;
    fs.writeJsonSync(FILE, data);
    return { ...data };
}

module.exports = { get, getAll, set, remove };

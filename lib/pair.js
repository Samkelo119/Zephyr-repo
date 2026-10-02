// lib/pair.js
// Per-owner WhatsApp pairing registry. Each paired number gets its own
// isolated auth session (managed by index.js) — this module just keeps
// track of who linked which number and gives the .addpair/.delpair/
// .listpair/.clearpair commands a single, clean interface.

const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'pairs.json');

function load() {
    try {
        if (!fs.existsSync(FILE)) return { pairs: {} };
        const data = fs.readJsonSync(FILE);
        if (!data.pairs) data.pairs = {};
        return data;
    } catch (e) {
        return { pairs: {} };
    }
}

let store = load();

function save() {
    try {
        fs.ensureDirSync(DATA_DIR);
        fs.writeJsonSync(FILE, store);
    } catch (e) {}
}

function cleanNumber(n) {
    return String(n || '').replace(/[^0-9]/g, '');
}

// index.js injects its pairing bridge here (avoids a circular require).
function bridge() {
    return global.__pairBridge || {};
}

async function addPair(rawNumber, jid, sock, ownerNumber, isSuperOwner) {
    const number = cleanNumber(rawNumber);
    if (!number || number.length < 8) {
        return { error: 'Please provide a valid number with country code, e.g. 27621834910.' };
    }

    const existing = store.pairs[number];
    if (existing && existing.status === 'connected') {
        return { number, already: true };
    }

    const b = bridge();
    if (typeof b.startPairing !== 'function') {
        return { error: 'Pairing engine is still starting up. Try again in a few seconds.' };
    }

    try {
        const result = await b.startPairing(null, number);
        const session = b.sessions && b.sessions[result.userId];
        let code = session && session.lastPairingCode;

        // Wait briefly for the code to be generated (Baileys is async).
        const started = Date.now();
        while (!code && session && Date.now() - started < 20000) {
            await new Promise(r => setTimeout(r, 400));
            code = session.lastPairingCode;
        }

        store.pairs[number] = {
            number,
            owner: cleanNumber(ownerNumber) || null,
            sessionId: result.userId,
            status: code ? 'pairing' : 'pending',
            createdAt: new Date().toISOString()
        };
        save();

        if (code) return { number, code };
        return { number, pending: true };
    } catch (e) {
        return { error: e.message || 'Pairing failed.' };
    }
}

async function delPair(rawNumber, ownerNumber, isSuperOwner) {
    const number = cleanNumber(rawNumber);
    const entry = store.pairs[number];
    if (!entry) return { error: 'That number is not linked.' };
    if (!isSuperOwner && entry.owner && entry.owner !== cleanNumber(ownerNumber)) {
        return { error: 'You can only remove numbers that you linked.' };
    }

    const b = bridge();
    const sessionId = entry.sessionId || `zephyr_${number}`;
    try {
        const session = b.sessions && b.sessions[sessionId];
        if (session) {
            if (session.sock) { try { await session.sock.logout(); } catch (e) {} }
            if (b.AUTH_DIR) {
                const authPath = path.join(b.AUTH_DIR, sessionId);
                if (fs.existsSync(authPath)) { try { fs.removeSync(authPath); } catch (e) {} }
            }
            delete b.sessions[sessionId];
        }
    } catch (e) {}

    delete store.pairs[number];
    save();
    return { number };
}

function listPairs(ownerNumber, isSuperOwner) {
    const owner = cleanNumber(ownerNumber);
    return Object.values(store.pairs)
        .filter(p => isSuperOwner || p.owner === owner)
        .map(p => ({ number: p.number, status: p.status, owner: p.owner }));
}

async function clearPairs(ownerNumber, isSuperOwner) {
    const list = listPairs(ownerNumber, isSuperOwner);
    let count = 0;
    for (const p of list) {
        const res = await delPair(p.number, ownerNumber, isSuperOwner);
        if (!res.error) count++;
    }
    return count;
}

function markConnected(number) {
    const n = cleanNumber(number);
    if (store.pairs[n]) { store.pairs[n].status = 'connected'; save(); }
}

module.exports = { addPair, delPair, listPairs, clearPairs, markConnected };

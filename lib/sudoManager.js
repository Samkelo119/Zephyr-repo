// lib/sudoManager.js
// Minimal sudo/owner resolution shared by the ported command modules.
// A "sudo" user is any number listed in the session/bot owner config.

function normalize(jid) {
    return String(jid || '').split('@')[0].split(':')[0];
}

function ownerNumbers() {
    const list = new Set();
    if (Array.isArray(global.ownerNumbers)) {
        for (const n of global.ownerNumbers) list.add(normalize(n));
    }
    if (global.primaryOwnerNumber) list.add(normalize(global.primaryOwnerNumber));
    if (global.OWNER_WA_NUMBER) list.add(normalize(global.OWNER_WA_NUMBER));
    if (process.env.OWNER_NUMBER) list.add(normalize(process.env.OWNER_NUMBER));
    return list;
}

function isSudo(jid) {
    const n = normalize(jid);
    if (!n) return false;
    const owners = ownerNumbers();
    if (owners.size === 0) return true; // no owners configured -> fail open to owner
    return owners.has(n);
}

module.exports = { isSudo, normalize, ownerNumbers };

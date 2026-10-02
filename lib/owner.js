// lib/owner.js
// Owner resolution shared by the ported command pack. Each paired bot session
// has its OWN paired number, which index.js records in
// global.currentSessionNumber right before dispatching a command. That keeps
// every paired number isolated: a command never reports or acts on another
// session's owner.

function clean(jid) {
    return String(jid || '').split('@')[0].split(':')[0];
}

function getPairedNumber() {
    return clean(global.currentSessionNumber)
        || clean(global.OWNER_WA_NUMBER)
        || clean(global.primaryOwnerNumber)
        || '';
}

function getOwnerNumbers() {
    const list = new Set();
    const paired = getPairedNumber();
    if (paired) list.add(paired);
    if (Array.isArray(global.ownerNumbers)) {
        for (const n of global.ownerNumbers) {
            const c = clean(n);
            if (c) list.add(c);
        }
    }
    const primary = clean(global.primaryOwnerNumber);
    if (primary) list.add(primary);
    return Array.from(list);
}

function isOwnerNumber(jid) {
    const n = clean(jid);
    return !!n && getOwnerNumbers().includes(n);
}

module.exports = { getPairedNumber, getOwnerNumbers, isOwnerNumber, clean };

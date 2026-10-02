// lib/groupAdmin.js
// Group permission helpers for the ported command pack. Handles both phone
// JIDs and LID JIDs so admin checks keep working on multi-device accounts.

function cleanNum(jid) {
    return String(jid || '').split('@')[0].split(':')[0];
}

function extractLidPart(jid) {
    return String(jid || '').split('@')[0];
}

function idsMatch(a, b) {
    const x = cleanNum(a);
    const y = cleanNum(b);
    return !!x && x === y;
}

function botJidFormats(conn) {
    const out = new Set();
    const id = conn && conn.user && conn.user.id;
    const lid = conn && conn.user && conn.user.lid;
    if (id) {
        out.add(id);
        out.add(cleanNum(id) + '@s.whatsapp.net');
        out.add(cleanNum(id) + '@lid');
    }
    if (lid) {
        out.add(lid);
        out.add(extractLidPart(lid) + '@lid');
    }
    return out;
}

async function isBotAdmin(conn, chatId) {
    try {
        if (!chatId || !chatId.endsWith('@g.us')) return false;
        const meta = await conn.groupMetadata(chatId);
        const formats = botJidFormats(conn);
        return meta.participants.some(p =>
            (p.admin === 'admin' || p.admin === 'superadmin') &&
            (formats.has(p.id) || (p.lid && formats.has(p.lid)) ||
             idsMatch(p.id, conn.user && conn.user.id) ||
             (p.lid && idsMatch(p.lid, conn.user && conn.user.lid)))
        );
    } catch (e) {
        return false;
    }
}

async function isSenderAdmin(conn, chatId, senderJid) {
    try {
        if (!chatId || !chatId.endsWith('@g.us')) return false;
        const meta = await conn.groupMetadata(chatId);
        const p = meta.participants.find(x =>
            idsMatch(x.id, senderJid) || (x.lid && idsMatch(x.lid, senderJid)));
        return !!(p && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch (e) {
        return false;
    }
}

module.exports = { isBotAdmin, isSenderAdmin, idsMatch, cleanNum, extractLidPart, botJidFormats };

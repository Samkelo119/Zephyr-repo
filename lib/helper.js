// lib/helper.js
// Shared reply helpers used by the newer command modules. Keeps output
// consistent with the rest of the bot (styled boxes, English only).

function normalizeJidNumber(jid) {
    if (!jid) return '';
    return String(jid).split('@')[0].split(':')[0];
}

function box(title, body) {
    const line = '━'.repeat(24);
    return [
        `╭${line}〔 ${title} 〕`,
        '',
        body,
        '',
        `╰${line}`
    ].join('\n');
}

async function reply(sock, jid, msg, text, options = {}) {
    try {
        await sock.sendMessage(jid, { text, ...options }, { quoted: msg });
    } catch (e) {
        try { await sock.sendMessage(jid, { text }); } catch (_) {}
    }
}

async function replyPairCode(sock, jid, msg, number, code) {
    const text = [
        '╭━━━━〔 🔑 ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ 〕━━━━',
        '',
        `📞 ɴᴜᴍʙᴇʀ  : +${number}`,
        `🔑 ᴄᴏᴅᴇ    : ${code}`,
        '',
        'Open WhatsApp → Linked Devices → Link a device →',
        'Link with phone number, then enter the code above.',
        '',
        '⏱️ The code expires in about 60 seconds.',
        '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    ].join('\n');
    await reply(sock, jid, msg, text);
}

function getMessageText(msg) {
    if (!msg || !msg.message) return '';
    const m = msg.message;
    const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message ||
        m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message || m;
    return (inner.conversation
        || inner.extendedTextMessage?.text
        || inner.imageMessage?.caption
        || inner.videoMessage?.caption
        || inner.documentMessage?.caption
        || '').trim();
}

async function isGroupAdmin(sock, from, sender) {
    try {
        if (!from || !from.endsWith('@g.us')) return false;
        const meta = await sock.groupMetadata(from);
        const target = normalizeJidNumber(sender);
        const p = meta.participants.find(x =>
            normalizeJidNumber(x.id) === target ||
            normalizeJidNumber(x.lid) === target);
        return !!(p && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch (e) {
        return false;
    }
}

module.exports = { reply, box, replyPairCode, normalizeJidNumber, getMessageText, isGroupAdmin };

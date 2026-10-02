// lib/interactive.js
// Tiny numbered-choice helper for group commands (warn / kick / delete ...).
// Sends a 2-3 option prompt and waits for the user to reply with a number.
// State is kept in memory with a short TTL so it can never leak between chats.

const pending = new Map();
const TTL_MS = 3 * 60 * 1000;

function norm(id) {
    return String(id || '').split('@')[0].split(':')[0];
}

function keyOf(chatId, sender) {
    return `${norm(chatId)}|${norm(sender)}`;
}

function cleanup() {
    const now = Date.now();
    for (const [k, v] of pending) {
        if (v.expires < now) pending.delete(k);
    }
}

async function sendOptions(sock, chatId, msg, sender, { title, options }) {
    cleanup();
    const list = Array.isArray(options) ? options.slice(0, 3) : [];
    if (!list.length) return;

    pending.set(keyOf(chatId, sender), { options: list, expires: Date.now() + TTL_MS });

    const lines = list.map((o, i) => `*${i + 1}.* ${o.label}`).join('\n');
    await sock.sendMessage(chatId, {
        text: `${title}\n\n${lines}\n\nReply with a number (1-${list.length}). This expires in 3 minutes.`
    }, { quoted: msg });
}

async function handleReply(sock, chatId, msg, text, sender) {
    const k = keyOf(chatId, sender);
    const state = pending.get(k);
    if (!state) return false;

    const n = parseInt(String(text || '').trim(), 10);
    if (!n || n < 1 || n > state.options.length) return false;

    pending.delete(k);
    const option = state.options[n - 1];
    try {
        await option.run(sock, chatId, msg);
    } catch (e) {
        console.error('[interactive] option failed:', e.message);
        try {
            await sock.sendMessage(chatId, { text: `❌ Action failed: ${e.message}` }, { quoted: msg });
        } catch (_) {}
    }
    return true;
}

function clearFor(chatId, sender) {
    pending.delete(keyOf(chatId, sender));
}

module.exports = { sendOptions, handleReply, clearFor };

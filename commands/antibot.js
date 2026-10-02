'use strict';

// 🛡️ Anti-Bot — detects messages that were clearly produced by another
// WhatsApp bot inside a group, deletes them, and removes the offending
// sender from the group.

const BOT_NAME_PATTERN = /(whatsapp\s*bot|wa\s*bot|\bbot\b|ᴢᴇᴘʜʏʀ|zephyr|mrlegend|baileys|pairing\s*code)/i;

const BOT_TEXT_PATTERNS = [
    /powered\s+by/i,
    /type\s+\.?menu/i,
    /\.menu\s+to\s+see/i,
    /╭[^\n]*bot/i,
    /ᴘᴏᴡᴇʀᴇᴅ\s+ʙʏ/i,
    /zᴇᴘʜʏʀ/i,
    /zephyr[- ]md/i
];

function looksLikeBot(msg, text, pushName, extraList) {
    const sender = (msg.key.participant || msg.key.remoteJid || '').split('@')[0];
    if (extraList && extraList[sender]) return true;
    if (pushName && BOT_NAME_PATTERN.test(pushName)) return true;
    if (typeof text === 'string' && text) {
        if (BOT_TEXT_PATTERNS.some(re => re.test(text))) return true;
    }
    return false;
}

async function antibotCommand(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData) {
    if (!isGroup) {
        return sock.sendMessage(from, { text: '❌ Anti-Bot only works inside groups.' }, { quoted: msg });
    }
    if (!isAdmin) {
        return sock.sendMessage(from, { text: '❌ Only an admin or the owner can configure Anti-Bot.' }, { quoted: msg });
    }
    if (!botData.antiBot) botData.antiBot = {};

    const action = (args[0] || '').toLowerCase();
    if (action === 'on') {
        botData.antiBot[from] = true;
        saveBotData();
        return sock.sendMessage(from, {
            text: [
                '╭━━━━〔 🛡️ ᴀɴᴛɪ-ʙᴏᴛ 〕━━━━',
                '',
                '✅ Anti-Bot is now *ON* for this group.',
                'Any bot-generated message will be deleted and',
                'the offending bot will be removed from the group.',
                '',
                'Turn it off with `.antibot off`.',
                '╰━━━━━━━━━━━━━━━━━━━━━━━━━━'
            ].join('\n')
        }, { quoted: msg });
    }
    if (action === 'off') {
        botData.antiBot[from] = false;
        saveBotData();
        return sock.sendMessage(from, { text: '✅ Anti-Bot is now *OFF* for this group.' }, { quoted: msg });
    }
    const state = botData.antiBot[from] ? 'ON' : 'OFF';
    return sock.sendMessage(from, {
        text: `🛡️ *ANTI-BOT*\n\nStatus: *${state}*\n\nUsage:\n.antibot on\n.antibot off`
    }, { quoted: msg });
}

// Called from index.js on every group message. Returns true when the
// message was identified as bot output and action was taken.
async function handleAntiBot(sock, from, msg, text, pushName, botData, sender, isAdmin) {
    if (!botData.antiBot || !botData.antiBot[from]) return false;
    if (isAdmin) return false; // never punish admins/owner
    const extraList = botData.antiBotList || {};
    if (!looksLikeBot(msg, text, pushName, extraList)) return false;

    try { await sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
    try {
        await sock.groupParticipantsUpdate(from, [sender], 'remove');
    } catch (e) {}
    try {
        await sock.sendMessage(from, {
            text: `🤖🚫 *Anti-Bot* detected a bot here. The bot's message was deleted and @${sender.split('@')[0]} was removed.`,
            mentions: [sender]
        });
    } catch (e) {}
    return true;
}

module.exports = antibotCommand;
module.exports.execute = antibotCommand;
module.exports.handleAntiBot = handleAntiBot;
module.exports.looksLikeBot = looksLikeBot;

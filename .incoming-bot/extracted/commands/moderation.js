// commands/moderation.js
// 👑 AWAIS CYBER — Advanced group moderation & automation.
// mute/unmute, bad-word filter, slow mode, and keyword auto-responder.
// These are normal, legitimate group-admin tools (same category as
// antilink/warn already in this bot) — not mass-action or spam tools.

function getTarget(msg) {
    return msg.message?.extendedTextMessage?.contextInfo?.participant
        || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
}

// ---- mute / unmute ----

async function mute(sock, from, msg, isGroup, isAdmin, botData, saveBotData) {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group only command.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admins only.' }, { quoted: msg });
    const target = getTarget(msg);
    if (!target) return sock.sendMessage(from, { text: '⚠️ Reply to or tag the user you want to mute.\n`.mute @user`' }, { quoted: msg });
    if (!botData.mutedUsers) botData.mutedUsers = {};
    if (!botData.mutedUsers[from]) botData.mutedUsers[from] = {};
    botData.mutedUsers[from][target] = true;
    saveBotData();
    await sock.sendMessage(from, { text: `🔇 @${target.split('@')[0]} has been muted — their messages will be auto-deleted.`, mentions: [target] }, { quoted: msg });
}

async function unmute(sock, from, msg, isGroup, isAdmin, botData, saveBotData) {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group only command.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admins only.' }, { quoted: msg });
    const target = getTarget(msg);
    if (!target) return sock.sendMessage(from, { text: '⚠️ Reply to or tag the user you want to unmute.\n`.unmute @user`' }, { quoted: msg });
    if (botData.mutedUsers && botData.mutedUsers[from]) delete botData.mutedUsers[from][target];
    saveBotData();
    await sock.sendMessage(from, { text: `🔊 @${target.split('@')[0]} has been unmuted.`, mentions: [target] }, { quoted: msg });
}

async function mutelist(sock, from, msg, isGroup, botData) {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group only command.' }, { quoted: msg });
    const list = Object.keys((botData.mutedUsers && botData.mutedUsers[from]) || {});
    if (!list.length) return sock.sendMessage(from, { text: '🔊 No one is muted in this group.' }, { quoted: msg });
    await sock.sendMessage(from, {
        text: `🔇 *Muted Users:*\n\n${list.map(j => `@${j.split('@')[0]}`).join('\n')}`,
        mentions: list
    }, { quoted: msg });
}

// ---- word filter ----

async function filter(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData) {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group only command.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admins only.' }, { quoted: msg });
    const sub = (args[0] || '').toLowerCase();
    if (!botData.filterWords) botData.filterWords = {};
    if (!botData.filterWords[from]) botData.filterWords[from] = [];

    if (sub === 'add') {
        const word = args.slice(1).join(' ').toLowerCase().trim();
        if (!word) return sock.sendMessage(from, { text: '⚠️ Usage: `.filter add <word>`' }, { quoted: msg });
        if (!botData.filterWords[from].includes(word)) botData.filterWords[from].push(word);
        saveBotData();
        return sock.sendMessage(from, { text: `✅ Added "${word}" to the word filter. Messages containing it will be auto-deleted.` }, { quoted: msg });
    }
    if (sub === 'remove') {
        const word = args.slice(1).join(' ').toLowerCase().trim();
        botData.filterWords[from] = botData.filterWords[from].filter(w => w !== word);
        saveBotData();
        return sock.sendMessage(from, { text: `🗑️ Removed "${word}" from the filter.` }, { quoted: msg });
    }
    if (sub === 'clear') {
        botData.filterWords[from] = [];
        saveBotData();
        return sock.sendMessage(from, { text: '🗑️ Filter list cleared for this group.' }, { quoted: msg });
    }
    const list = botData.filterWords[from];
    if (!list.length) return sock.sendMessage(from, { text: '📋 No filtered words set.\nUse `.filter add <word>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: `📋 *Filtered Words:*\n\n${list.join(', ')}\n\n_.filter add | .filter remove | .filter clear_` }, { quoted: msg });
}

// ---- slow mode ----

async function slowmode(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData) {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group only command.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admins only.' }, { quoted: msg });
    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0) return sock.sendMessage(from, { text: '⚠️ Usage: `.slowmode <seconds>` (0 to disable)\nExample: `.slowmode 10`' }, { quoted: msg });
    if (!botData.slowMode) botData.slowMode = {};
    if (seconds === 0) {
        delete botData.slowMode[from];
        saveBotData();
        return sock.sendMessage(from, { text: '✅ Slow mode disabled.' }, { quoted: msg });
    }
    botData.slowMode[from] = seconds;
    saveBotData();
    await sock.sendMessage(from, { text: `🐢 Slow mode enabled: members can send 1 message every *${seconds}s*.` }, { quoted: msg });
}

// ---- auto-responder ----

async function autoresponder(sock, from, msg, args, isGroup, isAdmin, isOwner, botData, saveBotData) {
    if (isGroup && !isAdmin) return sock.sendMessage(from, { text: '❌ Admins only.' }, { quoted: msg });
    if (!isGroup && !isOwner) return sock.sendMessage(from, { text: '❌ Owner only in DM.' }, { quoted: msg });
    const sub = (args[0] || '').toLowerCase();
    if (!botData.autoResponders) botData.autoResponders = {};
    if (!botData.autoResponders[from]) botData.autoResponders[from] = [];

    if (sub === 'add') {
        const rest = args.slice(1).join(' ');
        const [keyword, ...replyParts] = rest.split('|').map(s => s.trim());
        const reply = replyParts.join('|').trim();
        if (!keyword || !reply) return sock.sendMessage(from, { text: '⚠️ Usage: `.autoresponder add <keyword> | <reply>`\nExample: `.autoresponder add price | Our price list is in the pinned message.`' }, { quoted: msg });
        botData.autoResponders[from].push({ keyword: keyword.toLowerCase(), reply });
        saveBotData();
        return sock.sendMessage(from, { text: `✅ Auto-reply added for keyword: "${keyword}"` }, { quoted: msg });
    }
    if (sub === 'remove') {
        const idx = parseInt(args[1]) - 1;
        const list = botData.autoResponders[from];
        if (isNaN(idx) || !list[idx]) return sock.sendMessage(from, { text: '⚠️ Usage: `.autoresponder remove <number>` — see `.autoresponder list`' }, { quoted: msg });
        const removed = list.splice(idx, 1);
        saveBotData();
        return sock.sendMessage(from, { text: `🗑️ Removed auto-reply for: "${removed[0].keyword}"` }, { quoted: msg });
    }
    if (sub === 'clear') {
        botData.autoResponders[from] = [];
        saveBotData();
        return sock.sendMessage(from, { text: '🗑️ All auto-replies cleared here.' }, { quoted: msg });
    }
    const list = botData.autoResponders[from];
    if (!list.length) return sock.sendMessage(from, { text: '📋 No auto-replies set.\nUse `.autoresponder add <keyword> | <reply>`' }, { quoted: msg });
    const text = list.map((a, i) => `${i + 1}. "${a.keyword}" → ${a.reply}`).join('\n');
    await sock.sendMessage(from, { text: `📋 *Auto-Replies:*\n\n${text}\n\n_.autoresponder add | remove <n> | clear_` }, { quoted: msg });
}

// ---- content-type moderation toggles ----

const BAD_WORDS_DEFAULT = ['fuck', 'bitch', 'asshole', 'bastard', 'slut', 'whore', 'nigger', 'cunt'];

async function toggleGroupFlag(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData, flagKey, label) {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group only command.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admins only.' }, { quoted: msg });
    const setTo = (args[0] || '').toLowerCase();
    if (setTo !== 'on' && setTo !== 'off') return sock.sendMessage(from, { text: `⚠️ Usage: \`.${flagKey} on/off\`` }, { quoted: msg });
    if (!botData[flagKey]) botData[flagKey] = {};
    if (setTo === 'on') botData[flagKey][from] = true; else delete botData[flagKey][from];
    saveBotData();
    await sock.sendMessage(from, { text: `✅ ${label} turned *${setTo.toUpperCase()}* for this group.` }, { quoted: msg });
}

async function antisticker(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData) {
    return toggleGroupFlag(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData, 'antiSticker', 'Anti-sticker');
}
async function antipicture(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData) {
    return toggleGroupFlag(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData, 'antiPicture', 'Anti-picture');
}
async function antivideo(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData) {
    return toggleGroupFlag(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData, 'antiVideo', 'Anti-video');
}
async function antitext(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData) {
    return toggleGroupFlag(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData, 'antiText', 'Anti-text (media-only mode)');
}
async function antibadword(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData) {
    return toggleGroupFlag(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData, 'antiBadword', 'Anti-badword (built-in filter)');
}

// per-USER toggle (works in DM and group) — separate botData shape, keyed by userId not chat
async function antiedit(sock, from, msg, args, userId, botData, saveBotData) {
    const setTo = (args[0] || '').toLowerCase();
    if (setTo !== 'on' && setTo !== 'off') return sock.sendMessage(from, { text: '⚠️ Usage: `.antiedit on/off`\nWhen someone edits a message, the original + edited text gets sent to your DM.' }, { quoted: msg });
    if (!botData.antiEdit) botData.antiEdit = {};
    botData.antiEdit[userId] = (setTo === 'on');
    saveBotData();
    await sock.sendMessage(from, { text: `✅ Anti-edit turned *${setTo.toUpperCase()}*.` }, { quoted: msg });
}

async function statusmention(sock, from, msg, args, userId, botData, saveBotData) {
    const setTo = (args[0] || '').toLowerCase();
    if (setTo !== 'on' && setTo !== 'off') return sock.sendMessage(from, { text: '⚠️ Usage: `.statusmention on/off`\nNotifies you in DM if someone mentions you in their status.' }, { quoted: msg });
    if (!botData.statusMention) botData.statusMention = {};
    botData.statusMention[userId] = (setTo === 'on');
    saveBotData();
    await sock.sendMessage(from, { text: `✅ Status-mention alerts turned *${setTo.toUpperCase()}*.` }, { quoted: msg });
}

// ---- anti-spam (message flood control) ----
// In-memory only (not persisted) — resets on restart, which is fine
// since it's a short rolling window, not a durable setting.
const spamTracker = {};

// Periodic cleanup so this doesn't grow forever over long uptime —
// entries with no activity in the last minute are dropped.
setInterval(() => {
    const now = Date.now();
    for (const key of Object.keys(spamTracker)) {
        spamTracker[key] = spamTracker[key].filter(t => now - t < 10000);
        if (spamTracker[key].length === 0) delete spamTracker[key];
    }
}, 5 * 60 * 1000);

async function antispam(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData) {
    if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group only command.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admins only.' }, { quoted: msg });
    const setTo = (args[0] || '').toLowerCase();
    if (setTo !== 'on' && setTo !== 'off') return sock.sendMessage(from, { text: '⚠️ Usage: `.antispam on/off`\nAuto-deletes messages from anyone sending more than 5 messages within 10 seconds.' }, { quoted: msg });
    if (!botData.antiSpam) botData.antiSpam = {};
    if (setTo === 'on') botData.antiSpam[from] = true; else delete botData.antiSpam[from];
    saveBotData();
    await sock.sendMessage(from, { text: `✅ Anti-spam turned *${setTo.toUpperCase()}* for this group.` }, { quoted: msg });
}

// Called from index.js on every group message when antiSpam is on for that group.
// Returns true if this message should be deleted as spam.
function checkSpam(groupId, userId) {
    const key = `${groupId}:${userId}`;
    const now = Date.now();
    if (!spamTracker[key]) spamTracker[key] = [];
    spamTracker[key] = spamTracker[key].filter(t => now - t < 10000);
    spamTracker[key].push(now);
    return spamTracker[key].length > 5;
}

module.exports = {
    mute, unmute, mutelist, filter, slowmode, autoresponder,
    antisticker, antipicture, antivideo, antitext, antibadword, antiedit, statusmention,
    antispam, checkSpam,
    BAD_WORDS_DEFAULT
};

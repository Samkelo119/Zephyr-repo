const interactive = require('../lib/interactive');

async function kickCommand(sock, from, msg, isAdmin, botData, saveBotData) {
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only admin can use this command." }, { quoted: msg });
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command can only be used in groups." }, { quoted: msg });

    const target = msg.message?.extendedTextMessage?.contextInfo?.participant ||
                   msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (!target) return await sock.sendMessage(from, { text: "❌ Please reply to a message or tag someone to kick." }, { quoted: msg });

    const sender = msg.key.participant || msg.key.remoteJid;
    const mention = target.split('@')[0];

    const doKick = async (s, c, m) => {
        try {
            await s.groupParticipantsUpdate(c, [target], 'remove');
            await s.sendMessage(c, { text: `✅ @${mention} has been kicked.`, mentions: [target] }, { quoted: m });
        } catch (e) {
            await s.sendMessage(c, { text: '❌ Failed to kick user. Make sure I am an admin.' }, { quoted: m });
        }
    };

    const doWarn = async (s, c, m) => {
        if (!botData) return s.sendMessage(c, { text: '❌ Warning store unavailable.' }, { quoted: m });
        if (!botData.warnings) botData.warnings = {};
        if (!botData.warnings[c]) botData.warnings[c] = {};
        botData.warnings[c][target] = (botData.warnings[c][target] || 0) + 1;
        if (typeof saveBotData === 'function') saveBotData();
        await s.sendMessage(c, { text: `⚠️ @${mention} has been warned instead. (${botData.warnings[c][target]}/3)`, mentions: [target] }, { quoted: m });
    };

    await interactive.sendOptions(sock, from, msg, sender, {
        title: `🥾 *Kick @${mention}*\nChoose an action:`,
        options: [
            { label: 'Kick now', run: doKick },
            { label: 'Warn instead', run: doWarn },
            { label: 'Cancel', run: async (s, c, m) => s.sendMessage(c, { text: 'Cancelled.' }, { quoted: m }) }
        ]
    });
}

module.exports = kickCommand;

module.exports = async (sock, from, msg, isAdmin, botData, saveBotData, args) => {
    // This command can only be executed by the Admin/Owner
    if (!isAdmin) return;

    if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
        return await sock.sendMessage(from, { text: '*⚠️ SYSTEM NOTICE:* Please specify parameters.\n\n*Use:* `.ban on` or `.ban off`' }, { quoted: msg });
    }

    // Initialize bannedChats object if it doesn't exist
    if (!botData.bannedChats) {
        botData.bannedChats = {};
    }

    const targetUser = from.split('@')[0];

    // BAN ON PROTOCOL (Completely Silence Bot for this Chat)
    if (args[0] === 'on') {
        botData.bannedChats[from] = true;
        saveBotData(); // Save changes to your json database

        const banMsg = `
╔════════════════════════╗
    ☣️ CHAT ISOLATION ACTIVE ☣️
╚════════════════════════╝
*💀 TARGET:* @${targetUser}
*⚡ BOT STATUS:* TOTALLY MUTED & DISABLED
*🔒 PRIVACY MODE:* ENFORCED

*INFO:* 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 has muted this chat. No reactions, no status, no logs.
`;
        return await sock.sendMessage(from, { text: banMsg, mentions: [from] }, { quoted: msg });
    }

    // BAN OFF PROTOCOL (Re-engage Bot for this Chat)
    if (args[0] === 'off') {
        if (botData.bannedChats && botData.bannedChats[from]) {
            delete botData.bannedChats[from];
            saveBotData(); // Save changes to your json database
        }

        const unbanMsg = `
╔════════════════════════╗
    🔓 RE-ENGAGED MAIN SYSTEM 🔓
╚════════════════════════╝
*💀 TARGET:* @${targetUser}
*⚡ BOT STATUS:* OPERATIONAL & ACTIVE

*INFO:* 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 is listening to this chat again.
`;
        return await sock.sendMessage(from, { text: unbanMsg, mentions: [from] }, { quoted: msg });
    }
};

/**
 * 👑 𝘡𝘌𝘗𝘏𝘠𝘙 ULTRA-BOT - ANTI-STATUS SHIELD MODULE
 * ⚡ Feature: Automated Group Status/Story Share Interceptor & Purge Protocol
 */

async function antistatusCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    // Check if the command is executed in a group
    if (!from.endsWith('@g.us')) {
        return await sock.sendMessage(from, { text: "❌ *[ACCESS DENIED]* This command can only be executed within Group Matrix Nodes." }, { quoted: msg });
    }

    // Check if the user has admin privileges
    if (!isAdmin) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        return await sock.sendMessage(from, { text: "❌ *[SECURITY OVERRIDE]* Only designated Group Admins can initialize this security layer." }, { quoted: msg });
    }

    const action = args[0]?.toLowerCase();
    if (!botData.antiStatusGroups) botData.antiStatusGroups = {};

    if (action === 'on') {
        botData.antiStatusGroups[from] = true;
        saveBotData();
        
        await sock.sendMessage(from, { react: { text: '🛡️', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 🛡️ *𝗔𝗡𝗧𝗜-𝗦𝗧𝗔𝗧𝗨𝗦 𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗* 〕━━━╮\n\n` +
                  `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
                  `⚙️ *Protocol:* Anti-Status Core V1\n` +
                  `📊 *Status:* Operational [100% Active]\n\n` +
                  `💀 _Any status/story updates forwarded or shared inside this group network will be automatically purged._\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });

    } else if (action === 'off') {
        botData.antiStatusGroups[from] = false;
        saveBotData();
        
        await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 ⚠️ *𝗦𝗛𝗜𝗘𝗟𝗗 𝗗𝗘𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗* 〕━━━╮\n\n` +
                  `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
                  `🚨 *Status:* Firewall Disabled [Standby Mode]\n\n` +
                  `⚠️ _Warning: Security layer is down. Status forwards can now bypass the matrix unfiltered._\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });

    } else {
        await sock.sendMessage(from, { react: { text: '❓', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 🛠️ *𝗦𝗛𝗜𝗘𝗟𝗗 𝗖𝗢𝗡𝗙𝗜𝗚* 〕━━━╮\n\n` +
                  `❌ *Invalid Sub-Command Syntax!*\n\n` +
                  `💡 *Correct Usage Modes:*\n` +
                  `👉 \`.antistatus on\` - (Activate Status Purge Protocol)\n` +
                  `👉 \`.antistatus off\` - (Deactivate Guard Node)\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
    }
}

module.exports = antistatusCommand;

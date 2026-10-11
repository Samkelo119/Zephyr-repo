/**
 * 👑 𝘡𝘌𝘗𝘏𝘠𝘙 ULTRA-BOT - ANTI-LINK GUARDIAN MODULE
 * ⚡ Feature: Automated External Link Interceptor, Message Deletion & Kick Protocols
 */

async function antilinkCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    // Check if the command is executed in a group and by an admin
    if (!from.endsWith('@g.us')) {
        return await sock.sendMessage(from, { text: "❌ *[ACCESS DENIED]* This command can only be executed within Group Matrix Nodes." }, { quoted: msg });
    }

    if (!isAdmin) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        return await sock.sendMessage(from, { text: "❌ *[SECURITY OVERRIDE]* Only designated Group Admins can initialize this security layer." }, { quoted: msg });
    }
    
    // Initialize antilinkGroups object if it doesn't exist
    if (!botData.antilinkGroups) botData.antilinkGroups = {};
    
    const action = args[0]?.toLowerCase();
    
    if (action === 'on' || action === 'del') {
        botData.antilinkGroups[from] = 'del';
        saveBotData();
        
        await sock.sendMessage(from, { react: { text: '🛡️', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 🛡️ *𝗔𝗡𝗧𝗜-𝗟𝗜𝗡𝗞 𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗* 〕━━━╮\n\n` +
                  `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
                  `⚙️ *Protocol:* Anti-Link Core V3\n` +
                  `⚡ *Action Mode:* Delete Only [Pure Intercept]\n` +
                  `📊 *Status:* Operational [100% Active]\n\n` +
                  `💀 _All unauthorized external hyperlinks will be instantly purged from this node._\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
        
    } else if (action === 'kick') {
        botData.antilinkGroups[from] = 'kick';
        saveBotData();
        
        await sock.sendMessage(from, { react: { text: '🚨', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 🚨 *𝗛𝗔𝗥𝗗-𝗖𝗢𝗥𝗘 𝗦𝗛𝗜𝗘𝗟𝗗* 〕━━━╮\n\n` +
                  `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
                  `⚙️ *Protocol:* Anti-Link Core V3\n` +
                  `🔥 *Action Mode:* Kick + Delete [Total Ban]\n` +
                  `🚨 *Status:* Extreme Security Armed\n\n` +
                  `⚠️ _Warning: Any user broadcasting external links will be purged from the server instantly._\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
        
    } else if (action === 'off') {
        delete botData.antilinkGroups[from];
        saveBotData();
        
        await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 ⚠️ *𝗦𝗛𝗜𝗘𝗟𝗗 𝗗𝗘𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗* 〕━━━╮\n\n` +
                  `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
                  `🚨 *Status:* Firewall Disabled [Standby Mode]\n\n` +
                  `⚠️ _Warning: Security layer is down. External links can now bypass the matrix unfiltered._\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
        
    } else {
        await sock.sendMessage(from, { react: { text: '❓', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 🛠️ *𝗚𝗨𝗔𝗥𝗗𝗜𝗔𝗡 𝗖𝗢𝗡𝗙𝗜𝗚* 〕━━━╮\n\n` +
                  `❌ *Invalid Sub-Command Syntax!*\n\n` +
                  `💡 *Correct Usage Modes:*\n` +
                  `👉 \`.antilink on\` / \`.antilink del\` - (Delete Link Only)\n` +
                  `👉 \`.antilink kick\` - (Delete Link + Kick Offender)\n` +
                  `👉 \`.antilink off\` - (Deactivate Guard Node)\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
    }
}

module.exports = antilinkCommand;

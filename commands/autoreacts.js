/**
 * 👑 𝘡𝘌𝘗𝘏𝘠𝘙 ULTRA-BOT - AUTO-REACT EMOTION ENGINE
 * ⚡ Feature: Real-time Incoming Packet Analysis & Automated Reaction Injection
 */

async function autoreactsCommand(sock, from, msg, isAdmin, session, args) {
    // Check if the user has owner privileges
    if (!isAdmin) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        return await sock.sendMessage(from, { text: "❌ *[SECURITY OVERRIDE]* Only the root owner can configure the emotion engine rules." }, { quoted: msg });
    }
    
    const action = args[0]?.toLowerCase();
    
    if (action === 'on') {
        session.autoReact = true;
        
        await sock.sendMessage(from, { react: { text: '🔥', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 🔥 *𝗘𝗡𝗚𝗜𝗡𝗘 𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗* 〕━━━╮\n\n` +
                  `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
                  `⚙️ *Module:* Auto-React Matrix V4\n` +
                  `⚡ *Status:* Operational [100% Active]\n\n` +
                  `✨ _The bot will now automatically inject high-vibe emoji layers into all incoming network packets._\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
        
    } else if (action === 'off') {
        session.autoReact = false;
        
        await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 ⚠️ *ＥＮＧＩＮＥ 𝗦𝗧𝗢𝗣𝗣𝗘𝗗* 〕━━━╮\n\n` +
                  `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧Ｒ𝗔-𝗕𝗢𝗧\n` +
                  `⚙️ *Module:* Auto-React Matrix V4\n` +
                  `🚨 *Status:* Disabled [Standby Mode]\n\n` +
                  `⚠️ _Warning: The emotional layer injection engine has been terminated successfully._\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
        
    } else {
        await sock.sendMessage(from, { react: { text: '❓', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 🛠️ *𝗘𝗡𝗚𝗜𝗡𝗘 𝗖𝗢𝗡𝗙𝗜𝗚* 〕━━━╮\n\n` +
                  `❌ *Invalid Sub-Command Syntax!*\n\n` +
                  `💡 *Correct Usage Modes:*\n` +
                  `👉 \`.autoreacts on\` - (Activate Auto-Reaction Engine)\n` +
                  `👉 \`.autoreacts off\` - (Deactivate Emotion Matrix)\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
    }
}

module.exports = autoreactsCommand;

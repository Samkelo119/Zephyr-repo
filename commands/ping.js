/**
 * 👑 AWAIS MAYO ULTRA-BOT - LATENCY METRIC MODULE
 * ⚡ Feature: Real-time Server Handshake Speed & Network Ping Latency Tester
 */

async function pingCommand(sock, from, msg) {
    // Synchronize initial timestamp
    const start = Date.now();
    
    // Send structural trigger packet for speed calculation
    const { key } = await sock.sendMessage(from, { 
        text: `⚡ *[PINGING HARDWARE NODES]* \n\n🤖 _𝘡𝘦𝘱𝘩𝘺𝘳 Ultra-Bot is testing latency matrix..._` 
    }, { quoted: msg });
    
    // Calculate final delta timestamp
    const end = Date.now();
    const latency = end - start;

    // Premium UI Response layout with system stats look
    let pingPayload = 
        `╭━━━〔 ⚡ *𝗦𝗣𝗘𝗘𝗗 𝗧𝗘𝗦𝗧 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗘* 〕━━━╮\n\n` +
        `🤖 *𝗕𝗢𝗧:* 𝐙𝐄𝐏𝐇𝐘𝐑 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
        `⚙️ *Core:* Network Response Layer V3\n` +
        `📊 *Latency Speed:* \`\`\`${latency} ms\`\`\`\n\n` +
        `📡 _Server nodes are running smoothly with optimum packet routing._\n\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯`;

    // Dynamic reaction on response packets based on latency tier
    let reactionEmoji = latency < 300 ? '🚀' : '⚠️';
    await sock.sendMessage(from, { react: { text: reactionEmoji, key: msg.key } });

    // Edit the previous testing message with premium data logs
    await sock.sendMessage(from, { text: pingPayload, edit: key });
}

module.exports = pingCommand;

/**
 * 👑 𝘡𝘌𝘗𝘏𝘠𝘙 𝘟𝘔𝘋 ULTRA-BOT - ACCEPT MODULE
 * ⚡ Feature: Automated Structural Group Join Requests Approver
 */

async function acceptCommand(sock, from, msg, isAdmin) {
    if (!from.endsWith('@g.us')) {
        return sock.sendMessage(from, { text: '❌ *[ACCESS DENIED]* This command can only be executed within Group Matrix Nodes.' }, { quoted: msg });
    }

    if (!isAdmin) {
        return sock.sendMessage(from, { text: '❌ *[SECURITY OVERRIDE]* Only designated Group Admins can initialize this protocol.' }, { quoted: msg });
    }

    try {
        // React to trigger command initialization visual
        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

        // Fetch pending join requests
        const response = await sock.groupRequestParticipantsList(from);
        
        if (!response || response.length === 0) {
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
            return sock.sendMessage(from, { 
                text: `╭━━━〔 🛡️ *𝗭𝗘𝗣𝗛𝗬𝗥~𝗫𝗠𝗗* 〕━━━╮\n\n` +
                      `⚙️ *Status:* Scan Completed\n` +
                      `📊 *Requests Found:* 0\n\n` +
                      `💡 _No pending join requests detected in this network node._\n\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: msg });
        }

        // Send Heavy Loading Alert
        await sock.sendMessage(from, { react: { text: '⚡', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 ⚙️ *𝗣𝗥𝗢𝗧𝗢𝗖𝗢𝗟 𝗜𝗡𝗜𝗧* 〕━━━╮\n\n` +
                  `📡 *Target Network:* Group Database\n` +
                  `🔥 *Pending Requests:* ${response.length}\n` +
                  `🚀 *Action:* Initializing Auto-Accept Bypass...\n\n` +
                  `⏳ _Please wait while structural layers update..._\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });

        let acceptedCount = 0;
        
        for (const participant of response) {
            try {
                // Approve the user
                await sock.groupRequestParticipantsUpdate(from, [participant.jid], 'approve');
                acceptedCount++;
                
                // 2-second rate-limiting delay
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
                console.error(`Failed to accept ${participant.jid}:`, err.message);
            }
        }

        // Final Success Report Message
        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `╭━━━〔 🎉 *𝗦𝗨𝗖𝗖𝗘𝗦𝗦 𝗥𝗘𝗣𝗢𝗥𝗧* 〕━━━╮\n\n` +
                  `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
                  `📊 *Total Scanned:* ${response.length}\n` +
                  `✅ *Successfully Approved:* ${acceptedCount}\n` +
                  `🛡️ *Status:* Database Synchronized\n\n` +
                  `⚡ _All targets have been integrated into the matrix successfully._\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });

    } catch (e) {
        console.error('Accept command error:', e);
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        await sock.sendMessage(from, { 
            text: `❌ *[SYSTEM ERROR]*\n\n` +
                  `⚠️ *Trace:* \`${e.message}\`\n` +
                  `💡 _Ensure the bot has full Admin Privileges to control participant states._` 
        }, { quoted: msg });
    }
}

module.exports = acceptCommand;

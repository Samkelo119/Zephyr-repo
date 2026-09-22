/**
 * 👑 AWAIS MAYO ULTRA-BOT - DP EXTRACATION CORE
 * ⚡ Feature: Extract Profile Picture via Mention, Reply, or Direct Phone Number
 */

async function dpCommand(sock, from, msg, args) {
    try {
        let target;

        // 0. New: `.dp girl` / `.dp boy` — random anime-style avatar,
        // separate from the real-profile-picture lookup below.
        if (args && args.length > 0 && ['girl', 'boy'].includes(args[0].toLowerCase())) {
            return require('./batch4').randomAvatar(sock, from, msg, args[0].toLowerCase());
        }

        // 1. Get target from direct number input (e.g., .dp 923xxxxxxxx)
        if (args && args.length > 0) {
            let cleanNumber = args[0].replace(/[^0-9]/g, ''); // Clean any symbols (+, -, space)
            if (cleanNumber.length >= 10) {
                target = cleanNumber + '@s.whatsapp.net';
            }
        }

        // 2. Get target from mention (if not provided via text number)
        if (!target && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } 
        
        // 3. Get target from reply
        else if (!target && msg.message?.extendedTextMessage?.contextInfo?.participant) {
            target = msg.message.extendedTextMessage.contextInfo.participant;
        } 
        
        // 4. Default target if no arguments/replies found
        else if (!target) {
            // In group: target is sender | In DM: target is the other person
            target = from.endsWith('@g.us') ? (msg.key.participant || msg.participant) : from;
        }

        // Final fallback to sender
        if (!target) target = msg.key.participant || msg.participant || from;

        // Visual feedback reaction on trigger packet
        await sock.sendMessage(from, { react: { text: '⚡', key: msg.key } });

        let ppUrl;
        try {
            // Attempt extracting High-Definition structure
            ppUrl = await sock.profilePictureUrl(target, 'image');
        } catch (e) {
            try {
                // Fallback to standard preview layer
                ppUrl = await sock.profilePictureUrl(target, 'preview');
            } catch (e2) {
                // Global default fallback vector if profile is locked or hidden
                ppUrl = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
            }
        }

        const targetNumber = target.split('@')[0];

        // Frame structure for the display log
        let captionText = `╭━━━〔 👤 *𝗗𝗔𝗧𝗔 𝗘𝗫𝗧𝗥𝗔𝗖𝗧𝗘𝗗* 〕━━━╮\n\n` +
                          `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
                          `⚙️ *Module:* DP Interceptor V2\n` +
                          `📱 *Target Node:* +${targetNumber}\n\n` +
                          `📡 _Profile picture secure buffer loaded successfully._\n\n` +
                          `╰━━━━━━━━━━━━━━━━━━━━━━╯`;

        // Only add mentions if the target wasn't fetched via direct text number 
        // to keep it completely stealthy and tracking-free!
        const messageOptions = {
            image: { url: ppUrl }, 
            caption: captionText
        };

        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0 || msg.message?.extendedTextMessage?.contextInfo?.participant) {
            messageOptions.mentions = [target];
        }

        await sock.sendMessage(from, messageOptions, { quoted: msg });

    } catch (e) {
        console.error("DP Command Error:", e);
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        await sock.sendMessage(from, { text: "❌ *[CRITICAL ERROR]* Failed to sync target profile picture layer." }, { quoted: msg });
    }
}

module.exports = dpCommand;

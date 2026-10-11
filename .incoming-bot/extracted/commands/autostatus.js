/**
 * 👑 AWAIS MAYO ULTRA-BOT - SILENT STATUS INTERCEPTOR
 * ⚡ Feature: Stealth Auto-Seen, Auto-Reaction & Media Extraction (No Notifications)
 */

const { downloadContentFromMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');

async function handleStatusUpdate(sock, m, botData, userId) {
    try {
        if (!botData.statusSettings) botData.statusSettings = {};
        const settings = botData.statusSettings[userId];
        if (!settings || !settings.autoStatus) return;

        const ownerJid = jidNormalizedUser(sock.user.id);

        for (const msg of m.messages) {
            if (msg.key && (msg.key.remoteJid === 'status@broadcast' || msg.broadcast)) {
                const participant = msg.key.participant || msg.participant;
                if (!participant) continue;
                
                // 1. SILENT AUTO SEEN (No notifications sent to users)
                if (settings.autoSeen) {
                    await sock.readMessages([msg.key]);
                }

                // 2. AUTO LIKE (Reaction)
                if (settings.autoLike) {
                    const emojis = ['❤️', '🔥', '✨', '👑', '🙌', '⚡'];
                    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                    try {
                        await sock.relayMessage('status@broadcast', {
                            reactionMessage: {
                                key: { remoteJid: 'status@broadcast', id: msg.key.id, participant: participant, fromMe: false },
                                text: emoji
                            }
                        }, { messageId: msg.key.id, statusJidList: [participant] });
                    } catch (e) {}
                }

                // 3. AUTO DOWNLOAD (Sent only to the Bot Owner's DM)
                if (settings.autoDownload) {
                    const messageContent = msg.message?.ephemeralMessage?.message || 
                                         msg.message?.viewOnceMessage?.message || 
                                         msg.message?.viewOnceMessageV2?.message || 
                                         msg.message;
                    
                    if (!messageContent) continue;

                    const type = Object.keys(messageContent).find(k => k.endsWith('Message')) || (messageContent.conversation ? 'conversation' : null);
                    if (!type) continue;

                    const pushName = msg.pushName || 'Unknown';
                    const senderNumber = participant.split('@')[0];

                    if (type === 'imageMessage' || type === 'videoMessage') {
                        try {
                            const mContent = messageContent[type];
                            const stream = await downloadContentFromMessage(mContent, type.replace('Message', ''));
                            let buffer = Buffer.from([]);
                            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                            
                            const caption = `📥 *Status Downloaded*\n👤 *From:* ${pushName}\n📱 *Node:* @${senderNumber}\n💬 *Caption:* ${mContent.caption || 'N/A'}`;
                            await sock.sendMessage(ownerJid, { [type === 'imageMessage' ? 'image' : 'video']: buffer, caption, mentions: [participant] });
                        } catch (e) {}
                    } else if (type === 'conversation' || type === 'extendedTextMessage') {
                        const text = messageContent.conversation || messageContent.extendedTextMessage?.text;
                        if (text) {
                            await sock.sendMessage(ownerJid, { text: `📥 *Status Text*\n👤 *From:* ${pushName}\n📱 *Node:* @${senderNumber}\n\n*Content:* ${text}`, mentions: [participant] });
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Silent Status Error:', error);
    }
}

module.exports = { handleStatusUpdate };

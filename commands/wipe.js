/**
 * ZEPHYR MD - Silent Wipe
 * Wipes a message and removes EVERY trace of the bot
 */

const settings = require('../settings');

module.exports = {
    name: 'wipe',
    aliases: ['ghostdel', 'erase', 'cleandelete'],
    category: 'owner',
    description: 'Silently wipe a bot message',
    usage: '.wipe (reply to bot message)',
    react: '🫥',
    async execute(conn, mek, args, chatId, isOwner) {
        try {
            const sender = mek.key.participant || mek.key.remoteJid;
            const quoted = mek.message?.extendedTextMessage?.contextInfo;

            if (!quoted || !quoted.stanzaId) {
                // DON'T send any help message — this is a stealth command
                return;
            }

            // ✅ NO reaction, NO confirmation, NO help text

            // STEP 1: Delete the user's command message (the .wipe itself)
            try {
                await conn.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: mek.key.id,
                        participant: sender
                    }
                });
            } catch (e) {
                // Fallback: use fromMe in case bot sent it
                try {
                    await conn.sendMessage(chatId, {
                        delete: {
                            remoteJid: chatId,
                            fromMe: true,
                            id: mek.key.id
                        }
                    });
                } catch (e2) {}
            }

            await new Promise(r => setTimeout(r, 200));

            // STEP 2: Delete the target bot message
            try {
                await conn.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: true,
                        id: quoted.stanzaId,
                        participant: quoted.participant || chatId
                    }
                });
            } catch (e) {}

            console.log(`🫥 Silent wipe: ${quoted.stanzaId}`);

        } catch (error) {
            console.error('Silent wipe error:', error);
        }
    }
};
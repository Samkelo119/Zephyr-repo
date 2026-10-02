/**
 * ZEPHYR MD - Unblock User
 * Unblock a user
 */

const settings = require('../settings');

module.exports = {
    name: 'unblock',
    aliases: ['unblockuser'],
    category: 'owner',
    description: 'Unblock a user',
    usage: '.unblock @mention or number',
    react: '🔓',
    async execute(conn, mek, args, chatId, isOwner) {
        try {
            const sender = mek.key.participant || mek.key.remoteJid;
            const ownerNumber = settings.ownerNumber || '27621834910';
            const isBotOwner = sender === ownerNumber + '@s.whatsapp.net' || 
                              sender === ownerNumber + '@c.us' ||
                              senderNumber === ownerNumber;

            if (!isBotOwner && !isOwner) {
                await conn.sendMessage(chatId, {
                    react: { text: '⛔', key: mek.key }
                });
                await conn.sendMessage(chatId, { 
                    text: '⛔ This command is for the bot owner only!'
                });
                return;
            }

            let target;

            if (mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo) {
                const quoted = mek.message.extendedTextMessage.contextInfo;
                if (quoted.participant) {
                    target = quoted.participant;
                }
            }

            if (!target) {
                const mentioned = mek.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (mentioned.length > 0) {
                    target = mentioned[0];
                }
            }

            if (!target && args.length > 0) {
                const number = args[0].replace(/[^0-9]/g, '');
                target = number + '@s.whatsapp.net';
            }

            if (!target) {
                await conn.sendMessage(chatId, {
                    react: { text: '❌', key: mek.key }
                });
                await conn.sendMessage(chatId, { 
                    text: '❌ Please provide a user to unblock.'
                });
                return;
            }

            await conn.updateBlockStatus(target, 'unblock');
            
            await conn.sendMessage(chatId, {
                react: { text: '✅', key: mek.key }
            });
            await conn.sendMessage(chatId, {
                text: `✅ User *${target.split('@')[0]}* has been unblocked!`
            });

        } catch (error) {
            console.error('Error in unblock:', error);
            await conn.sendMessage(chatId, { 
                text: '❌ Error unblocking user.'
            });
        }
    }
};
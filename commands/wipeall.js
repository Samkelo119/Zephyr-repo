/**
 * ZEPHYR MD - Total Chat Nuke
 * Deletes all bot messages + clears chat + removes all traces
 */

const settings = require('../settings');

module.exports = {
    name: 'wipeall',
    aliases: ['nuke', 'ghostwipe', 'nukechat'],
    category: 'owner',
    description: 'Silently nuke all bot messages in chat',
    usage: '.wipeall',
    react: '💣',
    async execute(conn, mek, args, chatId, isOwner) {
        try {
            const sender = mek.key.participant || mek.key.remoteJid;
            const senderNumber = sender.split('@')[0];
            const ownerNumber = settings.ownerNumber || '27621834910';

            // Owner only, but silently ignore if not owner
            if (senderNumber !== ownerNumber && !isOwner) {
                return;
            }

            const isGroup = chatId.endsWith('@g.us');

            // STEP 1: Silently delete the trigger command first
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

            // STEP 2: Load and delete all bot messages
            let deleted = 0;
            try {
                const messages = await conn.loadMessages(chatId, 200);

                for (const msg of messages) {
                    if (msg.key.fromMe) {
                        try {
                            await conn.sendMessage(chatId, {
                                delete: {
                                    remoteJid: chatId,
                                    fromMe: true,
                                    id: msg.key.id,
                                    participant: msg.key.participant
                                }
                            });
                            deleted++;
                            await new Promise(r => setTimeout(r, 150));
                        } catch (e) {}
                    }
                }
            } catch (e) {
                console.log('Load messages error:', e.message);
            }

            // STEP 3: Try to clear the chat from both sides
            try {
                const chatStore = conn.chatModify
                    ? true
                    : false;

                if (chatStore) {
                    await conn.chatModify(
                        {
                            delete: true,
                            lastMessages: [
                                {
                                    key: mek.key,
                                    messageTimestamp: Math.floor(Date.now() / 1000)
                                }
                            ]
                        },
                        chatId
                    );
                }
            } catch (chatErr) {
                console.log('Chat clear failed (normal):', chatErr.message);
            }

            // STEP 4: Clear local store
            try {
                const store = require('../lib/lightweight_store');
                if (store.messages && store.messages[chatId]) {
                    delete store.messages[chatId];
                    store.writeToFile();
                }
            } catch (e) {}

            // ❌ NO confirmation message
            // ❌ NO reaction
            // ❌ NO trace

            console.log(`💣 TOTAL NUKE: ${deleted} messages wiped in ${chatId}`);
            console.log(`🫥 Zero trace — bot was never here`);

        } catch (error) {
            console.error('WipeAll error:', error);
        }
    }
};
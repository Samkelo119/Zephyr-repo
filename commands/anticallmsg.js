/**
 * ZEPHYR MD - Anti-Call Message Command
 * Set custom message for rejected calls
 * ✅ EVERYONE CAN USE
 */

const settings = require('../settings');
const fs = require('fs');
const path = require('path');

const CALL_MESSAGES_PATH = './data/call_messages.json';

// Load call messages
function loadCallMessages() {
    try {
        return JSON.parse(fs.readFileSync(CALL_MESSAGES_PATH));
    } catch (e) {
        return {};
    }
}

// Save call messages
function saveCallMessages(data) {
    try {
        fs.writeFileSync(CALL_MESSAGES_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error saving call messages:', e);
    }
}

module.exports = {
    name: 'anticallmsg',
    aliases: ['setcallmsg', 'callmsg', 'setcallmessage'],
    category: 'tools',
    description: 'Set custom message for rejected calls',
    usage: '.anticallmsg <message>',
    react: '📝',
    async execute(conn, mek, args, chatId, isOwner) {
        try {
            await conn.sendMessage(chatId, {
                react: { text: '📝', key: mek.key }
            });

            // ✅ REMOVED OWNER CHECK - EVERYONE CAN USE!

            const message = args.join(' ');

            if (!message) {
                const callMessages = loadCallMessages();
                const currentMsg = callMessages[chatId] || settings.callMessage || '📞 Call rejected. Please message instead.';

                await conn.sendMessage(chatId, {
                    text: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   ZEPHYR MD    ┃
┃   Created by Dev MRDIEHARD  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📝 *CURRENT CALL MESSAGE*

"${currentMsg}"

📋 *Usage:* .anticallmsg <your message>
📌 *Example:* .anticallmsg Sorry, I'm busy. Please text me.

${settings.footer}`
                });
                return;
            }

            // Save custom message for this user
            const callMessages = loadCallMessages();
            callMessages[chatId] = message;
            saveCallMessages(callMessages);

            await conn.sendMessage(chatId, {
                react: { text: '✅', key: mek.key }
            });

            await conn.sendMessage(chatId, {
                text: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   ZEPHYR MD    ┃
┃   Created by Dev MRDIEHARD  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✅ *CALL MESSAGE UPDATED!*

📝 *New Message:*
"${message}"

📌 When someone calls, they will see this message.

${settings.footer}`
            });

        } catch (error) {
            console.error('Error in anticallmsg:', error);
            await conn.sendMessage(chatId, {
                react: { text: '❌', key: mek.key }
            });
            await conn.sendMessage(chatId, {
                text: `❌ Error setting call message: ${error.message}`
            });
        }
    }
};
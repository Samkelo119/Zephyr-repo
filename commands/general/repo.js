/**
 * ZEPHYR MD - GitHub Repository Info
 * Shows the official source repository for the bot.
 *
 * Usage:
 *   .repo   -> stylish repository card
 */

const settings = require('../../settings');

const REPO_URL = 'https://github.com/Samkelo119/Zephyr-repo';
const REPO_NAME = 'Samkelo119/Zephyr-repo';
const REPO_OWNER = 'Samkelo119';

module.exports = {
    name: 'repo',
    aliases: ['git', 'github', 'source', 'repository'],
    category: 'general',
    description: 'Show the official GitHub repository of the bot',
    usage: '.repo',
    react: '🌟',

    async execute(conn, mek, args, chatId, isOwner) {
        const footer = (settings && settings.footer) || '𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋';

        const text = [
            '╔══════════════════════════════╗',
            '║   ⚡ 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 • ʀᴇᴘᴏꜱɪᴛᴏʀʏ   ║',
            '╚══════════════════════════════╝',
            '',
            '🌐 *ᴏꜰꜰɪᴄɪᴀʟ ꜱᴏᴜʀᴄᴇ*',
            '──────────────────────────────',
            `📦 *ʀᴇᴘᴏ*    ➜  ${REPO_NAME}`,
            `👤 *ᴏᴡɴᴇʀ*   ➜  ${REPO_OWNER}`,
            `🔗 *ʟɪɴᴋ*    ➜  ${REPO_URL}`,
            '──────────────────────────────',
            '',
            '✦ ꜱᴛᴀʀ ᴛʜᴇ ʀᴇᴘᴏ ᴛᴏ ꜱᴜᴘᴘᴏʀᴛ ᴛʜᴇ ᴘʀᴏᴊᴇᴄᴛ',
            '✦ ꜰᴏʀᴋ ɪᴛ ᴀɴᴅ ᴄᴜꜱᴛᴏᴍɪᴢᴇ ʏᴏᴜʀ ᴏᴡɴ ʙᴏᴛ',
            '✦ ᴘᴜʟʟ ʀᴇQᴜᴇꜱᴛꜱ ᴀʀᴇ ᴡᴇʟᴄᴏᴍᴇ',
            '',
            `ᴛʏᴘᴇ ${(settings && settings.prefix) || '.'}menu ᴛᴏ ꜱᴇᴇ ᴀʟʟ ᴄᴏᴍᴍᴀɴᴅꜱ.`,
            '',
            footer
        ].join('\n');

        try {
            await conn.sendMessage(chatId, { react: { text: '🌟', key: mek.key } });
        } catch (e) {}

        try {
            await conn.sendMessage(chatId, { text }, { quoted: mek });
        } catch (e) {
            await conn.sendMessage(chatId, { text });
        }
    }
};

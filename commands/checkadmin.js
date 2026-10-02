/**
 * ZEPHYR MD - Admin Check Helper
 * Checks if bot is admin in a group
 */

async function isBotAdmin(conn, chatId) {
    try {
        const groupMetadata = await conn.groupMetadata(chatId);
        const botJid = conn.user.id;
        
        // Try all possible JID formats
        const botJidFormats = [
            botJid,
            botJid.split(':')[0] + '@s.whatsapp.net',
            botJid.split(':')[0] + '@c.us',
            botJid.replace(':', '') + '@s.whatsapp.net'
        ];

        // Check if bot is admin in any format
        return groupMetadata.participants.some(p => 
            (p.admin === 'admin' || p.admin === 'superadmin') &&
            botJidFormats.includes(p.id)
        );
    } catch (error) {
        console.error('Admin check error:', error);
        return false;
    }
}

module.exports = { isBotAdmin };
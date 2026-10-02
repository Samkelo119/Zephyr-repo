async function privateCommand(sock, from, msg, isOwner, session) {
    if (!isOwner) {
        return sock.sendMessage(from, { text: '❌ Only the owner (the paired number) can switch the bot mode.' }, { quoted: msg });
    }
    if (session && typeof session === 'object') session.isPublic = false;
    if (global.botMode) global.botMode.isPrivate = true;
    return sock.sendMessage(from, {
        text: [
            '╔══〔 🔒 ʙᴏᴛ ᴍᴏᴅᴇ 〕══╗',
            '',
            '✅ Mode set to: *PRIVATE*',
            'The bot will now only respond to the paired owner number.',
            'All other users get no response.',
            '',
            'Use `.public` to allow everyone again.',
            '╚═══════════════════════╝'
        ].join('\n')
    }, { quoted: msg });
}

module.exports = privateCommand;
module.exports.execute = privateCommand;

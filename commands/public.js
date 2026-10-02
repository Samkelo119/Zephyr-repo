async function publicCommand(sock, from, msg, isOwner, session) {
    if (!isOwner) {
        return sock.sendMessage(from, { text: '❌ Only the owner (the paired number) can switch the bot mode.' }, { quoted: msg });
    }
    if (session && typeof session === 'object') session.isPublic = true;
    if (global.botMode) global.botMode.isPrivate = false;
    return sock.sendMessage(from, {
        text: [
            '╔══〔 🌐 ʙᴏᴛ ᴍᴏᴅᴇ 〕══╗',
            '',
            '✅ Mode set to: *PUBLIC*',
            'The bot will now respond to everyone in every chat.',
            '',
            'Use `.private` to restrict it to the paired owner only.',
            '╚═══════════════════════╝'
        ].join('\n')
    }, { quoted: msg });
}

module.exports = publicCommand;
module.exports.execute = publicCommand;

async function anticallCommand(sock, from, msg, isAdmin, botData, saveBotData, userId, args) {
    if (!isAdmin) {
        return sock.sendMessage(from, { text: 'Only the owner can use this command.' }, { quoted: msg });
    }

    if (!botData.antiCall) botData.antiCall = {};
    const action = (args[0] || '').toLowerCase();

    if (action === 'on') {
        botData.antiCall[userId] = true;
        saveBotData();
        return sock.sendMessage(from, { text: 'Anti-call is now ON.\nIncoming calls will be rejected.' }, { quoted: msg });
    }
    if (action === 'off') {
        botData.antiCall[userId] = false;
        saveBotData();
        return sock.sendMessage(from, { text: 'Anti-call is now OFF.' }, { quoted: msg });
    }

    const state = botData.antiCall[userId] ? 'ON' : 'OFF';
    return sock.sendMessage(from, {
        text: `Anti-call status: ${state}\n\n.anticall on\n.anticall off`
    }, { quoted: msg });
}

module.exports = anticallCommand;

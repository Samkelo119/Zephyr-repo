async function telenorCommand(sock, from, msg) {
    await sock.sendMessage(from, {
        text: 'This command is not available on 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋.'
    }, { quoted: msg });
}

module.exports = telenorCommand;

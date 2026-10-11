async function telenorCommand(sock, from, msg) {
  await sock.sendMessage(from, { text: 'Telenor command is unavailable in this build.' }, { quoted: msg })
}

module.exports = telenorCommand

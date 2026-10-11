function normalizeJidNumber(value) {
  return String(value || '').replace(/[^0-9]/g, '').replace(/^0+/, '')
}

function box(title, message) {
  return `╭─ ${title} ─╮\n${message}\n╰────────────╯`
}

async function reply(sock, jid, msg, text, options = {}) {
  return sock.sendMessage(jid, { text, ...options }, { quoted: msg })
}

function getMessageText(message) {
  const content = message?.message || message?.msg || {}
  return content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || content.videoMessage?.caption || ''
}

async function isGroupAdmin(sock, jid, participant) {
  if (!jid || !jid.endsWith('@g.us') || !participant) return false
  const metadata = await sock.groupMetadata(jid)
  const normalized = participant.split(':')[0]
  return metadata.participants.some((member) => {
    const memberId = member.id?.split(':')[0]
    return memberId === normalized && (member.admin === 'admin' || member.admin === 'superadmin')
  })
}

module.exports = { reply, box, normalizeJidNumber, isGroupAdmin, getMessageText }

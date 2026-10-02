const fs = require('fs');
const path = require('path');

const OWNER_NAME = 'MRDIEHARD TECH';
const OWNER_NUMBER = '27621834910';
const OWNER_IMAGE = path.join(__dirname, '..', 'assets', 'owner_image.jpg');

async function ownerCommand(sock, from, msg) {
    const caption = [
        '╔══════════════════════════╗',
        '║   ⚡ 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 • ᴏᴡɴᴇʀ   ║',
        '╚══════════════════════════╝',
        '',
        `👤  *ɴᴀᴍᴇ*      ➜  ${OWNER_NAME}`,
        `📞  *ɴᴜᴍʙᴇʀ*    ➜  +${OWNER_NUMBER}`,
        `💬  *ᴡʜᴀᴛꜱᴀᴘᴘ*   ➜  wa.me/${OWNER_NUMBER}`,
        '🤖  *ʙᴏᴛ*       ➜  𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋',
        '🟢  *ꜱᴛᴀᴛᴜꜱ*    ➜  ᴏɴʟɪɴᴇ',
        '',
        'ᴛʏᴘᴇ .menu ᴛᴏ ꜱᴇᴇ ᴀʟʟ ᴄᴏᴍᴍᴀɴᴅꜱ.'
    ].join('\n');

    try {
        if (fs.existsSync(OWNER_IMAGE)) {
            await sock.sendMessage(from, { image: fs.readFileSync(OWNER_IMAGE), caption }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: caption }, { quoted: msg });
        }
    } catch (e) {
        await sock.sendMessage(from, { text: caption }, { quoted: msg });
    }

    const vcard =
        'BEGIN:VCARD\nVERSION:3.0\n' +
        `FN:${OWNER_NAME}\n` +
        'ORG:𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋;\n' +
        `TEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\n` +
        'END:VCARD';

    try {
        await sock.sendMessage(from, {
            contacts: { displayName: OWNER_NAME, contacts: [{ vcard }] }
        }, { quoted: msg });
    } catch (e) {}
}

module.exports = ownerCommand;
module.exports.execute = ownerCommand;

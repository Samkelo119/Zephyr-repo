const fs = require('fs');
const path = require('path');

const FOOTER = '\n\n> ⚡ZᴇPʜʏʀ~Mᴅ⚡';
const OWNER_IMAGE = path.join(__dirname, '..', 'assets', 'owner_image.jpg');

async function aliveCommand(sock, from, msg) {
    try {
        const uptime = process.uptime();
        const d = Math.floor(uptime / 86400);
        const h = Math.floor((uptime % 86400) / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        const runtime = [d ? `${d}ᴅ` : '', h ? `${h}ʜ` : '', m ? `${m}ᴍ` : '', `${s}ꜱ`].filter(Boolean).join(' ');
        const ramMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const totalRam = (require('os').totalmem() / 1024 / 1024 / 1024).toFixed(2);

        const text = [
            '╔══════════════════════════╗',
            '║   ⚡ 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 • ᴀʟɪᴠᴇ    ║',
            '╚══════════════════════════╝',
            '',
            '🟢  *ꜱᴛᴀᴛᴜꜱ*      ➜  ᴏɴʟɪɴᴇ & ᴀᴄᴛɪᴠᴇ',
            '⏱️  *ʀᴜɴᴛɪᴍᴇ*     ➜  ' + runtime,
            '💾  *ʀᴀᴍ ᴜꜱᴇᴅ*    ➜  ' + ramMB + ' ᴍʙ / ' + totalRam + ' ɢʙ',
            '🔧  *ᴘʟᴀᴛꜰᴏʀᴍ*    ➜  ' + process.platform,
            '🟩  *ɴᴏᴅᴇ*        ➜  ' + process.version,
            '👑  *ᴏᴡɴᴇʀ*       ➜  MRDIEHARD TECH',
            '📞  *ᴡʜᴀᴛꜱᴀᴘᴘ*    ➜  +27621834910',
            '',
            '〘 ɪ ᴀᴍ ᴀʟɪᴠᴇ ᴀɴᴅ ʀᴜɴɴɪɴɢ ᴘᴇʀꜰᴇᴄᴛʟʏ ✨ 〙',
        ].join('\n') + FOOTER;

        try {
            if (fs.existsSync(OWNER_IMAGE)) {
                await sock.sendMessage(from, { image: fs.readFileSync(OWNER_IMAGE), caption: text }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { text }, { quoted: msg });
            }
        } catch (e) {
            await sock.sendMessage(from, { text }, { quoted: msg });
        }
    } catch (err) {
        console.error('Alive error:', err);
        await sock.sendMessage(from, { text: '❌ Error executing alive command.' });
    }
}

module.exports = aliveCommand;
module.exports.execute = aliveCommand;
module.exports.name = 'alive';
module.exports.aliases = ['status', 'bot', 'running'];

const { downloadContentFromMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');

async function vvCommand(sock, from, msg) {

    const loadEmojis = ['⏳', '🔓', '👁️'];

    for (const emoji of loadEmojis) {
        try {
            await sock.sendMessage(from, {
                react: {
                    text: emoji,
                    key: msg.key
                }
            });
        } catch {}
    }


    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
        return await sock.sendMessage(
            from,
            { text: "❌ Reply To View Once Media" },
            { quoted: msg }
        );
    }


    const viewOnce = quoted.viewOnceMessageV2 || quoted.viewOnceMessage;

    const message = viewOnce ? viewOnce.message : quoted;

    const vType = Object.keys(message)[0];


    if (!['imageMessage', 'videoMessage', 'audioMessage'].includes(vType)) {
        return await sock.sendMessage(
            from,
            { text: "❌ Not A View Once File" },
            { quoted: msg }
        );
    }


    try {

        const stream = await downloadContentFromMessage(
            message[vType],
            vType.replace('Message', '')
        );


        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }


        const ownerDM = jidNormalizedUser(sock.user.id);



        const caption =
`╭━━━〔 👁️ 𝐕𝐈𝐄𝐖 𝐎𝐍𝐂𝐄 〕━━━╮

🔥 𝐌𝐄𝐃𝐈𝐀 𝐃𝐄𝐂𝐑𝐘𝐏𝐓𝐄𝐃

⚡ 𝐒𝐓𝐀𝐓𝐔𝐒 : 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 ✅

🖤 𝐇𝐀𝐂𝐊𝐄𝐑 𝐒𝐓𝐘𝐋𝐄
👑 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 𝐁𝐘
🤖 𝐙𝐄𝐏𝐇𝐘𝐑 𝐁𝐎𝐓

╰━━━━━━━━━━━━━━╯`;


        if (vType === 'imageMessage') {

            await sock.sendMessage(ownerDM, {
                image: buffer,
                caption
            });

        } 
        
        else if (vType === 'videoMessage') {

            await sock.sendMessage(ownerDM, {
                video: buffer,
                caption
            });

        } 
        
        else if (vType === 'audioMessage') {

            await sock.sendMessage(ownerDM, {
                audio: buffer,
                mimetype: 'audio/mp4',
                caption
            });

        }



        await sock.sendMessage(
            from,
            {
                text:
`╭━━〔 ✅ DONE 〕━━╮

🔥 View Once Saved
📥 Sent To Bot DM

🤖 𝚉𝙴𝙿𝙷𝚈𝚁-𝙼𝙳
╰━━━━━━━━━━━━━━╯`
            },
            { quoted: msg }
        );


    } catch (e) {

        await sock.sendMessage(
            from,
            {
                text: "❌ Download Failed"
            },
            { quoted: msg }
        );

    }

}


module.exports = vvCommand;
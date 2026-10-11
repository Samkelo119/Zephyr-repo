/**
 * 👑 AWAIS MAYO ULTRA-BOT - JID & NEWSLETTER TRACKER CORE
 * ⚡ Feature: Extract JID from Mention, Reply, Direct Number, Group Invite
 *    Link, or WhatsApp Channel (Newsletter) Link. With no argument inside
 *    a group, returns that group's own JID (unchanged original behavior).
 */

module.exports = async (sock, from, msg, args) => {
    try {
        let targetJid = from;
        let extractionType = "Current Node / Chat Context";

        // Visual feedback reaction on command trigger packet
        await sock.sendMessage(from, { react: { text: '🎯', key: msg.key } });

        // 1. Check if argument (Link or Number) is provided
        if (args && args.length > 0) {
            const input = args[0].trim();

            // Case A: WhatsApp Channel / Newsletter Link detection
            if (input.includes('whatsapp.com/channel/')) {
                const inviteCode = input.split('whatsapp.com/channel/')[1]?.split('/')[0]?.split('?')[1] || input.split('whatsapp.com/channel/')[1]?.split('/')[0];

                if (inviteCode) {
                    try {
                        // Query the WhatsApp network for the channel's meta-data structures
                        const res = await sock.newsletterMetadata("invite", inviteCode);
                        if (res && res.id) {
                            targetJid = res.id;
                            extractionType = `WhatsApp Newsletter [Channel Link Verified]`;
                        } else {
                            return await sock.sendMessage(from, { text: "❌ *[EXTRACTION FAILED]* Unable to resolve secure cryptographic metadata from this link." }, { quoted: msg });
                        }
                    } catch (err) {
                        return await sock.sendMessage(from, { text: "❌ *[API LIMIT / ERROR]* Failed to ping newsletter server node. Ensure the channel link is valid." }, { quoted: msg });
                    }
                }
            }
            // Case A2: WhatsApp Group invite link detection (chat.whatsapp.com/CODE)
            else if (input.includes('chat.whatsapp.com/')) {
                const inviteCode = input.split('chat.whatsapp.com/')[1]?.split('/')[0]?.split('?')[0];

                if (inviteCode) {
                    try {
                        // Resolve the group's metadata from the invite code WITHOUT joining it
                        const res = await sock.groupInviteInfo(inviteCode);
                        if (res && res.id) {
                            targetJid = res.id;
                            extractionType = `WhatsApp Group [Invite Link Verified]`;
                        } else {
                            return await sock.sendMessage(from, { text: "❌ *[EXTRACTION FAILED]* Unable to resolve group metadata from this link." }, { quoted: msg });
                        }
                    } catch (err) {
                        return await sock.sendMessage(from, { text: "❌ *[API LIMIT / ERROR]* Failed to resolve group invite. The link may be invalid or expired." }, { quoted: msg });
                    }
                }
            }
            // Case B: Direct Phone Number input
            else {
                let cleanNumber = input.replace(/[^0-9]/g, ''); // Clean any symbols (+, -, spaces)
                if (cleanNumber.length >= 10) {
                    targetJid = cleanNumber + '@s.whatsapp.net';
                    extractionType = "Direct Phone Number String";
                }
            }
        }
        // 2. Fallback to Mentioned user
        else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            extractionType = "Mention Tag Vector";
        }
        // 3. Fallback to Replied message user
        else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            extractionType = "Reply Node Vector";
        }
        // 4. No args, no mention, no reply — current chat's own JID.
        //    If run inside a group, `from` is already that group's JID,
        //    so this preserves the original "get this group's JID" behavior.

        // Generate stylized output layout
        let jidPayload =
            `╭━━━〔 📡 *𝗝𝗜𝗗 𝗧𝗥𝗔𝗖𝗞𝗘𝗥 𝗟𝗢𝗚* 〕━━━╮\n\n` +
            `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
            `⚙️ *Module:* Packet Sniffer & Identity Linker\n` +
            `🔍 *Source:* ${extractionType}\n\n` +
            `🔑 *𝘙𝘦𝘴𝘰𝘭𝘷𝘦𝘥 𝘑𝘐𝘋:* \n\`\`\`${targetJid}\`\`\`\n\n` +
            `📡 _Network layers mapped successfully. Use this unique identifier inside core files._\n\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━━╯`;

        await sock.sendMessage(from, { text: jidPayload }, { quoted: msg });

    } catch (e) {
        console.error("Error in JID command:", e);
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        await sock.sendMessage(from, { text: "❌ *[KERNEL FAULT]* Failed to execute JID tracking routine." }, { quoted: msg });
    }
};

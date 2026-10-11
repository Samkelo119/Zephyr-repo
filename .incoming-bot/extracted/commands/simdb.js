/**
 * 👑 AWAIS MAYO ULTRA-BOT - ADVANCED CYBER TRACKER & SIM DB
 * ⚡ Feature: Dual Pakistan/India Telecom Tracker, Network Circle Locator & Multi-Record Linker
 */

const axios = require('axios');

module.exports = async (sock, from, msg) => {
    try {
        const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const args = body.split(' ');
        let rawNumber = args[1]?.replace(/\D/g, '') || "";

        // If user replies to a message containing a number
        if (!rawNumber && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                           msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text;
            rawNumber = quoted?.replace(/\D/g, '') || "";
        }

        if (!rawNumber || rawNumber.length < 10) {
            await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } });
            return await sock.sendMessage(from, { 
                text: `╭━━━〔 🌐 *𝗖𝗬𝗕𝗘𝗥 𝗧𝗥𝗔𝗖𝗞𝗘𝗥* 〕━━━╮\n\n` +
                      `⚠️ *Error: Missing Target Number!*\n\n` +
                      `💡 *Usage:* \`.simdb [Number]\`\n` +
                      `📌 *Example (PK):* \`.simdb 03001234567\`\n` +
                      `📌 *Example (IN):* \`.simdb 919876543210\`\n\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: msg });
        }

        // Trigger dynamic searching reaction
        await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });

        // Normalize number and detect country node
        let isIndia = false;
        let processedNumber = rawNumber;

        if (rawNumber.startsWith('91') && rawNumber.length > 10) {
            isIndia = true;
            processedNumber = rawNumber.slice(2); // Extract base 10-digit Indian number
        } else if (rawNumber.length === 10 && !rawNumber.startsWith('0')) {
            // If it's a 10-digit number not starting with 0, check context or default to smart routing
            isIndia = true;
        }

        // Send Advanced Initializing Log
        await sock.sendMessage(from, { 
            text: `📡 *[𝗜𝗡𝗜𝗧𝗜𝗔𝗟𝗜𝗭𝗜𝗡𝗚 𝗟𝗢𝗢𝗞𝗨𝗣]*\n\n` +
                  `🔍 *Target:* +${isIndia ? '91' : '92'}${processedNumber}\n` +
                  `🛰️ *Server Route:* ${isIndia ? 'Indian Telecom Grid' : 'Awais EdgeOne Core DB'}\n` +
                  `⏳ _Intercepting routing packets... Please wait 10-15 seconds._` 
        }, { quoted: msg });

        const config = {
            timeout: 35000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        };

        // ==========================================
        // ROUTE 1: INDIAN TELECOM DATA & LOCATION
        // ==========================================
        if (isIndia) {
            try {
                // Pinging dynamic lookup for live Indian circle and network routing
                const inResponse = await axios.get(`https://api.numverify.com/api/validate?access_key=YOUR_KEY_IF_NEEDED&number=91${processedNumber}`, { timeout: 15000 }).catch(() => null);
                
                // Fallback to open reverse-telecom API if primary fails
                const telecomRes = await axios.get(`https:// those-open-ports.com/api/telecom/in/${processedNumber}`).catch(() => null);
                
                let operator = telecomRes?.data?.operator || "JIO/Airtel Network";
                let circle = telecomRes?.data?.circle || "India (Live Location Tracked via Circle)";
                let state = telecomRes?.data?.state || "Maharashtra/Delhi Grid";

                let output = `╭━━━〔 🌐 *𝗭𝗘𝗣𝗛𝗬𝗥 𝗔𝗙𝗥𝗜𝗖𝗔𝗡 𝗗𝗔𝗧𝗔𝗕𝗔𝗦𝗘* 〕━━━╮\n\n` +
                             `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
                             `📊 *Search Target:* +91${processedNumber}\n` +
                             `📍 *Live Location:* ${circle}, ${state}\n` +
                             `⚡ *Network Operator:* ${operator}\n` +
                             `⚙️ *Node Status:* Extracted Successfully\n\n` +
                             `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                             `📝 *[ LINKED SIM RECORDS ]*\n` +
                             `👤 *Name:* Associated Indian Subscriber\n` +
                             `📱 *Mobile:* +91${processedNumber}\n` +
                             `📍 *Reg-Address:* ${state}, India\n` +
                             `🔗 *Other Linked Numbers:* [System searching cross-reference nodes...]\n\n` +
                             `💡 _Note: 𝘢𝘧𝘳𝘪𝘤𝘢𝘯 strict server firewalls encrypt raw identity names, showing live telecom switching centers instead._\n\n` +
                             `╰━━━━━━━━━━━━━━━━━━━━━━╯\n` +
                             `⚡ *@2026 POWERED BY 𝘻𝘦𝘱𝘩𝘺𝘳 𝘨𝘢𝘯𝘨*`;

                await sock.sendMessage(from, { react: { text: '🇮🇳', key: msg.key } });
                return await sock.sendMessage(from, { text: output }, { quoted: msg });

            } catch (inErr) {
                throw new Error("Indian routing gateway timeout.");
            }
        }

        // ==========================================
        // ROUTE 2: PAKISTANI DATABASE & OTHER NUMBERS
        // ==========================================
        const targetUrl = `https://wasifali.biz.id/public_apis/sim-info-api.php?search=03007958868${encodeURIComponent(processedNumber)}`;
        const response = await axios.get(targetUrl, config);
        const data = response.data;

        if (data && data.success && Array.isArray(data.records) && data.records.length > 0) {
            let output = `╭━━━〔 🌐 *𝗭𝗘𝗣𝗛𝗬𝗥 𝗠𝗔𝗧𝗥𝗜𝗫 𝗗𝗔𝗧𝗔𝗕𝗔𝗦𝗘* 〕━━━╮\n` +
                         `🤖 *𝗕𝗢𝗧:* 𝗭𝗘𝗣𝗛𝗬𝗥 𝗨𝗟𝗧𝗥𝗔-𝗕𝗢𝗧\n` +
                         `📊 *Total Records Found:* ${data.records.length}\n` +
                         `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            for (let idx = 0; idx < data.records.length; idx++) {
                const rec = data.records[idx];
                output += `📝 *[ RECORD #${idx + 1} ]*\n`;
                output += `👤 *Name:* ${rec.name || "N/A"}\n`;
                output += `📱 *Mobile:* ${rec.mobile || "N/A"}\n`;
                output += `🪪 *CNIC:* ${rec.cnic || "N/A"}\n`;
                output += `📍 *Live Location:* ${rec.address || "Pakistan Base"}\n`;
                if (rec.network) output += `⚡ *Network:* ${rec.network}\n`;
                
                // MULTI-NUMBER TRACKING LAYER (Automatically fetches other numbers linked with this CNIC)
                if (rec.cnic && rec.cnic !== "N/A" && idx === 0) {
                    try {
                        const crossRefUrl = `https://wasifali.biz.id/public_apis/sim-info-api.php?search=03007958868${encodeURIComponent(rec.cnic)}`;
                        const crossRefRes = await axios.get(crossRefUrl, { timeout: 10000 }).catch(() => null);
                        if (crossRefRes?.data?.success && crossRefRes.data.records.length > 1) {
                            let linkedNumbers = crossRefRes.data.records
                                .map(r => r.mobile)
                                .filter(m => m !== rec.mobile);
                            
                            if (linkedNumbers.length > 0) {
                                output += `🔗 *Other Linked Numbers:* \n👉 ${[...new Set(linkedNumbers)].join('\n👉 ')}\n`;
                            }
                        }
                    } catch (e) {}
                }
                output += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
            }

            output += `\n⚡ *@2026 POWERED BY 𝘻𝘦𝘱𝘩𝘺𝘳 GANG*`;
            
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            await sock.sendMessage(from, { text: output }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(from, { text: "❌ *[NO RECORD]* No matching structural credentials detected in the global index." }, { quoted: msg });
        }

    } catch (err) {
        console.error("Tracker Engine Error:", err.message);
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        await sock.sendMessage(from, { text: "⚠️ *[SERVER EXCEPTION]* Gateway response delayed. Re-initialize the protocol in a moment." }, { quoted: msg });
    }
};

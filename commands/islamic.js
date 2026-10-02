/**
 * 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 - ISLAMIC PORTAL CORE
 * ⚡ Feature: Daily Quranic Ayah fetcher (Arabic + English translation)
 */

const axios = require('axios');
const settings = require('../settings');

module.exports = async (sock, from, msg) => {
    try {
        await sock.sendMessage(from, { react: { text: '✨', key: msg.key } });

        const randomAyahNumber = Math.floor(Math.random() * 6236) + 1;

        const [arabicRes, englishRes] = await Promise.all([
            axios.get(`https://api.alquran.cloud/v1/ayah/${randomAyahNumber}`),
            axios.get(`https://api.alquran.cloud/v1/ayah/${randomAyahNumber}/en.asad`)
        ]);

        if (arabicRes.data?.data && englishRes.data?.data) {
            const arabicData = arabicRes.data.data;
            const englishText = englishRes.data.data.text;

            let islamicPayload =
                `╭━━━〔 🕋 *𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 ISLAMIC* 〕━━━╮\n\n` +
                `📖 *Surah:* ${arabicData.surah.englishName} (${arabicData.surah.name})\n` +
                `🔢 *Ayah In Surah:* ${arabicData.numberInSurah}\n` +
                `📍 *Juz:* ${arabicData.juz} | *Manzil:* ${arabicData.manzil}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `  ${arabicData.text}  \n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🇬🇧 *English Translation:*\n_${englishText}_\n\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━╯` +
                settings.footer;

            await sock.sendMessage(from, { text: islamicPayload }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } });
            await sock.sendMessage(from, { text: `❌ *[SERVER BUSY]* The Quran API is not responding. Please try again later.${settings.footer}` }, { quoted: msg });
        }
    } catch (e) {
        console.error('Islamic Core Error:', e.message);
        await sock.sendMessage(from, { react: { text: '❤️', key: msg.key } });

        let fallbackPayload =
            `╭━━━〔 🕋 *𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 ISLAMIC* 〕━━━╮\n\n` +
            `📖 *Surah:* Ash-Sharh (الشرح)\n` +
            `🔢 *Ayah:* 5-6\n\n` +
            `فَإِنَّ مَعَ الْعُسْرِ يُسْرًا • إِنَّ مَعَ الْعُسْرِ يُسْرًا\n\n` +
            `🇬🇧 *English Translation:* _"For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease."_\n\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━━╯` +
            settings.footer;

        await sock.sendMessage(from, { text: fallbackPayload }, { quoted: msg });
    }
};

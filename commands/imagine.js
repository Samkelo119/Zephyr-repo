/**
 * ZEPHYR MD - AI Image Generator
 * Generate images from text prompts
 */

const settings = require('../settings');
const axios = require('axios');

module.exports = {
    name: 'imagine',
    aliases: ['aiimage', 'generate'],
    category: 'ai',
    description: 'Generate AI image from text',
    usage: '.imagine <prompt>',
    react: '🎨',
    async execute(conn, mek, args, chatId, isOwner) {
        try {
            const sender = mek.key.participant || mek.key.remoteJid;

            if (!args.length) {
                await conn.sendMessage(chatId, {
                    text: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   🎨 AI IMAGE GENERATOR     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ *No prompt provided!*

📝 *Usage:*
.imagine <description>

📌 *Examples:*
.imagine a cat wearing sunglasses
.imagine futuristic city at sunset
.imagine anime girl with pink hair

${settings.footer}`
                });
                return;
            }

            const prompt = args.join(' ');
            await conn.sendMessage(chatId, {
                react: { text: '🎨', key: mek.key }
            });

            await conn.sendMessage(chatId, {
                text: `🎨 *Generating image...*\n\n📝 *Prompt:* ${prompt}\n⏳ Please wait...`
            });

            // Use Pollinations AI (free, no API key)
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;

            await conn.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   🎨 AI GENERATED IMAGE     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📝 *Prompt:* ${prompt}
🤖 *Powered by:* Zephyr AI

${settings.footer}`,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: settings.channelId,
                        newsletterName: settings.channelName,
                        serverMessageId: 1
                    }
                }
            });

            console.log(`✅ Image generated: ${prompt}`);

        } catch (error) {
            console.error('Imagine error:', error);
            await conn.sendMessage(chatId, { text: '❌ Failed to generate image.' });
        }
    }
};
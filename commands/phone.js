/**
 * ZEPHYR MD - Phone Info
 * Get phone number information
 */

const settings = require('../settings');

module.exports = {
    name: 'phone',
    aliases: ['phonenumber', 'num'],
    category: 'tools',
    description: 'Get phone number information',
    usage: '.phone <number>',
    react: '📱',
    async execute(conn, mek, args, chatId, isOwner) {
        try {
            const sender = mek.key.participant || mek.key.remoteJid;
            
            if (!args.length) {
                await conn.sendMessage(chatId, {
                    react: { text: '❌', key: mek.key }
                });
                await conn.sendMessage(chatId, { 
                    text: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   📱 PHONE INFO             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ *No number provided!*

📝 *Usage:*
.phone <number>

📌 *Example:*
.phone 27749852029

${settings.footer}`
                });
                return;
            }

            let number = args[0].replace(/[^0-9]/g, '');
            
            if (number.length < 10) {
                await conn.sendMessage(chatId, {
                    react: { text: '❌', key: mek.key }
                });
                await conn.sendMessage(chatId, { 
                    text: '❌ Invalid number! Please provide a valid phone number.'
                });
                return;
            }

            // Get country code
            const countryCodes = {
                '254': '🇰🇪 Kenya',
                '255': '🇹🇿 Tanzania',
                '256': '🇺🇬 Uganda',
                '257': '🇧🇮 Burundi',
                '250': '🇷🇼 Rwanda',
                '233': '🇬🇭 Ghana',
                '234': '🇳🇬 Nigeria',
                '27': '🇿🇦 South Africa',
                '44': '🇬🇧 UK',
                '1': '🇺🇸 USA/Canada',
                '91': '🇮🇳 India',
                '92': '🇵🇰 Pakistan',
                '20': '🇪🇬 Egypt',
                '212': '🇲🇦 Morocco',
                '216': '🇹🇳 Tunisia',
                '30': '🇬🇷 Greece',
                '31': '🇳🇱 Netherlands',
                '32': '🇧🇪 Belgium',
                '33': '🇫🇷 France',
                '34': '🇪🇸 Spain',
                '36': '🇭🇺 Hungary',
                '39': '🇮🇹 Italy',
                '40': '🇷🇴 Romania',
                '41': '🇨🇭 Switzerland',
                '45': '🇩🇰 Denmark',
                '46': '🇸🇪 Sweden',
                '47': '🇳🇴 Norway',
                '48': '🇵🇱 Poland',
                '49': '🇩🇪 Germany',
                '52': '🇲🇽 Mexico',
                '54': '🇦🇷 Argentina',
                '55': '🇧🇷 Brazil',
                '56': '🇨🇱 Chile',
                '57': '🇨🇴 Colombia',
                '58': '🇻🇪 Venezuela',
                '60': '🇲🇾 Malaysia',
                '61': '🇦🇺 Australia',
                '62': '🇮🇩 Indonesia',
                '63': '🇵🇭 Philippines',
                '64': '🇳🇿 New Zealand',
                '65': '🇸🇬 Singapore',
                '66': '🇹🇭 Thailand',
                '81': '🇯🇵 Japan',
                '82': '🇰🇷 South Korea',
                '84': '🇻🇳 Vietnam',
                '86': '🇨🇳 China',
                '90': '🇹🇷 Turkey',
                '351': '🇵🇹 Portugal',
                '352': '🇱🇺 Luxembourg',
                '353': '🇮🇪 Ireland',
                '354': '🇮🇸 Iceland',
                '355': '🇦🇱 Albania',
                '356': '🇲🇹 Malta',
                '357': '🇨🇾 Cyprus',
                '358': '🇫🇮 Finland',
                '359': '🇧🇬 Bulgaria',
                '370': '🇱🇹 Lithuania',
                '371': '🇱🇻 Latvia',
                '372': '🇪🇪 Estonia',
                '373': '🇲🇩 Moldova',
                '374': '🇦🇲 Armenia',
                '375': '🇧🇾 Belarus',
                '376': '🇦🇩 Andorra',
                '377': '🇲🇨 Monaco',
                '378': '🇸🇲 San Marino',
                '379': '🇻🇦 Vatican',
                '380': '🇺🇦 Ukraine',
                '381': '🇷🇸 Serbia',
                '382': '🇲🇪 Montenegro',
                '383': '🇽🇰 Kosovo',
                '385': '🇭🇷 Croatia',
                '386': '🇸🇮 Slovenia',
                '387': '🇧🇦 Bosnia',
                '389': '🇲🇰 Macedonia',
                '420': '🇨🇿 Czech',
                '421': '🇸🇰 Slovakia',
                '423': '🇱🇮 Liechtenstein',
                '500': '🇫🇰 Falkland'
            };

            let country = 'Unknown';
            for (const [code, name] of Object.entries(countryCodes)) {
                if (number.startsWith(code)) {
                    country = name;
                    break;
                }
            }

            const message = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   📱 PHONE INFORMATION      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📱 *Number:* ${number}
🌍 *Country:* ${country}
📊 *Length:* ${number.length} digits

💡 *Example:* wa.me/${number}

${settings.footer}`;

            await conn.sendMessage(chatId, {
                react: { text: '📱', key: mek.key }
            });
            await conn.sendMessage(chatId, {
                text: message,
                contextInfo: {
                    mentionedJid: [sender]
                }
            });

        } catch (error) {
            console.error('Error in phone:', error);
            await conn.sendMessage(chatId, { 
                text: '❌ Error getting phone info.'
            });
        }
    }
};
/**
 * ZEPHYR MD - Auto Channel React
 * When the owner posts a new update on the community channel, every paired
 * number reacts with its OWN emoji (assigned in lib/channelReact.js), so the
 * post collects a varied set of reactions instead of the same one repeated.
 *
 * This is per paired number: .channelreact on/off only affects THIS number.
 */

const settings = require('../settings');
const { reactionFor, indexFor } = require('../lib/channelReact');

function stateFor(ctx) {
    if (ctx && ctx.botData) {
        if (!ctx.botData.channelReact) ctx.botData.channelReact = { enabled: true };
        return ctx.botData.channelReact;
    }
    if (!global.channelReact) global.channelReact = { enabled: true };
    return global.channelReact;
}

function saveIf(ctx) {
    try { if (ctx && typeof ctx.saveBotData === 'function') ctx.saveBotData(); } catch (e) {}
}

module.exports = {
    name: 'channelreact',
    aliases: ['cr', 'autoreactchannel'],
    category: 'tools',
    description: 'Toggle auto-reaction to channel updates (per paired number)',
    usage: '.channelreact on/off',
    react: '🔥',
    async execute(conn, mek, args, chatId, isOwner, ctx) {
        try {
            await conn.sendMessage(chatId, { react: { text: '🔥', key: mek.key } });

            const state = stateFor(ctx);
            const action = (args[0] || '').toLowerCase();
            const userId = ctx && ctx.session ? ctx.session.userId : 'default';
            const myEmoji = reactionFor(userId, Date.now());
            const myIndex = indexFor(userId) + 1;

            if (action === 'on' || action === 'off') {
                state.enabled = action === 'on';
                if (ctx && !ctx.botData) global.channelReact.enabled = state.enabled;
                saveIf(ctx);
                await conn.sendMessage(chatId, {
                    text:
                        `🔥 *AUTO CHANNEL REACT*\n\n` +
                        `Status: ${state.enabled ? '✅ ENABLED' : '❌ DISABLED'}\n\n` +
                        `This number reacts with *${myEmoji}* (slot #${myIndex}).\n` +
                        `Every paired number uses a different reaction.\n\n` +
                        `${settings.footer}`
                });
                return;
            }

            await conn.sendMessage(chatId, {
                text:
                    `🔥 *AUTO CHANNEL REACT*\n\n` +
                    `Status: ${state.enabled ? '✅ ENABLED' : '❌ DISABLED'}\n` +
                    `This number's reaction: *${myEmoji}* (slot #${myIndex})\n\n` +
                    `Usage: .channelreact on / .channelreact off\n` +
                    `(Applies to this paired number only.)\n\n` +
                    `${settings.footer}`
            });
        } catch (error) {
            console.error('Error in channelreact:', error);
            try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
            try { await conn.sendMessage(chatId, { text: '❌ Error in channel reaction command.' }); } catch (e) {}
        }
    }
};

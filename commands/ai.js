const { queryAI } = require('../lib/aiClient');

async function aiCommand(sock, from, msg, isAdmin, session, args) {
    const action = args[0]?.toLowerCase();

    if (action === 'on' || action === 'off') {
        if (!isAdmin) return sock.sendMessage(from, { text: '❌ Only the owner can toggle AI auto-reply.' }, { quoted: msg });
        session.aiEnabled = action === 'on';
        return sock.sendMessage(from, {
            text: session.aiEnabled ? '✅ AI auto-reply enabled.' : '❌ AI auto-reply disabled.'
        }, { quoted: msg });
    }

    if (args.length > 0) {
        const query = args.join(' ');
        try {
            await sock.sendMessage(from, { react: { text: '🤖', key: msg.key } });
            const response = await queryAI(session.openaiClient, query, process.env.AI_MODEL);
            await sock.sendMessage(from, { text: `🤖 *AI Response:*\n\n${response}` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(from, { text: '❌ AI Error: ' + e.message }, { quoted: msg });
        }
        return;
    }

    await sock.sendMessage(from, {
        text: [
            '🤖 *AI COMMAND*',
            '',
            'Usage:',
            '.ai <question>   - Ask the AI anything',
            '.ai on          - Enable AI auto-reply (owner)',
            '.ai off         - Disable AI auto-reply (owner)'
        ].join('\n')
    }, { quoted: msg });
}

module.exports = aiCommand;
module.exports.execute = aiCommand;

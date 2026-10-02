// lib/aiClient.js
// Multi-provider AI client. Tries the configured OpenAI key first (Admin
// Panel / OPENAI_API_KEY), then falls back to free public AI endpoints so
// the .ai command keeps working even without a paid key.

const axios = require('axios');

const AI_APIS = [
    q => `https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(q)}`,
    q => `https://vapis.my.id/api/openai?q=${encodeURIComponent(q)}`,
    q => `https://api.princetechn.com/api/ai/gpt?apikey=prince&q=${encodeURIComponent(q)}`
];

async function queryPublicAI(question) {
    for (const buildUrl of AI_APIS) {
        try {
            const res = await axios.get(buildUrl(question), { timeout: 15000 });
            const data = res.data;
            const answer = data?.message || data?.result || data?.response || data?.msg || data?.data?.message || data?.data?.msg;
            if (typeof answer === 'string' && answer.trim()) return answer.trim();
        } catch (e) {
            console.error('[AI] provider failed:', e.message);
        }
    }
    return null;
}

async function queryAI(openai, question, model) {
    if (openai) {
        try {
            const completion = await openai.chat.completions.create({
                model: model || 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful, friendly assistant. Reply in clear English.' },
                    { role: 'user', content: question }
                ],
                max_tokens: 300
            });
            const text = completion.choices?.[0]?.message?.content;
            if (text && text.trim()) return text.trim();
        } catch (e) {
            console.error('[AI] OpenAI failed, falling back:', e.message);
        }
    }
    const fallback = await queryPublicAI(question);
    if (fallback) return fallback;
    return '⚠️ Sorry, all AI servers are currently unavailable. Please try again later.';
}

module.exports = { queryAI, queryPublicAI, AI_APIS };

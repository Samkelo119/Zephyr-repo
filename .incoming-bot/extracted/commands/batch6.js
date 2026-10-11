// commands/batch6.js
// 👑 AWAIS CYBER — Batch 6: security & networking tools, on-brand for
// a "Cyber" bot. Kept to legitimate, defensive/informational utilities
// only — nothing here does reconnaissance against third parties
// (no port scanners, no subdomain enumeration, no exploit helpers).

const axios = require('axios');
const tls = require('tls');
const AXIOS_OPTS = { timeout: 10000 };

// ---- HTTP headers inspector ----
async function headers(sock, from, msg, q) {
    if (!q || !/^https?:\/\//i.test(q.trim())) return sock.sendMessage(from, { text: '⚠️ Usage: `.headers <url>`\nExample: `.headers https://example.com`' }, { quoted: msg });
    try {
        const res = await axios.get(q.trim(), { ...AXIOS_OPTS, validateStatus: () => true, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AwaisCyberBot/1.0)' } });
        const lines = Object.entries(res.headers).map(([k, v]) => `${k}: ${v}`).join('\n');
        await sock.sendMessage(from, { text: `📡 *HTTP Headers* (status ${res.status})\n\n${lines.slice(0, 3000)}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Could not fetch headers: ${e.message}` }, { quoted: msg });
    }
}

// ---- WHOIS domain lookup ----
async function domainwhois(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.whois <domain>`\nExample: `.whois example.com`' }, { quoted: msg });
    const domain = q.trim().replace(/^https?:\/\//, '').split('/')[0];
    try {
        const { data } = await axios.get(`https://rdap.org/domain/${encodeURIComponent(domain)}`, AXIOS_OPTS);
        const registrar = data.entities?.find(e => e.roles?.includes('registrar'))?.vcardArray?.[1]?.find(f => f[0] === 'fn')?.[3] || 'Unknown';
        const events = (data.events || []).map(e => `${e.eventAction}: ${e.eventDate?.split('T')[0]}`).join('\n');
        await sock.sendMessage(from, { text: `🔍 *WHOIS: ${domain}*\n\n▪️ Registrar: ${registrar}\n▪️ Status: ${(data.status || []).join(', ') || 'unknown'}\n\n${events}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ WHOIS lookup failed for "${domain}". It may not be registered, or the registry doesn't support RDAP.` }, { quoted: msg });
    }
}

// ---- SSL certificate expiry checker ----
async function sslcheck(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.sslcheck <domain>`\nExample: `.sslcheck example.com`' }, { quoted: msg });
    const host = q.trim().replace(/^https?:\/\//, '').split('/')[0];
    try {
        const cert = await new Promise((resolve, reject) => {
            const socket = tls.connect(443, host, { servername: host, timeout: 10000 }, () => {
                const c = socket.getPeerCertificate();
                socket.end();
                if (!c || !c.valid_to) reject(new Error('No certificate returned'));
                else resolve(c);
            });
            socket.on('error', reject);
            socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')); });
        });
        const expiry = new Date(cert.valid_to);
        const daysLeft = Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24));
        await sock.sendMessage(from, {
            text: `🔐 *SSL Certificate: ${host}*\n\n▪️ Issuer: ${cert.issuer?.O || cert.issuer?.CN || 'unknown'}\n▪️ Valid From: ${cert.valid_from}\n▪️ Valid To: ${cert.valid_to}\n▪️ Days Remaining: ${daysLeft} ${daysLeft < 14 ? '⚠️ expiring soon!' : '✅'}`
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Could not check SSL for "${host}": ${e.message}` }, { quoted: msg });
    }
}

// ---- CVE lookup (public vulnerability database, informational) ----
async function cve(sock, from, msg, q) {
    if (!q || !/^CVE-\d{4}-\d+$/i.test(q.trim())) return sock.sendMessage(from, { text: '⚠️ Usage: `.cve <CVE-YYYY-NNNNN>`\nExample: `.cve CVE-2021-44228`' }, { quoted: msg });
    try {
        const { data } = await axios.get(`https://cve.circl.lu/api/cve/${q.trim().toUpperCase()}`, AXIOS_OPTS);
        if (!data || !data.id) return sock.sendMessage(from, { text: '❌ CVE not found.' }, { quoted: msg });
        const summary = (data.summary || 'No description available.').slice(0, 500);
        const cvss = data.cvss ? `${data.cvss}/10` : 'N/A';
        await sock.sendMessage(from, { text: `🛡️ *${data.id}*\n\n▪️ CVSS Score: ${cvss}\n▪️ Published: ${data.Published?.split('T')[0] || 'unknown'}\n\n${summary}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ CVE lookup service unreachable right now.' }, { quoted: msg });
    }
}

// ---- user-agent string parser (pure logic) ----
async function useragent(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.useragent <user-agent string>`' }, { quoted: msg });
    const ua = q.trim();
    const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari' : 'Unknown';
    const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown';
    const isMobile = /Mobile|Android|iPhone/.test(ua);
    await sock.sendMessage(from, { text: `🕵️ *User-Agent Analysis*\n\n▪️ Browser: ${browser}\n▪️ OS: ${os}\n▪️ Device: ${isMobile ? 'Mobile' : 'Desktop'}` }, { quoted: msg });
}

// ---- base32 encode/decode (pure logic) ----
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buf) {
    let bits = '', out = '';
    for (const byte of buf) bits += byte.toString(2).padStart(8, '0');
    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.slice(i, i + 5).padEnd(5, '0');
        out += B32_ALPHABET[parseInt(chunk, 2)];
    }
    while (out.length % 8 !== 0) out += '=';
    return out;
}
function base32Decode(str) {
    const clean = str.replace(/=+$/, '').toUpperCase();
    let bits = '';
    for (const ch of clean) {
        const idx = B32_ALPHABET.indexOf(ch);
        if (idx === -1) throw new Error('Invalid base32 character');
        bits += idx.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
    return Buffer.from(bytes);
}
async function base32(sock, from, msg, args, q) {
    const mode = (args[0] || '').toLowerCase();
    const text = args.slice(1).join(' ');
    if (!['encode', 'decode'].includes(mode) || !text) return sock.sendMessage(from, { text: '⚠️ Usage: `.base32 encode <text>` or `.base32 decode <base32>`' }, { quoted: msg });
    try {
        if (mode === 'encode') await sock.sendMessage(from, { text: `🔐 *Base32:*\n${base32Encode(Buffer.from(text, 'utf8'))}` }, { quoted: msg });
        else await sock.sendMessage(from, { text: `🔓 *Decoded:*\n${base32Decode(text).toString('utf8')}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Invalid base32 input: ${e.message}` }, { quoted: msg });
    }
}

// ---- Caesar cipher (classic cyber/crypto fun, pure logic) ----
async function cipher(sock, from, msg, args) {
    const mode = (args[0] || '').toLowerCase();
    const shift = parseInt(args[1]);
    const text = args.slice(2).join(' ');
    if (!['encode', 'decode'].includes(mode) || isNaN(shift) || !text) {
        return sock.sendMessage(from, { text: '⚠️ Usage: `.cipher encode <shift> <text>` or `.cipher decode <shift> <text>`\nExample: `.cipher encode 3 hello world`' }, { quoted: msg });
    }
    const s = mode === 'encode' ? shift : -shift;
    const out = text.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + s) % 26 + 26) % 26 + base);
    });
    await sock.sendMessage(from, { text: `🔑 *Caesar Cipher (shift ${shift}):*\n${out}` }, { quoted: msg });
}

// ---- IPv4 subnet calculator (pure logic) ----
async function subnetcalc(sock, from, msg, q) {
    if (!q || !q.includes('/')) return sock.sendMessage(from, { text: '⚠️ Usage: `.subnetcalc <ip>/<cidr>`\nExample: `.subnetcalc 192.168.1.0/24`' }, { quoted: msg });
    const [ip, cidrStr] = q.trim().split('/');
    const cidr = parseInt(cidrStr);
    const octets = ip.split('.').map(Number);
    if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255) || isNaN(cidr) || cidr < 0 || cidr > 32) {
        return sock.sendMessage(from, { text: '❌ Invalid IP/CIDR format.' }, { quoted: msg });
    }
    const ipInt = octets.reduce((acc, o) => (acc << 8) + o, 0) >>> 0;
    const maskInt = cidr === 0 ? 0 : (0xFFFFFFFF << (32 - cidr)) >>> 0;
    const network = (ipInt & maskInt) >>> 0;
    const broadcast = (network | (~maskInt >>> 0)) >>> 0;
    const toIp = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
    const totalHosts = cidr >= 31 ? Math.pow(2, 32 - cidr) : Math.pow(2, 32 - cidr) - 2;

    await sock.sendMessage(from, {
        text: `🌐 *Subnet Calculator: ${q.trim()}*\n\n▪️ Network: ${toIp(network)}\n▪️ Broadcast: ${toIp(broadcast)}\n▪️ Subnet Mask: ${toIp(maskInt)}\n▪️ Usable Hosts: ${Math.max(totalHosts, 0)}\n▪️ First Usable: ${cidr >= 31 ? toIp(network) : toIp(network + 1)}\n▪️ Last Usable: ${cidr >= 31 ? toIp(broadcast) : toIp(broadcast - 1)}`
    }, { quoted: msg });
}

// ---- MAC address vendor lookup (established free API) ----
async function macvendor(sock, from, msg, q) {
    if (!q || !/^([0-9A-Fa-f]{2}[:-]){2,}[0-9A-Fa-f]{2}/.test(q.trim())) {
        return sock.sendMessage(from, { text: '⚠️ Usage: `.macvendor <mac address>`\nExample: `.macvendor 00:1A:2B:33:44:55`' }, { quoted: msg });
    }
    try {
        const { data } = await axios.get(`https://api.macvendors.com/${encodeURIComponent(q.trim())}`, AXIOS_OPTS);
        await sock.sendMessage(from, { text: `🏭 *MAC Vendor:* ${data}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Vendor not found for that MAC address.' }, { quoted: msg });
    }
}

module.exports = { headers, domainwhois, sslcheck, cve, useragent, base32, cipher, subnetcalc, macvendor };

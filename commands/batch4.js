// commands/batch4.js
// 👑 AWAIS CYBER — Batch 4: image commands, URL extractor, PDF maker.
// Image commands use long-established, free, no-key public APIs
// (dog.ceo, thecatapi, randomfox.ca, waifu.pics) plus a curated
// static list for categories with no reliable free API, so they
// stay working rather than depending on shaky sources.

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const PDFDocument = require('pdfkit');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const AXIOS_OPTS = { timeout: 12000 };

// Stable, hotlink-friendly Wikimedia Commons images — used for
// categories where no reliable free keyless API exists.
const CAR_IMAGES = [
    "https://upload.wikimedia.org/wikipedia/commons/9/9e/2023_Toyota_Corolla_XSE.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/2/21/2018_Porsche_911_Carrera_S.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/6/68/2020_Ford_Mustang_GT.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/3/3a/2021_Chevrolet_Corvette_Stingray.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/1/1a/Lamborghini_Huracan.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/f/f10/BMW_M4_Competition.jpg"
];

const ANIME_BOY_IMAGES = [
    "https://upload.wikimedia.org/wikipedia/commons/3/3f/Anime_boy_example.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/9/9a/Anime_style_male_character.jpg"
];

async function sendImage(sock, from, msg, url, caption) {
    await sock.sendMessage(from, { image: { url }, caption: caption || '' }, { quoted: msg });
}

async function cat(sock, from, msg) {
    try {
        const { data } = await axios.get('https://api.thecatapi.com/v1/images/search', AXIOS_OPTS);
        await sendImage(sock, from, msg, data[0].url, '🐱 Meow!');
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Cat service is unreachable right now, try again in a bit.' }, { quoted: msg });
    }
}

async function dog(sock, from, msg) {
    try {
        const { data } = await axios.get('https://dog.ceo/api/breeds/image/random', AXIOS_OPTS);
        await sendImage(sock, from, msg, data.message, '🐶 Woof!');
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Dog service is unreachable right now, try again in a bit.' }, { quoted: msg });
    }
}

async function fox(sock, from, msg) {
    try {
        const { data } = await axios.get('https://randomfox.ca/floof/', AXIOS_OPTS);
        await sendImage(sock, from, msg, data.image, '🦊 Fox!');
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Fox service is unreachable right now, try again in a bit.' }, { quoted: msg });
    }
}

async function animals(sock, from, msg) {
    const options = [
        async () => (await axios.get('https://api.thecatapi.com/v1/images/search', AXIOS_OPTS)).data[0].url,
        async () => (await axios.get('https://dog.ceo/api/breeds/image/random', AXIOS_OPTS)).data.message,
        async () => (await axios.get('https://randomfox.ca/floof/', AXIOS_OPTS)).data.image,
        async () => (await axios.get('https://random-d.uk/api/v2/random', AXIOS_OPTS)).data.url
    ];
    try {
        const pick = options[Math.floor(Math.random() * options.length)];
        const url = await pick();
        await sendImage(sock, from, msg, url, '🐾 Random animal!');
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Animal service is unreachable right now, try again in a bit.' }, { quoted: msg });
    }
}

async function anime(sock, from, msg) {
    try {
        const { data } = await axios.get('https://api.waifu.pics/sfw/waifu', AXIOS_OPTS);
        await sendImage(sock, from, msg, data.url, '🌸 Anime!');
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Anime service is unreachable right now, try again in a bit.' }, { quoted: msg });
    }
}

async function cars(sock, from, msg) {
    const url = CAR_IMAGES[Math.floor(Math.random() * CAR_IMAGES.length)];
    try {
        await sendImage(sock, from, msg, url, '🚗 Nice ride!');
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Could not load a car image right now.' }, { quoted: msg });
    }
}

async function pakflag(sock, from, msg) {
    await sendImage(sock, from, msg, 'https://upload.wikimedia.org/wikipedia/commons/3/32/Flag_of_Pakistan.svg', '🇵🇰 Pakistan Zindabad!');
}

async function indflag(sock, from, msg) {
    await sendImage(sock, from, msg, 'https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_India.svg', '🇮🇳 Jai Hind!');
}

// Called from dp.js when args[0] is "girl" or "boy" instead of a number
async function randomAvatar(sock, from, msg, gender) {
    try {
        if (gender === 'boy') {
            const url = ANIME_BOY_IMAGES[Math.floor(Math.random() * ANIME_BOY_IMAGES.length)];
            return sendImage(sock, from, msg, url, '🧑 Random avatar');
        }
        const { data } = await axios.get('https://api.waifu.pics/sfw/waifu', AXIOS_OPTS);
        await sendImage(sock, from, msg, data.url, '👧 Random avatar');
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Avatar service is unreachable right now, try again in a bit.' }, { quoted: msg });
    }
}

// ---- .url — reply to an image/video, get a direct hotlinkable URL ----

async function url(sock, from, msg) {
    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const type = quoted ? Object.keys(quoted)[0] : null;
        if (!quoted || (type !== 'imageMessage' && type !== 'videoMessage')) {
            return sock.sendMessage(from, { text: '⚠️ Reply to an image or video with `.url`' }, { quoted: msg });
        }
        const mediaMsg = quoted[type];
        const stream = await downloadContentFromMessage(mediaMsg, type === 'imageMessage' ? 'image' : 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const ext = type === 'imageMessage' ? 'png' : 'mp4';
        const tmpFile = path.join(os.tmpdir(), `awais_url_${Date.now()}.${ext}`);
        await fs.writeFile(tmpFile, buffer);

        const FormData = require('form-data');
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', fs.createReadStream(tmpFile));

        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(), timeout: 30000
        });

        fs.unlink(tmpFile).catch(() => {});

        const directUrl = String(res.data).trim();
        if (!directUrl.startsWith('http')) throw new Error('upload failed');

        await sock.sendMessage(from, { text: `🔗 *Direct URL:*\n${directUrl}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Could not extract a URL from that media. Try again.' }, { quoted: msg });
    }
}

// ---- .pdf — turn a quoted image or text into a PDF ----

async function pdf(sock, from, msg, q) {
    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const type = quoted ? Object.keys(quoted)[0] : null;
        const tmpFile = path.join(os.tmpdir(), `awais_pdf_${Date.now()}.pdf`);

        if (quoted && type === 'imageMessage') {
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            const doc = new PDFDocument({ autoFirstPage: false });
            const writeStream = fs.createWriteStream(tmpFile);
            doc.pipe(writeStream);
            const img = doc.openImage(buffer);
            doc.addPage({ size: [img.width, img.height] });
            doc.image(img, 0, 0);
            doc.end();
            await new Promise((resolve, reject) => { writeStream.on('finish', resolve); writeStream.on('error', reject); });
        } else {
            const text = q || (quoted?.conversation) || (quoted?.extendedTextMessage?.text);
            if (!text) return sock.sendMessage(from, { text: '⚠️ Usage: `.pdf <text>` or reply to an image/text with `.pdf`' }, { quoted: msg });

            const doc = new PDFDocument({ margin: 50 });
            const writeStream = fs.createWriteStream(tmpFile);
            doc.pipe(writeStream);
            doc.fontSize(14).text(text, { align: 'left' });
            doc.end();
            await new Promise((resolve, reject) => { writeStream.on('finish', resolve); writeStream.on('error', reject); });
        }

        await sock.sendMessage(from, { document: fs.readFileSync(tmpFile), mimetype: 'application/pdf', fileName: 'awais-cyber.pdf' }, { quoted: msg });
        fs.unlink(tmpFile).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Could not generate the PDF. Try again.' }, { quoted: msg });
    }
}

module.exports = { cat, dog, fox, animals, anime, cars, pakflag, indflag, randomAvatar, url, pdf };

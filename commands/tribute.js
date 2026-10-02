// commands/tribute.js
// 👑 AWAIS CYBER — Independence-day tribute webpage generator, v3.
// Premium/heavy edition: cloth-style 3D waving flag (layered strips,
// not a flat image), particle confetti burst, real-time mouse-tilt on
// cards, national monuments, animated "years of independence" counter,
// scroll-reveal. Still one personal page per WhatsApp number — every
// photo they add becomes another card on their own permanent link.

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const TRIBUTES_DIR = path.join(__dirname, '..', 'tributes');
fs.ensureDirSync(TRIBUTES_DIR);

const MAX_CARDS_PER_PAGE = 60;

function getQuotedImage(msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const direct = msg.message?.imageMessage ? msg.message : null;
    const container = quoted || direct;
    if (!container || !container.imageMessage) return null;
    return container.imageMessage;
}

async function downloadImageBase64(imageMsg) {
    const stream = await downloadContentFromMessage(imageMsg, 'image');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

const CURRENT_YEAR = new Date().getFullYear();

const THEMES = {
    pak: {
        title: 'Happy Independence Day 𝘈𝘧𝘳𝘪𝘤𝘢',
        emoji: 'ZA',
        dateLabel: '14th August · 1947',
        years: CURRENT_YEAR - 1947,
        primary: '#01411C',
        secondary: '#013220',
        accent: '#00A651',
        stripeColors: ['#01411C', '#ffffff', '#01411C'],
        figures: [
            { name: 'Quaid-e-Azam Muhammad Ali Jinnah', img: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Jinnah1945.jpg' },
            { name: 'Allama Muhammad Iqbal', img: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Sir_Muhammad_Iqbal%2C_c1930s.jpg' }
        ],
        monument: { name: 'Minar-e-Pakistan', img: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Minar-e-Pakistan_2021.jpg' }
    },
    ind: {
        title: 'Happy Independence Day India',
        emoji: '🇮🇳',
        dateLabel: '15th August · 1947',
        years: CURRENT_YEAR - 1947,
        primary: '#FF9933',
        secondary: '#7a4600',
        accent: '#138808',
        stripeColors: ['#FF9933', '#ffffff', '#138808'],
        figures: [
            { name: 'Mahatma Gandhi', img: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Portrait_Gandhi.jpg' },
            { name: 'Dr. B. R. Ambedkar', img: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Dr._Bhimrao_Ambedkar.jpg' }
        ],
        monument: { name: 'India Gate', img: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/India_Gate_in_New_Delhi_03-2016.jpg' }
    }
};

const VARIANTS = [
    { angle: '135deg', radius: '10px', name: 'Aurora' },
    { angle: '45deg', radius: '26px', name: 'Skyline' },
    { angle: '200deg', radius: '2px', name: 'Prism' }
];

const GENDER_ACCENTS = {
    girl: { glow: '#ff6fb0', ring: '#ff9fd0' },
    boy: { glow: '#4da3ff', ring: '#7fc4ff' },
    default: null
};

function cardHtml(card, theme, idx) {
    const g = GENDER_ACCENTS[card.gender] || null;
    const glow = g ? g.glow : theme.accent;
    const ring = g ? g.ring : theme.accent;
    const delay = (idx % 10) * 0.12;
    return `
    <div class="card reveal" style="--glow:${glow}; --ring:${ring}; animation-delay:${delay}s;">
      <div class="card-inner">
        ${card.photo ? `<img class="photo" src="${card.photo}" alt="${card.name}">` : `<div class="photo placeholder">👤</div>`}
        <div class="name3d">${card.name}</div>
        ${card.number ? `<div class="number">${card.number}</div>` : ''}
        ${card.caption ? `<div class="caption">"${card.caption}"</div>` : ''}
      </div>
    </div>`;
}

function buildHtml(theme, variant, cards) {
    const stripes = theme.stripeColors.map((c, i) => `<div class="strip" style="background:${c}; animation-delay:${i * 0.15}s;"></div>`).join('');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${theme.emoji} ${theme.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    min-height: 100vh; font-family: 'Segoe UI', sans-serif; overflow-x: hidden;
    background: radial-gradient(circle at 20% 0%, ${theme.primary} 0%, #05070a 55%), linear-gradient(${variant.angle}, #05070a, #000);
    color: #fff; display: flex; flex-direction: column; align-items: center; padding: 46px 16px 90px; position: relative;
  }
  .orb { position: fixed; border-radius: 50%; filter: blur(70px); opacity: 0.35; z-index: -2; animation: float 12s ease-in-out infinite; }
  .orb1 { width: 340px; height: 340px; background: ${theme.accent}; top: -100px; left: -100px; }
  .orb2 { width: 280px; height: 280px; background: ${theme.primary}; bottom: -80px; right: -80px; animation-duration: 16s; }
  @keyframes float { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-30px) scale(1.15); } }

  .stars { position: fixed; inset: 0; pointer-events: none; z-index: -1; }
  .star { position: absolute; width: 2px; height: 2px; background: #fff; border-radius: 50%; opacity: 0.6; animation: twinkle 3s infinite; }
  @keyframes twinkle { 0%,100% { opacity: 0.15; } 50% { opacity: 0.9; } }

  /* ---- 3D cloth-style waving flag (layered strips, not a flat image) ---- */
  .flag-stage { perspective: 900px; margin-bottom: 20px; }
  .flag3d {
    width: 220px; height: 140px; position: relative; transform-style: preserve-3d;
    animation: flagSway 4s ease-in-out infinite; box-shadow: 0 25px 60px rgba(0,0,0,0.6);
    border-radius: 6px; overflow: hidden; border: 2px solid rgba(255,255,255,0.25);
  }
  @keyframes flagSway { 0%,100% { transform: rotateY(-10deg) rotateX(3deg); } 50% { transform: rotateY(10deg) rotateX(-3deg); } }
  .strip { flex: 1; height: 33.33%; animation: ripple 2.2s ease-in-out infinite; transform-origin: left center; }
  .flag3d { display: flex; flex-direction: column; }
  @keyframes ripple { 0%,100% { transform: scaleX(1) skewY(0deg); } 50% { transform: scaleX(0.97) skewY(1.2deg); } }

  h1 {
    font-size: clamp(1.5rem, 5.5vw, 2.6rem); text-align: center; text-shadow: 0 4px 24px rgba(0,0,0,0.6);
    animation: fadeDown 1s ease; letter-spacing: 0.5px;
  }
  .date { color: ${theme.accent}; font-weight: 700; letter-spacing: 2.5px; margin: 8px 0 6px; animation: fadeDown 1.2s ease; }
  .years { font-size: 12.5px; color: rgba(255,255,255,0.65); margin-bottom: 30px; animation: fadeDown 1.3s ease; }
  .years b { color: #fff; font-size: 15px; }
  @keyframes fadeDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }

  .monument-wrap { width: 100%; max-width: 680px; border-radius: 22px; overflow: hidden; margin-bottom: 40px; position: relative; box-shadow: 0 30px 70px rgba(0,0,0,0.55); animation: fadeUp 1s ease; }
  .monument-wrap img { width: 100%; display: block; filter: brightness(0.55) saturate(1.2); transform: scale(1.05); transition: transform 8s ease; }
  .monument-wrap:hover img { transform: scale(1.15); }
  .monument-label { position: absolute; bottom: 14px; left: 18px; font-size: 13px; font-weight: 700; text-shadow: 0 2px 8px rgba(0,0,0,0.8); }

  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px; width: 100%; max-width: 1100px; perspective: 1200px; }
  .card {
    opacity: 0; animation: cardIn 0.8s ease forwards; border-radius: ${variant.radius === '2px' ? '4px' : '20px'};
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.25);
    backdrop-filter: blur(18px) saturate(150%); box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset;
    transform-style: preserve-3d; transition: transform 0.12s ease-out, box-shadow 0.25s ease; padding: 26px 18px; text-align: center; will-change: transform;
  }
  .card:hover { box-shadow: 0 30px 70px rgba(0,0,0,0.55), 0 0 44px var(--glow); }
  @keyframes cardIn { from { opacity: 0; transform: translateY(40px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }

  .photo { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; margin: 0 auto 16px; border: 3px solid var(--ring); box-shadow: 0 0 26px var(--glow); animation: pulse 2.6s ease-in-out infinite; }
  .photo.placeholder { display: flex; align-items: center; justify-content: center; font-size: 40px; background: rgba(255,255,255,0.08); }
  @keyframes pulse { 0%,100% { box-shadow: 0 0 16px var(--glow); } 50% { box-shadow: 0 0 34px var(--glow); } }

  .name3d { font-size: 19px; font-weight: 800; margin-bottom: 4px; color: #fff; text-shadow: 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.6), 0 10px 20px var(--glow); }
  .number { color: #ddd; font-size: 12px; margin-bottom: 10px; letter-spacing: 1px; }
  .caption { font-size: 13px; color: #eee; line-height: 1.5; font-style: italic; }

  .figures { display: flex; gap: 20px; margin-top: 54px; flex-wrap: wrap; justify-content: center; }
  .figure { text-align: center; width: 100px; }
  .figure img { width: 82px; height: 82px; border-radius: 12px; object-fit: cover; margin-bottom: 8px; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
  .figure span { font-size: 10.5px; color: #ddd; display: block; }

  .add-hint { margin-top: 46px; font-size: 12.5px; color: rgba(255,255,255,0.75); text-align: center; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 14px; max-width: 480px; }
  footer { margin-top: 30px; font-size: 11px; color: rgba(255,255,255,0.5); text-align: center; }

  .confetti { position: fixed; top: -10px; width: 8px; height: 14px; opacity: 0.9; z-index: 5; animation: fall linear forwards; }
  @keyframes fall { to { transform: translateY(110vh) rotate(540deg); opacity: 0; } }

  .reveal { opacity: 0; }
  .reveal.in { animation: cardIn 0.8s ease forwards; }
</style>
</head>
<body>
<div class="orb orb1"></div>
<div class="orb orb2"></div>
<div class="stars" id="stars"></div>
<div id="confettiLayer"></div>

<div class="flag-stage"><div class="flag3d">${stripes}</div></div>

<h1>${theme.emoji} ${theme.title}</h1>
<div class="date">${theme.dateLabel}</div>
<div class="years"><b>${theme.years}</b> years of independence</div>

<div class="monument-wrap">
  <img src="${theme.monument.img}" alt="${theme.monument.name}">
  <div class="monument-label">📍 ${theme.monument.name}</div>
</div>

<div class="gallery" id="gallery">
  ${cards.map((c, i) => cardHtml(c, theme, i)).join('')}
</div>

<div class="figures">
  ${theme.figures.map(f => `<div class="figure"><img src="${f.img}" alt="${f.name}"><span>${f.name}</span></div>`).join('')}
</div>

<div class="add-hint">✨ ${cards.length}/${MAX_CARDS_PER_PAGE} cards on this page — this is your own personal page, run the command again with a new photo to add more.</div>

<footer>Powered By Awais MD</footer>

<script>
  // twinkling stars
  const starsContainer = document.getElementById('stars');
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 3) + 's';
    starsContainer.appendChild(s);
  }

  // confetti burst in flag colors, on load only, capped count
  (function confetti() {
    const colors = ${JSON.stringify(theme.stripeColors)};
    const layer = document.getElementById('confettiLayer');
    for (let i = 0; i < 45; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDuration = (2.5 + Math.random() * 2) + 's';
      c.style.animationDelay = (Math.random() * 1.2) + 's';
      layer.appendChild(c);
      setTimeout(() => c.remove(), 6000);
    }
  })();

  // real-time mouse-tilt on cards (lightweight, capped to pointer devices)
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'translateY(-6px) rotateX(' + (-y * 10) + 'deg) rotateY(' + (x * 10) + 'deg) scale(1.03)';
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  // scroll-reveal for anything below the fold
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('in'); });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
</script>
</body>
</html>`;
}

function getOrCreatePage(personId, countryKey) {
    const pageId = crypto.createHash('md5').update(`${personId}:${countryKey}`).digest('hex').slice(0, 12);
    const dir = path.join(TRIBUTES_DIR, pageId);
    fs.ensureDirSync(dir);
    const manifestPath = path.join(dir, 'manifest.json');
    let manifest;
    if (fs.existsSync(manifestPath)) {
        manifest = fs.readJsonSync(manifestPath);
    } else {
        const variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
        manifest = { variant, cards: [] };
    }
    return { pageId, dir, manifestPath, manifest };
}

async function generateTribute(sock, from, msg, args, q, countryKey, publicBaseUrl, senderId, isLocalUrl) {
    try {
        const theme = THEMES[countryKey];
        const parts = (q || '').split('|').map(s => s.trim());
        const name = parts[0];
        const number = parts[1] || '';
        const caption = parts[2] || '';
        const genderRaw = (parts[3] || '').toLowerCase();
        const gender = ['girl', 'boy'].includes(genderRaw) ? genderRaw : 'default';

        if (!name) {
            const cmd = countryKey === 'pak' ? '14pak' : '15ind';
            return sock.sendMessage(from, {
                text: `⚠️ Usage: \`.${cmd} <name> | <number> | <caption> | girl/boy\`\nReply to your photo so it appears on your page.\nExample: \`.${cmd} Awais | 923001234567 | Proud to be Pakistani! | boy\`\n\nThis is YOUR personal page — every photo you add (run the command again with a new photo) becomes another card on it. Same link every time.`
            }, { quoted: msg });
        }

        const imageMsg = getQuotedImage(msg);
        const photoDataUri = imageMsg ? await downloadImageBase64(imageMsg) : null;

        const { pageId, dir, manifestPath, manifest } = getOrCreatePage(senderId || from, countryKey);

        if (manifest.cards.length >= MAX_CARDS_PER_PAGE) {
            return sock.sendMessage(from, { text: `⚠️ Your page is full (${MAX_CARDS_PER_PAGE} cards max).` }, { quoted: msg });
        }

        manifest.cards.push({ name, number, caption, photo: photoDataUri, gender });
        await fs.writeJson(manifestPath, manifest);

        const html = buildHtml(theme, manifest.variant, manifest.cards);
        await fs.writeFile(path.join(dir, 'index.html'), html);

        const link = `${publicBaseUrl}/tributes/${pageId}/`;
        const warning = isLocalUrl ? '\n\n⚠️ *This link won\'t open from outside this server* — your host doesn\'t expose a public URL automatically. Set the `APP_URL` environment variable to your host\'s real public address (see DEPLOY.md) and try again.' : '';
        await sock.sendMessage(from, {
            text: `🎉 *Your ${countryKey === 'pak' ? 'Pakistan' : 'India'} Independence Day page is ready!*\n\n🔗 ${link}\n\n📸 ${manifest.cards.length} card(s) on your page so far — this link is yours, run the command again anytime to add more.${warning}`
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Could not generate the page. Try again.' }, { quoted: msg });
    }
}

module.exports = { generateTribute };

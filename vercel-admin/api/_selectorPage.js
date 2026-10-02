// vercel-admin/api/_selectorPage.js
// 👑 AWAIS CYBER — Renders the "choose which bot server" picker page.

function renderSelectorHtml(servers) {
    const cards = servers.map((s, i) => `
        <a class="card" href="/go?server=${i}">
            <div class="dot"></div>
            <div>
                <div class="name">${s.name}</div>
                <div class="url">${s.url}</div>
            </div>
            <div class="arrow">→</div>
        </a>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZEPHYR-MD BOT — Choose Server</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh; background: #05070d; color: #eaf0ff;
    font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 40px 20px;
  }
  h1 { font-size: 1.5rem; margin-bottom: 8px; text-align: center; }
  p { color: #8b96b8; margin-bottom: 30px; text-align: center; font-size: 13px; }
  .list { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 12px; }
  .card {
    display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 14px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(120,150,255,0.2); text-decoration: none; color: inherit;
    transition: border-color 0.2s, transform 0.15s;
  }
  .card:hover { border-color: #00ffb3; transform: translateY(-2px); }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #00ffb3; box-shadow: 0 0 10px #00ffb3; flex-shrink: 0; }
  .name { font-weight: 700; font-size: 14px; }
  .url { font-size: 11.5px; color: #8b96b8; font-family: monospace; margin-top: 2px; }
  .arrow { margin-left: auto; color: #00ffb3; font-size: 18px; }
  footer { margin-top: 30px; font-size: 11px; color: #5a6b91; }
</style>
</head>
<body>
  <h1>⚡ Choose a Bot Server</h1>
  <p>Pick which deployment to connect to</p>
  <div class="list">${cards}</div>
  <footer>Powered by ZEPHYR-MD</footer>
</body>
</html>`;
}

module.exports = { renderSelectorHtml };

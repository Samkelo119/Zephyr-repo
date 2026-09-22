#!/data/data/com.termux/files/usr/bin/bash
# 👑 AWAIS CYBER — Termux setup script
# Run this once inside Termux: bash termux-setup.sh

echo "📦 Updating Termux packages..."
pkg update -y && pkg upgrade -y

echo "📦 Installing Node.js, git, and ffmpeg (needed for stickers/video)..."
pkg install -y nodejs-lts git ffmpeg python libwebp vips

echo "📦 Installing bot dependencies..."
npm install --no-audit --no-fund

echo ""
echo "ℹ️  Note about 'sharp' (used for stickers):"
echo "   Termux uses Android's own C library, which is different from"
echo "   regular Linux — some npm packages with native code (like sharp)"
echo "   can fail to install here. The bot is built to handle this"
echo "   gracefully: if sharp fails, .sticker/.toimg will just show a"
echo "   clear error instead of crashing the whole bot. Everything else"
echo "   (190+ other commands) will work normally either way."
echo ""

echo "🔧 Setting up storage access (allow the popup permission)..."
termux-setup-storage

echo ""
echo "✅ Setup complete!"
echo ""
echo "▶️  To start the bot now:            node bootstrap.js"
echo "▶️  To keep it running after closing Termux, install a session"
echo "    manager so it survives you closing the app:"
echo "       pkg install tmux"
echo "       tmux new -s bot"
echo "       node bootstrap.js"
echo "    (detach with Ctrl+B then D — reattach anytime with: tmux attach -t bot)"
echo ""
echo "🔋 Also run this so Android doesn't kill Termux in the background:"
echo "       termux-wake-lock"
echo ""
echo "🌐 Admin Panel will be at: http://localhost:3000/admin"

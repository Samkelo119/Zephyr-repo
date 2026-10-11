const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const crypto = require('crypto');

// 🤖 Termux runs on Android's Bionic libc, not glibc/musl — the prebuilt
// ffmpeg-static binary (built for standard Linux) does NOT work there.
// On Termux, use the system ffmpeg installed via `pkg install ffmpeg`
// (already done by termux-setup.sh) instead of the static binary.
const isTermux = !!process.env.TERMUX_VERSION || (process.env.PREFIX || '').includes('com.termux');
if (isTermux) {
    ffmpeg.setFfmpegPath('ffmpeg'); // resolved from Termux's PATH
} else {
    const ffmpegStatic = require('ffmpeg-static');
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Convert audio buffer to MP3
 * @param {Buffer} buffer 
 * @param {string} ext 
 * @returns {Promise<Buffer>}
 */
async function toAudio(buffer, ext) {
    const tmpDir = path.join(__dirname, '../temp');
    if (!fsSync.existsSync(tmpDir)) await fs.mkdir(tmpDir, { recursive: true });
    
    const id = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(tmpDir, `${id}_in.${ext}`);
    const outputPath = path.join(tmpDir, `${id}_out.mp3`);
    
    try {
        await fs.writeFile(inputPath, buffer);
        
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat('mp3')
                .on('end', resolve)
                .on('error', reject)
                .save(outputPath);
        });
        
        const outputBuffer = await fs.readFile(outputPath);
        return outputBuffer;
    } finally {
        // Cleanup
        try {
            if (fsSync.existsSync(inputPath)) await fs.unlink(inputPath);
            if (fsSync.existsSync(outputPath)) await fs.unlink(outputPath);
        } catch (e) {
            console.error('Cleanup error:', e);
        }
    }
}

module.exports = {
    toAudio
};

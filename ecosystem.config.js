// PM2 process configuration for running ZEPHYR-MD 24/7 on a VPS.
//
//   npm install -g pm2
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup            # then run the command it prints (enables boot start)
//
// max_memory_restart makes PM2 recycle the process automatically if memory
// ever creeps up, which (together with the in-app memory guard in index.js)
// keeps the bot online without manual restarts.
module.exports = {
    apps: [
        {
            name: 'zephyr-md-bot',
            script: 'bootstrap.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '700M',
            node_args: '--expose-gc --max-old-space-size=1024',
            restart_delay: 4000,
            max_restarts: 50,
            kill_timeout: 8000,
            merge_logs: true,
            time: true,
            out_file: './logs/out.log',
            error_file: './logs/err.log',
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
};

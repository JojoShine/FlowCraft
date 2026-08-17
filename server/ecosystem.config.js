module.exports = {
  apps: [{
    name: 'flowcraft-api',
    script: 'dist/index.js',
    cwd: __dirname,
    exec_mode: 'fork',
    node_args: '--enable-source-maps',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3800,
    },
    autorestart: true,
    kill_timeout: 5000,
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
  }],
};

// ============================================
// TERENCE — PM2 Ecosystem Config
// ============================================
module.exports = {
  apps: [
    {
      name: 'terence',
      cwd: '/var/www/TERENCE',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      // Logs
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/www/TERENCE/logs/pm2-error.log',
      out_file: '/var/www/TERENCE/logs/pm2-out.log',
      merge_logs: true,
      // Resource
      max_memory_restart: '512M',
      // Watch (disabled in production)
      watch: false,
    },
  ],
}

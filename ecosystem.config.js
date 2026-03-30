// ============================================
// TERENCE — PM2 Ecosystem Config (Production)
// ============================================
// Uses custom server.ts (compiled) for Socket.IO support.
// Path: /var/www/TERENCE
//
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 reload ecosystem.config.js
// ============================================
module.exports = {
  apps: [
    {
      name: 'terence',
      cwd: '/var/www/TERENCE',
      // Use custom server for Socket.IO support
      script: 'node_modules/.bin/tsx',
      args: 'server.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
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
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
}

// C:\discord-ultra-PSAAS\ecosystem.config.js
// PM2 ecosystem (CommonJS) — API, BOT, DASHBOARD (Next) sans fenêtre
module.exports = {
  apps: [
    {
      name: "api-backend",
      cwd: "C:/discord-ultra-PSAAS/api-backend",
      script: "./src/server.js",
      interpreter: "node",
      watch: false,
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 20,
      time: true,
      out_file: "C:/discord-ultra-PSAAS/logs/api-backend-out.log",
      error_file: "C:/discord-ultra-PSAAS/logs/api-backend-error.log",
      env: { NODE_ENV: "production" } // autres variables via api-backend/.env
    },
    {
      name: "bot-discord",
      cwd: "C:/discord-ultra-PSAAS/bot-discord",
      script: "./src/index.js",
      interpreter: "node",
      watch: false,
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 20,
      time: true,
      out_file: "C:/discord-ultra-PSAAS/logs/bot-out.log",
      error_file: "C:/discord-ultra-PSAAS/logs/bot-error.log",
      env: { NODE_ENV: "production" } // token etc. via bot-discord/.env
    },
    {
      // Lancement direct du binaire Next -> pas de fenêtre
      name: "dashboard-client",
      cwd: "C:/discord-ultra-PSAAS/dashboard-client",
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3010",
      interpreter: "node",
      watch: false,
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 20,
      time: true,
      out_file: "C:/discord-ultra-PSAAS/logs/dashboard-out.log",
      error_file: "C:/discord-ultra-PSAAS/logs/dashboard-error.log",
      env: { NODE_ENV: "production" } // URL API etc. via .env.local
    }
  ]
};

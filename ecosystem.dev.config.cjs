/**
 * Next.js dev under PM2 — survives Cursor agent terminal teardown.
 * Repo root: npm run dev:pm2
 */
const path = require("path");

module.exports = {
  apps: [
    {
      name: "life-os-next-dev",
      cwd: path.join(__dirname, "app"),
      script: "npm",
      args: "run dev",
      autorestart: true,
      max_restarts: 30,
      exp_backoff_restart_delay: 500,
      watch: false,
      merge_logs: true,
    },
  ],
};

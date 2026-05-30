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
    {
      name: "life-os-voxcpm-tts",
      cwd: path.join(__dirname, "services/voxcpm-tts"),
      script: ".venv/bin/uvicorn",
      args: "main:app --host 127.0.0.1 --port 7860",
      env: {
        VOXCPM_API_KEY: process.env.VOXCPM_API_KEY || "dev-secret",
      },
      autorestart: true,
      max_restarts: 10,
      watch: false,
      merge_logs: true,
    },
  ],
};

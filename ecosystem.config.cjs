// PM2 process config for DigitalCarda (production).
// Env vars (DATABASE_URL, JWT_SECRET, APP_ID, …) are loaded from the .env file
// in this directory by the app itself (dotenv). Only runtime basics are set here.
module.exports = {
  apps: [
    {
      name: "digitalcarda",
      script: "dist/boot.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      out_file: "/var/log/digitalcarda/out.log",
      error_file: "/var/log/digitalcarda/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};

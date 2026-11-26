// pm2-runtime process file for the production container (Dockerfile.dev CMD).
//
// Every app runs node directly. Going through `pnpm run pm2` -> `pm2 start pnpm -- start`
// -> `dotenv -e ../../.env` kept a pnpm and a dotenv node process alive per app plus a
// permanent `pm2 logs` (about 700 MB RSS of wrappers) and left pm2 watching the wrapper
// instead of the app, so max_memory_restart never saw the real process.
// The container has no .env file: all settings come from the compose environment.
//
// Memory: --max-old-space-size caps the V8 heap of each app; max_memory_restart restarts
// an app whose RSS keeps growing past it. Both sit well under the container mem_limit
// in docker-compose.kelolakonten.yaml.
const path = require('path');

const root = path.resolve(__dirname, '../..');

const app = (name, dir, script, args, heapMb, restartAt) => ({
  name,
  cwd: path.join(root, dir),
  script,
  args,
  node_args: ['--experimental-require-module', `--max-old-space-size=${heapMb}`],
  max_memory_restart: restartAt,
  // the orchestrator exits when Temporal is unreachable at boot; back off between retries
  exp_backoff_restart_delay: 1000,
  // logs go to the container stdout through pm2-runtime only
  out_file: '/dev/null',
  error_file: '/dev/null',
});

module.exports = {
  apps: [
    app('backend', 'apps/backend', './dist/apps/backend/src/main.js', '', 768, '1000M'),
    app('orchestrator', 'apps/orchestrator', './dist/apps/orchestrator/src/main.js', '', 640, '850M'),
    app('frontend', 'apps/frontend', path.join(root, 'node_modules/next/dist/bin/next'), 'start -p 4200', 384, '512M'),
  ],
};

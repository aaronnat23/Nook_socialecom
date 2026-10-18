import { spawnSync } from 'node:child_process';
const url = process.env.OPENAPI_URL || 'http://127.0.0.1:8000/openapi.json';
const result = spawnSync(
  'pnpm',
  ['exec', 'openapi-typescript', url, '-o', 'packages/api-client/src/openapi.d.ts'],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);

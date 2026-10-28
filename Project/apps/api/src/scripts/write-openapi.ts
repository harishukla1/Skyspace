import fs from 'node:fs';
import path from 'node:path';

process.env.ACCESS_TOKEN_SECRET ??= 'x'.repeat(32);
process.env.REFRESH_TOKEN_SECRET ??= 'y'.repeat(32);
const { buildOpenApi } = await import('../docs/openapi');
const out = path.resolve(process.cwd(), '../../docs/openapi.json');
fs.writeFileSync(out, JSON.stringify(buildOpenApi(), null, 2));
console.log(`Wrote ${out}`);

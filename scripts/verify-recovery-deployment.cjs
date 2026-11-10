// Read-only deployment verification. No Auth endpoints, tokens or emails.
const fs = require('node:fs');
const crypto = require('node:crypto');
const site = new URL(process.argv[2] || 'https://halal-check-sigma.vercel.app');
if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash) throw Error('Expected a public HTTPS deployment origin');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
(async () => {
  const checks = [];
  for (const file of ['admin/index.html', 'admin/admin.js', 'admin/config.js', 'admin/runtime-config.js', 'admin/reset-password/index.html', 'admin/reset-password/reset-password.js']) {
    const response = await fetch(new URL('/'+file, site), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    const match = hash(bytes) === hash(fs.readFileSync('dist/'+file));
    const uncached = response.headers.get('cache-control')?.includes('no-store') === true;
    const csp = response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'") === true;
    checks.push({ file, status: response.status, match, uncached, csp, passed: response.status === 200 && match && uncached && csp });
  }
  console.log(JSON.stringify({ site: site.origin, checks, passed: checks.every(check => check.passed), authRequests: 0 }, null, 2));
  if (checks.some(check => !check.passed)) process.exitCode = 1;
})().catch(() => { console.error('Deployment verification could not complete.'); process.exitCode = 1; });

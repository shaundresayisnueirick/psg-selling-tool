#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
let fail = 0;
function ok(condition, message) {
  if (condition) console.log('  ✓ ' + message);
  else { fail++; console.log('  ✗ ' + message); }
}
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

console.log('[PR #20] Static targeted checks');
const lock = JSON.parse(read('package-lock.json')).packages;
ok(lock['node_modules/@netlify/identity'] && lock['node_modules/@netlify/identity'].version === '2.0.0', '@netlify/identity locked at 2.0.0');
ok(lock['node_modules/gotrue-js'] && lock['node_modules/gotrue-js'].version === '1.0.1', 'gotrue-js locked at 1.0.1');

const vendor = read('src/vendor/netlify-identity.js');
for (const name of ['login','getUser','logout','requestPasswordRecovery','handleAuthCallback','acceptInvite','updateUser']) {
  ok(vendor.includes(name + ': () => ' + name), 'vendor exposes ' + name);
}
const ui = read('src/identity-login.js');
ok(!ui.includes('admin.listUsers') && !ui.includes('admin.createUser') && !ui.includes('admin.updateUser'), 'browser does not use Identity Admin APIs');
ok(!ui.includes('localStorage') && !ui.includes('sessionStorage') && !ui.includes('indexedDB'), 'identity-login.js does not access storage directly');
ok(!ui.includes('Erwin') && !ui.includes('@gmail.com'), 'owner email is not hardcoded');
ok(ui.includes("fetch('/api/psg/me'") && ui.includes('source: \'server:/api/psg/me\''), 'server profile is the application identity source');
ok(ui.includes('status === \'nonaktif\'') && ui.includes('psg_owner') && ui.includes('psg_admin'), 'inactive/role authorization branches exist');

const index = read('index.html');
ok(index.indexOf('src/vendor/netlify-identity.js') < index.indexOf('src/identity-login.js') && index.indexOf('src/identity-login.js') < index.indexOf('src/identity-callback.js'), 'script order vendor -> login -> PR #19 callback');
ok(index.includes('src/identity-login.css'), 'login CSS is loaded');

const gate = read('src/access-gate.js');
const baseline = JSON.parse(read('tests/contract-baseline.json'));
const expectedGate = baseline.static && baseline.static.protectedFiles && baseline.static.protectedFiles['src/access-gate.js'];
const gateHash = crypto.createHash('sha256').update(gate).digest('hex');
ok(gateHash === expectedGate, 'src/access-gate.js matches protected baseline byte-for-byte');

const server = read('netlify/functions/psg-me.mts');
ok(server.includes("path: '/api/psg/me'") && server.includes('tanganiMe'), '/api/psg/me remains present');

const cb = read('src/identity-callback.js');
ok(cb.includes('lib.handleAuthCallback()') && cb.includes('lib.acceptInvite(token, password)') && cb.includes('lib.updateUser({ password: password })'), 'PR #19 invite/recovery callback remains intact');

const sw = read('sw.js');
ok(sw.includes("insurance-hub-v117.1.7"), 'service worker version bumped for new assets');
ok(sw.includes("'./src/identity-login.js'") && sw.includes("'./src/identity-login.css'"), 'new login assets are in the service worker precache');

const requiredUi = ['type="email"','autocomplete="email"','type="password"','autocomplete="current-password"','Lupa Password?','MASUK DENGAN KODE AKSES LAMA'];
for (const needle of requiredUi) ok(ui.includes(needle), 'UX marker: ' + needle);

console.log(fail ? 'RESULT: FAIL (' + fail + ')' : 'RESULT: PASS');
process.exit(fail ? 1 : 0);

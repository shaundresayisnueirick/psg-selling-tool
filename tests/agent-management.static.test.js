#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const R=path.join(__dirname,'..');let bad=0;const ok=(x,m)=>x?console.log('✓ '+m):(bad++,console.log('✗ '+m));const read=f=>fs.readFileSync(path.join(R,f),'utf8');
console.log('[PR #21] targeted static checks');
const server=read('netlify/functions/psg-agents.mts');
for(const x of ['admin.listUsers','admin.getUser','admin.createUser','admin.updateUser','verifyRequestOrigin','requestPasswordRecovery']) ok(server.includes(x),'server API: '+x);
ok(server.includes("path: '/api/psg/agents'"),'endpoint path');ok(server.includes('accountCreated: true')&&server.includes('stage: \'recovery\''),'invite distinguishes account creation from email recovery');ok(!server.includes('admin.deleteUser(created.id)'),'invite does not delete a successfully created account when recovery email fails');
ok(server.includes("roles.includes('psg_owner')")&&server.includes("roles.includes('psg_admin')"),'server-side owner/admin authorization');
ok(!server.includes('localStorage')&&!server.includes('sessionStorage'),'server does not use browser storage');
const auth=read('netlify/lib/psg-auth.mts');ok(auth.includes("ROLE_SISTEM = ['psg_owner', 'psg_admin']"),'role registry unchanged');ok(auth.includes('Array.isArray(app.roles)')&&!auth.includes('Array.isArray(user.roles) ? user.roles'),'server reads PSG roles from app_metadata');
const gate=crypto.createHash('sha256').update(read('src/access-gate.js')).digest('hex');const base=JSON.parse(read('tests/contract-baseline.json')).static.protectedFiles['src/access-gate.js'];ok(gate===base,'legacy access-gate.js unchanged');
const ui=read('src/agent-management.js');ok(ui.includes('/api/psg/me')&&ui.includes('/api/psg/agents'),'UI uses server auth + management API');ok(ui.includes('err.accountCreated')&&ui.includes('KIRIM AKSES'),'UI handles partial invite failure without losing created account');ok(!ui.includes('localStorage')&&!ui.includes('sessionStorage'),'UI does not persist auth/data');
const index=read('index.html');ok(index.includes('layarAgentManagement')&&index.includes('data-psg-nav="manajemen"'),'management screen/nav present');ok(index.includes('src/agent-management.js')&&index.includes('src/agent-management.css'),'management assets loaded');
const sw=read('sw.js');ok(sw.includes("insurance-hub-v117.1.9")&&sw.includes("'./src/agent-management.js'")&&sw.includes("'./src/agent-management.css'"),'service worker updated for management assets');
console.log(bad?'RESULT: FAIL ('+bad+')':'RESULT: PASS');process.exit(bad?1:0);
#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const R=path.join(__dirname,'..');let bad=0;const ok=(x,m)=>x?console.log('✓ '+m):(bad++,console.log('✗ '+m));const read=f=>fs.readFileSync(path.join(R,f),'utf8');
console.log('[PR #21] targeted static checks');
const server=read('netlify/functions/psg-agents.mts');const lib=read('netlify/lib/psg-agents.mts');
ok(server.includes("path: '/api/psg/agents'"),'endpoint path');
ok(server.includes('getIdentityConfig()')&&server.includes('getUser'),'operator token from getIdentityConfig(); session from getUser()');
ok(server.includes('context?.site?.url')&&!server.includes('clientContext'),'Identity admin requests go to primary site URL, not the Deploy Preview URL');
ok(lib.includes("'/invite'")&&lib.includes("'/recover'")&&lib.includes('/admin/users'),'official Identity endpoints: /invite, /recover, /admin/users');
ok(lib.includes('app_metadata')&&lib.includes('export function keUser'),'admin API snake_case users normalized before PSG rules');
ok(lib.includes("includes('psg_owner')")&&lib.includes("includes('psg_admin')")&&lib.includes('bolehKelola'),'server-side owner/admin authorization');
ok(!(server+lib).includes('localStorage')&&!(server+lib).includes('sessionStorage'),'server does not use browser storage');
const auth=read('netlify/lib/psg-auth.mts');ok(auth.includes("ROLE_SISTEM = ['psg_owner', 'psg_admin']"),'role registry unchanged');ok(auth.includes('Array.isArray(app.roles)')&&!auth.includes('Array.isArray(user.roles) ? user.roles'),'server reads PSG roles from app_metadata');
const gate=crypto.createHash('sha256').update(read('src/access-gate.js')).digest('hex');const base=JSON.parse(read('tests/contract-baseline.json')).static.protectedFiles['src/access-gate.js'];ok(gate===base,'legacy access-gate.js unchanged');
const ui=read('src/agent-management.js');ok(ui.includes('/api/psg/me')&&ui.includes('/api/psg/agents'),'UI uses server auth + management API');ok(ui.includes('status=r.status')&&ui.includes('raw.trim()'),'UI surfaces raw HTTP/function response errors');ok(!ui.includes('localStorage')&&!ui.includes('sessionStorage'),'UI does not persist auth/data');
const index=read('index.html');ok(index.includes('layarAgentManagement')&&index.includes('data-psg-nav="manajemen"'),'management screen/nav present');ok(index.includes('src/agent-management.js')&&index.includes('src/agent-management.css'),'management assets loaded');
const sw=read('sw.js');ok(sw.includes("insurance-hub-v117.1.16")&&sw.includes("'./src/agent-management.js?v=21.13'")&&sw.includes("'./src/agent-management.css?v=21.13'"),'service worker updated for management assets');
console.log(bad?'RESULT: FAIL ('+bad+')':'RESULT: PASS');process.exit(bad?1:0);
/* Management Agen — browser UI. Authorization is enforced again by the server. */
(function(){
  'use strict';
  const ENDPOINT='/api/psg/agents';
  const state={owner:false,admin:false,users:[],q:''};
  const $=(id)=>document.getElementById(id);
  function nav(show){ document.querySelectorAll('.psg-admin-only[data-psg-nav="manajemen"]').forEach(b=>{b.hidden=!show;b.setAttribute('aria-hidden',show?'false':'true')}) }
  async function getMe(){ const r=await fetch('/api/psg/me',{cache:'no-store',credentials:'same-origin'}); if(!r.ok)return null; const d=await r.json().catch(()=>({})); return d.authenticated?d.user:null }
  async function api(method='GET',body){ const r=await fetch(ENDPOINT,{method,cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}); const raw=await r.text(); let d={}; try{d=raw?JSON.parse(raw):{}}catch(_){} if(!r.ok){const detail=d.message||raw.trim().replace(/\\s+/g,' ').slice(0,300)||('HTTP '+r.status); const err=new Error(detail);err.code=d.error||'';err.accountCreated=Boolean(d.accountCreated);err.status=r.status;err.payload=d;throw err} return d }
  const esc=(v)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function role(u){return (u.roles||[]).includes('psg_owner')?'PSG Dev':(u.roles||[]).includes('psg_admin')?'PSG Admin':(u.level||'Agen')}
  function canEdit(u){if((u.roles||[]).includes('psg_owner'))return false;return state.owner || !(u.roles||[]).includes('psg_admin')}
  function render(){
    const list=$('agentMgmtList');if(!list)return;
    const q=state.q.toLowerCase();
    const users=state.users.filter(u=>!q||[u.nama,u.email,u.kodeAgen,u.level].some(v=>String(v||'').toLowerCase().includes(q)));
    const active=state.users.filter(u=>u.status==='aktif').length, inactive=state.users.length-active;
    $('agentMgmtSummary').innerHTML='<div class="agent-mgmt-stat"><b>'+state.users.length+'</b><small>Total akun PSG</small></div><div class="agent-mgmt-stat"><b>'+active+'</b><small>Aktif</small></div><div class="agent-mgmt-stat"><b>'+inactive+'</b><small>Nonaktif</small></div>';
    list.innerHTML=users.length?users.map(u=>{
      const editable=canEdit(u);
      return '<article class="agent-mgmt-card"><div><div class="agent-mgmt-name">'+esc(u.nama||'Tanpa nama')+'</div><div class="catatan">'+esc(u.email||'—')+'</div><div class="agent-mgmt-meta"><span class="agent-mgmt-pill">'+esc(role(u))+'</span>'+(u.kodeAgen?'<span class="agent-mgmt-pill">'+esc(u.kodeAgen)+'</span>':'')+'<span class="agent-mgmt-pill '+esc(u.status)+'">'+esc(u.status==='aktif'?'AKTIF':'NONAKTIF')+'</span>'+ (u.emailTerkonfirmasi?'<span class="agent-mgmt-pill">EMAIL TERKONFIRMASI</span>':'<span class="agent-mgmt-pill">EMAIL BELUM TERKONFIRMASI</span>')+'</div></div><div class="agent-mgmt-actions">'+(editable?'<button type="button" data-agent-edit="'+esc(u.id)+'">Edit</button>':'')+(editable&&u.status==='aktif'&&u.email?'<button type="button" data-agent-resend="'+esc(u.id)+'">Kirim ulang link</button>':'')+'</div></article>'
    }).join(''):'<div class="agent-mgmt-empty">Belum ada agen yang cocok.</div>';
  }
  function modal(mode,u){
    const m=$('agentMgmtModal'),f=$('agentMgmtForm'); if(!m||!f)return;
    f.dataset.mode=mode;f.dataset.id=u?.id||'';
    $('agentMgmtModalTitle').textContent=mode==='invite'?'Undang Agen':'Edit Agen';
    $('agentMgmtModalSub').textContent=mode==='invite'?'Buat akun PSG lalu kirim link email untuk membuat password.':'Perbarui identitas, level, status, atau role PSG Admin.';
    $('agentMgmtEmail').value=u?.email||'';$('agentMgmtEmail').disabled=mode!=='invite';
    $('agentMgmtNama').value=u?.nama||'';$('agentMgmtKode').value=u?.kodeAgen||'';$('agentMgmtLevel').value=u?.level||'FC';$('agentMgmtStatus').value=u?.status||'aktif';
    $('agentMgmtRole').value=(u?.roles||[]).includes('psg_admin')?'psg_admin':'agent';$('agentMgmtRoleWrap').hidden=!state.owner&&!(mode==='invite'&&state.admin);
    if(mode==='invite')$('agentMgmtRole').value='agent';
    m.hidden=false;$('agentMgmtNama').focus();
  }
  function close(){if($('agentMgmtModal'))$('agentMgmtModal').hidden=true}
  async function load(){ $('agentMgmtList').innerHTML='<div class="agent-mgmt-empty">Memuat data agen…</div>'; try{state.users=(await api()).users||[];render()}catch(_){$('agentMgmtList').innerHTML='<div class="agent-mgmt-empty">Data agen tidak dapat dimuat. Periksa hak akses dan koneksi.</div>'} }
  async function authorize(){const me=await getMe();const roles=me?.roles||[];const ok=roles.includes('psg_owner')||roles.includes('psg_admin');state.owner=roles.includes('psg_owner');state.admin=roles.includes('psg_admin');nav(ok);return ok}
  function bind(){
    document.addEventListener('click',async(e)=>{
      const t=e.target instanceof Element?e.target:null;if(!t)return;
      const ed=t.closest('[data-agent-edit]');if(ed){const u=state.users.find(x=>x.id===ed.dataset.agentEdit);if(u)modal('edit',u);return}
      const rs=t.closest('[data-agent-resend]');if(rs){if(!confirm('Kirim ulang link akses ke email agen ini?'))return;rs.disabled=true;try{await api('POST',{action:'resend_access',id:rs.dataset.agentResend});alert('Link akses sudah dikirim ulang.')}catch(err){alert(err.message)}finally{rs.disabled=false}return}
      if(t.closest('#btnAgentMgmtInvite'))modal('invite')
    });
    $('agentMgmtSearch')?.addEventListener('input',e=>{state.q=e.target.value||'';render()});
    $('agentMgmtCancel')?.addEventListener('click',close);$('agentMgmtClose')?.addEventListener('click',close);
    $('agentMgmtForm')?.addEventListener('submit',async(e)=>{
      e.preventDefault();const f=e.currentTarget,mode=f.dataset.mode,btn=$('agentMgmtSubmit');btn.disabled=true;btn.textContent=mode==='invite'?'MEMPROSES…':'MENYIMPAN…';
      const body={email:$('agentMgmtEmail').value.trim(),nama:$('agentMgmtNama').value.trim(),kodeAgen:$('agentMgmtKode').value.trim(),level:$('agentMgmtLevel').value,status:$('agentMgmtStatus').value,role:$('agentMgmtRole').value};if(mode!=='invite')body.id=f.dataset.id;
      try{const hasil=await api(mode==='invite'?'POST':'PATCH',body);close();await load();if(mode==='invite')alert(hasil.diagnostic?'TES BERHASIL: akun Identity sudah dibuat. Belum ada email/link yang dikirim. Sekarang cek Netlify → Identity → Users.':'Akun agen berhasil dibuat dan link akses sudah dikirim ke email.')}catch(err){if(mode==='invite'&&err.accountCreated){close();await load();alert(err.message||'Akun berhasil dibuat, tetapi link akses belum terkirim.')}else{alert(err.message||'Perubahan tidak dapat disimpan.')}}finally{btn.disabled=false;btn.textContent=mode==='invite'?'KIRIM AKSES':'SIMPAN PERUBAHAN'}
    });
    $('agentMgmtModal')?.addEventListener('click',e=>{if(e.target===$('agentMgmtModal'))close()});
  }
  async function open(){if(await authorize()){await load()}}
  function init(){bind();nav(false);const refresh=()=>authorize().catch(()=>nav(false));window.addEventListener('psg:identity-ready',refresh);if(window.InsuranceHubIdentity?.source==='server:/api/psg/me')refresh();const s=$('layarAgentManagement');if(s)new MutationObserver(()=>{if(s.classList.contains('aktif'))open()}).observe(s,{attributes:true,attributeFilter:['class']});window.PSGAgentManagement={refreshAuthorization:refresh,open}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

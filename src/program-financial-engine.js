/* PSG Selling Tools — Program Financial Engine
 * Pure aggregation/scheduling layer. It does NOT calculate product premiums.
 * Product calculators remain the source of truth; this layer only groups the
 * already-calculated components by payment period and benefit semantics.
 */
(function(global){
  'use strict';
  function premiumPhases(components){
    const finite=(components||[]).filter(c=>!c.recurring&&Number(c.paymentTerm)>0);
    const recurring=(components||[]).filter(c=>c.recurring);
    const ends=[...new Set(finite.map(c=>Number(c.paymentTerm)))].sort((a,b)=>a-b);
    const phases=[]; let from=1;
    for(const end of ends){
      const active=(components||[]).filter(c=>c.recurring || (Number(c.paymentTerm)>=from && Number(c.paymentTerm)>=end));
      if(!active.length) continue;
      phases.push({fromYear:from,toYear:end,totalAnnual:active.reduce((s,c)=>s+Number(c.annual||0),0),hasRecurring:active.some(c=>c.recurring)});
      from=end+1;
    }
    if(recurring.length) phases.push({fromYear:from,toYear:null,totalAnnual:recurring.reduce((s,c)=>s+Number(c.annual||0),0),hasRecurring:true});
    return phases;
  }
  function activeBenefits(benefits, age, predicate){
    return (benefits||[]).filter(b=>Number(b.amount||0)>0 && (b.activeFromAge==null||age>=b.activeFromAge) && (b.activeUntilAge==null||age<=b.activeUntilAge) && (!predicate||predicate(b)));
  }
  function resolvedAmount(b, age){
    /* Manfaat hanya berlaku selama polisnya masih aktif. Tanpa pemeriksaan
       ini, polis yang sudah jatuh tempo tetap ikut dijumlahkan pada usia
       berikutnya, sehingga tabel manfaat program tidak pernah menunjukkan
       penurunan setelah ada polis yang cair. */
    if(b.activeUntilAge!=null && age>Number(b.activeUntilAge)) return 0;
    if(b.activeFromAge!=null && age<Number(b.activeFromAge)) return 0;
    if(Array.isArray(b.amountSchedule) && b.amountSchedule.length){
      // Prefer an explicit range. This is the canonical representation.
      const hit=b.amountSchedule.find(x=>age>=Number(x.fromAge??-Infinity) && age<=Number(x.toAge??Infinity));
      if(hit){
        if(hit.amount!=null) return Number(hit.amount||0);
        if(hit.multiplier!=null) return Number(b.baseAmount??b.amount??0)*Number(hit.multiplier||0);
      }
      // Existing product calculators sometimes expose a year-by-year table
      // (fromAge === toAge). In that representation the row at a milestone
      // remains applicable until the next supplied row. Carry the last known
      // value forward rather than falling back to the base amount.
      const ordered=b.amountSchedule.slice().sort((a,c)=>Number(a.fromAge??-Infinity)-Number(c.fromAge??-Infinity));
      let prior=null;
      for(const x of ordered){
        if(Number(x.fromAge??-Infinity)<=age) prior=x; else break;
      }
      if(prior){
        if(prior.amount!=null) return Number(prior.amount||0);
        if(prior.multiplier!=null) return Number(b.baseAmount??b.amount??0)*Number(prior.multiplier||0);
      }
    }
    return Number(b.amount||0);
  }
  function deathTotal(benefits, age){ return activeBenefits(benefits, age, b=>b.event==='death').reduce((s,b)=>s+resolvedAmount(b,age),0); }
  function deathScenarioTotal(benefits, age, scenario){
    const active=activeBenefits(benefits, age);
    let total=active.filter(b=>b.event==='death').reduce((s,b)=>s+resolvedAmount(b,age),0);
    if(scenario==='accident_general') total += active.filter(b=>b.event==='accident_death').reduce((s,b)=>s+resolvedAmount(b,age),0)
      + active.filter(b=>b.event==='public_transport_death').reduce((s,b)=>s+resolvedAmount(b,age),0);
    else if(scenario==='public_transport') total += active.filter(b=>b.event==='public_transport_death').reduce((s,b)=>s+resolvedAmount(b,age),0);
    return total;
  }
  function changePoints(benefits, age){
    const pts=new Set();
    for(const b of (benefits||[])){
      if(b.activeUntilAge!=null){ const u=Number(b.activeUntilAge); if(u>=age) pts.add(u+1); }
      if(b.activeFromAge!=null){ const f=Number(b.activeFromAge); if(f>age) pts.add(f); }
      if(Array.isArray(b.amountSchedule)){
        for(const seg of b.amountSchedule){
          const f=Number(seg.fromAge); const t=Number(seg.toAge);
          if(Number.isFinite(f)&&f>age) pts.add(f);
          if(Number.isFinite(t)&&t>=age) pts.add(t+1);
        }
      }
    }
    return [...pts].filter(v=>v>age).sort((a,b)=>a-b);
  }

  function deathSchedule(benefits, startAge){
    const all=(benefits||[]).filter(b=>b&&b.event==='death'&&Number(b.amount||0)>0);
    if(!all.length) return [];
    const maxAge=all.reduce((m,b)=>Math.max(m,Number(b.activeUntilAge||0),...(Array.isArray(b.amountSchedule)?b.amountSchedule.map(x=>Number(x.toAge||0)):[0])), startAge);
    const points=new Set([Number(startAge)]);
    for(const b of all){
      if(b.activeFromAge!=null && Number(b.activeFromAge)>=startAge) points.add(Number(b.activeFromAge));
      if(b.activeUntilAge!=null && Number(b.activeUntilAge)>=startAge) points.add(Number(b.activeUntilAge)+1);
      if(Array.isArray(b.amountSchedule)) for(const seg of b.amountSchedule){
        const f=Number(seg.fromAge), t=Number(seg.toAge);
        if(Number.isFinite(f)&&f>=startAge) points.add(f);
        if(Number.isFinite(t)&&t>=startAge) points.add(t+1);
      }
    }
    const ages=[...points].filter(a=>a<=maxAge).sort((a,b)=>a-b);
    const rows=[];
    for(let i=0;i<ages.length;i++){
      const from=ages[i], next=ages[i+1]!=null?ages[i+1]-1:maxAge;
      if(next<from) continue;
      const total=all.reduce((sum,b)=>sum+resolvedAmount(b,from),0);
      if(total<=0) continue;
      rows.push({fromAge:from,toAge:next,total});
    }
    const merged=[];
    for(const row of rows){
      const prev=merged[merged.length-1];
      if(prev && prev.toAge+1===row.fromAge && Math.abs(prev.total-row.total)<0.5) prev.toAge=row.toAge;
      else merged.push({...row});
    }
    return merged;
  }

  function programDeathSchedule(benefits, startAge){
    // Aggregate every active death benefit at each age. Product-specific
    // escalation remains local to its product/family. When several benefit
    // components belong to the same escalationGroup (e.g. Gen Aman Life +
    // Gen Aman GHPS), their base amounts are pooled first, then the single
    // parent product schedule is applied to the whole pool. This prevents
    // both omission and double escalation.
    const all=(benefits||[]).filter(b=>b&&b.event==='death'&&Number(b.amount||0)>0);
    const escalationGroups=new Map();
    for(const b of all){
      if(!b.escalationGroup) continue;
      if(!escalationGroups.has(b.escalationGroup)) escalationGroups.set(b.escalationGroup,{items:[],primary:null});
      const g=escalationGroups.get(b.escalationGroup); g.items.push(b);
      if(b.escalationRole==='primary' && Array.isArray(b.amountSchedule) && b.amountSchedule.length) g.primary=b;
    }
    const grouped=new Set();
    const resolvedProgramAmount=(b,age)=>{
      if(!b.escalationGroup || !escalationGroups.has(b.escalationGroup)) return resolvedAmount(b,age);
      const g=escalationGroups.get(b.escalationGroup);
      if(!g.primary) return resolvedAmount(b,age);
      if(grouped.has(b.escalationGroup)) return 0;
      grouped.add(b.escalationGroup);
      const base=g.items.reduce((sum,it)=>sum+Number(it.baseAmount!=null?it.baseAmount:it.amount||0),0);
      const primaryBase=Number(g.primary.baseAmount!=null?g.primary.baseAmount:g.primary.amount||0);
      const primaryResolved=resolvedAmount(g.primary,age);
      const multiplier=primaryBase>0?primaryResolved/primaryBase:1;
      return base*multiplier;
    };
    if(!all.length) return [];
    const ages=new Set([Number(startAge)]);
    for(const b of all){
      if(b.activeFromAge!=null && Number(b.activeFromAge)>startAge) ages.add(Number(b.activeFromAge));
      if(b.activeUntilAge!=null && Number(b.activeUntilAge)>=startAge) ages.add(Number(b.activeUntilAge)+1);
      if(Array.isArray(b.amountSchedule)) for(const seg of b.amountSchedule){
        const f=Number(seg.fromAge), t=Number(seg.toAge);
        if(Number.isFinite(f)&&f>=startAge) ages.add(f);
        if(Number.isFinite(t)&&t>=startAge) ages.add(t+1);
      }
    }
    const sorted=[...ages].filter(Number.isFinite).sort((a,b)=>a-b);
    /* Batas akhir tabel. Manfaat yang tidak punya usia berakhir dianggap
       berjalan sampai usia 99, dan usia mulai berlakunya manfaat ikut
       diperhitungkan — tanpa itu, manfaat yang baru aktif belakangan tidak
       pernah muncul karena batas tabelnya berhenti sebelum usia tersebut. */
    const adaSeumurHidup=all.some(b=>b.activeUntilAge==null);
    const maxAge=Math.max(
      all.reduce((m,b)=>Math.max(m,
        Number(b.activeUntilAge||0),
        Number(b.activeFromAge||0),
        ...(Array.isArray(b.amountSchedule)?b.amountSchedule.map(x=>Number(x.toAge||0)):[0])
      ),startAge),
      adaSeumurHidup?99:startAge
    );
    const rows=[];
    for(let i=0;i<sorted.length;i++){
      const from=sorted[i], to=sorted[i+1]!=null?sorted[i+1]-1:maxAge;
      if(to<from) continue;
      grouped.clear();
      const total=all.reduce((sum,b)=>sum+resolvedProgramAmount(b,from),0);
      /* Baris bernilai nol tetap dilewati, tetapi rentang setelahnya masih
         diperiksa — manfaat yang baru aktif di usia tertentu tidak boleh
         hilang hanya karena rentang pertamanya kosong. */
      if(total>0) rows.push({fromAge:from,toAge:to,total});
    }
    const merged=[];
    for(const row of rows){ const prev=merged[merged.length-1]; if(prev&&prev.toAge+1===row.fromAge&&Math.abs(prev.total-row.total)<0.5) prev.toAge=row.toAge; else merged.push(row); }
    return merged;
  }

  function groupBenefits(benefits){
    const map=new Map();
    for(const b of (benefits||[])){
      const key=[b.aggregateGroup||b.category||'other',b.event||'',b.category||'other'].join('|');
      if(!map.has(key)) map.set(key,{key,label:b.label,category:b.category,event:b.event,items:[],descriptions:[]});
      const g=map.get(key);g.items.push(b);if(b.description)g.descriptions.push(b.description);
    }
    return [...map.values()];
  }
  global.PSGProgramFinancialEngine={premiumPhases,activeBenefits,resolvedAmount,deathTotal,deathScenarioTotal,changePoints,deathSchedule,programDeathSchedule,groupBenefits,version:'1.4.0'};
})(globalThis);

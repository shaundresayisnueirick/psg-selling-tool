/* Insurance Hub — RAYA Pro Maxima engine
   Baseline rules audited against RAYA Pro Maxima training material and
   External Memo No. 033/GNR-PD/09/2026. */
(function(){
  'use strict';
  const RAYA_RULES = {
    TJA1: { plan:'5–15', term:15, maxEntryAge:55, upFactor:5.5, adbRate:0.00288,
      surrender:[0,0,0,0.10,0.20,0.30,0.30,0.50,0.50,0.60,0.60,0.65,0.65,0.70,1.00] },
    TJA2: { plan:'5–20', term:20, maxEntryAge:50, upFactor:6.0, adbRate:0.00300,
      surrender:[0,0,0,0.10,0.20,0.20,0.30,0.30,0.30,0.50,0.50,0.50,0.60,0.60,0.60,0.60,0.625,0.625,0.625,1.00] }
  };
  const FREQ = {
    Tahunan:{perYear:1,label:'Tahunan'},
    Semesteran:{perYear:2,label:'Semesteran'},
    Kuartalan:{perYear:4,label:'Kuartalan'},
    Bulanan:{perYear:12,label:'Bulanan'}
  };
  function num(v){ return Math.max(0, Number(v)||0); }
  function money(v){ return Math.round(num(v)); }
  function annualize(perPayment, freq){ return num(perPayment)*(FREQ[freq]||FREQ.Tahunan).perYear; }
  function perPayment(annual, freq){ return annual/(FREQ[freq]||FREQ.Tahunan).perYear; }
  function ageNearestBirthday(dob, now){
    if(!dob) return null;
    if(window.ihUsiaGenerali){
      try{return window.ihUsiaGenerali(new Date(dob+'T00:00:00'),now||new Date());}catch(e){}
    }
    const d=new Date(dob+'T00:00:00'), n=now||new Date();
    let a=n.getFullYear()-d.getFullYear();
    const bday=new Date(n.getFullYear(),d.getMonth(),d.getDate());
    const last=new Date(n.getFullYear()-1,d.getMonth(),d.getDate());
    if(n>=bday) a=n.getFullYear()-d.getFullYear();
    else if(n<last) a--;
    else if((n-last.getTime())<(bday.getTime()-n.getTime())) a--;
    return a;
  }
  function minContribution(freq){
    return {Tahunan:24000000,Semesteran:12000000,Kuartalan:6000000,Bulanan:2000000}[freq]||24000000;
  }
  function calculate(input){
    const freq=input.freq||'Tahunan';
    const rule=RAYA_RULES[input.plan||'TJA1'];
    const annualBasic=annualize(input.basicContribution,freq);
    const up=annualBasic*rule.upFactor;
    const adbUp=Math.min(up,500000000);
    const adbAnnual=adbUp*rule.adbRate;
    const adbPer=perPayment(adbAnnual,freq);
    const totalPer=num(input.basicContribution)+adbPer;
    const totalAnnual=annualBasic+adbAnnual;
    const errors=[];
    const age=input.age==null?null:Number(input.age);
    if(age==null || !Number.isFinite(age) || age<0) {
      errors.push('Usia masuk belum valid. Pastikan tanggal lahir nasabah sudah diisi dengan benar.');
    } else if(age>rule.maxEntryAge) {
      errors.push('Usia masuk '+age+' tahun tidak memenuhi ketentuan masa asuransi '+rule.term+' tahun. Usia masuk maksimal '+rule.maxEntryAge+' tahun.');
    }
    if(num(input.basicContribution)<=0) errors.push('Kontribusi dasar harus diisi.');
    const min=minContribution(freq);
    if(totalPer<min) {
      errors.push('Minimum kontribusi Dasar + ADB adalah '+formatRp(min)+' per pembayaran untuk frekuensi '+freq.toLowerCase()+'. Total saat ini '+formatRp(totalPer)+'.');
    }
    if(adbUp<7500000) errors.push('Santunan ADB minimum adalah Rp7.500.000.');
    const annualBenefit=annualBasic*0.15;
    const totalBasicContribution=annualBasic*5;
    const maturity=totalBasicContribution*(rule.term===15?1.10:1.20);
    const deathRows=[];
    for(let y=1;y<=rule.term;y++){
      const paidYears=Math.min(y,5);
      const paid=annualBasic*paidYears;
      const benefitsPaid=Math.max(0,y-5)*annualBenefit;
      const futureBenefits=Math.max(0,rule.term-Math.max(y,5))*annualBenefit;
      deathRows.push({year:y,paid,benefitsPaid,futureBenefits,death:up+futureBenefits});
    }
    const surrender=rule.surrender.map((pct,i)=>({
      year:i+1,pct,paid:annualBasic*Math.min(i+1,5),value:annualBasic*Math.min(i+1,5)*pct
    }));
    return {ok:errors.length===0,errors,eligibility:{valid:errors.length===0,ageValid:(age!=null&&Number.isFinite(age)&&age>=0&&age<=rule.maxEntryAge),minimumContributionValid:totalPer>=minContribution(freq)},plan:rule.plan,term:rule.term,maxEntryAge:rule.maxEntryAge,
      age,freq,periods:(FREQ[freq]||FREQ.Tahunan).perYear,basicPerPayment:num(input.basicContribution),
      annualBasic,totalBasicContribution,up,adbUp,adbRate:rule.adbRate,adbAnnual,adbPer,totalPer,totalAnnual,
      annualBenefit,maturity,deathRows,surrender,upFactor:rule.upFactor};
  }
  function formatRp(v){return 'Rp '+money(v).toLocaleString('id-ID');}
  window.RayaProMaximaEngine={RULES:RAYA_RULES,FREQ,calculate,formatRp,ageNearestBirthday,minContribution};
})();

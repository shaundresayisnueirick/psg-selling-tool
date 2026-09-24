/* PSG Selling Tools — Program Financial Result Normalizer
 * Purpose: normalize existing product-calculator outputs into a common contract.
 * No premium formulas are created here. Existing calculators remain source of truth.
 */
(function(global){
  'use strict';

  const finite = (id, label, amount, term, meta={}) => ({
    id, label, amountPerPayment: Number(amount || 0),
    amountPerYear: meta.amountPerYear != null ? Number(meta.amountPerYear) : Number(amount || 0),
    paymentTerm: Number(term || 0), recurring: false,
    waiverEligible: meta.waiverEligible !== false,
    premiumIncluded: meta.premiumIncluded === true,
    sourceProduct: meta.sourceProduct || null, sourceField: meta.sourceField || null
  });

  const recurring = (id, label, amount, meta={}) => ({
    id, label, amountPerPayment: Number(amount || 0),
    amountPerYear: meta.amountPerYear != null ? Number(meta.amountPerYear) : Number(amount || 0),
    paymentTerm: null, recurring: true,
    waiverEligible: false,
    premiumIncluded: meta.premiumIncluded === true,
    sourceProduct: meta.sourceProduct || null, sourceField: meta.sourceField || null
  });

  const benefit = (id, label, amount, meta={}) => ({
    id, label, category: meta.category || 'other', event: meta.event || id,
    amount: Number(amount || 0),
    activeFromAge: meta.activeFromAge ?? null,
    activeUntilAge: meta.activeUntilAge ?? null,
    eventAge: meta.eventAge ?? null,
    conditional: meta.conditional === true,
    additive: meta.additive !== false,
    aggregateGroup: meta.aggregateGroup || meta.category || 'other',
    sourceProduct: meta.sourceProduct || null,
    sourceField: meta.sourceField || null,
    description: meta.description || '',
    amountSchedule: Array.isArray(meta.amountSchedule) ? meta.amountSchedule : null,
    baseAmount: meta.baseAmount != null ? Number(meta.baseAmount) : null
  });

  function normalize(x){
    if (!x || typeof x !== 'object') throw new Error('Product result kosong/tidak valid.');
    if (Array.isArray(x.premiumComponents) && Array.isArray(x.benefits)) return x;
    return { productKey:x.product||null, productName:x.productName||x.product||'Produk', need:x.need||null,
      customerAge:Number(x.age||0)||null, paymentFrequency:x.metode||'Tahunan', paymentTerm:Number(x.paymentTerm||0)||0,
      coverageEndAge:x.coverageEndAge||null, premiumComponents:[], benefits:[], waiver:null, raw:x };
  }

  function aggregateBenefits(results){
    const groups = new Map();
    for (const r of results || []) for (const b of (r.benefits || [])) {
      if (!b || !Number(b.amount || 0)) continue;
      const key = [b.aggregateGroup || b.category, b.event, b.activeFromAge, b.activeUntilAge].join('|');
      if (!groups.has(key)) groups.set(key, { ...b, items:[], total:0 });
      const g = groups.get(key); g.total += Number(b.amount||0); g.items.push(b);
    }
    return [...groups.values()];
  }

  function buildPremiumPhases(results){
    const comps = (results || []).flatMap(r => r.premiumComponents || []);
    const finiteTerms = [...new Set(comps.filter(c => !c.recurring && c.paymentTerm > 0).map(c => c.paymentTerm))].sort((a,b)=>a-b);
    const recurringComps = comps.filter(c => c.recurring);
    const ends = finiteTerms;
    const phases=[]; let from=1;
    for (const end of ends){
      const active = comps.filter(c => c.recurring || c.paymentTerm >= end || (c.paymentTerm >= from && c.paymentTerm >= end));
      const total = active.reduce((s,c)=>s+Number(c.amountPerYear||0),0);
      phases.push({fromYear:from,toYear:end,totalAnnual:total,hasRecurring:active.some(c=>c.recurring)});
      from=end+1;
    }
    if (recurringComps.length){
      phases.push({fromYear:from,toYear:null,totalAnnual:recurringComps.reduce((s,c)=>s+Number(c.amountPerYear||0),0),hasRecurring:true});
    }
    return phases;
  }

  global.PSGProgramNormalizer = {
    finite, recurring, benefit, normalize, aggregateBenefits, buildPremiumPhases,
    version:'1.0.0'
  };
})(globalThis);

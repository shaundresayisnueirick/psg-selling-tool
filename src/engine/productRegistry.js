/* Insurance Hub — Product Engine Registry.
 * Every product calculation enters through one standard contract.
 */
const InsuranceHubEngines = globalThis.InsuranceHubEngines || {};
globalThis.InsuranceHubEngines = InsuranceHubEngines;

const InsuranceHubEngine = {
  version: '2.2.0',
  calculate(productId, input, context = {}) {
    const engine = InsuranceHubEngines[productId];
    if (!engine || typeof engine.calculate !== 'function') {
      throw new Error('Calculation engine belum terdaftar: ' + productId);
    }
    return engine.calculate(input, context.rates, context.hariIni, context.meta);
  },
  has(productId) {
    return !!(InsuranceHubEngines[productId] && typeof InsuranceHubEngines[productId].calculate === 'function');
  },
  list() {
    return Object.keys(InsuranceHubEngines).sort().map(id => ({
      id, version: InsuranceHubEngines[id].version || 'unknown'
    }));
  }
};
globalThis.InsuranceHubEngine = InsuranceHubEngine;

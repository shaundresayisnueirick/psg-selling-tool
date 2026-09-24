/* Optional developer diagnostics: only visible with ?debug=1. */
(function(){
  const params = new URLSearchParams(location.search);
  if (params.get('debug') !== '1') return;
  window.addEventListener('load', () => {
    const box = document.createElement('details');
    box.open = true;
    box.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;background:#fff;border:1px solid #ddd;border-radius:10px;padding:10px;max-width:360px;font:12px/1.4 system-ui;box-shadow:0 6px 24px rgba(0,0,0,.15)';
    const list = globalThis.InsuranceHubEngine ? InsuranceHubEngine.list() : [];
    box.innerHTML = '<summary><b>Insurance Hub Diagnostics</b></summary>'
      + '<div style="margin-top:8px">Engine registry: ' + (globalThis.InsuranceHubEngine ? 'OK' : 'MISSING') + '</div>'
      + '<div>Registered: ' + (list.length ? list.map(x => x.id + ' v' + x.version).join(', ') : 'none') + '</div>'
      + '<div style="margin-top:6px">Normal user mode tidak menampilkan panel ini.</div>';
    document.body.appendChild(box);
  });
})();

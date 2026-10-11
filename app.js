const $ = id => document.getElementById(id);
const AC = window.AudioContext || window.webkitAudioContext;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const noMedia = () => !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const kv = o => Object.entries(o).map(([k, v]) => `<li><span>${k}</span><span>${String(v).replace(/</g,'&lt;')}</span></li>`).join('');
const TESTS = [
  ['display','Display','#34d399','<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>'],
  ['camera','Camera','#22d3ee','<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/>'],
  ['mic','Microphone','#2dd4bf','<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>'],
  ['pointer','Touchpad & mouse','#a78bfa','<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 3v7"/>'],
  ['keyboard','Keyboard','#f472b6','<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'],
  ['touch','Touchscreen & pen','#fda4af','<path d="M9 11V5a2 2 0 014 0v6M13 10a2 2 0 014 0v3a6 6 0 01-6 6h-1a5 5 0 01-4-2l-2-3a2 2 0 013-2l2 2"/>'],
  ['gamepad','Game controller','#c084fc','<rect x="3" y="8" width="18" height="9" rx="4.5"/><path d="M8 11v3M6.5 12.5h3M16 11.5h.01M18 13.5h.01"/>'],
  ['speakers','Speakers','#fb923c','<path d="M4 9h4l5-4v14l-5-4H4zM17 8a5 5 0 010 8"/>'],
  ['battery','Battery','#facc15','<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2M7 10v4M11 10v4"/>'],
  ['network','Network speed','#38bdf8','<path d="M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5h.01"/>'],
  ['wifi','Wi-Fi stability','#22d3ee','<path d="M3 17l4-6 4 3 4-8 6 11"/><path d="M3 21h18"/>'],
  ['benchmark','Performance','#f87171','<path d="M4 17a8 8 0 1116 0M12 17l4-6"/>'],
  ['system','System','#60a5fa','<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>']
];
const NAME = Object.fromEntries(TESTS.map(t => [t[0], t[1]])), CHECKS = TESTS.map(t => t[0]).filter(id => !['gamepad', 'touch'].includes(id) && (id !== 'battery' || navigator.getBattery));
const status = id => R[id] && R[id].done ? (R[id].warn ? 'Check' : 'Done') : ['gamepad', 'touch'].includes(id) ? 'Optional' : 'Not run';
let R = {}; try{ R = JSON.parse(localStorage.getItem('ll-results') || '{}'); }catch(e){}
function mark(id, detail, warn){ R[id] = { done: true, warn: !!warn, detail, at: new Date().toLocaleString() }; try{ localStorage.setItem('ll-results', JSON.stringify(R)); }catch(e){} paint(); }
function paint(){
  const d = id => !!(R[id] && R[id].done);
  document.querySelectorAll('[data-go]').forEach(b => { if(NAME[b.dataset.go]){ b.classList.toggle('done', d(b.dataset.go)); b.classList.toggle('warn', !!(R[b.dataset.go] && R[b.dataset.go].warn)); } });
  const n = CHECKS.filter(d).length; $('progText').textContent = `${n} of ${CHECKS.length} checks done`; $('progBar').style.width = (n / CHECKS.length * 100) + '%'; $('summit').hidden = n < CHECKS.length;
}
const icon = (c, p) => `<svg viewBox="0 0 24 24" style="--c:${c}">${p}</svg>`;
$('nav').innerHTML = `<button data-go="home" style="--c:#34d399"><svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10H3zM9 21v-7h6v7"/></svg>Home<i>›</i></button>` +
  TESTS.map(([id, n, c, p]) => `<button data-go="${id}" style="--c:${c}">${icon(c, p).replace(' style="--c:'+c+'"','')}${n}<i>›</i></button>`).join('');
$('tiles').innerHTML = TESTS.map(([id, n, c, p]) => `<button data-go="${id}">${icon(c, p)}${n}</button>`).join('');

const pages = [...document.querySelectorAll('[data-page]')];
function go(name){
  pages.forEach(p => p.hidden = p.dataset.page !== name);
  document.querySelectorAll('[data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === name));
  try{ history.replaceState(null, '', '#' + name); }catch(e){}
  if(name === 'display') screenInfo(); if(name === 'battery') battery().catch(e => $('batInfo').innerHTML = kv({ Status: 'Battery info is unavailable: ' + e.message }));
  if(name === 'speakers') listOutputs();
  if(name === 'system') system();
  if(name === 'network') netInfo();
  if(name === 'report') report();
}
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
$('bannerX').onclick = () => $('banner').remove();

// ---- Display ----
const COLORS = ['#000', '#fff', '#f00', '#0f0', '#00f', '#808080', 'linear-gradient(90deg,#000,#fff)',
  'repeating-conic-gradient(#fff 0% 25%,#000 0% 50%) 0 0/48px 48px', 'linear-gradient(#fff 1px,transparent 1px) 0 0/48px 48px,linear-gradient(90deg,#fff 1px,transparent 1px) 0 0/48px 48px,#000'];
let fsIdx = -1; const fs = document.createElement('div'); fs.id = 'fs'; fs.innerHTML = '<span>Click: next color · Esc: exit</span>'; document.body.append(fs);
function showFs(){ if(fsIdx >= COLORS.length){ mark('display', 'Viewed all ' + COLORS.length + ' fills'); closeFs(); return; } fs.style.background = COLORS[fsIdx]; fs.style.display = 'block'; }
function closeFs(){ fs.style.display = 'none'; fsIdx = -1; const ex = document.exitFullscreen || document.webkitExitFullscreen; if((document.fullscreenElement || document.webkitFullscreenElement) && ex) ex.call(document); }
document.addEventListener('fullscreenchange', () => { if(!document.fullscreenElement && fsIdx >= 0) closeFs(); });
$('fsStart').onclick = () => { fsIdx = 0; showFs(); const req = fs.requestFullscreen || fs.webkitRequestFullscreen; if(req){ try{ Promise.resolve(req.call(fs)).catch(() => {}); }catch(e){} } };
fs.onclick = () => { fsIdx++; showFs(); };
document.addEventListener('keydown', e => { if(e.key === 'Escape' && fsIdx >= 0) closeFs(); });
function screenInfo(){
  $('screenInfo').innerHTML = kv({ Resolution: `${screen.width} × ${screen.height}`, 'Pixel ratio': devicePixelRatio, 'Color depth': screen.colorDepth + ' bit',
    'Window': `${innerWidth} × ${innerHeight}`, Orientation: (screen.orientation || {}).type || 'n/a', 'Touch points': navigator.maxTouchPoints });
}

// ---- Camera ----
let camStream;
$('camOn').onclick = async () => {
  try{
    if(noMedia()) throw new Error('Camera needs HTTPS or localhost and a modern browser.');
    const sz = { 1080: [1920, 1080], 720: [1280, 720], 480: [640, 480] }[$('camRes').value];
    camStream = await navigator.mediaDevices.getUserMedia({ video: sz ? { width: { ideal: sz[0] }, height: { ideal: sz[1] } } : true }); $('cam').srcObject = camStream;
    const t = camStream.getVideoTracks()[0], s = t.getSettings();
    $('camInfo').innerHTML = kv({ Name: t.label, Resolution: `${s.width} × ${s.height}`, 'Frame rate': (s.frameRate || 'n/a') + ' fps', 'Aspect ratio': s.aspectRatio ? s.aspectRatio.toFixed(3) : 'n/a', 'Device ID': s.deviceId });
    $('camOff').disabled = false; $('camSnap').disabled = false; mark('camera', `${s.width}×${s.height} at ${s.frameRate || '?'} fps`);
  }catch(e){ $('camInfo').innerHTML = kv({ Error: e.name + ': ' + e.message }); }
};
$('camOff').onclick = () => { camStream.getTracks().forEach(t => t.stop()); $('cam').srcObject = null; $('camOff').disabled = true; $('camSnap').disabled = true; };

// ---- Microphone ----
let micStream, micCtx, raf, peak = -100;
$('micOn').onclick = async () => {
  try{
    if(noMedia() || !AC) throw new Error('Microphone needs HTTPS or localhost and a modern browser.');
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micCtx = new AC(); if(micCtx.state === 'suspended') micCtx.resume(); const an = micCtx.createAnalyser(); an.fftSize = 1024; micCtx.createMediaStreamSource(micStream).connect(an);
    const buf = new Float32Array(an.fftSize), s = micStream.getAudioTracks()[0].getSettings(); peak = -100;
    const loop = () => {
      an.getFloatTimeDomainData(buf); const rms = Math.sqrt(buf.reduce((a, b) => a + b * b, 0) / buf.length), db = 20 * Math.log10(rms || 1e-6);
      peak = Math.max(peak, db); if(peak > -40 && !(R.mic && R.mic.done)) mark('mic', 'Picked up sound, peak ' + peak.toFixed(0) + ' dB'); $('meter').style.width = Math.max(0, Math.min(100, (db + 60) / 60 * 100)) + '%';
      $('micInfo').innerHTML = kv({ Name: micStream.getAudioTracks()[0].label, Level: db.toFixed(1) + ' dB', Peak: peak.toFixed(1) + ' dB', 'Sample rate': micCtx.sampleRate + ' Hz', Channels: s.channelCount || 'n/a', 'Echo cancellation': s.echoCancellation });
      raf = requestAnimationFrame(loop);
    }; loop(); $('micOff').disabled = false;
  }catch(e){ $('micInfo').innerHTML = kv({ Error: e.name + ': ' + e.message }); }
};
$('micOff').onclick = () => { cancelAnimationFrame(raf); micStream.getTracks().forEach(t => t.stop()); micCtx.close(); $('meter').style.width = 0; $('micOff').disabled = true; };

// ---- Touchpad & mouse ----
const pad = $('pad'); let st, rate = 0, moves = 0;
const resetPad = () => st = { L: 0, M: 0, R: 0, dbl: 0, wx: 0, wy: 0, pinch: 0, fmax: 0, x: '-', y: '-', type: '-', pressure: '-' };
function drawPad(){ if(st.L && st.R && (st.wx || st.wy) && !(R.pointer && R.pointer.done)) mark('pointer', 'Left click, right click and scroll registered');
  $('padInfo').innerHTML = kv({ Position: `${st.x}, ${st.y}`, 'Input type': st.type, Pressure: st.pressure, 'Left clicks': st.L, 'Middle clicks': st.M, 'Right clicks': st.R, 'Double clicks': st.dbl, 'Scroll X / Y': `${st.wx} / ${st.wy}`, 'Pinch events': st.pinch, 'Max fingers at once': st.fmax, 'Move events/sec': rate }); }
resetPad(); drawPad(); $('padReset').onclick = () => { resetPad(); drawPad(); };
pad.onpointermove = e => { moves++; Object.assign(st, { x: Math.round(e.offsetX), y: Math.round(e.offsetY), type: e.pointerType, pressure: e.pressure.toFixed(2) }); drawPad(); };
const fingers = new Set();
pad.onpointerdown = e => { fingers.add(e.pointerId); st.fmax = Math.max(st.fmax, fingers.size); st[['L', 'M', 'R'][e.button] || 'L']++; pad.classList.add('on'); drawPad(); };
pad.onpointerup = pad.onpointercancel = e => { fingers.delete(e.pointerId); pad.classList.remove('on'); };
pad.ondblclick = () => { st.dbl++; drawPad(); };
pad.oncontextmenu = e => e.preventDefault();
pad.addEventListener('gesturechange', () => { st.pinch++; drawPad(); });
pad.addEventListener('wheel', e => { e.preventDefault(); if(e.ctrlKey) st.pinch++; else { st.wx += Math.round(e.deltaX); st.wy += Math.round(e.deltaY); } drawPad(); }, { passive: false });
setInterval(() => { rate = moves; moves = 0; }, 1000);

// ---- Speakers ----
let actx, cur; const spkHeard = new Set();
function audio(){
  if(!AC) throw new Error('Web Audio is not supported in this browser.');
  actx = actx || new AC(); if(actx.state === 'suspended') actx.resume(); return actx;
}
function stopTone(){ if(cur){ try{ cur.stop(); }catch(e){} cur = null; } }
function play(pan, sweep){
  try{
    const c = audio(); stopTone();
    const o = c.createOscillator(), g = c.createGain(), v = +$('vol').value, t = c.currentTime, d = sweep ? 4 : 1.2;
    if(sweep){ o.frequency.setValueAtTime(100, t); o.frequency.exponentialRampToValueAtTime(10000, t + d); } else o.frequency.value = +$('freq').value;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .03); g.gain.setValueAtTime(v, t + d - .05); g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g);
    if(c.createStereoPanner){ const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(c.destination); }
    else { const m = c.createChannelMerger(2); if(pan <= 0) g.connect(m, 0, 0); if(pan >= 0) g.connect(m, 0, 1); m.connect(c.destination); }
    o.start(t); o.stop(t + d); cur = o;
    spkHeard.add(sweep ? 'sweep' : pan); if(spkHeard.has(-1) && spkHeard.has(1)) mark('speakers', 'Left and right channels played' + (spkHeard.has('sweep') ? ', sweep run' : '')); o.onended = () => { if(cur === o) cur = null; };
    $('spkNote').textContent = sweep ? 'Sweeping 100 Hz to 10 kHz. Listen for rattles, buzzing or dropouts.' : '';
  }catch(e){ $('spkNote').textContent = 'Could not play sound: ' + e.message; }
}
document.querySelectorAll('[data-pan]').forEach(b => b.onclick = () => play(+b.dataset.pan, false));
$('sweep').onclick = () => play(0, true);
$('stopTone').onclick = stopTone;
async function listOutputs(){
  const sel = $('spkOut'), can = AC && 'setSinkId' in AC.prototype;
  sel.disabled = !can; $('spkList').disabled = !can;
  if(!can){ $('spkNote').textContent = 'Choosing an output device needs Chrome or Edge. Sound plays through the system default.'; return; }
  try{
    const outs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications');
    const keep = sel.value;
    sel.innerHTML = '<option value="">System default</option>' + outs.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || 'Output ' + (i + 1))}</option>`).join('');
    sel.value = keep;
  }catch(e){ $('spkNote').textContent = 'Could not list outputs: ' + e.message; }
}
$('spkList').onclick = listOutputs;
$('spkOut').onchange = async () => {
  try{ await audio().setSinkId($('spkOut').value); $('spkNote').textContent = 'Output changed.'; }
  catch(e){ $('spkNote').textContent = 'Could not switch output: ' + e.message; }
};

// ---- Battery ----
let batBound = false;
async function battery(){
  if(!navigator.getBattery){ $('batInfo').innerHTML = kv({ Status: 'Not supported in this browser. Use Chrome or Edge.' }); return; }
  const b = await navigator.getBattery();
  const draw = () => $('batInfo').innerHTML = kv({ Level: Math.round(b.level * 100) + '%', Charging: b.charging ? 'Yes' : 'No',
    'Time to full': b.charging && isFinite(b.chargingTime) ? Math.round(b.chargingTime / 60) + ' min' : '-', 'Time remaining': !b.charging && isFinite(b.dischargingTime) ? Math.round(b.dischargingTime / 60) + ' min' : '-' });
  draw(); mark('battery', Math.round(b.level * 100) + '% ' + (b.charging ? 'charging' : 'on battery') + (b.level < .2 && !b.charging ? ' (low)' : '') + batRate.text, (b.level < .2 && !b.charging) || batRate.warn); if(!batBound){ ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach(ev => b.addEventListener(ev, draw)); batBound = true; }
}
// ---- Extras: refresh rate, snapshot, mic playback ----
$('hzBtn').onclick = () => {
  let n = 0, t0; $('hz').textContent = 'Measuring for one second…';
  const f = t => { if(!t0) t0 = t; n++; if(t - t0 < 1000) requestAnimationFrame(f); else $('hz').textContent = `Measured about ${Math.round(n / ((t - t0) / 1000))} Hz. Laptops may lower this on battery or in power-saving mode.`; };
  requestAnimationFrame(f);
};
$('camMirror').onchange = () => $('cam').style.transform = $('camMirror').checked ? 'scaleX(-1)' : '';
$('camSnap').onclick = () => {
  const v = $('cam'); if(!v.videoWidth) return;
  const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; const x = c.getContext('2d');
  if($('camMirror').checked){ x.translate(c.width, 0); x.scale(-1, 1); } x.drawImage(v, 0, 0);
  c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'snapshot.png'; a.click(); });
};
$('micRec').onclick = async () => {
  const btn = $('micRec');
  try{
    if(typeof MediaRecorder === 'undefined' || noMedia()) throw new Error('Recording is not supported here. Use HTTPS or localhost in a current browser.');
    const s = micStream && micStream.active ? micStream : await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(s), chunks = []; btn.disabled = true; let left = 5; btn.textContent = `Recording… ${left}`;
    const tick = setInterval(() => { left--; btn.textContent = left > 0 ? `Recording… ${left}` : 'Processing…'; }, 1000);
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      clearInterval(tick); if(s !== micStream) s.getTracks().forEach(t => t.stop());
      const p = $('micPlay'); p.src = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })); p.hidden = false; p.play().catch(() => {});
      btn.disabled = false; btn.textContent = 'Record 5 s and play back'; mark('mic', 'Recorded 5 s and played it back');
    };
    rec.start(); setTimeout(() => rec.stop(), 5000);
  }catch(e){ btn.disabled = false; btn.textContent = 'Record 5 s and play back'; $('micInfo').innerHTML = kv({ Error: e.message }); }
};

// ---- Keyboard ----
const LBL = {Escape:'Esc',Backquote:'`',Minus:'-',Equal:'=',Backspace:'⌫',BracketLeft:'[',BracketRight:']',Backslash:'\\',CapsLock:'Caps',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',ShiftLeft:'Shift',ShiftRight:'Shift',ControlLeft:'Ctrl',ControlRight:'Ctrl',MetaLeft:'Win',MetaRight:'Win',AltLeft:'Alt',AltRight:'Alt',Space:'',ContextMenu:'Menu',PrintScreen:'PrtSc',ScrollLock:'ScrLk',Insert:'Ins',Delete:'Del',PageUp:'PgUp',PageDown:'PgDn',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'};
const lab = c => LBL[c] ?? (c.startsWith('Key') ? c[3] : c.startsWith('Digit') ? c[5] : c);
const KS = s => s.split('').map(x => 'Key' + x).join(' '), KD = [1,2,3,4,5,6,7,8,9,0].map(n => 'Digit' + n).join(' ');
const KF = (a, b) => Array.from({length: b - a + 1}, (_, i) => 'F' + (a + i)).join(' ');
const KROWS = [`Escape _1 ${KF(1,4)} _.5 ${KF(5,8)} _.5 ${KF(9,12)} _.5 PrintScreen ScrollLock Pause`,
  `Backquote ${KD} Minus Equal Backspace*2 _.5 Insert Home PageUp`, `Tab*1.5 ${KS('QWERTYUIOP')} BracketLeft BracketRight Backslash*1.5 _.5 Delete End PageDown`,
  `CapsLock*1.75 ${KS('ASDFGHJKL')} Semicolon Quote Enter*2.25 _3.5`, `ShiftLeft*2.25 ${KS('ZXCVBNM')} Comma Period Slash ShiftRight*2.75 _1.5 ArrowUp _1`,
  `ControlLeft*1.25 MetaLeft*1.25 AltLeft*1.25 Space*6.25 AltRight*1.25 MetaRight*1.25 ContextMenu*1.25 ControlRight*1.25 _.5 ArrowLeft ArrowDown ArrowRight`];
const kels = {}, ktested = new Set(), kheld = new Set(); let kmax = 0, klast = 0;
KROWS.forEach(r => { const row = document.createElement('div'); row.className = 'krow';
  r.split(' ').forEach(t => { if(t[0] === '_'){ const g = document.createElement('i'); g.style.flex = `${t.slice(1)} 1 0`; row.append(g); return; }
    const [c, w = '1'] = t.split('*'), k = document.createElement('b'); k.style.flex = `${w} 1 0`; k.textContent = lab(c); kels[c] = k; row.append(k); });
  $('kbd').append(row); });
function kStats(){ const n = [...ktested].filter(c => kels[c]).length, tot = Object.keys(kels).length;
  $('kbTested').textContent = n + ' / ' + tot; $('kbHeld').textContent = kheld.size; $('kbMax').textContent = kmax;
  if(n === tot && !(R.keyboard && R.keyboard.done)) mark('keyboard', `All ${tot} keys registered`); }
const kbOn = e => !document.querySelector('[data-page="keyboard"]').hidden && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
document.addEventListener('keydown', e => {
  if(!kbOn(e)) return; e.preventDefault();
  if(kels[e.code]) kels[e.code].classList.add('down', 'tested'); ktested.add(e.code);
  const now = performance.now(), gap = klast ? Math.round(now - klast) + ' ms' : '-';
  if(!e.repeat){ kheld.add(e.code); kmax = Math.max(kmax, kheld.size); klast = now; }
  $('kbLast').innerHTML = kv({ Key: e.key, Code: e.code, Location: ['standard','left','right','numpad'][e.location], Repeat: e.repeat, 'Since last press': gap }); kStats();
});
document.addEventListener('keyup', e => { kheld.delete(e.code); if(kels[e.code]) kels[e.code].classList.remove('down'); kStats(); });
window.addEventListener('blur', () => { kheld.clear(); Object.values(kels).forEach(k => k.classList.remove('down')); });
$('kbReset').onclick = () => { ktested.clear(); kheld.clear(); kmax = 0; Object.values(kels).forEach(k => k.classList.remove('down', 'tested')); $('kbLast').innerHTML = ''; kStats(); };
kStats();

// ---- System ----
function system(){
  let gpu = 'n/a'; try{ const gl = document.createElement('canvas').getContext('webgl'), x = gl.getExtension('WEBGL_debug_renderer_info'); gpu = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }catch(e){}
  const c = navigator.connection || {}, m = navigator.userAgent.match(/(Edg|Chrome|Firefox|Version)\/[\d.]+/);
  const o = { Platform: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || 'n/a', Browser: m ? m[0].replace('Edg', 'Edge').replace('Version', 'Safari') : 'n/a',
    'CPU threads': navigator.hardwareConcurrency || 'n/a', 'Memory (rounded)': navigator.deviceMemory ? 'at least ' + navigator.deviceMemory + ' GB' : 'n/a (Chrome and Edge only)', Graphics: gpu,
    Language: navigator.language, 'Time zone': Intl.DateTimeFormat().resolvedOptions().timeZone, Online: navigator.onLine ? 'Yes' : 'No',
    Connection: c.effectiveType ? `${c.effectiveType}, ${c.downlink} Mbps, ${c.rtt} ms` : 'n/a (Chrome and Edge only)', 'Dark mode': matchMedia('(prefers-color-scheme: dark)').matches ? 'On' : 'Off' };
  $('sysInfo').innerHTML = kv(o);
  (async () => { const x = {};
    try{ const e = await navigator.storage.estimate(); x['Browser storage'] = `${(e.usage / 1e6).toFixed(1)} MB used of ${(e.quota / 1e9).toFixed(1)} GB allowed`; }catch(e){}
    for(const n of ['camera', 'microphone', 'geolocation', 'notifications']){ try{ x[n[0].toUpperCase() + n.slice(1) + ' permission'] = (await navigator.permissions.query({ name: n })).state; }catch(e){} }
    if(Object.keys(x).length) $('sysInfo').insertAdjacentHTML('beforeend', kv(x)); })();
  mark('system', `${o.Platform}, ${o['CPU threads']} threads, ${gpu}`);
}

// ---- Game controller ----
setInterval(() => {
  if(document.querySelector('[data-page="gamepad"]').hidden) return;
  if(!navigator.getGamepads){ $('padList').innerHTML = kv({ Status: 'Game controllers are not supported in this browser.' }); return; }
  const pads = [...navigator.getGamepads()].filter(Boolean);
  if(!pads.length){ $('padList').innerHTML = '<li>No controller detected yet. Press a button on it.</li>'; return; }
  $('padList').innerHTML = pads.map(p => { const on = p.buttons.map((b, i) => b.pressed ? i : -1).filter(i => i >= 0);
    if(on.length && !(R.gamepad && R.gamepad.done)) mark('gamepad', 'Controller responded: ' + p.id.slice(0, 40));
    return kv({ Controller: p.id.slice(0, 60), 'Buttons pressed': on.join(', ') || 'none', Axes: p.axes.map(v => v.toFixed(2)).join('  '), Mapping: p.mapping || 'non-standard' }); }).join('');
}, 100);
$('rumble').onclick = () => { const p = navigator.getGamepads && [...navigator.getGamepads()].find(Boolean), v = p && p.vibrationActuator;
  if(v && v.playEffect) v.playEffect('dual-rumble', { duration: 500, strongMagnitude: 1, weakMagnitude: 1 }).catch(() => {}); else $('padList').insertAdjacentHTML('beforeend', '<li>This controller or browser does not support vibration.</li>'); };

// ---- Guided run ----
let tour = -1;
function tourShow(){
  if(tour < 0){ $('tour').hidden = true; return; }
  const id = CHECKS[tour]; $('tour').hidden = false;
  $('tourText').textContent = `Guided run: ${NAME[id]} (${tour + 1} of ${CHECKS.length})`;
  $('tourNext').textContent = tour === CHECKS.length - 1 ? 'Finish' : 'Next check'; go(id);
}
$('tourStart').onclick = () => { tour = 0; tourShow(); };
$('tourNext').onclick = () => { if(tour >= CHECKS.length - 1){ tour = -1; tourShow(); go('report'); } else { tour++; tourShow(); } };
$('tourExit').onclick = () => { tour = -1; tourShow(); };

// ---- Offline support ----
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});

// ---- Network speed ----
const SPEED = 'https://speed.cloudflare.com';
const SIZES = { quick: { dl: 5e6, ul: 1e6, secs: 6 }, full: { dl: 25e6, ul: 4e6, secs: 10 } };
const mbps = (bytes, t0) => bytes * 8 / ((performance.now() - t0) / 1000) / 1e6;
let netCtl = null, NET = []; try{ NET = JSON.parse(localStorage.getItem('ll-net') || '[]'); }catch(e){}
function netInfo(){
  const c = navigator.connection || {};
  $('netInfo').innerHTML = kv({ Online: navigator.onLine ? 'Yes' : 'No', 'Connection type': c.type || 'n/a', 'Effective speed class': c.effectiveType || 'n/a (Chrome and Edge only)',
    'Browser estimate': c.downlink ? `${c.downlink} Mbps, ${c.rtt} ms` : 'n/a', 'Data saver': c.saveData ? 'On (the full test is not recommended)' : 'Off' });
}
function drawNet(){ $('netHist').innerHTML = NET.length ? kv(Object.fromEntries(NET.map(r => [r.at, `${r.down} down / ${r.up} up / ${r.ping} ms`]))) : '<li>No tests yet.</li>'; }
async function netPing(ctl){
  const t = [];
  for(let i = 0; i < 9; i++){ const s = performance.now(); await fetch(`${SPEED}/__down?bytes=0&r=${Math.random()}`, { cache: 'no-store', signal: ctl.signal }); t.push(performance.now() - s); }
  t.shift(); const sorted = [...t].sort((x, y) => x - y);
  return { ping: sorted[Math.floor(sorted.length / 2)], jitter: t.slice(1).reduce((s, v, i) => s + Math.abs(v - t[i]), 0) / (t.length - 1) };
}
async function netDown(ctl, z, onProg){
  const t0 = performance.now(), stop = new AbortController(); let bytes = 0;
  const abort = () => stop.abort(); ctl.signal.addEventListener('abort', abort); const timer = setTimeout(abort, z.secs * 1000);
  const worker = async () => { try{
    const r = await fetch(`${SPEED}/__down?bytes=${z.dl}&r=${Math.random()}`, { cache: 'no-store', signal: stop.signal }), rd = r.body.getReader();
    for(;;){ const { done, value } = await rd.read(); if(done) break; bytes += value.length; onProg(mbps(bytes, t0)); }
  }catch(e){ if(e.name !== 'AbortError') throw e; } };
  try{ await Promise.all([worker(), worker(), worker()]); } finally { clearTimeout(timer); ctl.signal.removeEventListener('abort', abort); }
  if(ctl.signal.aborted) throw new DOMException('Stopped', 'AbortError');
  return mbps(bytes, t0);
}
async function netUp(ctl, z, onProg){
  const buf = new Uint8Array(z.ul); for(let i = 0; i < buf.length; i += 65536) crypto.getRandomValues(buf.subarray(i, Math.min(i + 65536, buf.length)));
  const t0 = performance.now(), cap = 4 * z.ul; let sent = 0;
  const worker = async () => { while(!ctl.signal.aborted && sent < cap && performance.now() - t0 < z.secs * 1000){
    await fetch(`${SPEED}/__up`, { method: 'POST', body: buf, cache: 'no-store', signal: ctl.signal }); sent += buf.length; onProg(mbps(sent, t0)); } };
  await Promise.all([worker(), worker()]);
  if(!sent) throw new Error('Upload was too slow to measure');
  return mbps(sent, t0);
}
const verdict = (d, u, p) => d >= 25 && u >= 5 && p < 80 ? 'Fast enough for 4K streaming, video calls and large downloads.' : d >= 5 && u >= 1.5 ? 'Fine for HD video and calls.' : 'On the slow side: video calls and streaming may stutter.';
$('netStart').onclick = async () => {
  if(!navigator.onLine){ $('netNote').textContent = 'You appear to be offline.'; return; }
  const z = SIZES[$('netSize').value], ctl = netCtl = new AbortController(), bar = p => $('netBar').style.width = p + '%', res = {};
  ['nDown', 'nUp', 'nPing', 'nJit'].forEach(i => $(i).textContent = '–'); $('netStart').disabled = true; $('netStop').disabled = false;
  try{
    $('netNote').textContent = 'Measuring latency…'; bar(5);
    const p = await netPing(ctl); res.ping = Math.round(p.ping); $('nPing').textContent = res.ping; $('nJit').textContent = p.jitter.toFixed(1);
    $('netNote').textContent = 'Testing download…'; bar(30); res.down = +(await netDown(ctl, z, v => $('nDown').textContent = v.toFixed(1))).toFixed(1); $('nDown').textContent = res.down;
    $('netNote').textContent = 'Testing upload…'; bar(70); res.up = +(await netUp(ctl, z, v => $('nUp').textContent = v.toFixed(1))).toFixed(1); $('nUp').textContent = res.up;
    bar(100); $('netNote').textContent = 'Done. ' + verdict(res.down, res.up, res.ping);
    NET.unshift({ at: new Date().toLocaleString(), ...res }); NET = NET.slice(0, 5); try{ localStorage.setItem('ll-net', JSON.stringify(NET)); }catch(e){}
    drawNet(); mark('network', `${res.down} Mbps down, ${res.up} Mbps up, ${res.ping} ms latency`, res.down < 5 || res.up < 1 || res.ping > 150);
  }catch(e){ $('netNote').textContent = e.name === 'AbortError' ? 'Stopped.' : 'Test failed: ' + e.message + '. The speed server may be blocked by your network, a firewall or a browser extension.'; }
  $('netStart').disabled = false; $('netStop').disabled = true;
};
$('netStop').onclick = () => netCtl && netCtl.abort();
$('netClear').onclick = () => { NET = []; try{ localStorage.removeItem('ll-net'); }catch(e){} drawNet(); };
window.addEventListener('online', netInfo); window.addEventListener('offline', netInfo);
drawNet();

// ---- Wi-Fi stability ----
const PING = 'https://speed.cloudflare.com/__down?bytes=0', sleep = ms => new Promise(r => setTimeout(r, ms));
let wfCtl = null;
async function pingOnce(ctl){
  const to = new AbortController(), s = performance.now(), onAbort = () => to.abort(), timer = setTimeout(() => to.abort(), 3000);
  ctl.signal.addEventListener('abort', onAbort);
  try{ await fetch(`${PING}&r=${Math.random()}`, { mode: 'no-cors', cache: 'no-store', signal: to.signal }); return performance.now() - s; }
  catch(e){ return null; } finally { clearTimeout(timer); ctl.signal.removeEventListener('abort', onAbort); }
}
function wfStats(sm){
  const ok = sm.filter(v => v != null), sorted = [...ok].sort((x, y) => x - y), med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  return { n: sm.length, ok: ok.length, avg: ok.length ? ok.reduce((x, y) => x + y, 0) / ok.length : 0, worst: ok.length ? Math.max(...ok) : 0,
    loss: sm.length ? (sm.length - ok.length) / sm.length * 100 : 0, spikes: ok.filter(v => v > Math.max(200, 3 * med)).length };
}
function wfDraw(sm, total){
  const cv = $('wfGraph'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600, H = 200; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext && cv.getContext('2d'); if(!g) return; g.scale(dpr, dpr);
  const ok = sm.filter(v => v != null), top = Math.max(100, ...ok) * 1.1, L = 40, y = v => H - 16 - (v / top) * (H - 30), x = i => L + i * (W - L - 8) / Math.max(total - 1, 1);
  g.font = '11px sans-serif'; g.fillStyle = css('--mute'); g.strokeStyle = css('--contour'); g.lineWidth = 1;
  [0, .5, 1].forEach(f => { const v = top * f; g.beginPath(); g.moveTo(L, y(v)); g.lineTo(W - 8, y(v)); g.stroke(); g.fillText(Math.round(v) + ' ms', 2, y(v) + 4); });
  g.strokeStyle = '#ff7a1a'; g.lineWidth = 2; g.beginPath(); let pen = false;
  sm.forEach((v, i) => { if(v == null){ pen = false; return; } pen ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)); pen = true; }); g.stroke();
  g.fillStyle = '#ff6b5e'; sm.forEach((v, i) => { if(v == null) g.fillRect(x(i) - 2, H - 14, 4, 12); });
}
$('wfStart').onclick = async () => {
  if(!navigator.onLine){ $('wfNote').textContent = 'You appear to be offline.'; return; }
  const total = +$('wfLen').value * 2, sm = [], ctl = wfCtl = new AbortController(); let done = false, dead = false;
  $('wfStart').disabled = true; $('wfStop').disabled = false; $('wfNote').textContent = 'Measuring… walk around if you want to compare rooms.';
  while(sm.length < total && !ctl.signal.aborted){
    const s = performance.now(), v = await pingOnce(ctl); if(ctl.signal.aborted) break;
    sm.push(v); const st = wfStats(sm);
    $('wAvg').textContent = st.avg.toFixed(0); $('wWorst').textContent = st.worst.toFixed(0); $('wLoss').textContent = st.loss.toFixed(1); $('wSpk').textContent = st.spikes; wfDraw(sm, total);
    if(sm.length >= 5 && st.ok === 0){ dead = true; break; }
    const wait = 500 - (performance.now() - s); if(wait > 0) await sleep(wait);
  }
  done = sm.length >= total;
  if(dead) $('wfNote').textContent = 'No replies at all. Check your internet connection, or the ping server may be blocked by your network or an extension.';
  else if(done){
    const st = wfStats(sm), spk = st.spikes / st.n, stable = st.loss === 0 && spk < .03, mostly = st.loss <= 2 && spk < .1, slow = st.avg > 150;
    $('wfNote').textContent = stable && slow ? 'Steady but slow: delays above 150 ms make calls and games feel laggy.' : stable ? 'Stable: no lost replies and almost no lag spikes.' : mostly ? 'Mostly stable, with some lag spikes. Video calls may glitch now and then.' : 'Unstable: expect stuttering calls and slow pages. Try moving closer to the router.';
    mark('wifi', `${st.avg.toFixed(0)} ms average, ${st.worst.toFixed(0)} ms worst, ${st.loss.toFixed(1)}% lost, ${st.spikes} spikes`, !stable || slow);
  } else $('wfNote').textContent = 'Stopped.';
  $('wfStart').disabled = false; $('wfStop').disabled = true;
};
$('wfStop').onclick = () => wfCtl && wfCtl.abort();

// ---- Website reachability ----
const SITES = { Google: 'https://www.google.com/generate_204', Cloudflare: 'https://www.cloudflare.com/cdn-cgi/trace', GitHub: 'https://github.com/', Wikipedia: 'https://www.wikipedia.org/', Microsoft: 'https://www.microsoft.com/' };
async function reach(url){
  const ctl = new AbortController(), s = performance.now(), timer = setTimeout(() => ctl.abort(), 6000);
  try{ await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: ctl.signal }); return Math.round(performance.now() - s) + ' ms'; }
  catch(e){ return e.name === 'AbortError' ? 'Timed out' : 'Unreachable'; } finally { clearTimeout(timer); }
}
const reachRows = rows => $('reachList').innerHTML = rows.map(([n, t]) => `<li><span>${esc(n)}</span><span class="${/ms$/.test(t) ? 'ok' : 'no'}">${esc(t)}</span></li>`).join('');
$('reachGo').onclick = async () => { reachRows(Object.keys(SITES).map(n => [n, 'Checking…'])); reachRows(await Promise.all(Object.entries(SITES).map(async ([n, u]) => [n, await reach(u)]))); };
$('reachOne').onclick = async () => {
  let v = $('reachUrl').value.trim(); if(!v) return; if(!/^https?:\/\//i.test(v)) v = 'https://' + v;
  let u; try{ u = new URL(v); if(!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) throw 0; }catch(e){ reachRows([['Address', 'Not a valid website address']]); return; }
  reachRows([[u.hostname, 'Checking…']]); reachRows([[u.hostname, await reach(u.href)]]);
};

// ---- Notification test ----
$('notifTest').onclick = async () => {
  if(!('Notification' in window)){ $('notifMsg').textContent = 'Notifications are not supported in this browser.'; return; }
  try{
    const p = await Notification.requestPermission();
    if(p === 'granted'){ new Notification('Laptop Lab', { body: 'Notifications work on this laptop.' }); $('notifMsg').textContent = 'Sent. If you saw nothing, check Focus Assist or Do Not Disturb.'; }
    else $('notifMsg').textContent = 'Permission is ' + p + '. Allow notifications for this site in the address bar to test.';
  }catch(e){ $('notifMsg').textContent = 'Could not send: ' + e.message; }
};

// ---- Performance benchmark ----
const sieve = (n, r) => { let c = 0; for(let k = 0; k < r; k++){ const s = new Uint8Array(n + 1); for(let i = 2; i * i <= n; i++) if(!s[i]) for(let j = i * i; j <= n; j += i) s[j] = 1; c = 0; for(let i = 2; i <= n; i++) if(!s[i]) c++; } return c; };
const tick = () => new Promise(r => setTimeout(r, 30));
$('benchStart').onclick = async () => {
  $('benchStart').disabled = true; const out = {}, show = () => $('benchInfo').innerHTML = kv(out);
  out.Status = 'Testing one core…'; show(); await tick();
  let t0 = performance.now(); sieve(5e6, 8); const single = performance.now() - t0; out['One core'] = single.toFixed(0) + ' ms (lower is faster)';
  out.Status = 'Testing all cores…'; show(); await tick();
  let multi = null, n = Math.min(navigator.hardwareConcurrency || 4, 16);
  try{
    const url = URL.createObjectURL(new Blob([`const f=${sieve.toString()};onmessage=e=>postMessage(f(e.data.n,e.data.r));`], { type: 'text/javascript' }));
    t0 = performance.now();
    await Promise.all(Array.from({ length: n }, () => new Promise((res, rej) => { const w = new Worker(url); w.onmessage = () => { w.terminate(); res(); }; w.onerror = rej; w.postMessage({ n: 5e6, r: 8 }); })));
    multi = performance.now() - t0; URL.revokeObjectURL(url);
    out[`All ${n} threads`] = multi.toFixed(0) + ' ms'; out['Parallel speedup'] = (n * single / multi).toFixed(1) + '× (ideal is ' + n + '×)';
  }catch(e){ out['All threads'] = 'Not available in this browser'; }
  out.Status = 'Testing memory…'; show(); await tick();
  const a = new Float64Array(4e6), b = new Float64Array(4e6); t0 = performance.now(); for(let i = 0; i < 20; i++) b.set(a);
  const gbs = 4e6 * 8 * 20 / ((performance.now() - t0) / 1000) / 1e9; out['Memory copy speed'] = gbs.toFixed(1) + ' GB/s';
  delete out.Status; show(); $('benchStart').disabled = false;
  mark('benchmark', `${single.toFixed(0)} ms one core, ${multi ? multi.toFixed(0) + ' ms on ' + n + ' threads, ' : ''}${gbs.toFixed(1)} GB/s memory`);
};

// ---- Theme ----
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
function setTheme(t){
  document.documentElement.dataset.theme = t; try{ localStorage.setItem('ll-theme', t); }catch(e){}
  $('themeTxt').textContent = t === 'day' ? 'Night theme' : 'Day theme';
  const m = document.querySelector('meta[name="theme-color"]'); if(m) m.content = t === 'day' ? '#f1e8d0' : '#0a1d26';
}
$('themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'day' ? 'night' : 'day');
setTheme(document.documentElement.dataset.theme === 'day' ? 'day' : 'night');

// ---- More display tests ----
const fx = document.createElement('div'); fx.id = 'fx'; fx.style.cssText = 'position:fixed;inset:0;z-index:99;display:none;cursor:pointer;overflow:hidden'; document.body.append(fx);
let fxRaf = 0;
const fxHint = (t, c) => `<span style="position:absolute;bottom:12px;left:0;right:0;text-align:center;font:13px sans-serif;color:${c || '#999'};pointer-events:none;mix-blend-mode:difference">${t}</span>`;
function fxClose(){ cancelAnimationFrame(fxRaf); fx.style.display = 'none'; fx.innerHTML = ''; if(document.fullscreenElement || document.webkitFullscreenElement){ const ex = document.exitFullscreen || document.webkitExitFullscreen; if(ex) ex.call(document); } }
const FX = {
  banding(){ fx.style.background = '#000'; fx.innerHTML = ['#fff', '#f00', '#0f0', '#00f'].map(c => `<div style="height:25%;background:linear-gradient(90deg,#000,${c})"></div>`).join('') + fxHint('Look for visible steps in the gradients. Click to exit.'); },
  sharp(){ fx.style.background = 'repeating-conic-gradient(#fff 0 25%,#000 0 50%) 0 0/2px 2px'; fx.innerHTML = fxHint('Should look an even grey. Stripes or shimmer mean scaling is on. Click to exit.', '#f0f'); },
  bleed(){ fx.style.background = '#000'; fx.innerHTML = fxHint('Dim the room. Look for glowing edges or corners. Click to exit.', '#333'); },
  ghost(){
    fx.style.background = '#808080'; fx.innerHTML = fxHint('Watch for smears behind the boxes. Click to exit.', '#fff');
    const boxes = [240, 480, 960, 1920].map((v, i) => { const b = document.createElement('div'); b.style.cssText = `position:absolute;top:${i * 22 + 6}%;left:0;width:70px;height:70px;background:#fff;border-radius:8px`; fx.append(b); return [b, v]; });
    const t0 = performance.now(), step = t => { const W = innerWidth + 70; boxes.forEach(([b, v]) => b.style.left = (((t - t0) / 1000 * v) % W - 70) + 'px'); fxRaf = requestAnimationFrame(step); }; fxRaf = requestAnimationFrame(step);
  }
};
document.querySelectorAll('[data-fx]').forEach(b => b.onclick = () => {
  FX[b.dataset.fx](); fx.style.display = 'block';
  const req = fx.requestFullscreen || fx.webkitRequestFullscreen; if(req){ try{ Promise.resolve(req.call(fx)).catch(() => {}); }catch(e){} }
});
fx.onclick = fxClose;
document.addEventListener('keydown', e => { if(e.key === 'Escape' && fx.style.display === 'block') fxClose(); });
document.addEventListener('fullscreenchange', () => { if(!document.fullscreenElement && fx.style.display === 'block') fxClose(); });

// ---- Touchscreen & pen ----
(function(){
  const cv = $('touchPad'), pts = new Map(), seen = { touch: false, pen: false, mouse: false }; let max = 0, press = 0, tilt = 0;
  const ctx = () => cv.getContext && cv.getContext('2d'), COL = { touch: '--moss', pen: '--flare', mouse: '--sand' };
  function fit(){ const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600; if(cv.width !== Math.round(W * dpr)){ cv.width = Math.round(W * dpr); cv.height = Math.round(360 * dpr); const c = ctx(); if(c) c.scale(dpr, dpr); } }
  const fingers = () => [...pts.values()].filter(p => p.type === 'touch').length;
  function info(){ $('touchInfo').innerHTML = kv({ 'Touch points supported': navigator.maxTouchPoints || 0, 'Touch seen': seen.touch ? 'Yes' : 'No', 'Pen seen': seen.pen ? 'Yes' : 'No', 'Fingers down now': fingers(), 'Most fingers at once': max, 'Pen pressure (last)': press.toFixed(2), 'Pen tilt (last)': tilt + '°' }); }
  $('touchNote').textContent = navigator.maxTouchPoints ? '' : 'No touchscreen detected. You can still test a pen or mouse.';
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => {
    fit(); try{ cv.setPointerCapture(e.pointerId); }catch(x){}
    const type = e.pointerType || 'mouse', p = pos(e); pts.set(e.pointerId, { ...p, type }); seen[type] = true; max = Math.max(max, fingers());
    if(type === 'pen'){ press = e.pressure || 0; tilt = Math.round(e.tiltX || 0); }
    if(seen.touch || seen.pen) mark('touch', `${seen.touch ? max + ' finger' + (max === 1 ? '' : 's') + ' at once' : ''}${seen.touch && seen.pen ? ', ' : ''}${seen.pen ? 'pen detected' : ''}`);
    info();
  });
  cv.addEventListener('pointermove', e => {
    const q = pts.get(e.pointerId); if(!q) return; const p = pos(e), c = ctx();
    if(e.pointerType === 'pen'){ press = e.pressure || 0; tilt = Math.round(e.tiltX || 0); }
    if(c){ c.strokeStyle = css(COL[q.type] || '--sand'); c.lineWidth = q.type === 'pen' ? 1 + (e.pressure || .3) * 8 : 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(p.x, p.y); c.stroke(); }
    q.x = p.x; q.y = p.y; info();
  });
  const up = e => { pts.delete(e.pointerId); info(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  $('touchClear').onclick = () => { const c = ctx(); if(c) c.clearRect(0, 0, cv.clientWidth, 360); pts.clear(); max = 0; press = 0; tilt = 0; info(); };
  info();
})();

// ---- Battery drain tracker ----
const batRate = { text: '', warn: false }, BAT_MS = 30000;
let BAT = []; try{ BAT = JSON.parse(localStorage.getItem('ll-bat') || '[]'); }catch(e){}
let batTimer = null, batObj = null;
async function batSample(){
  if(!navigator.getBattery){ $('batNote').textContent = 'Battery info is not supported in this browser. Use Chrome or Edge.'; return; }
  const b = batObj || (batObj = await navigator.getBattery());
  BAT.push({ t: Date.now(), l: Math.round(b.level * 1000) / 10, c: b.charging });
  BAT = BAT.filter(s => Date.now() - s.t < 6 * 3600e3).slice(-720);
  try{ localStorage.setItem('ll-bat', JSON.stringify(BAT)); }catch(e){}
  batStats();
}
function batDraw(){
  const cv = $('batGraph'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600, H = 180; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext && cv.getContext('2d'); if(!g) return; g.scale(dpr, dpr); g.font = '11px sans-serif';
  const L = 38, y = l => H - 16 - (l / 100) * (H - 30); g.fillStyle = css('--mute'); g.strokeStyle = css('--contour'); g.lineWidth = 1;
  [0, 50, 100].forEach(l => { g.beginPath(); g.moveTo(L, y(l)); g.lineTo(W - 8, y(l)); g.stroke(); g.fillText(l + '%', 4, y(l) + 4); });
  if(BAT.length < 2){ g.fillText('Waiting for data…', L + 10, H / 2); return; }
  const t0 = BAT[0].t, span = Math.max(BAT[BAT.length - 1].t - t0, 60000), x = t => L + (t - t0) / span * (W - L - 8); g.lineWidth = 2.5; g.lineCap = 'round';
  for(let i = 1; i < BAT.length; i++){ g.strokeStyle = css(BAT[i].c ? '--moss' : '--flare'); g.beginPath(); g.moveTo(x(BAT[i - 1].t), y(BAT[i - 1].l)); g.lineTo(x(BAT[i].t), y(BAT[i].l)); g.stroke(); }
}
function batStats(){
  $('bSamples').textContent = BAT.length; batDraw();
  const last = BAT[BAT.length - 1], dash = () => { $('bRate').textContent = '–'; $('bLeft').textContent = '–'; };
  if(!last){ dash(); $('batNote').textContent = 'No data yet. Press Start tracking.'; return; }
  if(last.c){ dash(); batRate.text = ''; batRate.warn = false; $('batNote').textContent = 'Plugged in. Unplug the charger to measure how fast the battery drains.'; return; }
  const run = []; for(let i = BAT.length - 1; i >= 0 && !BAT[i].c; i--) run.unshift(BAT[i]);
  const mins = run.length > 1 ? (run[run.length - 1].t - run[0].t) / 60000 : 0;
  if(mins < 10){ dash(); $('batNote').textContent = `Collecting data… about ${Math.ceil(10 - mins)} more minutes on battery power needed.`; return; }
  const xs = run.map(s => (s.t - run[0].t) / 3600e3), ys = run.map(s => s.l), n = run.length, sum = v => v.reduce((p, q) => p + q, 0);
  const sx = sum(xs), sy = sum(ys), slope = (n * sum(xs.map((v, i) => v * ys[i])) - sx * sy) / (n * sum(xs.map(v => v * v)) - sx * sx), rate = -slope;
  if(!(rate > 0.05)){ dash(); $('batNote').textContent = 'The level has not dropped enough to measure yet. Keep tracking.'; return; }
  const left = last.l / rate; $('bRate').textContent = rate.toFixed(1); $('bLeft').textContent = left.toFixed(1);
  batRate.text = ` (drains ${rate.toFixed(0)}%/h)`; batRate.warn = rate > 20;
  $('batNote').textContent = rate > 20 ? 'High drain. Check for heavy apps, a bright screen or too many tabs.' : rate > 12 ? 'Moderate drain, typical for active work.' : 'Light drain.';
  mark('battery', `${Math.round(last.l)}% on battery, drains ${rate.toFixed(1)}%/h, about ${left.toFixed(1)} h left`, batRate.warn || last.l < 20);
}
$('batStart').onclick = () => { if(batTimer) return; batSample(); batTimer = setInterval(batSample, BAT_MS); $('batStart').disabled = true; $('batStop').disabled = false; };
$('batStop').onclick = () => { clearInterval(batTimer); batTimer = null; $('batStart').disabled = false; $('batStop').disabled = true; };
$('batClear').onclick = () => { BAT = []; batRate.text = ''; batRate.warn = false; try{ localStorage.removeItem('ll-bat'); }catch(e){} batStats(); };
batStats();

// ---- Field report ----
function repSummary(){
  const done = CHECKS.filter(id => R[id] && R[id].done), warns = done.filter(id => R[id].warn).map(id => NAME[id]);
  $('repSum').textContent = `${done.length} of ${CHECKS.length} checks done.` + (warns.length ? ' Needs attention: ' + warns.join(', ') + '.' : done.length ? ' Nothing needs attention.' : '');
}
function report(){ repSummary();
  $('repList').innerHTML = TESTS.map(([id, n]) => { const r = R[id], ok = r && r.done;
    return `<li><span>${n}</span><span class="chip ${ok ? (r.warn ? 'warn' : 'ok') : 'no'}">${status(id)}</span><span>${ok ? esc(r.detail) : ''}</span></li>`; }).join('');
}
const repText = () => ['Laptop Lab field report', new Date().toLocaleString(), ''].concat(TESTS.map(([id, n]) => `${n}: ${R[id] && R[id].done ? status(id) + ' - ' + R[id].detail : status(id)}`)).join('\n');
function save(name, type, text){ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); }
$('repTxt').onclick = () => save('field-report.txt', 'text/plain', repText());
$('repJson').onclick = () => save('field-report.json', 'application/json', JSON.stringify({ date: new Date().toISOString(), results: R }, null, 2));
$('repPrint').onclick = () => window.print();
$('repCopy').onclick = async () => { try{ await navigator.clipboard.writeText(repText()); $('repMsg').textContent = 'Report copied.'; }catch(e){ $('repMsg').textContent = 'Copy is blocked here. Use Download report instead.'; } };
$('repClear').onclick = () => { R = {}; try{ localStorage.removeItem('ll-results'); }catch(e){} paint(); report(); };

// ---- Compatibility ----
(function(){
  const t = (k, v) => `<li><span>${k}</span><span class="${v ? 'ok' : 'no'}">${v ? 'Supported' : 'Not available'}</span></li>`;
  $('compat').innerHTML = t('Secure page (HTTPS/localhost)', window.isSecureContext) + t('Camera and microphone', !noMedia()) + t('Sound (Web Audio)', !!AC) +
    t('Speaker selection', !!AC && 'setSinkId' in AC.prototype) + t('Battery info', !!navigator.getBattery) + t('Full screen', !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) + t('Touchpad pointer events', !!window.PointerEvent);
})();
paint();
go(pages.some(p => p.dataset.page === location.hash.slice(1)) ? location.hash.slice(1) : 'home');

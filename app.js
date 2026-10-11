// Phone Lab: browser-based phone hardware checks. No dependencies.
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const kv = o => Object.entries(o).map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`).join('');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
const AC = window.AudioContext || window.webkitAudioContext;
const mq = q => !!(window.matchMedia && matchMedia(q).matches);
const noMedia = () => !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const mbps = (bytes, t0) => bytes * 8 / ((performance.now() - t0) / 1000) / 1e6;

// ---------- Checks list ----------
const TESTS = [
  ['touch','Touch screen','#fda4af','<path d="M9 11V5a2 2 0 014 0v6M13 10a2 2 0 014 0v3a6 6 0 01-6 6h-1a5 5 0 01-4-2l-2-3a2 2 0 013-2l2 2"/>'],
  ['display','Display','#34d399','<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'],
  ['camera','Cameras','#22d3ee','<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'],
  ['mic','Microphone','#2dd4bf','<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>'],
  ['speakers','Speakers','#fb923c','<path d="M4 9h4l5-4v14l-5-4H4zM17 8a5 5 0 010 8"/>'],
  ['vibration','Vibration','#c084fc','<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M4 8v8M20 8v8M1 10v4M23 10v4"/>'],
  ['motion','Motion sensors','#a78bfa','<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>'],
  ['compass','Compass & level','#fbbf24','<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'],
  ['gps','GPS location','#f87171','<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'],
  ['battery','Battery','#facc15','<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2M7 10v4M11 10v4"/>'],
  ['network','Network speed','#38bdf8','<path d="M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5h.01"/>'],
  ['signal','Connection stability','#22d3ee','<path d="M3 17l4-6 4 3 4-8 6 11M3 21h18"/>'],
  ['wireless','Bluetooth & NFC','#60a5fa','<path d="M7 7l10 10-5 4V3l5 4L7 17"/>'],
  ['system','System','#8fcf6b','<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>']
];
const OPTIONAL = ['wireless'];
const NAME = Object.fromEntries(TESTS.map(t => [t[0], t[1]]));
const UNSUPPORTED = { battery: !navigator.getBattery, vibration: !navigator.vibrate, gps: !navigator.geolocation, motion: !window.DeviceMotionEvent };
const CHECKS = TESTS.map(t => t[0]).filter(id => !OPTIONAL.includes(id) && !UNSUPPORTED[id]);

let R = {}; try{ R = JSON.parse(localStorage.getItem('pl-results') || '{}'); }catch(e){}
const status = id => R[id] && R[id].done ? (R[id].warn ? 'Check' : 'Done') : OPTIONAL.includes(id) ? 'Optional' : 'Not run';
function mark(id, detail, warn){
  R[id] = { done: true, warn: !!warn, detail, at: new Date().toLocaleString() };
  try{ localStorage.setItem('pl-results', JSON.stringify(R)); }catch(e){} paint();
}
function paint(){
  document.querySelectorAll('#tiles [data-go]').forEach(b => { const r = R[b.dataset.go]; b.classList.toggle('done', !!(r && r.done)); b.classList.toggle('warn', !!(r && r.warn)); });
  const n = CHECKS.filter(id => R[id] && R[id].done).length;
  $('progText').textContent = `${n} of ${CHECKS.length} checks done`; $('progBar').style.width = (n / CHECKS.length * 100) + '%';
}
$('tiles').innerHTML = TESTS.map(([id, n, c, p]) => `<button data-go="${id}"><svg viewBox="0 0 24 24" style="--c:${c}">${p}</svg>${esc(n)}</button>`).join('');

// ---------- Navigation ----------
const pages = [...document.querySelectorAll('[data-page]')], STOPPERS = {};
pages.forEach(p => { if(!['home', 'report', 'docs'].includes(p.dataset.page)) p.insertAdjacentHTML('afterbegin', '<button class="back" data-go="home">← All checks</button>'); });
function go(name){
  Object.entries(STOPPERS).forEach(([k, f]) => { if(k !== name) f(); });
  pages.forEach(p => p.hidden = p.dataset.page !== name);
  const tab = ['report', 'docs'].includes(name) ? name : 'home';
  document.querySelectorAll('.tabs [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === tab));
  try{ history.replaceState(null, '', '#' + name); }catch(e){} window.scrollTo(0, 0);
  if(name === 'system') system(); if(name === 'report') report(); if(name === 'battery') battery(); if(name === 'network') netInfo(); if(name === 'display') dispInfo();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if(b) go(b.dataset.go); });

// ---------- Theme and install ----------
function setTheme(t){
  document.documentElement.dataset.theme = t; try{ localStorage.setItem('pl-theme', t); }catch(e){}
  $('themeTxt').textContent = t === 'day' ? '☾' : '☀';
  const m = document.querySelector('meta[name="theme-color"]'); if(m) m.content = t === 'day' ? '#f1e8d0' : '#0a1d26';
}
$('themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'day' ? 'night' : 'day');
setTheme(document.documentElement.dataset.theme === 'day' ? 'day' : 'night');
let deferred = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('installBtn').hidden = false; });
$('installBtn').onclick = async () => { if(!deferred) return; deferred.prompt(); try{ await deferred.userChoice; }catch(e){} deferred = null; $('installBtn').hidden = true; };

// ---------- Full-screen overlay (display tests) ----------
const fx = document.createElement('div'); fx.id = 'fx'; fx.style.cssText = 'position:fixed;inset:0;z-index:99;display:none;overflow:hidden;touch-action:none'; document.body.append(fx);
let fxTap = null;
const fxHint = t => `<span class="fxhint">${t}</span>`;
function fxOpen(bg, html, tap){
  fx.style.background = bg; fx.innerHTML = html || ''; fx.style.display = 'block'; fxTap = tap || fxClose;
  const r = fx.requestFullscreen || fx.webkitRequestFullscreen; if(r){ try{ Promise.resolve(r.call(fx)).catch(() => {}); }catch(e){} }
}
function fxClose(){ fx.style.display = 'none'; fx.innerHTML = ''; if(document.fullscreenElement || document.webkitFullscreenElement){ const ex = document.exitFullscreen || document.webkitExitFullscreen; if(ex) ex.call(document); } }
fx.addEventListener('click', () => fxTap && fxTap());
document.addEventListener('fullscreenchange', () => { if(!document.fullscreenElement && fx.style.display === 'block') fxClose(); });
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ if(fx.style.display === 'block') fxClose(); if(tt.style.display === 'block') ttClose(); } });

// ---------- Display ----------
const FILLS = ['#000', '#fff', '#f00', '#0f0', '#00f', '#808080', 'linear-gradient(0deg,#000,#fff)']; let fi = 0;
function showFill(){ if(fi >= FILLS.length){ mark('display', `Viewed all ${FILLS.length} fills`); fxClose(); return; } fx.style.background = FILLS[fi]; }
$('fillStart').onclick = () => { fi = 0; fxOpen(FILLS[0], fxHint('Tap for the next color'), () => { fi++; showFill(); }); };
$('bandBtn').onclick = () => fxOpen('#000', ['#fff', '#f00', '#0f0', '#00f'].map(c => `<div style="height:25%;background:linear-gradient(90deg,#000,${c})"></div>`).join('') + fxHint('Look for visible steps. Tap to exit'));
$('hzBtn').onclick = () => {
  const ts = []; $('hz').textContent = 'Measuring for 1.5 seconds…'; $('hzBtn').disabled = true;
  const done = () => {
    $('hzBtn').disabled = false; const d = ts.slice(1).map((t, i) => t - ts[i]).sort((x, y) => x - y);
    if(d.length < 10){ $('hz').textContent = 'Not enough frames to measure. Keep this tab in front and try again.'; return; }
    const med = d[Math.floor(d.length / 2)], raw = 1000 / med, common = [24, 30, 48, 50, 60, 72, 75, 90, 120, 144, 165];
    const near = common.reduce((p, c) => Math.abs(c - raw) < Math.abs(p - raw) ? c : p), hz = Math.abs(near - raw) / near < .05 ? near : Math.round(raw), late = d.filter(x => x > med * 1.5).length;
    $('hz').textContent = `Your screen runs at about ${hz} Hz (${raw.toFixed(1)} measured). ` + (late ? `${late} of ${d.length} frames arrived late; close other apps and retry. ` : 'Frames arrived evenly. ') + 'Phones often lower the rate in battery saver mode.';
  };
  const f = t => { ts.push(t); if(t - ts[0] < 1500) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f);
};
let wl = null;
$('wakeBtn').onclick = async () => {
  if(!navigator.wakeLock){ $('hz').textContent = 'Keeping the screen on is not supported in this browser.'; return; }
  try{
    if(wl){ await wl.release(); wl = null; $('wakeBtn').textContent = 'Keep screen on'; return; }
    wl = await navigator.wakeLock.request('screen'); $('wakeBtn').textContent = 'Screen stays on (tap to stop)'; wl.addEventListener('release', () => { wl = null; $('wakeBtn').textContent = 'Keep screen on'; });
  }catch(e){ $('hz').textContent = 'Could not keep the screen on: ' + e.message; }
};
function dispInfo(){
  const gamut = mq('(color-gamut: rec2020)') ? 'Very wide (Rec. 2020)' : mq('(color-gamut: p3)') ? 'Wide (Display P3)' : mq('(color-gamut: srgb)') ? 'Standard (sRGB)' : 'Unknown', d = devicePixelRatio || 1;
  $('dispInfo').innerHTML = kv({ 'Screen size (CSS px)': `${screen.width} × ${screen.height}`, 'Physical pixels (approx.)': `${Math.round(screen.width * d)} × ${Math.round(screen.height * d)}`, 'Pixel density': d + '×',
    'Color depth': screen.colorDepth + ' bit', 'Color gamut': gamut, HDR: mq('(dynamic-range: high)') ? 'Supported' : 'Not detected', Orientation: (screen.orientation || {}).type || 'n/a', 'Touch points': navigator.maxTouchPoints || 0 });
}
(function(){
  const box = $('gamutSw');
  if(!(window.CSS && CSS.supports && CSS.supports('color', 'color(display-p3 1 0 0)'))){ box.innerHTML = '<p class="hint">This browser can\'t show Display P3 colors, so the comparison is unavailable.</p>'; return; }
  box.innerHTML = [['#f00', 'color(display-p3 1 0 0)', 'Red'], ['#0f0', 'color(display-p3 0 1 0)', 'Green'], ['#00f', 'color(display-p3 0 0 1)', 'Blue']].map(([s, p, n]) =>
    `<div style="text-align:center"><div style="display:flex;width:110px;height:50px;border-radius:8px;overflow:hidden"><i style="flex:1;background:${s}"></i><i style="flex:1;background:${p}"></i></div><small class="hint">${n}: sRGB | P3</small></div>`).join('');
})();

// ---------- Touch screen ----------
const tt = document.createElement('div'); tt.id = 'tt'; document.body.append(tt);
const tstate = { cols: 0, rows: 0, on: null, max: 0, ptrs: new Set(), done: false };
function ttOpen(){
  const W = innerWidth, H = innerHeight, size = 52, cols = Math.max(2, Math.ceil(W / size)), rows = Math.max(2, Math.ceil(H / size));
  Object.assign(tstate, { cols, rows, on: new Uint8Array(cols * rows), max: 0, done: false }); tstate.ptrs.clear();
  tt.innerHTML = `<div id="ttGrid" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">${'<i></i>'.repeat(cols * rows)}</div><div id="ttHud"><span id="ttTxt"></span><button id="ttX" aria-label="Close touch test">✕</button></div>`;
  tt.style.display = 'block'; const r = tt.requestFullscreen || tt.webkitRequestFullscreen; if(r){ try{ Promise.resolve(r.call(tt)).catch(() => {}); }catch(e){} }
  $('ttX').onclick = ttClose; ttHud();
  // cells hidden under the close button count as tested automatically
  const b = $('ttX').getBoundingClientRect(); if(b.width) for(let r2 = 0; r2 < rows; r2++) for(let c = 0; c < cols; c++){ const x0 = c * W / cols, x1 = (c + 1) * W / cols, y0 = r2 * H / rows, y1 = (r2 + 1) * H / rows; if(x1 > b.left && x0 < b.right && y1 > b.top && y0 < b.bottom) ttCover(c, r2); }
}
function ttCover(c, r){ const i = r * tstate.cols + c; if(!tstate.on[i]){ tstate.on[i] = 1; const el = $('ttGrid').children[i]; if(el) el.className = 'on'; } }
function ttHud(){
  const n = tstate.on.reduce((a, b) => a + b, 0), tot = tstate.on.length;
  $('ttTxt').textContent = n === tot ? `All ${tot} zones respond ✓` : `${n} / ${tot} zones · fingers ${tstate.ptrs.size} (max ${tstate.max})`;
  if(n === tot && !tstate.done){ tstate.done = true; mark('touch', `All ${tot} zones responded, up to ${tstate.max} fingers at once`); }
}
function ttClose(){
  if(tt.style.display !== 'block') return; const n = tstate.on.reduce((a, b) => a + b, 0), tot = tstate.on.length;
  tt.style.display = 'none'; tt.innerHTML = ''; if(document.fullscreenElement || document.webkitFullscreenElement){ const ex = document.exitFullscreen || document.webkitExitFullscreen; if(ex) ex.call(document); }
  $('ttInfo').innerHTML = kv({ 'Zones that responded': `${n} of ${tot}`, 'Dead zones': tot - n, 'Most fingers at once': tstate.max, Verdict: n === tot ? 'Whole screen responds' : 'Some areas never responded. Clean the screen and retry, and check for a screen protector fault.' });
}
const ttPos = e => { const W = innerWidth, H = innerHeight; return [Math.min(tstate.cols - 1, Math.max(0, Math.floor(e.clientX / W * tstate.cols))), Math.min(tstate.rows - 1, Math.max(0, Math.floor(e.clientY / H * tstate.rows)))]; };
tt.addEventListener('pointerdown', e => { if(e.target.id === 'ttX') return; tstate.ptrs.add(e.pointerId); tstate.max = Math.max(tstate.max, tstate.ptrs.size); ttCover(...ttPos(e)); ttHud(); });
tt.addEventListener('pointermove', e => { if(!tstate.ptrs.has(e.pointerId)) return; ttCover(...ttPos(e)); ttHud(); });
['pointerup', 'pointercancel'].forEach(t => tt.addEventListener(t, e => { tstate.ptrs.delete(e.pointerId); if(tt.style.display === 'block') ttHud(); }));
document.addEventListener('fullscreenchange', () => { if(!document.fullscreenElement && tt.style.display === 'block') ttClose(); });
$('ttStart').onclick = ttOpen;

// ---------- Cameras ----------
let camStream = null, camTrack = null, torchOn = false;
function camStop(){
  if(camStream) camStream.getTracks().forEach(t => t.stop()); camStream = camTrack = null; torchOn = false; $('cam').srcObject = null;
  ['camOff', 'camTorch', 'camShot'].forEach(i => $(i).disabled = true); $('camTorch').textContent = 'Flashlight';
}
STOPPERS.camera = camStop;
async function camStart(mode){
  try{
    if(noMedia()) throw new Error('Camera needs HTTPS and a modern browser.'); camStop();
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode } } }); $('cam').srcObject = camStream;
    camTrack = camStream.getVideoTracks()[0]; const s = camTrack.getSettings(), caps = camTrack.getCapabilities ? camTrack.getCapabilities() : {};
    let cams = 'n/a'; try{ cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput').length; }catch(e){}
    $('camInfo').innerHTML = kv({ Camera: camTrack.label || mode, Facing: s.facingMode || mode, Resolution: `${s.width} × ${s.height}`, 'Frame rate': (s.frameRate || 'n/a') + ' fps', 'Cameras found': cams,
      Flashlight: caps.torch ? 'Available' : 'Not available on this camera', Zoom: caps.zoom ? `${caps.zoom.min}× to ${caps.zoom.max}×` : 'n/a' });
    $('camOff').disabled = false; $('camShot').disabled = false; $('camTorch').disabled = !caps.torch;
    mark('camera', `${mode === 'user' ? 'Front' : 'Back'} camera ${s.width}×${s.height}`);
  }catch(e){ $('camInfo').innerHTML = kv({ Error: e.name + ': ' + e.message }); }
}
$('camBack').onclick = () => camStart('environment'); $('camFront').onclick = () => camStart('user'); $('camOff').onclick = camStop;
$('camTorch').onclick = async () => {
  try{ torchOn = !torchOn; await camTrack.applyConstraints({ advanced: [{ torch: torchOn }] }); $('camTorch').textContent = torchOn ? 'Flashlight off' : 'Flashlight'; if(torchOn) mark('camera', 'Camera and flashlight work'); }
  catch(e){ torchOn = false; $('camInfo').insertAdjacentHTML('beforeend', kv({ Flashlight: 'Could not switch: ' + e.message })); }
};
$('camShot').onclick = () => { const v = $('cam'), c = $('camSnap'), g = c.getContext && c.getContext('2d'); if(!g || !v.videoWidth) return; c.width = v.videoWidth; c.height = v.videoHeight; g.drawImage(v, 0, 0); c.hidden = false; };

// ---------- Microphone ----------
let micStream = null, micCtx = null, micRaf = 0, peak = -100;
function micStop(){
  cancelAnimationFrame(micRaf); if(micStream){ micStream.getTracks().forEach(t => t.stop()); micStream = null; } if(micCtx){ micCtx.close(); micCtx = null; }
  $('meter').style.width = 0; $('micOff').disabled = true; $('micOn').disabled = false;
}
STOPPERS.mic = micStop;
$('micOn').onclick = async () => {
  try{
    if(noMedia() || !AC) throw new Error('Microphone needs HTTPS and a modern browser.');
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); micCtx = new AC(); if(micCtx.state === 'suspended') micCtx.resume();
    const an = micCtx.createAnalyser(); an.fftSize = 1024; micCtx.createMediaStreamSource(micStream).connect(an);
    const buf = new Float32Array(an.fftSize), tr = micStream.getAudioTracks()[0], s = tr.getSettings(); peak = -100;
    const loop = () => {
      an.getFloatTimeDomainData(buf); const rms = Math.sqrt(buf.reduce((a, b) => a + b * b, 0) / buf.length), db = 20 * Math.log10(rms || 1e-6); peak = Math.max(peak, db);
      if(peak > -40 && !(R.mic && R.mic.done)) mark('mic', 'Picked up sound, peak ' + peak.toFixed(0) + ' dB');
      $('meter').style.width = Math.max(0, Math.min(100, (db + 60) / 60 * 100)) + '%';
      $('micInfo').innerHTML = kv({ Name: tr.label, Level: db.toFixed(1) + ' dB', Peak: peak.toFixed(1) + ' dB', 'Sample rate': micCtx.sampleRate + ' Hz', Channels: s.channelCount || 'n/a', 'Noise suppression': s.noiseSuppression });
      micRaf = requestAnimationFrame(loop);
    }; loop(); $('micOff').disabled = false; $('micOn').disabled = true;
  }catch(e){ $('micInfo').innerHTML = kv({ Error: e.name + ': ' + e.message }); }
};
$('micOff').onclick = micStop;

// ---------- Speakers ----------
let actx = null, cur = null; const spkHeard = new Set();
function stopTone(){ if(cur){ try{ cur.stop(); }catch(e){} cur = null; } }
function play(pan, sweep){
  try{
    if(!AC) throw new Error('Web Audio is not supported in this browser.'); actx = actx || new AC(); if(actx.state === 'suspended') actx.resume(); stopTone();
    const c = actx, o = c.createOscillator(), g = c.createGain(), v = +$('vol').value, t = c.currentTime, d = sweep ? 4 : 1.2;
    if(sweep){ o.frequency.setValueAtTime(100, t); o.frequency.exponentialRampToValueAtTime(10000, t + d); } else o.frequency.value = +$('freq').value;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .03); g.gain.setValueAtTime(v, t + d - .05); g.gain.linearRampToValueAtTime(0, t + d); o.connect(g);
    if(c.createStereoPanner){ const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(c.destination); }
    else { const m = c.createChannelMerger(2); if(pan <= 0) g.connect(m, 0, 0); if(pan >= 0) g.connect(m, 0, 1); m.connect(c.destination); }
    o.start(t); o.stop(t + d); cur = o; o.onended = () => { if(cur === o) cur = null; };
    spkHeard.add(sweep ? 'sweep' : pan); if(spkHeard.has(-1) && spkHeard.has(1)) mark('speakers', 'Left and right channels played' + (spkHeard.has('sweep') ? ', sweep run' : ''));
    $('spkNote').textContent = sweep ? 'Sweeping 100 Hz to 10 kHz. Listen for rattles, buzzing or dropouts.' : 'If you hear nothing, raise the media volume and check silent mode.';
  }catch(e){ $('spkNote').textContent = 'Could not play sound: ' + e.message; }
}
document.querySelectorAll('[data-pan]').forEach(b => b.onclick = () => play(+b.dataset.pan, false));
$('sweep').onclick = () => play(0, true); $('stopTone').onclick = stopTone;

// ---------- Vibration ----------
const VIB = { short: [200], long: [1000], sos: [100, 100, 100, 100, 100, 100, 300, 100, 300, 100, 300, 100, 100, 100, 100, 100, 100], heart: [80, 80, 160, 600, 80, 80, 160] };
document.querySelectorAll('[data-vib]').forEach(b => b.onclick = () => {
  if(!navigator.vibrate){ $('vibNote').textContent = 'Vibration is not supported in this browser.'; return; }
  const ok = navigator.vibrate(VIB[b.dataset.vib]); $('vibAsk').hidden = false;
  $('vibNote').textContent = ok ? 'Vibrating. Did you feel it?' : 'The browser refused to vibrate. Check silent mode and battery saver.';
});
$('vibStop').onclick = () => navigator.vibrate && navigator.vibrate(0);
$('vibYes').onclick = () => { mark('vibration', 'Felt the vibration'); $('vibAsk').hidden = true; $('vibNote').textContent = 'Stamped.'; };
$('vibNo').onclick = () => { mark('vibration', 'Did not feel vibration (check silent mode, haptics and battery saver)', true); $('vibAsk').hidden = true; $('vibNote').textContent = 'Marked for attention.'; };

// ---------- Motion sensors ----------
let motionOn = false, shakes = 0, lastShake = 0, lastDraw = 0, seenAcc = false, seenGyro = false;
function motionStop(){ if(!motionOn) return; motionOn = false; removeEventListener('devicemotion', onMotion); $('motionOn').disabled = false; $('motionOff').disabled = true; }
STOPPERS.motion = motionStop;
function onMotion(e){
  const a = e.accelerationIncludingGravity, l = e.acceleration, r = e.rotationRate, now = Date.now(), has = o => o && o.x != null;
  if(has(l) && Math.hypot(l.x, l.y, l.z) > 15 && now - lastShake > 500){ shakes++; lastShake = now; }
  const acc = has(a), gyro = !!(r && r.alpha != null);
  if((acc && !seenAcc) || (gyro && !seenGyro)){ seenAcc = seenAcc || acc; seenGyro = seenGyro || gyro; mark('motion', seenGyro ? 'Accelerometer and gyroscope respond' : 'Accelerometer responds, no gyroscope data', !seenGyro); }
  if(now - lastDraw < 100) return; lastDraw = now; const f = n => (n == null ? 0 : n).toFixed(2);
  $('motionInfo').innerHTML = kv({ 'Accelerometer X / Y / Z (m/s²)': acc ? `${f(a.x)} / ${f(a.y)} / ${f(a.z)}` : 'no data', 'Total force': acc ? (Math.hypot(a.x, a.y, a.z) / 9.81).toFixed(2) + ' g (about 1.00 at rest)' : 'no data',
    'Gyroscope α / β / γ (°/s)': gyro ? `${f(r.alpha)} / ${f(r.beta)} / ${f(r.gamma)}` : 'no data', 'Shakes counted': shakes });
}
$('motionOn').onclick = async () => {
  try{
    if(!window.DeviceMotionEvent) throw new Error('Motion sensors are not supported in this browser.');
    if(DeviceMotionEvent.requestPermission){ if(await DeviceMotionEvent.requestPermission() !== 'granted') throw new Error('Permission was denied.'); }
    if(motionOn) return; motionOn = true; shakes = 0; seenAcc = seenGyro = false; addEventListener('devicemotion', onMotion); $('motionOn').disabled = true; $('motionOff').disabled = false;
    $('motionInfo').innerHTML = kv({ Status: 'Waiting for sensor data… move the phone.' });
  }catch(e){ $('motionInfo').innerHTML = kv({ Error: e.message }); }
};
$('motionOff').onclick = motionStop;

// ---------- Compass & level ----------
let compOn = false, compTimer = 0, compMarked = false;
const compEvent = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function compStop(){ if(!compOn) return; compOn = false; clearTimeout(compTimer); removeEventListener(compEvent, onOri); $('compOn').disabled = false; $('compOff').disabled = true; }
STOPPERS.compass = compStop;
function onOri(e){
  clearTimeout(compTimer);
  let h = null; if(e.webkitCompassHeading != null) h = e.webkitCompassHeading; else if(e.alpha != null && (e.absolute || compEvent === 'deviceorientationabsolute')) h = (360 - e.alpha) % 360;
  const beta = e.beta || 0, gamma = e.gamma || 0, flat = Math.abs(beta) < 2 && Math.abs(gamma) < 2, clamp = v => Math.max(-30, Math.min(30, v));
  if(h != null) $('dial').style.transform = `rotate(${-h}deg)`;
  $('bubble').style.transform = `translate(${clamp(gamma) * 2.4}px,${clamp(beta) * 2.4}px)`; $('bubble').parentNode.classList.toggle('flat', flat);
  $('compInfo').innerHTML = kv({ Heading: h != null ? `${Math.round(h)}° ${DIRS[Math.round(h / 45) % 8]}` : 'No compass heading', 'Tilt front/back (β)': beta.toFixed(1) + '°', 'Tilt left/right (γ)': gamma.toFixed(1) + '°', Level: flat ? 'Flat' : 'Tilted' });
  if(!compMarked){ compMarked = true; if(h != null) mark('compass', `Compass works, heading ${Math.round(h)}°`); else mark('compass', 'Tilt works but no compass heading (no magnetometer data)', true); }
}
$('compOn').onclick = async () => {
  try{
    if(!window.DeviceOrientationEvent) throw new Error('Orientation sensors are not supported in this browser.');
    if(DeviceOrientationEvent.requestPermission){ if(await DeviceOrientationEvent.requestPermission() !== 'granted') throw new Error('Permission was denied.'); }
    if(compOn) return; compOn = true; compMarked = false; addEventListener(compEvent, onOri); $('compOn').disabled = true; $('compOff').disabled = false; $('compNote').textContent = 'Waiting for the compass…';
    compTimer = setTimeout(() => { $('compNote').textContent = 'No sensor data arrived. This phone may lack a compass, or the browser blocked sensors.'; }, 2500);
  }catch(e){ $('compNote').textContent = e.message; }
};
$('compOff').onclick = compStop;

// ---------- GPS ----------
let gpsId = null;
function gpsStop(){ if(gpsId != null && navigator.geolocation) navigator.geolocation.clearWatch(gpsId); gpsId = null; $('gpsStop').disabled = true; }
STOPPERS.gps = gpsStop;
function gpsShow(p, ms){
  const c = p.coords;
  $('gpsInfo').innerHTML = kv({ Latitude: c.latitude.toFixed(5), Longitude: c.longitude.toFixed(5), Accuracy: '± ' + Math.round(c.accuracy) + ' m', Altitude: c.altitude != null ? Math.round(c.altitude) + ' m' : 'n/a',
    Speed: c.speed != null ? (c.speed * 3.6).toFixed(1) + ' km/h' : 'n/a', Heading: c.heading != null && !isNaN(c.heading) ? Math.round(c.heading) + '°' : 'n/a', 'Time to first fix': ms ? (ms / 1000).toFixed(1) + ' s' : '-' });
}
const gpsErr = e => $('gpsNote').textContent = ['', 'Location permission was denied. Allow it in the browser and try again.', 'Location is unavailable. Turn on location services and go outside or near a window.', 'Timed out. Try again near a window or outside.'][e.code] || ('Location error: ' + e.message);
$('gpsFind').onclick = () => {
  if(!navigator.geolocation){ $('gpsNote').textContent = 'Location is not supported in this browser.'; return; }
  const t0 = performance.now(); $('gpsNote').textContent = 'Looking for your location… this can take up to 25 seconds.';
  navigator.geolocation.getCurrentPosition(p => {
    const ms = performance.now() - t0, acc = Math.round(p.coords.accuracy); gpsShow(p, ms);
    $('gpsNote').textContent = acc <= 20 ? 'Excellent fix.' : acc <= 100 ? 'Usable fix. Go outside for a sharper one.' : 'Weak fix. You are probably indoors, or location is set to low accuracy.';
    mark('gps', `Fix in ${(ms / 1000).toFixed(1)} s, accuracy ± ${acc} m`, acc > 100);
  }, gpsErr, { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
};
$('gpsTrack').onclick = () => {
  if(!navigator.geolocation){ $('gpsNote').textContent = 'Location is not supported in this browser.'; return; } gpsStop();
  $('gpsNote').textContent = 'Tracking. Walk around and watch the speed and accuracy update.'; $('gpsStop').disabled = false;
  gpsId = navigator.geolocation.watchPosition(p => gpsShow(p), gpsErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 });
};
$('gpsStop').onclick = gpsStop;

// ---------- Battery ----------
let batObj = null, batBound = false, batSamples = [];
async function battery(){
  if(!navigator.getBattery){ $('batInfo').innerHTML = kv({ Status: 'Battery info is not supported in this browser. Use Chrome on Android.' }); return; }
  try{ batObj = batObj || await navigator.getBattery(); }catch(e){ $('batInfo').innerHTML = kv({ Status: 'Battery info is blocked: ' + e.message }); return; }
  if(!batBound){ ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach(ev => batObj.addEventListener(ev, batDraw)); batBound = true; batSamples = []; }
  batDraw();
}
function batDraw(){
  const b = batObj, lvl = Math.round(b.level * 100), last = batSamples[batSamples.length - 1];
  if(last && last.c !== b.charging) batSamples = []; if(!batSamples.length || batSamples[batSamples.length - 1].l !== lvl) batSamples.push({ t: Date.now(), l: lvl, c: b.charging });
  let rate = null; if(batSamples.length >= 2){ const f = batSamples[0], l = batSamples[batSamples.length - 1], h = (l.t - f.t) / 3600e3; if(h >= .02 && l.l !== f.l) rate = (l.l - f.l) / h; }
  const mins = t => isFinite(t) ? Math.round(t / 60) + ' min' : '-';
  const o = { Level: lvl + '%', Charging: b.charging ? 'Yes' : 'No', 'Time to full': b.charging ? mins(b.chargingTime) : '-', 'Time remaining': !b.charging ? mins(b.dischargingTime) : '-' };
  if(rate != null){ if(b.charging) o['Charging speed'] = '+' + rate.toFixed(0) + '% per hour'; else { o['Drain'] = (-rate).toFixed(0) + '% per hour'; if(rate < 0) o['Estimated life'] = (lvl / -rate).toFixed(1) + ' h at this rate'; } }
  $('batInfo').innerHTML = kv(o);
  $('batNote').textContent = rate == null ? 'Keep this page open for a few minutes to measure charging speed or drain. The level changes in 1% steps.' : '';
  const drain = rate != null && !b.charging ? -rate : 0, low = lvl < 20 && !b.charging;
  mark('battery', `${lvl}% ${b.charging ? 'charging' : 'on battery'}${low ? ' (low)' : ''}${rate != null ? (b.charging ? ', +' : ', drains ') + Math.abs(rate).toFixed(0) + '%/h' : ''}`, low || drain > 25);
}

// ---------- Network speed ----------
const SPEED = 'https://speed.cloudflare.com', SIZES = { quick: { dl: 5e6, ul: 1e6, secs: 6 }, full: { dl: 25e6, ul: 4e6, secs: 10 } };
let netCtl = null;
const onCell = () => !!(navigator.connection && navigator.connection.type === 'cellular');
function netInfo(){
  const c = navigator.connection || {};
  $('netInfo').innerHTML = kv({ Online: navigator.onLine ? 'Yes' : 'No', 'Connection type': c.type || 'n/a (Chrome on Android only)', 'Speed class': c.effectiveType || 'n/a', 'Browser estimate': c.downlink ? `${c.downlink} Mbps, ${c.rtt} ms` : 'n/a', 'Data saver': c.saveData ? 'On' : 'Off' });
  if(onCell()) $('netNote').textContent = 'You are on mobile data. The test will use some of your data plan.';
}
async function netPing(ctl){
  const t = []; for(let i = 0; i < 9; i++){ const s = performance.now(); await fetch(`${SPEED}/__down?bytes=0&r=${Math.random()}`, { cache: 'no-store', signal: ctl.signal }); t.push(performance.now() - s); }
  t.shift(); const sorted = [...t].sort((x, y) => x - y); return { ping: sorted[Math.floor(sorted.length / 2)], jitter: t.slice(1).reduce((s, v, i) => s + Math.abs(v - t[i]), 0) / (t.length - 1) };
}
async function netDown(ctl, z, onProg){
  const t0 = performance.now(), stop = new AbortController(); let bytes = 0; const abort = () => stop.abort(); ctl.signal.addEventListener('abort', abort); const timer = setTimeout(abort, z.secs * 1000);
  const worker = async () => { try{ const r = await fetch(`${SPEED}/__down?bytes=${z.dl}&r=${Math.random()}`, { cache: 'no-store', signal: stop.signal }), rd = r.body.getReader();
    for(;;){ const { done, value } = await rd.read(); if(done) break; bytes += value.length; onProg(mbps(bytes, t0)); } }catch(e){ if(e.name !== 'AbortError') throw e; } };
  try{ await Promise.all([worker(), worker(), worker()]); } finally { clearTimeout(timer); ctl.signal.removeEventListener('abort', abort); }
  if(ctl.signal.aborted) throw new DOMException('Stopped', 'AbortError'); return mbps(bytes, t0);
}
async function netUp(ctl, z, onProg){
  const buf = new Uint8Array(z.ul); for(let i = 0; i < buf.length; i += 65536) crypto.getRandomValues(buf.subarray(i, Math.min(i + 65536, buf.length)));
  const t0 = performance.now(), cap = 4 * z.ul; let sent = 0;
  const worker = async () => { while(!ctl.signal.aborted && sent < cap && performance.now() - t0 < z.secs * 1000){ await fetch(`${SPEED}/__up`, { method: 'POST', body: buf, cache: 'no-store', signal: ctl.signal }); sent += buf.length; onProg(mbps(sent, t0)); } };
  await Promise.all([worker(), worker()]); if(!sent) throw new Error('Upload was too slow to measure'); return mbps(sent, t0);
}
const verdict = (d, u, p) => d >= 25 && u >= 5 && p < 80 ? 'Fast enough for 4K streaming and video calls.' : d >= 5 && u >= 1.5 ? 'Fine for HD video and calls.' : 'On the slow side: video calls and streaming may stutter.';
$('netStart').onclick = async () => {
  if(!navigator.onLine){ $('netNote').textContent = 'You appear to be offline.'; return; }
  if(onCell() && $('netSize').value === 'full' && !confirm('You are on mobile data. The full test can use up to about 100 MB. Continue?')) return;
  const z = SIZES[$('netSize').value], ctl = netCtl = new AbortController(), bar = p => $('netBar').style.width = p + '%', res = {};
  ['nDown', 'nUp', 'nPing', 'nJit'].forEach(i => $(i).textContent = '–'); $('netStart').disabled = true; $('netStop').disabled = false;
  try{
    $('netNote').textContent = 'Measuring latency…'; bar(5); const p = await netPing(ctl); res.ping = Math.round(p.ping); $('nPing').textContent = res.ping; $('nJit').textContent = p.jitter.toFixed(1);
    $('netNote').textContent = 'Testing download…'; bar(30); res.down = +(await netDown(ctl, z, v => $('nDown').textContent = v.toFixed(1))).toFixed(1); $('nDown').textContent = res.down;
    $('netNote').textContent = 'Testing upload…'; bar(70); res.up = +(await netUp(ctl, z, v => $('nUp').textContent = v.toFixed(1))).toFixed(1); $('nUp').textContent = res.up;
    bar(100); $('netNote').textContent = 'Done. ' + verdict(res.down, res.up, res.ping);
    mark('network', `${res.down} Mbps down, ${res.up} Mbps up, ${res.ping} ms latency`, res.down < 5 || res.up < 1 || res.ping > 150);
  }catch(e){ $('netNote').textContent = e.name === 'AbortError' ? 'Stopped.' : 'Test failed: ' + e.message + '. The speed server may be blocked by your network or an extension.'; }
  $('netStart').disabled = false; $('netStop').disabled = true;
};
$('netStop').onclick = () => netCtl && netCtl.abort();
window.addEventListener('online', netInfo); window.addEventListener('offline', netInfo);

// ---------- Connection stability ----------
let sgCtl = null;
async function pingOnce(ctl){
  const to = new AbortController(), s = performance.now(), onAbort = () => to.abort(), timer = setTimeout(() => to.abort(), 3000); ctl.signal.addEventListener('abort', onAbort);
  try{ await fetch(`${SPEED}/__down?bytes=0&r=${Math.random()}`, { mode: 'no-cors', cache: 'no-store', signal: to.signal }); return performance.now() - s; }
  catch(e){ return null; } finally { clearTimeout(timer); ctl.signal.removeEventListener('abort', onAbort); }
}
function sgStats(sm){
  const ok = sm.filter(v => v != null), sorted = [...ok].sort((x, y) => x - y), med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  return { n: sm.length, ok: ok.length, avg: ok.length ? ok.reduce((x, y) => x + y, 0) / ok.length : 0, worst: ok.length ? Math.max(...ok) : 0, loss: sm.length ? (sm.length - ok.length) / sm.length * 100 : 0, spikes: ok.filter(v => v > Math.max(200, 3 * med)).length };
}
function sgDraw(sm, total){
  const cv = $('sgGraph'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 320, H = 200; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext && cv.getContext('2d'); if(!g) return; g.scale(dpr, dpr);
  const ok = sm.filter(v => v != null), top = Math.max(100, ...ok) * 1.1, L = 40, y = v => H - 16 - (v / top) * (H - 30), x = i => L + i * (W - L - 8) / Math.max(total - 1, 1);
  g.font = '11px sans-serif'; g.fillStyle = css('--mute'); g.strokeStyle = css('--contour'); g.lineWidth = 1;
  [0, .5, 1].forEach(f => { const v = top * f; g.beginPath(); g.moveTo(L, y(v)); g.lineTo(W - 8, y(v)); g.stroke(); g.fillText(Math.round(v) + ' ms', 2, y(v) + 4); });
  g.strokeStyle = css('--flare'); g.lineWidth = 2; g.beginPath(); let pen = false;
  sm.forEach((v, i) => { if(v == null){ pen = false; return; } pen ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)); pen = true; }); g.stroke();
  g.fillStyle = css('--bad'); sm.forEach((v, i) => { if(v == null) g.fillRect(x(i) - 2, H - 14, 4, 12); });
}
$('sgStart').onclick = async () => {
  if(!navigator.onLine){ $('sgNote').textContent = 'You appear to be offline.'; return; }
  const total = +$('sgLen').value * 2, sm = [], ctl = sgCtl = new AbortController(); let dead = false;
  $('sgStart').disabled = true; $('sgStop').disabled = false; $('sgNote').textContent = 'Measuring… walk around to compare spots.';
  while(sm.length < total && !ctl.signal.aborted){
    const s = performance.now(), v = await pingOnce(ctl); if(ctl.signal.aborted) break; sm.push(v); const st = sgStats(sm);
    $('gAvg').textContent = st.avg.toFixed(0); $('gWorst').textContent = st.worst.toFixed(0); $('gLoss').textContent = st.loss.toFixed(1); $('gSpk').textContent = st.spikes; sgDraw(sm, total);
    if(sm.length >= 5 && st.ok === 0){ dead = true; break; } const wait = 500 - (performance.now() - s); if(wait > 0) await sleep(wait);
  }
  if(dead) $('sgNote').textContent = 'No replies at all. Check your connection, or the ping server may be blocked.';
  else if(sm.length >= total){
    const st = sgStats(sm), spk = st.spikes / st.n, stable = st.loss === 0 && spk < .03, mostly = st.loss <= 2 && spk < .1, slow = st.avg > 150;
    $('sgNote').textContent = stable && slow ? 'Steady but slow: delays above 150 ms make calls and games laggy.' : stable ? 'Stable: no lost replies and almost no lag spikes.' : mostly ? 'Mostly stable, with some lag spikes.' : 'Unstable: expect stuttering calls. Move closer to the router or to better signal.';
    mark('signal', `${st.avg.toFixed(0)} ms average, ${st.worst.toFixed(0)} ms worst, ${st.loss.toFixed(1)}% lost, ${st.spikes} spikes`, !stable || slow);
  } else $('sgNote').textContent = 'Stopped.';
  $('sgStart').disabled = false; $('sgStop').disabled = true;
};
$('sgStop').onclick = () => sgCtl && sgCtl.abort();

// ---------- Bluetooth & NFC ----------
$('btScan').onclick = async () => {
  if(!navigator.bluetooth){ $('btInfo').innerHTML = kv({ Status: 'Web Bluetooth is not supported here. Use Chrome on Android.' }); return; }
  try{
    const d = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['battery_service'] }), o = { Name: d.name || '(unnamed)', ID: d.id }; $('btInfo').innerHTML = kv(o);
    try{ const s = await d.gatt.connect(), b = await (await s.getPrimaryService('battery_service')).getCharacteristic('battery_level'); o.Battery = (await b.readValue()).getUint8(0) + '%'; d.gatt.disconnect(); }
    catch(e){ o.Battery = 'not shared by this device'; } $('btInfo').innerHTML = kv(o); mark('wireless', 'Bluetooth device found: ' + (d.name || 'unnamed'));
  }catch(e){ $('btInfo').innerHTML = kv({ Status: 'Cancelled or blocked: ' + e.message }); }
};
$('nfcScan').onclick = async () => {
  if(!('NDEFReader' in window)){ $('nfcInfo').innerHTML = kv({ Status: 'Web NFC is not supported here. Use Chrome on Android with NFC turned on.' }); return; }
  try{
    const r = new NDEFReader(); await r.scan(); $('nfcInfo').innerHTML = kv({ Status: 'Hold an NFC tag against the back of the phone…' });
    r.onreading = e => { $('nfcInfo').innerHTML = kv({ 'Tag serial': e.serialNumber || 'n/a', Records: [...e.message.records].map(x => x.recordType).join(', ') || 'empty' }); mark('wireless', 'NFC tag read'); };
    r.onreadingerror = () => $('nfcInfo').innerHTML = kv({ Status: 'Could not read this tag. Hold it steady or try another.' });
  }catch(e){ $('nfcInfo').innerHTML = kv({ Status: 'NFC unavailable: ' + e.message + ' (check that NFC is turned on)' }); }
};

// ---------- System ----------
async function system(){
  const ua = navigator.userAgentData; let hi = {}; try{ hi = ua ? await ua.getHighEntropyValues(['model', 'platformVersion']) : {}; }catch(e){}
  let gpu = 'n/a'; try{ const gl = document.createElement('canvas').getContext('webgl'), x = gl.getExtension('WEBGL_debug_renderer_info'); gpu = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }catch(e){}
  const brands = ua && ua.brands ? ua.brands.filter(b => !/not.?a.?brand/i.test(b.brand)).map(b => b.brand + ' ' + b.version).join(', ') : ((navigator.userAgent.match(/(Edg|Chrome|Firefox|Version)\/[\d.]+/) || [])[0] || 'n/a');
  const os = ua && ua.platform ? ua.platform + (hi.platformVersion ? ' ' + hi.platformVersion : '') : (navigator.platform || 'n/a');
  const o = { 'Phone model': hi.model || 'Hidden by the browser', 'Operating system': os, Browser: brands, 'CPU threads': navigator.hardwareConcurrency || 'n/a', 'Memory (rounded)': navigator.deviceMemory ? 'at least ' + navigator.deviceMemory + ' GB' : 'n/a',
    Graphics: gpu, 'Screen (physical px)': `${Math.round(screen.width * (devicePixelRatio || 1))} × ${Math.round(screen.height * (devicePixelRatio || 1))}`, Language: navigator.language, 'Time zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    'Installed as app': mq('(display-mode: standalone)') ? 'Yes' : 'No', 'Dark mode': mq('(prefers-color-scheme: dark)') ? 'On' : 'Off' };
  try{ const e = await navigator.storage.estimate(); o['Storage this site may use'] = `${(e.usage / 1e6).toFixed(1)} MB used of ${(e.quota / 1e9).toFixed(1)} GB allowed (a browser limit, not free space)`; }catch(e){}
  try{ o['Screen lock / biometrics'] = window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ? ((await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) ? 'Available (fingerprint, face or screen lock)' : 'Not available') : 'n/a'; }catch(e){}
  for(const n of ['camera', 'microphone', 'geolocation', 'notifications']){ try{ o[n[0].toUpperCase() + n.slice(1) + ' permission'] = (await navigator.permissions.query({ name: n })).state; }catch(e){} }
  $('sysInfo').innerHTML = kv(o);
  const sup = [['Motion sensors', !!window.DeviceMotionEvent], ['Orientation / compass', !!window.DeviceOrientationEvent], ['GPS / location', !!navigator.geolocation], ['Vibration', !!navigator.vibrate], ['Battery info', !!navigator.getBattery],
    ['Flashlight control', !!(window.ImageCapture || (navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints && navigator.mediaDevices.getSupportedConstraints().torch))], ['Bluetooth', !!navigator.bluetooth], ['NFC', 'NDEFReader' in window],
    ['Keep screen on', !!navigator.wakeLock], ['Share sheet', !!navigator.share], ['Notifications', 'Notification' in window]];
  $('supInfo').innerHTML = sup.map(([k, v]) => `<li><span>${k}</span><span class="${v ? 'ok' : 'no'}">${v ? 'Supported' : 'Not available'}</span></li>`).join('');
  mark('system', `${o['Phone model']}, ${o['Operating system']}, ${o['CPU threads']} threads`);
}

// ---------- Report ----------
function repSummary(){
  const done = CHECKS.filter(id => R[id] && R[id].done), warns = done.filter(id => R[id].warn).map(id => NAME[id]);
  $('repSum').textContent = `${done.length} of ${CHECKS.length} checks done.` + (warns.length ? ' Needs attention: ' + warns.join(', ') + '.' : done.length ? ' Nothing needs attention.' : '');
}
function report(){
  repSummary(); $('repShare').hidden = !navigator.share;
  $('repList').innerHTML = TESTS.map(([id, n]) => { const r = R[id], ok = r && r.done;
    return `<li><span>${esc(n)}</span><span class="chip ${ok ? (r.warn ? 'warn' : 'ok') : 'no'}">${status(id)}</span><span>${ok ? esc(r.detail) : ''}</span></li>`; }).join('');
}
const repText = () => ['Phone Lab report', new Date().toLocaleString(), ''].concat(TESTS.map(([id, n]) => `${n}: ${R[id] && R[id].done ? status(id) + ' - ' + R[id].detail : status(id)}`)).join('\n');
function save(name, type, text){ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); }
$('repTxt').onclick = () => save('phone-report.txt', 'text/plain', repText());
$('repJson').onclick = () => save('phone-report.json', 'application/json', JSON.stringify({ date: new Date().toISOString(), results: R }, null, 2));
$('repCopy').onclick = async () => { try{ await navigator.clipboard.writeText(repText()); $('repMsg').textContent = 'Copied to the clipboard.'; }catch(e){ $('repMsg').textContent = 'Copy was blocked. Use Download instead.'; } };
$('repShare').onclick = async () => { try{ await navigator.share({ title: 'Phone Lab report', text: repText() }); }catch(e){} };
$('repClear').onclick = () => { R = {}; try{ localStorage.removeItem('pl-results'); }catch(e){} paint(); report(); $('repMsg').textContent = 'Results cleared.'; };

// ---------- Guided run ----------
let tour = -1;
function tourShow(){
  if(tour < 0){ $('tour').hidden = true; return; } const id = CHECKS[tour]; $('tour').hidden = false;
  $('tourText').textContent = `${NAME[id]} (${tour + 1} of ${CHECKS.length})`; $('tourNext').textContent = tour === CHECKS.length - 1 ? 'Finish' : 'Next check'; go(id);
}
$('tourStart').onclick = () => { tour = 0; tourShow(); };
$('tourNext').onclick = () => { if(tour >= CHECKS.length - 1){ tour = -1; tourShow(); go('report'); } else { tour++; tourShow(); } };
$('tourExit').onclick = () => { tour = -1; tourShow(); };

// ---------- Offline support and start ----------
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
paint();
go(pages.some(p => p.dataset.page === location.hash.slice(1)) ? location.hash.slice(1) : 'home');

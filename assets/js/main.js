/* Siddhanth Kartik Mani — portfolio script.
   Kept in its own file so the page can run under a strict Content Security Policy. */
(() => {
'use strict';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
document.getElementById('yr').textContent = new Date().getFullYear();
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;

/* ---------- theme toggle ---------- */
const listeners = [];
const themeBtn = document.getElementById('themeBtn');
function syncThemeLabel(){ themeBtn.setAttribute('aria-pressed', String(isDark())); }
themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
  syncThemeLabel(); listeners.forEach(f => f());
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { syncThemeLabel(); listeners.forEach(f => f()); });
syncThemeLabel();

/* ---------- pinned story chapters ---------- */
const story = document.getElementById('story');
const chaps = [...document.querySelectorAll('.chap')];
const dots = [...document.querySelectorAll('#dots button')];
const hint = document.getElementById('hint');
let progress = 0;

function storyProgress(){
  const r = story.getBoundingClientRect();
  const total = story.offsetHeight - innerHeight;
  return total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) * (chaps.length - 1) : 0;
}
function updateChapters(){
  progress = storyProgress();
  chaps.forEach((c, i) => {
    // fade out completely before the next chapter fades in (no overlapping text mid-scroll)
    const d = progress - i, w = Math.max(0, 1 - Math.abs(d) * 2.6);
    c.style.opacity = w;
    c.style.transform = `translateY(${-d * 50}px)`;
    c.classList.toggle('on', w > .5);
    c.setAttribute('aria-hidden', String(w < .5));
  });
  const cur = Math.round(progress);
  dots.forEach((d, i) => { d.classList.toggle('on', i === cur); d.setAttribute('aria-current', i === cur ? 'step' : 'false'); });
  hint.style.opacity = progress > .3 ? 0 : 1;
}
dots.forEach((d, i) => d.addEventListener('click', () => {
  const total = story.offsetHeight - innerHeight;
  scrollTo({ top: story.offsetTop + total * i / (chaps.length - 1), behavior: reduce ? 'auto' : 'smooth' });
}));
addEventListener('scroll', updateChapters, { passive: true });
addEventListener('resize', updateChapters);
updateChapters();

/* =====================================================================
   SCREEN CONTENT — five animated "apps" drawn on a canvas
   ===================================================================== */
const SW = 1024, SH = 640;
const MONO = '"SF Mono", ui-monospace, Menlo, Consolas, monospace';
const UI = '-apple-system, "Segoe UI", Inter, Helvetica, Arial, sans-serif';
const ACCENTS = ['#0a84ff', '#30d158', '#bf5af2', '#ff9f0a', '#ff375f'];
const TITLES  = ['failover.py — Code', 'System Monitor', 'Terminal — zsh', 'Nexus AI', 'Tap Reflex'];
const ease = x => 1 - Math.pow(1 - x, 3);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const rnd = k => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function rr(c, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function chrome(c, title, accent){
  c.fillStyle = '#1c1c1f'; c.fillRect(0, 0, SW, 44);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(24 + i * 22, 22, 6.5, 0, 7); c.fill(); });
  c.fillStyle = '#9a9aa2'; c.font = `500 15px ${UI}`; c.textAlign = 'center'; c.fillText(title, SW / 2, 27); c.textAlign = 'left';
  c.fillStyle = accent; c.globalAlpha = .9; c.fillRect(0, 43, SW, 1); c.globalAlpha = 1;
}
function wrap(c, text, maxW){
  const words = text.split(' '), out = []; let line = '';
  for (const w of words){ const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line){ out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

/* ---- 0: code editor (types real code, runs tests) ---- */
const CODE = [
  'from providers import gemini, groq, openrouter',
  '',
  'PROVIDERS = [gemini, groq, openrouter]',
  '',
  'def ask(prompt: str) -> str:',
  '    """Try each model until one answers."""',
  '    for provider in PROVIDERS:',
  '        try:',
  '            reply = provider.chat(prompt, timeout=8)',
  '            log.info("answered by %s", provider.name)',
  '            return reply',
  '        except TimeoutError:',
  '            log.warning("%s timed out", provider.name)',
  '            continue',
  '    raise RuntimeError("all providers down")',
  '',
  'def test_failover(monkeypatch):',
  '    monkeypatch.setattr(gemini, "chat", too_slow)',
  '    assert ask("hello") == "hi there"',
];
const KW = /^(def|return|for|in|try|except|raise|import|from|assert|class|if|else|None|True|False|continue|with|as)$/;
function tokens(line){
  const out = []; const re = /(#.*$)|("[^"]*"?|'[^']*'?)|(\b\d+\b)|([A-Za-z_]\w*)|(\s+)|(.)/g; let m;
  while ((m = re.exec(line))){
    let col = '#d4d4d8';
    if (m[1]) col = '#6a737d'; else if (m[2]) col = '#a5d6a7'; else if (m[3]) col = '#ffb86c';
    else if (m[4]){ if (KW.test(m[4])) col = '#ff7ab2'; else if (line[re.lastIndex] === '(') col = '#79b8ff'; else if (/^[A-Z_]+$/.test(m[4])) col = '#ffd479'; }
    out.push([m[0], col]);
  }
  return out;
}
const CODE_TOK = CODE.map(tokens);
const CODE_LEN = CODE.map(l => l.length + 1);
const CODE_TOTAL = CODE_LEN.reduce((a, b) => a + b, 0);
const CPS = 42, CODE_LOOP = CODE_TOTAL / CPS + 5;

function viewEditor(c, t, accent){
  c.fillStyle = '#121214'; c.fillRect(0, 0, SW, SH);
  chrome(c, TITLES[0], accent);
  // activity bar + explorer
  c.fillStyle = '#18181b'; c.fillRect(0, 44, 54, SH - 72);
  for (let i = 0; i < 4; i++){ c.fillStyle = i === 0 ? '#e4e4e7' : '#52525b'; rr(c, 17, 66 + i * 46, 20, 20, 5); c.fill(); }
  c.fillStyle = '#16161a'; c.fillRect(54, 44, 196, SH - 72);
  c.font = `600 12px ${UI}`; c.fillStyle = '#71717a'; c.fillText('EXPLORER', 72, 72);
  const files = [['▾ nexus-ai', 0], ['providers.py', 1], ['failover.py', 1], ['rag.py', 1], ['runner.py', 1], ['▾ tests', 0], ['test_failover.py', 1]];
  files.forEach(([f, ind], i) => {
    const y = 102 + i * 28;
    if (f === 'failover.py'){ c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(54, y - 18, 196, 26); }
    c.fillStyle = f === 'failover.py' ? '#fafafa' : '#a1a1aa'; c.font = `14px ${UI}`; c.fillText(f, 72 + ind * 16, y);
  });
  // tabs
  c.fillStyle = '#16161a'; c.fillRect(250, 44, SW - 250, 36);
  c.fillStyle = '#121214'; c.fillRect(250, 44, 150, 36); c.fillStyle = accent; c.fillRect(250, 44, 150, 2);
  c.fillStyle = '#e4e4e7'; c.font = `13px ${UI}`; c.fillText('failover.py', 272, 67); c.fillStyle = '#71717a'; c.fillText('test_failover.py', 422, 67);

  const lt = t % CODE_LOOP;
  let chars = Math.floor(lt * CPS), curLine = 0, curCol = 0;
  for (let i = 0; i < CODE.length; i++){ if (chars < CODE_LEN[i]){ curLine = i; curCol = chars; break; } chars -= CODE_LEN[i]; curLine = i; curCol = CODE_LEN[i] - 1; }
  const done = lt * CPS >= CODE_TOTAL;
  const LH = 27, top = 108, rows = 17;
  const scroll = Math.max(0, curLine - (rows - 4)) * LH;
  c.save(); c.beginPath(); c.rect(250, 80, SW - 340, SH - 108); c.clip();
  c.font = `15px ${MONO}`;
  for (let i = 0; i <= curLine; i++){
    const y = top + i * LH - scroll; if (y < 80 || y > SH) continue;
    c.fillStyle = i === curLine ? '#a1a1aa' : '#3f3f46'; c.textAlign = 'right'; c.fillText(String(i + 1), 296, y); c.textAlign = 'left';
    if (i === curLine && !done){ c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(250, y - 19, SW - 340, LH); }
    let x = 318, left = i < curLine || done ? Infinity : curCol;
    for (const [txt, col] of CODE_TOK[i]){
      if (left <= 0) break;
      const s = txt.slice(0, left); left -= txt.length;
      c.fillStyle = col; c.fillText(s, x, y); x += c.measureText(s).width;
    }
    if (i === curLine && !done && Math.floor(t * 2.2) % 2 === 0){ c.fillStyle = accent; c.fillRect(x + 1, y - 16, 2, 21); }
  }
  c.restore();
  // minimap
  c.fillStyle = '#16161a'; c.fillRect(SW - 90, 80, 90, SH - 108);
  for (let i = 0; i <= curLine; i++){ const w = Math.min(70, CODE[i].length * 1.4); c.fillStyle = '#3f3f46'; c.fillRect(SW - 80, 92 + i * 6, w, 3); }
  // status bar
  c.fillStyle = accent; c.fillRect(0, SH - 28, SW, 28);
  c.fillStyle = '#fff'; c.font = `600 13px ${UI}`; c.fillText('⎇ main', 16, SH - 9);
  c.fillText(done ? '✓ 24 passed' : '● editing', 110, SH - 9);
  c.textAlign = 'right'; c.fillText(`Ln ${curLine + 1}, Col ${curCol + 1}   Python 3.12`, SW - 16, SH - 9); c.textAlign = 'left';
  // test toast
  if (done){
    const p = ease(clamp((lt - CODE_TOTAL / CPS) / .5));
    const x = SW - 330, y = SH - 120 + (1 - p) * 30;
    c.globalAlpha = p; c.fillStyle = '#232327'; rr(c, x, y, 300, 70, 12); c.fill();
    c.fillStyle = '#30d158'; c.beginPath(); c.arc(x + 32, y + 35, 13, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = `700 15px ${UI}`; c.fillText('✓', x + 26, y + 41);
    c.font = `600 15px ${UI}`; c.fillText('All tests passed', x + 58, y + 31);
    c.fillStyle = '#a1a1aa'; c.font = `13px ${UI}`; c.fillText('24 passed in 1.8 s · ready to deploy', x + 58, y + 51);
    c.globalAlpha = 1;
  }
  fadeLoop(c, lt, CODE_LOOP);
}

/* ---- 1: IT system monitor (gauges, live network, devices) ---- */
function gauge(c, x, y, r, val, label, accent){
  c.lineWidth = 12; c.lineCap = 'round';
  c.strokeStyle = '#2a2a2e'; c.beginPath(); c.arc(x, y, r, Math.PI * .75, Math.PI * 2.25); c.stroke();
  c.strokeStyle = accent; c.beginPath(); c.arc(x, y, r, Math.PI * .75, Math.PI * (.75 + 1.5 * val / 100)); c.stroke();
  c.fillStyle = '#fafafa'; c.font = `700 30px ${UI}`; c.textAlign = 'center'; c.fillText(Math.round(val) + '%', x, y + 8);
  c.fillStyle = '#8e8e93'; c.font = `600 13px ${UI}`; c.fillText(label, x, y + 32); c.textAlign = 'left';
}
function viewMonitor(c, t, accent){
  c.fillStyle = '#101012'; c.fillRect(0, 0, SW, SH);
  chrome(c, TITLES[1], accent);
  const secs = Math.floor(t) % 60, mins = (34 + Math.floor(t / 60)) % 60;
  c.fillStyle = '#fafafa'; c.font = `700 22px ${UI}`; c.fillText('IT Admin Pro', 32, 86);
  c.fillStyle = '#8e8e93'; c.font = `14px ${UI}`; c.fillText('Live · Windows 11 · refreshed every second', 32, 108);
  c.textAlign = 'right'; c.font = `600 16px ${MONO}`; c.fillStyle = '#d4d4d8';
  c.fillText(`14:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, SW - 32, 92); c.textAlign = 'left';

  const cpu = 34 + 16 * Math.sin(t * .9) + 7 * Math.sin(t * 2.7);
  const ram = 57 + 4 * Math.sin(t * .35);
  const disk = 65 + .6 * Math.sin(t * .1);
  [[cpu, 'CPU'], [ram, 'MEMORY'], [disk, 'DISK']].forEach(([v, l], i) => {
    c.fillStyle = '#18181b'; rr(c, 32 + i * 196, 130, 182, 170, 16); c.fill();
    gauge(c, 123 + i * 196, 216, 52, v, l, v > 80 ? '#ff453a' : accent);
  });
  // network chart
  c.fillStyle = '#18181b'; rr(c, 32, 316, 574, 268, 16); c.fill();
  c.fillStyle = '#fafafa'; c.font = `600 15px ${UI}`; c.fillText('Network', 52, 346);
  const now = 18 + 9 * Math.sin(t * 1.3) + 5 * Math.sin(t * 3.1);
  c.fillStyle = '#8e8e93'; c.font = `13px ${UI}`; c.fillText(`↓ ${now.toFixed(1)} Mb/s   ↑ ${(now * .31).toFixed(1)} Mb/s`, 140, 346);
  const pts = [];
  for (let i = 0; i <= 60; i++){ const tt = t - (60 - i) * .12; pts.push([52 + i * 9, 560 - (18 + 9 * Math.sin(tt * 1.3) + 5 * Math.sin(tt * 3.1)) * 5.2]); }
  const g = c.createLinearGradient(0, 380, 0, 560); g.addColorStop(0, accent + '66'); g.addColorStop(1, accent + '00');
  c.beginPath(); c.moveTo(pts[0][0], 560); pts.forEach(p => c.lineTo(p[0], p[1])); c.lineTo(pts[60][0], 560); c.fillStyle = g; c.fill();
  c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.strokeStyle = accent; c.lineWidth = 2.5; c.stroke();
  // devices
  c.fillStyle = '#18181b'; rr(c, 622, 130, 370, 454, 16); c.fill();
  c.fillStyle = '#fafafa'; c.font = `600 15px ${UI}`; c.fillText('Devices', 642, 160);
  const flick = Math.floor(t / 4) % 6;
  const devs = [['Venue A · Camera 1', 'Online'], ['Venue A · Camera 2', 'Online'], ['Venue B · Camera 1', 'Online'], ['Venue B · Camera 2', 'Online'],
    ['Company website', '200 OK'], ['Office laptops', '12 / 12'], ['Backup', 'Done 02:00']];
  devs.forEach(([n, s], i) => {
    const y = 200 + i * 54, warn = i === flick && i < 4 && (t % 4) < 1.4;
    c.fillStyle = '#222226'; rr(c, 638, y - 22, 338, 44, 10); c.fill();
    c.fillStyle = warn ? '#ff9f0a' : '#30d158'; c.beginPath(); c.arc(660, y, 6, 0, 7); c.fill();
    c.fillStyle = '#e4e4e7'; c.font = `14px ${UI}`; c.fillText(n, 678, y + 5);
    c.fillStyle = warn ? '#ff9f0a' : '#8e8e93'; c.textAlign = 'right'; c.fillText(warn ? 'Reconnecting…' : s, 962, y + 5); c.textAlign = 'left';
  });
  c.fillStyle = '#8e8e93'; c.font = `13px ${UI}`; c.fillText('Uptime this month 99.98%', 642, 568);
}

/* ---- 2: terminal (builds, tests, compiles — endless stream) ---- */
const TERM = [
  ['$ ', 'git pull origin main'], ['', 'Already up to date.'],
  ['$ ', 'npm run build'], ['', 'vite v5.4.2 building for production…'], ['ok', '✓ 412 modules transformed.'],
  ['', 'dist/assets/app.js   142.18 kB │ gzip: 45.91 kB'], ['ok', '✓ built in 2.31s'],
  ['$ ', 'pytest -q'], ['ok', 'PASSED tests/test_auth.py::test_login'], ['ok', 'PASSED tests/test_router.py::test_failover'],
  ['ok', 'PASSED tests/test_rag.py::test_hybrid_search'], ['ok', 'PASSED tests/test_runner.py::test_timeout'], ['ok', '1000+ passed in 41.2s'],
  ['$ ', 'g++ -O2 marks.cpp -o marks && ./marks'], ['', 'Loaded 120 students · sorted by GPA'],
  ['$ ', 'javac Inventory.java && java Inventory'], ['', 'Relief stock report written → report.csv'],
  ['$ ', 'python verify_foundation.py --site nausori'], ['ok', '✓ pile capacity 1,240 kN ≥ design load 905 kN'],
  ['ok', '✓ settlement 18 mm < 25 mm limit'], ['', 'charts saved → out/settlement.png'],
];
function viewTerminal(c, t, accent){
  c.fillStyle = '#0d0d10'; c.fillRect(0, 0, SW, SH);
  chrome(c, TITLES[2], accent);
  const rate = 2.1, n = t * rate, whole = Math.floor(n), frac = ease(n - whole);
  const LH = 30, rows = 17, baseY = 80;
  c.save(); c.beginPath(); c.rect(0, 46, SW, SH - 46); c.clip();
  c.font = `16px ${MONO}`;
  for (let k = 0; k <= rows + 1; k++){
    const idx = whole - k; if (idx < 0) continue;
    const [kind, txt] = TERM[idx % TERM.length];
    const y = baseY + (rows - k) * LH + (1 - frac) * LH;
    let x = 28;
    if (kind === '$ '){ c.fillStyle = accent; c.fillText('siddhanth@lab', x, y); x += c.measureText('siddhanth@lab ').width; c.fillStyle = '#8e8e93'; c.fillText('~ %', x, y); x += c.measureText('~ % ').width; c.fillStyle = '#fafafa'; }
    else c.fillStyle = kind === 'ok' ? '#30d158' : '#a1a1aa';
    const shown = k === 0 ? txt.slice(0, Math.ceil(txt.length * clamp((n - whole) * 1.6))) : txt;
    c.fillText(shown, x, y);
    if (k === 0 && Math.floor(t * 2.4) % 2 === 0){ c.fillStyle = accent; c.fillRect(x + c.measureText(shown).width + 3, y - 15, 9, 19); }
  }
  c.restore();
  // progress footer
  const p = (t * .08) % 1;
  c.fillStyle = '#18181b'; c.fillRect(0, SH - 34, SW, 34);
  c.fillStyle = '#2a2a2e'; rr(c, 180, SH - 22, SW - 360, 8, 4); c.fill();
  c.fillStyle = accent; rr(c, 180, SH - 22, (SW - 360) * p, 8, 4); c.fill();
  c.fillStyle = '#a1a1aa'; c.font = `12px ${UI}`; c.fillText('CI · GitHub Actions', 28, SH - 13);
  c.textAlign = 'right'; c.fillText(Math.round(p * 100) + '%', SW - 28, SH - 13); c.textAlign = 'left';
}

/* ---- 3: Nexus AI chat (failover + streamed answers) ---- */
const CHAT = [
  { who: 'u', text: 'My laptop keeps dropping Wi-Fi. What should I check first?' },
  { who: 'a', text: 'Start simple: forget and re-join the network, update the Wi-Fi driver, then turn off power saving for the adapter in Device Manager. If it still drops, change the router channel to avoid interference.', note: 'gemini timed out · answered by groq' },
  { who: 'u', text: 'Summarise the attached support report.' },
  { who: 'a', text: 'Q3 summary: 214 tickets resolved, average fix time 3.2 hours. Most issues were network-related, so schedule monthly router firmware updates.', note: 'RAG · 6 sources from report.pdf' },
];
const CHAT_T = (() => { let s = .3; return CHAT.map(m => { const st = s; s += m.who === 'u' ? 1.0 : 1.2 + m.text.length / 55 + 1.6; return st; }); })();
const CHAT_LOOP = CHAT_T[CHAT_T.length - 1] + 1.2 + CHAT[CHAT.length - 1].text.length / 55 + 4;
function viewChat(c, t, accent){
  c.fillStyle = '#0f0f12'; c.fillRect(0, 0, SW, SH);
  chrome(c, TITLES[3], accent);
  // sidebar
  c.fillStyle = '#151518'; c.fillRect(0, 44, 230, SH - 44);
  c.fillStyle = accent; rr(c, 18, 62, 194, 38, 10); c.fill();
  c.fillStyle = '#fff'; c.font = `600 14px ${UI}`; c.fillText('+  New chat', 34, 86);
  ['Wi-Fi troubleshooting', 'Support report Q3', 'Python test helper', 'CCTV setup notes'].forEach((s, i) => {
    if (i === 0){ c.fillStyle = 'rgba(255,255,255,.07)'; rr(c, 12, 118, 206, 34, 8); c.fill(); }
    c.fillStyle = i === 0 ? '#fafafa' : '#8e8e93'; c.font = `14px ${UI}`; c.fillText(s, 26, 140 + i * 40);
  });
  const lt = t % CHAT_LOOP;
  // header pill — shows the failover during the first answer
  const failing = lt > CHAT_T[1] && lt < CHAT_T[1] + 1.2;
  c.fillStyle = '#fafafa'; c.font = `700 18px ${UI}`; c.fillText('Nexus AI', 256, 80);
  const pill = failing ? (lt < CHAT_T[1] + .6 ? ['gemini · timeout', '#ff9f0a'] : ['switching → groq', '#ff9f0a']) : ['groq · online', '#30d158'];
  c.font = `600 13px ${UI}`; const pw = c.measureText(pill[0]).width + 34;
  c.fillStyle = '#1f1f23'; rr(c, 350, 62, pw, 26, 13); c.fill();
  c.fillStyle = pill[1]; c.beginPath(); c.arc(364, 75, 4.5, 0, 7); c.fill();
  c.fillStyle = '#d4d4d8'; c.fillText(pill[0], 376, 80);
  c.fillStyle = '#26262b'; c.fillRect(230, 104, SW - 230, 1);

  // messages, stacked from the bottom
  const items = [];
  c.font = `16px ${UI}`;
  CHAT.forEach((m, i) => {
    const st = CHAT_T[i]; if (lt < st) return;
    if (m.who === 'u'){ items.push({ m, lines: wrap(c, m.text, 440), a: clamp((lt - st) / .3) }); return; }
    const typingEnd = st + 1.2;
    if (lt < typingEnd){ items.push({ typing: true, a: clamp((lt - st) / .3) }); return; }
    const chars = Math.floor((lt - typingEnd) * 55);
    items.push({ m, lines: wrap(c, m.text.slice(0, chars), 520), a: 1, streaming: chars < m.text.length });
  });
  let y = SH - 96;
  c.save(); c.beginPath(); c.rect(230, 106, SW - 230, SH - 186); c.clip();
  for (let i = items.length - 1; i >= 0; i--){
    const it = items[i];
    if (it.typing){
      const h = 48; y -= h; c.globalAlpha = it.a;
      c.fillStyle = '#232328'; rr(c, 262, y, 86, h, 18); c.fill();
      for (let d = 0; d < 3; d++){ c.fillStyle = '#8e8e93'; c.globalAlpha = it.a * (.35 + .65 * Math.abs(Math.sin(t * 5 - d * .7))); c.beginPath(); c.arc(286 + d * 19, y + 24, 5, 0, 7); c.fill(); }
      c.globalAlpha = 1; y -= 18; continue;
    }
    const user = it.m.who === 'u', lines = it.lines.length ? it.lines : [''];
    const w = Math.max(...lines.map(l => c.measureText(l).width)) + 36, h = lines.length * 24 + 26 + (it.m.note && !user ? 22 : 0);
    y -= h; const x = user ? SW - 32 - w : 262;
    c.globalAlpha = it.a; c.fillStyle = user ? accent : '#232328'; rr(c, x, y + (1 - it.a) * 12, w, h, 18); c.fill();
    c.fillStyle = '#fff'; c.font = `16px ${UI}`;
    lines.forEach((l, k) => c.fillText(l, x + 18, y + 32 + k * 24));
    if (it.streaming){ c.fillStyle = accent; c.fillRect(x + 19 + c.measureText(lines[lines.length - 1]).width, y + 17 + (lines.length - 1) * 24, 8, 19); }
    if (it.m.note && !user){ c.fillStyle = '#8e8e93'; c.font = `12px ${UI}`; c.fillText('↻ ' + it.m.note, x + 18, y + h - 12); }
    c.globalAlpha = 1; y -= 18;
  }
  c.restore();
  // input bar
  c.fillStyle = '#1c1c20'; rr(c, 262, SH - 70, SW - 294, 46, 23); c.fill();
  c.fillStyle = '#6e6e73'; c.font = `15px ${UI}`; c.fillText('Ask Nexus AI…', 286, SH - 41);
  c.fillStyle = accent; c.beginPath(); c.arc(SW - 56, SH - 47, 16, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.font = `700 16px ${UI}`; c.fillText('↑', SW - 61, SH - 41);
  fadeLoop(c, lt, CHAT_LOOP);
}

/* ---- 4: Tap Reflex (targets, taps, combos) ---- */
function viewGame(c, tAll, accent){
  const t = tAll % 60;                       // a 60-second "round", so the score and work stay bounded
  const g = c.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, '#0b1030'); g.addColorStop(1, '#130a24');
  c.fillStyle = g; c.fillRect(0, 0, SW, SH);
  for (let i = 0; i < 70; i++){ c.fillStyle = `rgba(160,190,255,${.15 + .35 * rnd(i + 9)})`; c.fillRect(rnd(i) * SW, (rnd(i + 50) * SH + t * 8 * (.3 + rnd(i + 3))) % SH, 2, 2); }
  const SPAWN = .75, LIFE = 1.1;
  const k0 = Math.max(0, Math.floor((t - LIFE - .5) / SPAWN)), k1 = Math.floor(t / SPAWN);
  let score = 0, combo = 0;
  for (let k = 0; k <= k1; k++){ if (t > k * SPAWN + LIFE * .72){ score += 10 + Math.round(rnd(k + 7) * 5); combo++; } }
  for (let k = k0; k <= k1; k++){
    const born = k * SPAWN, age = t - born, x = 110 + rnd(k) * (SW - 220), y = 130 + rnd(k + 33) * (SH - 230);
    const tapAt = LIFE * .72, bomb = rnd(k + 91) > .86;
    if (age < tapAt){
      const p = age / tapAt, r = 34 + 6 * Math.sin(age * 9) * (1 - p);
      c.strokeStyle = bomb ? '#ff453a' : '#ffd60a'; c.lineWidth = 4;
      c.beginPath(); c.arc(x, y, r + 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p)); c.stroke();
      const rg = c.createRadialGradient(x - 10, y - 10, 4, x, y, r);
      rg.addColorStop(0, bomb ? '#ff8a80' : '#ffffff'); rg.addColorStop(1, bomb ? '#b3261e' : '#c7d2fe');
      c.fillStyle = rg; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      c.fillStyle = bomb ? '#fff' : '#ff9f0a'; c.font = `700 24px ${UI}`; c.textAlign = 'center'; c.fillText(bomb ? '✕' : '⚡', x, y + 8); c.textAlign = 'left';
    } else if (age < tapAt + .55 && !bomb){
      const p = (age - tapAt) / .55;
      for (let s = 0; s < 12; s++){ const a = s / 12 * Math.PI * 2, d = 20 + p * 70; c.fillStyle = `rgba(255,214,10,${1 - p})`; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 4 * (1 - p) + 1, 0, 7); c.fill(); }
      c.globalAlpha = 1 - p; c.fillStyle = '#ffd60a'; c.font = `800 26px ${UI}`; c.textAlign = 'center';
      c.fillText(rnd(k + 5) > .5 ? 'PERFECT!' : 'GREAT', x, y - 30 - p * 30); c.globalAlpha = 1; c.textAlign = 'left';
    }
  }
  // HUD
  c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, 24, 22, 190, 74, 16); c.fill();
  c.fillStyle = '#fff'; c.font = `800 34px ${UI}`; c.fillText(String(score), 42, 66);
  c.fillStyle = '#a1a1d6'; c.font = `600 12px ${UI}`; c.fillText('SPEED ' + (1 + Math.min(t, 60) / 60).toFixed(1) + 'x', 42, 86);
  c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, SW - 214, 22, 190, 74, 16); c.fill();
  c.fillStyle = '#ff375f'; c.font = `24px ${UI}`; c.fillText('♥ ♥ ♥', SW - 190, 58);
  c.fillStyle = '#fff'; c.font = `700 18px ${UI}`; c.textAlign = 'right'; c.fillText('×' + (combo % 25 + 1), SW - 42, 86); c.textAlign = 'left';
  c.fillStyle = 'rgba(255,255,255,.55)'; c.font = `600 13px ${UI}`; c.textAlign = 'center'; c.fillText('CLASSIC · RANKED SEASON', SW / 2, SH - 24); c.textAlign = 'left';
}

/* fade to black briefly at the end of a loop instead of jumping */
function fadeLoop(c, lt, len){
  const a = Math.max(clamp((lt - (len - .5)) / .5), clamp(1 - lt / .4));
  if (a > 0){ c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(0, 0, SW, SH); }
}
function bootScreen(c, p){
  c.fillStyle = '#000'; c.fillRect(0, 0, SW, SH);
  c.globalAlpha = clamp(p * 3);
  c.fillStyle = '#f5f5f7'; c.font = `700 64px ${UI}`; c.textAlign = 'center'; c.fillText('SM', SW / 2, SH / 2 - 10);
  c.fillStyle = '#3a3a3c'; rr(c, SW / 2 - 110, SH / 2 + 40, 220, 6, 3); c.fill();
  c.fillStyle = '#f5f5f7'; rr(c, SW / 2 - 110, SH / 2 + 40, 220 * clamp(p), 6, 3); c.fill();
  c.textAlign = 'left'; c.globalAlpha = 1;
}
const VIEWS = [viewEditor, viewMonitor, viewTerminal, viewChat, viewGame];

/* =====================================================================
   THE LAPTOP
   ===================================================================== */
function initGL(){
  if (!window.THREE) return;
  const canvas = document.getElementById('gl');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, 1.2, 10); camera.lookAt(0, .6, 0);

  // studio reflections (soft boxes)
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x3a3a40, side: THREE.BackSide })));
  const panel = (col, w, h, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
  panel(0xffffff, 16, 6, 0, 11, 3); panel(0xffffff, 6, 12, -12, 3, 3); panel(0xffe2c2, 5, 10, 12, 0, 4);
  panel(0xb9d4ff, 12, 3, 0, -10, -5); panel(0xffffff, 5, 5, 5, 4, 12);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, .04).texture;
  scene.add(new THREE.AmbientLight(0xffffff, .35));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 8, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xc8dcff, .6); fill.position.set(-6, 2, 4); scene.add(fill);

  const W = 4.0, D = 2.76, BASE_T = .13, LID_H = 2.62, LID_T = .06;
  const roundedShape = (w, h, r, y0 = -h / 2) => {
    const s = new THREE.Shape(), x0 = -w / 2;
    s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
    s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
    s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    return s;
  };
  const alu = new THREE.MeshStandardMaterial({ color: 0xd8d9dd, metalness: .92, roughness: .3 });
  const group = new THREE.Group(); scene.add(group);

  // base: rounded slab with soft bevelled edges
  const baseGeo = new THREE.ExtrudeGeometry(roundedShape(W, D, .2), { depth: BASE_T - .04, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 4, curveSegments: 12 });
  baseGeo.rotateX(-Math.PI / 2); baseGeo.translate(0, .02, 0);
  const base = new THREE.Mesh(baseGeo, alu); group.add(base);
  const TOP = BASE_T;

  // keyboard deck
  const dk = document.createElement('canvas'); dk.width = 1024; dk.height = 706; const k = dk.getContext('2d');
  k.fillStyle = '#cfd0d4'; k.fillRect(0, 0, 1024, 706);
  k.fillStyle = '#b9bac0'; rr(k, 118, 34, 788, 362, 14); k.fill();           // keyboard well
  const key1 = (x, y, w, h) => { k.fillStyle = '#16171a'; rr(k, x, y, w, h, 7); k.fill(); k.fillStyle = 'rgba(255,255,255,.06)'; rr(k, x + 2, y + 2, w - 4, 3, 2); k.fill(); };
  const U = 52, G = 6, X0 = 130;
  for (let i = 0; i < 14; i++) key1(X0 + i * (U + G) - (i ? 0 : 0), 44, i === 13 ? U : U, 28);           // function row
  const rows = [[1,1,1,1,1,1,1,1,1,1,1,1,1,1.55], [1.55,1,1,1,1,1,1,1,1,1,1,1,1,1], [1.8,1,1,1,1,1,1,1,1,1,1,1,1.8], [2.3,1,1,1,1,1,1,1,1,1,1,2.36]];
  rows.forEach((r, ri) => { let x = X0; r.forEach(u => { const w = u * U + (u - 1) * G; key1(x, 80 + ri * (U + G), w, U); x += w + G; }); });
  let bx = X0; [1,1,1,1.2,4.95,1.2,1].forEach(u => { const w = u * U + (u - 1) * G; key1(bx, 80 + 4 * (U + G), w, U); bx += w + G; });
  key1(bx, 80 + 4 * (U + G) + U / 2 + 1, U, U / 2 - 1); key1(bx + U + G, 80 + 4 * (U + G), U, U / 2 - 1); key1(bx + U + G, 80 + 4 * (U + G) + U / 2 + 1, U, U / 2 - 1); key1(bx + 2 * (U + G), 80 + 4 * (U + G) + U / 2 + 1, U, U / 2 - 1);
  for (let s = 0; s < 2; s++){ const sx = s ? 932 : 34; for (let yy = 0; yy < 30; yy++) for (let xx = 0; xx < 5; xx++){ k.fillStyle = '#9fa0a6'; k.beginPath(); k.arc(sx + xx * 12 + 6, 50 + yy * 11.5, 2.2, 0, 7); k.fill(); } }
  k.fillStyle = '#c3c4c9'; rr(k, 322, 420, 380, 250, 18); k.fill(); k.strokeStyle = '#b3b4ba'; k.lineWidth = 3; rr(k, 322, 420, 380, 250, 18); k.stroke();
  k.fillStyle = '#b6b7bd'; rr(k, 452, 690, 120, 30, 15); k.fill();          // thumb notch
  const deckTex = new THREE.CanvasTexture(dk); deckTex.encoding = THREE.sRGBEncoding; deckTex.anisotropy = 8;
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(W - .08, D - .08), new THREE.MeshStandardMaterial({ map: deckTex, metalness: .55, roughness: .45 }));
  deck.rotation.x = -Math.PI / 2; deck.position.y = TOP + .001; group.add(deck);

  // hinge
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, W - .9, 24), new THREE.MeshStandardMaterial({ color: 0x2c2d31, metalness: .8, roughness: .35 }));
  hinge.rotation.z = Math.PI / 2; hinge.position.set(0, TOP + .02, -D / 2 + .07); group.add(hinge);

  // lid
  const lid = new THREE.Group(); lid.position.set(0, TOP + .02, -D / 2 + .07); group.add(lid);
  const lidGeo = new THREE.ExtrudeGeometry(roundedShape(W, LID_H, .2, 0), { depth: LID_T - .02, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 3, curveSegments: 12 });
  lidGeo.translate(0, 0, -LID_T);
  lid.add(new THREE.Mesh(lidGeo, alu));
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(W - .06, LID_H - .06, .17, .03), 12), new THREE.MeshStandardMaterial({ color: 0x050506, metalness: .2, roughness: .12 }));
  bezel.position.z = .0015; lid.add(bezel);
  // screen
  const scrC = document.createElement('canvas'); scrC.width = SW; scrC.height = SH; const sc = scrC.getContext('2d');
  const scrTex = new THREE.CanvasTexture(scrC); scrTex.encoding = THREE.sRGBEncoding; scrTex.anisotropy = 8;
  const SCR_W = W - .26, SCR_H = SCR_W * SH / SW;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCR_W, SCR_H), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
  screen.position.set(0, .14 + SCR_H / 2, .003); lid.add(screen);
  // camera notch
  const notch = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(.36, .085, .035, 0), 8), new THREE.MeshBasicMaterial({ color: 0x050506 }));
  notch.position.set(0, .14 + SCR_H - .083, .004); lid.add(notch);
  const cam = new THREE.Mesh(new THREE.CircleGeometry(.018, 16), new THREE.MeshBasicMaterial({ color: 0x1b2433 }));
  cam.position.set(0, .14 + SCR_H - .04, .005); lid.add(cam);
  // glass sheen
  const gc = document.createElement('canvas'); gc.width = 256; gc.height = 160; const gx = gc.getContext('2d');
  const grd = gx.createLinearGradient(0, 0, 256, 160); grd.addColorStop(0, 'rgba(255,255,255,.0)'); grd.addColorStop(.42, 'rgba(255,255,255,.0)'); grd.addColorStop(.5, 'rgba(255,255,255,.55)'); grd.addColorStop(.62, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = grd; gx.fillRect(0, 0, 256, 160);
  const sheenTex = new THREE.CanvasTexture(gc);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(SCR_W, SCR_H), new THREE.MeshBasicMaterial({ map: sheenTex, transparent: true, opacity: .07, depthWrite: false }));
  sheen.position.copy(screen.position); sheen.position.z = .006; lid.add(sheen);
  // screen glow onto the keyboard
  const glow = new THREE.PointLight(0x0a84ff, 0, 4.5, 2); glow.position.set(0, 1.0, .9); lid.add(glow);
  // logo on the back of the lid
  const logo = new THREE.Mesh(new THREE.CircleGeometry(.22, 48), new THREE.MeshStandardMaterial({ color: 0xf2f2f4, metalness: 1, roughness: .08 }));
  logo.position.set(0, LID_H / 2, -LID_T - .002); logo.rotation.y = Math.PI; lid.add(logo);

  // contact shadow
  const shC = document.createElement('canvas'); shC.width = shC.height = 128; const shx = shC.getContext('2d');
  const sg = shx.createRadialGradient(64, 64, 0, 64, 64, 64); sg.addColorStop(0, 'rgba(0,0,0,.42)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); shx.fillStyle = sg; shx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 4.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shC), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.01; group.add(shadow);
  listeners.push(() => { shadow.material.opacity = isDark() ? .25 : .9; });
  listeners[listeners.length - 1]();

  function resize(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const desktop = w > 900;
    const narrow = w / h < 1.45;                       // squarer desktop windows need a smaller laptop
    group.userData = { x: desktop ? (narrow ? 1.45 : 1.7) : -.3, y: desktop ? -.7 : 1.3, s: desktop ? (narrow ? .78 : .88) : .58 };
    group.position.x = group.userData.x;
  }
  new ResizeObserver(resize).observe(canvas); resize();

  const CLOSED = Math.PI / 2 * .995, OPEN = -.2;
  let mx = 0, my = 0, tx = 0, ty = 0, visible = true;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(story);
  const clock = new THREE.Clock();
  const accentColor = new THREE.Color();

  (function loop(){
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime(), sp = reduce ? 0 : 1;
    mx += (tx - mx) * .05; my += (ty - my) * .05;
    const ud = group.userData;

    const openP = reduce ? 1 : ease(clamp((t - .25) / 1.5));
    lid.rotation.x = CLOSED + (OPEN - CLOSED) * openP;
    group.scale.setScalar(ud.s * (reduce ? 1 : .9 + .1 * ease(clamp(t / .8))));

    // screen: boot, then the view for the current chapter (cross-fading between chapters).
    // Screen content always animates: typing on a screen isn't the kind of motion "reduce motion" is about
    // (Windows sets it whenever animation effects are off), so only the laptop's own movement is held still.
    const appT = t - 2.4;
    if (t < 2.4){ bootScreen(sc, clamp((t - .9) / 1.3)); }
    else {
      const f = clamp(progress, 0, VIEWS.length - 1), i0 = Math.floor(f), frac = f - i0;
      VIEWS[i0](sc, appT, ACCENTS[i0]);
      if (frac > .01 && i0 + 1 < VIEWS.length){ sc.save(); sc.globalAlpha = frac; VIEWS[i0 + 1](sc, appT, ACCENTS[i0 + 1]); sc.restore(); }
      if (t < 2.9){ sc.fillStyle = `rgba(0,0,0,${1 - (t - 2.4) / .5})`; sc.fillRect(0, 0, SW, SH); }
    }
    scrTex.needsUpdate = true;
    accentColor.set(ACCENTS[Math.round(clamp(progress, 0, 4))]);
    glow.color.lerp(accentColor, .08);
    glow.intensity = (isDark() ? 1.6 : .9) * clamp((t - 2.4) / .6);

    // movement: settle in, then a slow turntable sway that follows scroll + pointer
    group.rotation.y = -.42 + progress * .1 + mx * .4 + Math.sin(t * .45) * .06 * sp;
    group.rotation.x = .02 + my * .14 + Math.sin(t * .7) * .015 * sp;
    group.position.y += (ud.y + Math.sin(t * 1.05) * .05 * sp - group.position.y) * .1;
    sheen.material.opacity = .05 + .04 * Math.sin(group.rotation.y * 3);
    renderer.render(scene, camera);
  })();
}
try { initGL(); } catch (e) { console.warn('3D view disabled:', e); }

/* ---------- Nexus AI server log — types once, then holds ---------- */
const lines = [
  ['<span class="p">POST</span> /api/v1/chat  <span class="d">user=demo</span>', 450],
  ['  auth ✓  rate-limit ✓  request-check ✓', 420],
  ['  → gemini       <span class="w">timeout after 8s</span>', 620],
  ['  → groq         <span class="ok">200 OK</span>  <span class="d">412 ms</span>', 480],
  ['  rag: 6 chunks retrieved <span class="d">(keyword + embedding)</span>', 560],
  ['  <span class="ok">✓ streamed to web · telegram</span>', 900],
  ['', 160],
  ['<span class="p">$</span> pytest -q', 560],
  ['<span class="ok">....................................................</span>', 360],
  ['<span class="ok">1000+ passed</span>  <span class="d">· GitHub Actions</span><span class="cur">▋</span>', 0],
];
const termOut = document.getElementById('termOut');
let termRunning = false;
function runTerm(){
  // all markup above is static, written here — no user input reaches innerHTML
  termOut.innerHTML = lines.map(l => '<span class="ln" style="visibility:hidden">' + (l[0] || '&nbsp;') + '</span>').join('\n');
  const slots = [...termOut.querySelectorAll(':scope > .ln')];
  let i = 0;
  (function next(){
    if (i >= lines.length) return;
    slots[i].style.visibility = 'visible';
    const delay = lines[i][1]; i++;
    if (delay) setTimeout(next, delay); else next();
  })();
}

/* ---------- SOC bars ---------- */
const bars = document.getElementById('bars');
if (bars) {
  for (let i = 0; i < 28; i++) bars.appendChild(document.createElement('i'));
  const tickBars = () => { [...bars.children].forEach(b => { const h = 15 + Math.random() * 80; b.style.height = h + '%'; b.classList.toggle('hi', h > 82); }); };
  tickBars(); setInterval(() => { if (!document.hidden) tickBars(); }, 1600);
}

/* ---------- CyberSec quiz: five levels, flip between them ---------- */
const levels = [
  { lvl: 'Password Strength · Level 1', xp: 100, q: 'Which of these is the most secure password?',
    opts: ['password123', 'Admin2024!', 'qwerty', 'Tr0ub4dor&3'], ans: 3, note: 'Correct — long, mixed and unpredictable. +100 XP' },
  { lvl: 'Password Strength · Level 2', xp: 250, q: 'Main weakness of “P@ssw0rd2023”?',
    opts: ['Too short', 'Predictable substitutions', 'No symbols', 'No numbers'], ans: 1, note: 'Right — @→a and 0→o are the first swaps crackers try. +250 XP' },
  { lvl: 'Password Strength · Level 3', xp: 500, q: 'Entropy of a 12-char random alphanumeric password?',
    opts: ['~40 bits', '~70 bits', '~100 bits', '~128 bits'], ans: 1, note: 'Exactly — 12 × log₂(62) ≈ 71 bits. +500 XP' },
  { lvl: 'Password Storage · Level 4', xp: 750, q: 'Best way for a website to store user passwords?',
    opts: ['MD5 hash', 'AES encryption', 'Salted bcrypt / Argon2', 'Plain SHA-256'], ans: 2, note: 'Spot on — slow, salted hashing makes cracking leaked hashes impractical. +750 XP' },
  { lvl: 'Account Defence · Level 5', xp: 1000, q: 'Your password shows up in a breach. What protects you most?',
    opts: ['Change one character', 'Turn on MFA + new password', 'Security question', 'Clear your cookies'], ans: 1, note: 'Perfect — a fresh unique password plus MFA stops credential stuffing. +1,000 XP' },
];
const qflip = document.getElementById('qflip'), qdots = document.getElementById('qdots'), qxp = document.getElementById('qxp');
levels.forEach(() => qdots.appendChild(document.createElement('i')));
let qi = 0, qxpVal = 0, busy = false;
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
function paintDots(){ [...qdots.children].forEach((d, i) => { d.className = i < qi ? 'done' : i === qi ? 'on' : ''; }); }
function renderLevel(){
  const L = levels[qi]; qflip.replaceChildren();
  qflip.append(el('div', 'lvl', L.lvl), el('div', 'q', L.q));
  const opts = el('div', 'opts');
  L.opts.forEach((o, i) => { const b = el('button', 'opt', o); b.type = 'button'; b.addEventListener('click', () => answer(b, i, L)); opts.append(b); });
  const foot = el('div', 'foot', 'Pick the best answer.'); foot.setAttribute('aria-live', 'polite');
  qflip.append(opts, foot); paintDots();
}
function flipTo(fn){
  if (reduce){ fn(); busy = false; return; }
  qflip.style.transform = 'rotateY(-90deg)';
  setTimeout(() => {
    fn();
    qflip.style.transition = 'none'; qflip.style.transform = 'rotateY(90deg)';
    requestAnimationFrame(() => requestAnimationFrame(() => { qflip.style.transition = ''; qflip.style.transform = 'rotateY(0deg)'; busy = false; }));
  }, 320);
}
function answer(btn, i, L){
  if (busy) return;
  const foot = qflip.querySelector('.foot');
  if (i === L.ans){
    busy = true;
    qflip.querySelectorAll('.opt').forEach(x => { x.disabled = true; });
    btn.classList.add('ok'); foot.textContent = L.note; foot.classList.add('good');
    qxpVal += L.xp; qxp.textContent = qxpVal.toLocaleString() + ' XP';
    qdots.children[qi].className = 'done';
    setTimeout(() => { qi++; flipTo(qi < levels.length ? renderLevel : renderDone); }, 850);
  } else {
    btn.classList.add('no'); foot.textContent = 'Not quite — try again.'; foot.classList.remove('good');
    qflip.classList.remove('shake'); void qflip.offsetWidth; qflip.classList.add('shake');
  }
}
function renderDone(){
  qflip.replaceChildren();
  const box = el('div', 'qdone'); const again = el('button', null, 'Play again'); again.type = 'button';
  box.append(el('div', 'big', '🏆'), el('h5', null, 'Challenge complete'), el('p', null, `All five levels cleared — ${qxpVal.toLocaleString()} XP earned.`), again);
  qflip.append(box); paintDots();
  again.addEventListener('click', () => { if (busy) return; busy = true; qxpVal = 0; qxp.textContent = '0 XP'; qi = 0; flipTo(renderLevel); });
}
renderLevel();

/* ---------- skills (real logos, built with DOM APIs) ---------- */
const D = n => `https://cdn.jsdelivr.net/npm/devicon@2.16.0/icons/${n}.svg`;
const groups = [
  ['Languages', [['Python', 'python/python-original'], ['JavaScript', 'javascript/javascript-original'], ['C++', 'cplusplus/cplusplus-original'], ['Java', 'java/java-original'], ['C# / VB.NET', 'dot-net/dot-net-original'], ['HTML5', 'html5/html5-original'], ['CSS3', 'css3/css3-original']]],
  ['Frameworks & data', [['Flask', 'flask/flask-original', 1], ['React', 'react/react-original'], ['React Native', 'react/react-original'], ['Vite', 'vitejs/vitejs-original'], ['Node.js', 'nodejs/nodejs-original'], ['Tailwind', 'tailwindcss/tailwindcss-original'], ['Bootstrap', 'bootstrap/bootstrap-original'], ['MySQL', 'mysql/mysql-original']]],
  ['AI, cloud & DevOps', [['Gemini API', null, 'G', '#1a73e8'], ['Ollama', null, 'O', '#111'], ['RAG', null, 'R', '#c7781c'], ['Render', null, 'R', '#46e3b7'], ['Oracle Cloud', 'oracle/oracle-original'], ['Cloudflare', 'cloudflare/cloudflare-original'], ['GitHub Actions', 'githubactions/githubactions-original']]],
  ['Tools & security', [['Git', 'git/git-original'], ['GitHub', 'github/github-original', 1], ['VS Code', 'vscode/vscode-original'], ['IntelliJ', 'intellij/intellij-original'], ['pytest', 'pytest/pytest-original'], ['Android', 'android/android-original'], ['Linux', 'linux/linux-original'], ['Kali Linux', null, 'K', '#367bf0']]],
];
const glyph = (letter, color) => { const g = el('div', 'glyph', letter); g.style.background = color; return g; };
const sgEl = document.getElementById('skillgroups');
groups.forEach(([title, items]) => {
  const g = el('div', 'sg rv'); g.append(el('h4', null, title));
  const icons = el('div', 'icons');
  items.forEach(([name, path, a, b]) => {
    const card = el('div', 'icon');
    if (path){
      const img = new Image(); img.src = D(path); img.alt = ''; img.loading = 'lazy'; img.width = 40; img.height = 40;
      if (a === 1) img.className = 'inv';
      img.addEventListener('error', () => img.replaceWith(glyph(name[0], '#6e6e73')), { once: true });
      card.append(img);
    } else card.append(glyph(a, b));
    card.append(el('span', null, name)); icons.append(card);
  });
  g.append(icons); sgEl.append(g);
});

/* ---------- carousel ---------- */
const car = document.getElementById('carousel'), prev = document.getElementById('prev'), nextB = document.getElementById('next');
if (car && prev && nextB) {
  const step = () => car.querySelector('.card').offsetWidth + 18;
  prev.addEventListener('click', () => car.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }));
  nextB.addEventListener('click', () => car.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }));
  const carState = () => { prev.disabled = car.scrollLeft < 5; nextB.disabled = car.scrollLeft + car.clientWidth >= car.scrollWidth - 5; };
  car.addEventListener('scroll', carState, { passive: true }); addEventListener('resize', carState); carState();
}

/* ---------- headline word-rise ---------- */
document.querySelectorAll('.sec-title h2, .contact h2, #more h2').forEach(h => {
  if (h.children.length) return;
  const words = h.textContent.trim().split(/\s+/); h.setAttribute('aria-label', h.textContent.trim()); h.replaceChildren();
  words.forEach((w, i) => { const s = el('span', 'w', w); s.style.setProperty('--i', i); s.setAttribute('aria-hidden', 'true'); h.append(s, ' '); });
  if (!h.closest('.rv')) { h.classList.add('rv'); }
});

/* ---------- reveal + counters ---------- */
function countUp(n){
  const target = +n.dataset.count, suf = n.dataset.suffix || '', t0 = performance.now();
  (function s(now){ const p = Math.min((now - t0) / 1500, 1), e = 1 - Math.pow(1 - p, 3);
    n.textContent = Math.round(target * e).toLocaleString() + (p === 1 ? suf : ''); if (p < 1) requestAnimationFrame(s); })(t0);
}
const io = new IntersectionObserver(es => es.forEach(en => {
  if (!en.isIntersecting) return;
  const t = en.target; t.classList.add('in');
  t.querySelectorAll('[data-count]').forEach(countUp);
  if (t.querySelector('#termOut') && !termRunning){ termRunning = true; runTerm(); }
  io.unobserve(t);
}), { threshold: .15 });
document.querySelectorAll('.rv').forEach(n => io.observe(n));

/* ---------- subtle 3D tilt on visuals ---------- */
if (!reduce && matchMedia('(hover:hover)').matches){
  document.querySelectorAll('.tilt').forEach(v => {
    const tile = v.closest('.tile');
    v.style.transition = 'transform .4s cubic-bezier(.2,.8,.2,1)';
    tile.addEventListener('pointermove', e => {
      const r = tile.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      v.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 6}deg)`;
    });
    tile.addEventListener('pointerleave', () => { v.style.transform = ''; });
  });
}

/* ---------- about photo parallax + nav ---------- */
const aboutImg = document.getElementById('aboutImg'), gnav = document.getElementById('gnav');
const prog = el('div', 'prog'); prog.setAttribute('aria-hidden', 'true'); gnav.append(prog);
addEventListener('scroll', () => {
  gnav.classList.toggle('scrolled', scrollY > 10);
  const max = document.documentElement.scrollHeight - innerHeight;
  prog.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
  const r = aboutImg.parentElement.getBoundingClientRect();
  if (r.bottom > 0 && r.top < innerHeight && !reduce){
    const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    aboutImg.style.transform = `translateY(${p * -24}px)`;
  }
}, { passive: true });
})();

// BAGWORKER home: the agents you can hire, creating a coin (its picture, name, ticker, brief and agent; a test shift and a
// chat before it launches; the launch on pump.fun with its split locked, then its first shift), the bagwork from every
// coin, the coins at work, and the agent console in the hero. Every number is read from bagworker's records, the chain or
// PumpPortal; nothing is invented, and an empty board says it is empty.
(function () {
  'use strict';
  const C = window.Core, X = window.Cross, L = window.Live, $ = C.$, $$ = C.$$, esc = C.esc;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AGENTS = [
    { key: 'nico', name: 'Nico', role: 'the night shift', shot: 2, skill: 'Posts at 3 AM so your chart never sleeps.' },
    { key: 'mara', name: 'Mara', role: 'the thread writer', shot: 6, skill: 'Clean posts with a hook that people finish.' },
    { key: 'vale', name: 'Vale', role: 'the closer', shot: 7, skill: 'One-liners that land in any reply section.' },
    { key: 'pix', name: 'Pix', role: 'the meme lord', shot: 8, skill: 'Memes first, words second, chaos always.' },
    { key: 'rex', name: 'Rex', role: 'the raider', shot: 9, skill: 'Builds the raid kit and rallies everyone.' },
  ];
  const face = a => '/api/ping?shot=' + a.shot;
  const byKey = k => AGENTS.find(a => a.key === k) || AGENTS[3];
  const st = { board: null, sort: 'new', shown: 24, open: null, busy: false, born: null, image: null, agent: 'pix', chat: [] };
  const nm = $('#nm'), tk = $('#tk'), brief = $('#brief'), xh = $('#xh'), goBtn = $('#goBtn'), goStatus = $('#goStatus'), goProg = $('#goProg'), goRes = $('#goRes');
  const bytes = s => new TextEncoder().encode(s).length;
  const clip32 = s => { s = String(s || '').replace(/\s+/g, ' ').trim(); while (bytes(s) > 32) s = s.slice(0, -1); return s.trim(); };
  const status = t => { goStatus.textContent = t || ''; };
  const usdOf = sol => (st.board && st.board.solUsd && sol != null ? C.usd(sol * st.board.solUsd) : sol != null ? (+sol).toFixed(1) + ' SOL' : null);
  const STATE = { awake: 'on shift', rot: 'slowing down', dead: 'off shift', ascended: 'graduated' };
  const intent = t => 'https://x.com/intent/post?text=' + encodeURIComponent(t);

  // ---------- 01 the roster ----------
  $('#roster').innerHTML = AGENTS.map(a => `<article class="ag" data-k="${a.key}"><div class="ph"><img src="${face(a)}" alt="" loading="lazy"><span class="av">● available</span></div><b>${a.name}</b><i>${a.role}</i><p>${a.skill}</p><button type="button" class="btn line sm" data-hire="${a.key}">hire ${a.name}</button></article>`).join('');
  $('#pick').innerHTML = AGENTS.map(a => `<button type="button" class="pk" data-k="${a.key}"><img src="${face(a)}" alt=""><span><b>${a.name}</b><i>${a.role}</i></span></button>`).join('');
  function hire(k, scroll) {
    st.agent = k; const a = byKey(k);
    $$('.pk').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    $$('.ag').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    $('#outFace').src = face(a); $('#outName').textContent = a.name; $('#outRole').textContent = a.role; $('#outTitle').textContent = a.name + ' · test shift';
    if (scroll) { $('#create').scrollIntoView({ behavior: calm ? 'auto' : 'smooth' }); const s = $('.studio'); s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash'); }
  }
  $('#roster').addEventListener('click', e => { const b = e.target.closest('[data-hire]'); if (b) hire(b.dataset.hire, true); });
  $('#pick').addEventListener('click', e => { const b = e.target.closest('.pk'); if (b) hire(b.dataset.k); });
  hire('pix');

  // ---------- 02 the coin's picture, resized here to 768×768 before it is sent ----------
  const drop = $('#drop'), picIn = $('#pic'), picImg = $('#picImg'), picNote = $('#picNote');
  function takeFile(f) {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) { picNote.textContent = 'PNG, JPG, WebP or GIF'; return; }
    if (f.size > 12e6) { picNote.textContent = 'too big'; return; }
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 768; const x = c.getContext('2d'), s = Math.min(im.width, im.height);
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, 768, 768); x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 768, 768);
      st.image = c.toDataURL('image/jpeg', .9); picImg.src = st.image; drop.classList.add('on'); picNote.textContent = 'tap to change'; URL.revokeObjectURL(url); refreshGo();
    };
    im.onerror = () => { picNote.textContent = 'didn’t open'; URL.revokeObjectURL(url); };
    im.src = url;
  }
  picIn.addEventListener('change', () => takeFile(picIn.files[0]));
  ['dragenter', 'dragover'].forEach(k => drop.addEventListener(k, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(k => drop.addEventListener(k, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => takeFile(e.dataTransfer.files[0]));
  const briefCount = () => { const n = brief.value.trim().length; $('#briefN').textContent = n ? n + '/700' : ''; };
  brief.addEventListener('input', () => { briefCount(); refreshGo(); });
  [nm, tk].forEach(i => i.addEventListener('input', refreshGo));
  tk.addEventListener('input', () => { const v = tk.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v !== tk.value) tk.value = v; });
  const handle = () => xh.value.trim().replace(/^@/, '');
  const draft = () => ({ name: nm.value, symbol: tk.value, agent: st.agent, brief: brief.value });

  // ---------- a test shift before launch ----------
  function typeInto(el, text, done) {
    if (calm) { el.textContent = text; done && done(); return; }
    let i = 0; el.classList.add('typing'); const iv = setInterval(() => { i += Math.max(1, Math.ceil(text.length / 90)); el.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(iv); el.classList.remove('typing'); done && done(); } }, 18);
  }
  function renderShift(r, symbol) {
    const sh = $('#shift'), kit = (r.kit || []);
    sh.innerHTML = `<div class="step done"><i></i>read the brief</div><div class="step done"><i></i>wrote the post</div><p class="post" id="sPost"></p><div class="row2b"><a class="btn sm" target="_blank" rel="noopener" href="${intent(r.post)}">post on X ↗</a><button type="button" class="btn line sm" data-copy="${esc(r.post)}">copy</button></div>${kit.length ? `<div class="step done"><i></i>built the raid kit</div><ul class="kit">${kit.map(k => `<li><span>${esc(k)}</span><button type="button" class="cp" data-copy="${esc(k)}">copy</button></li>`).join('')}</ul>` : ''}${r.image ? `<div class="step done"><i></i>made a meme</div><figure class="meme"><img src="${r.image}" alt=""><a class="dl" href="${r.image}" download="${esc(symbol || 'meme')}-meme.jpg">save</a></figure>` : ''}`;
    typeInto($('#sPost'), r.post);
  }
  $('#testBtn').addEventListener('click', async () => {
    const ts = $('#testStatus'), b = $('#testBtn'); ts.textContent = '';
    if (!st.image) { ts.textContent = 'Add the coin’s picture first.'; return; }
    if (brief.value.trim().length < 12) { ts.textContent = 'Write the brief first: what the coin is and its vibe.'; return; }
    b.disabled = true; b.textContent = 'on shift…'; const sh = $('#shift');
    sh.innerHTML = `<div class="step now"><i></i>reading the brief</div><div class="step"><i></i>writing the post</div><div class="step"><i></i>building the raid kit</div><div class="step"><i></i>making a meme</div>`;
    let k = 0; const tick = setInterval(() => { const s = sh.querySelectorAll('.step'); if (k < s.length - 1) { s[k].className = 'step done'; k++; s[k].className = 'step now'; } }, 4200);
    try {
      const r = await C.post('/api/shoot', { draft: draft(), image: st.image });
      clearInterval(tick);
      if (r.ok || r.post) renderShift(r, tk.value); else { sh.innerHTML = `<p class="idle">${esc(r.error || 'The shift didn’t finish. Try again.')}</p>`; }
      if (!r.ok && r.error && r.post) ts.textContent = r.error;
    } catch { clearInterval(tick); sh.innerHTML = '<p class="idle">The shift didn’t finish. Try again.</p>'; }
    finally { b.disabled = false; b.textContent = 'run another test shift'; }
  });
  document.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (!b) return; navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy).then(() => C.toast('Copied.')); });

  // ---------- talking to your agent before launch ----------
  const said = $('#said'), askIn = $('#askIn'), askBtn = $('#askBtn');
  function bubble(who, text, cls) {
    const p = document.createElement('p'); p.className = who + (cls ? ' ' + cls : ''); said.appendChild(p);
    if (who === 'it' && !cls) typeInto(p, text, () => { said.scrollTop = said.scrollHeight; }); else p.textContent = text;
    said.scrollTop = said.scrollHeight;
  }
  $('#askForm').addEventListener('submit', async e => {
    e.preventDefault(); const q = askIn.value.trim(); if (!q) return;
    if (brief.value.trim().length < 12) { bubble('it', 'Write the brief first, then I can plan the bagwork.', 'sys'); return; }
    askIn.value = ''; bubble('you', q); askBtn.disabled = true; said.classList.add('wait');
    try { const r = await C.post('/api/think', { draft: draft(), q, history: st.chat }); if (r.ok) { bubble('it', r.text); st.chat.push({ q, a: r.text }); st.chat = st.chat.slice(-4); } else bubble('it', r.error, 'sys'); }
    catch { bubble('it', 'No answer. Try again.', 'sys'); }
    finally { askBtn.disabled = false; said.classList.remove('wait'); }
  });

  // ---------- the split and the launch ----------
  function splitShow() {
    const me = C.S.me || '\u0000you', H = '\u0000house';
    $('#split').innerHTML = X.sharesOf(me, H).map(r => `<div class="${r.address === me ? 'me' : ''}"><dt>${r.address === me ? 'you' : 'the house'}</dt><dd>${r.bps / 100}%</dd></div>`).join('');
  }
  function refreshGo() {
    if (st.busy) return;
    if (st.open === false) { goBtn.disabled = true; goBtn.textContent = 'Launching opens soon'; return; }
    if (st.born) { goBtn.disabled = true; goBtn.textContent = 'launched ✓'; return; }
    goBtn.disabled = false; goBtn.textContent = C.S.me ? 'launch it' : 'Connect wallet to launch';
  }
  const buy = X.buyBox($('#buyBox'));
  C.onWallet(() => { splitShow(); refreshGo(); });
  async function firstShift(mint) {
    const box = $('#firstShift'); if (!box) return;
    box.innerHTML = '<p class="status">your agent is on its first shift…</p>';
    let r = null; for (let i = 0; i < 2 && !(r && r.ok); i++) { try { r = await C.post('/api/shoot', { mint }); } catch { r = null; } if (r && r.posted) break; }
    if (r && r.ok) box.innerHTML = `<figure class="meme"><img src="/p/${r.id}" alt=""></figure><p class="post">${esc(r.post)}</p><div class="row2b"><a class="btn sm" target="_blank" rel="noopener" href="${intent(r.post)}">post on X ↗</a></div>`;
    else box.innerHTML = `<p class="status">${esc((r && r.error) || 'Its first shift comes with the next cycle.')}</p>`;
  }
  goBtn.addEventListener('click', async () => {
    if (st.busy || st.born || st.open === false) return;
    if (!C.S.me) { await C.connect(); refreshGo(); return; }
    const name = clip32(nm.value), symbol = tk.value.trim().replace(/^\$/, '').toUpperCase();
    if (!st.image) return status('Add the coin’s picture.');
    if (!name) return status('Give it a name.');
    if (!/^[A-Z0-9]{1,10}$/.test(symbol)) return status('The ticker is 1–10 letters or numbers.');
    if (brief.value.trim().length < 12) return status('Write the brief.');
    if (handle() && !/^[A-Za-z0-9_]{1,15}$/.test(handle())) return status('That X handle doesn’t look right.');
    if (buy.over()) return status('Up to 5 SOL in the first buy.');
    st.busy = true; goBtn.disabled = true; goBtn.textContent = 'launching…'; status(''); goRes.hidden = true;
    try {
      const r = await X.run({ name, symbol, agent: st.agent, brief: brief.value.trim(), x: handle(), image: st.image, devBuy: buy.lamports(), onStep: i => X.steps(goProg, i) });
      X.steps(goProg, 99, true);
      const live = r.settle && r.settle.live; st.born = r.mint;
      goRes.hidden = false;
      goRes.innerHTML = `<p class="ok">$${esc(symbol)} is ${live ? 'live. ' + byKey(st.agent).name + ' is on shift.' : 'on pump.fun.'}</p>${r.buyNote ? `<p class="status">${esc(r.buyNote)}</p>` : ''}<div id="firstShift"></div><div class="acts"><a class="btn" href="/c/${r.mint}">its page →</a><a class="btn line" href="https://pump.fun/coin/${r.mint}" target="_blank" rel="noopener">pump.fun ↗</a><a class="btn line" href="${C.solscan('tx', r.sig)}" target="_blank" rel="noopener">solscan ↗</a></div>`;
      C.toast('Your agent is on shift.'); C.say('$' + symbol + ' is live.');
      loadBoard(r.mint);
      if (live) firstShift(r.mint);
    } catch (e) {
      status(C.human(e));
      if (e && e.mint) { goRes.hidden = false; goRes.innerHTML = `<div class="acts"><a class="btn" href="/c/${e.mint}">finish it on its page →</a></div>`; }
    } finally { st.busy = false; refreshGo(); }
  });

  // ---------- 04 coins at work ----------
  function sorted() {
    const ks = ((st.board && st.board.infl) || []).slice();
    if (st.sort === 'heavy') ks.sort((x, y) => (y.mcap_sol || 0) - (x.mcap_sol || 0) || y.slot - x.slot); else ks.sort((x, y) => y.slot - x.slot);
    return ks;
  }
  let popped = false;
  function renderCoins(hit) {
    const el = $('#nursery'), ks = sorted();
    if (!ks.length) { el.innerHTML = `<a class="cn ghost" href="#create"><span class="gp">+</span><span><b>no coin is at work yet</b><i>the first agent shift is yours</i></span></a>`; $('#moreBtn').hidden = true; return; }
    el.innerHTML = ks.slice(0, st.shown).map((k, i) => { const a = byKey(k.niche), cap = usdOf(k.mcap_sol);
      return `<a class="cn s-${esc(k.state)}${popped ? '' : ' pop'}" style="--i:${i % 12}" href="/c/${k.mint}" data-m="${k.mint}"><img class="ci" src="/i/${k.mint}" alt="" loading="lazy"><img class="fa" src="${face(a)}" alt="" loading="lazy"><span class="nm"><b>$${esc(k.symbol)}</b><i>${esc(k.name)}</i></span><span class="ag2">${a.name}<em>${a.role}</em></span><span class="sh2">${k.posts} shift${k.posts === 1 ? '' : 's'}</span><span class="stt">${STATE[k.state] || k.state}</span><span class="cap">${cap || '—'}</span></a>`; }).join('');
    popped = true; $('#moreBtn').hidden = ks.length <= st.shown;
    if (hit) { const c = el.querySelector(`[data-m="${hit}"]`); if (c) c.classList.add('hit'); }
  }
  $('#sorts').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.sort = b.dataset.s; $$('#sorts button').forEach(x => x.classList.toggle('on', x === b)); renderCoins(); });
  $('#moreBtn').addEventListener('click', () => { st.shown += 24; renderCoins(); });

  // ---------- 03 fresh bagwork ----------
  const seen = new Set(); let feedKey = '';
  function renderFeed() {
    const ps = (st.board && st.board.posts) || [], el = $('#posts'), key = ps.map(p => p.id).join(',');
    if (key === feedKey && el.children.length) return; feedKey = key;
    if (!ps.length) { el.innerHTML = `<div class="bw ghost"><span class="gp">+</span><p>The first shift lands here the minute a coin launches.</p></div><div class="bw ghost"></div><div class="bw ghost"></div>`; return; }
    let n = 0;
    el.innerHTML = ps.map(p => { const nw = !seen.has(p.id); seen.add(p.id);
      return `<article class="bw${nw ? ' new' : ''}" style="--i:${nw ? n++ : 0}"><a href="/c/${p.mint}" class="mi"><img src="/p/${p.id}" alt="" loading="lazy"></a><div class="bt"><a class="who2" href="/c/${p.mint}">$${esc(p.symbol)}</a><p>${esc(p.caption)}</p><div class="row2b"><a class="btn sm" target="_blank" rel="noopener" href="${intent(p.caption)}">post on X ↗</a><button type="button" class="btn line sm" data-copy="${esc(p.caption)}">copy</button></div></div></article>`; }).join('');
  }

  // ---------- live trades light up their rows ----------
  if (L) {
    L.births(false);
    L.on('trade', t => { const c = document.querySelector(`.cn[data-m="${t.mint}"]`); if (!c) return; c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); });
  }

  // ---------- the records ----------
  async function loadBoard(hit) {
    let j = null; try { j = await C.get('/api/board'); } catch {}
    if (!j || !j.ok) { if (!st.board) { $('#nursery').innerHTML = `<div class="cn ghost"><span><b>bagworker’s records didn’t answer.</b></span><button class="btn line sm" type="button" id="retryBoard">try again ↻</button></div>`; const r = $('#retryBoard'); if (r) r.onclick = () => loadBoard(); renderFeed(); } return; }
    st.board = j; if (j.open != null) st.open = j.open; refreshGo();
    renderCoins(hit); renderFeed();
    if (L) L.watch(j.infl.slice(0, 200).map(k => k.mint));
  }

  // ---------- the hero console: one agent's shift, start to finish, on a loop (an illustration of a shift, not data) ----------
  (function console_() {
    const log = $('#log'), img = $('#camImg'), nm2 = $('#camName'), rl = $('#camRole'), cur = $('#cur'), sw = $('#modeSw');
    setTimeout(() => sw && sw.classList.add('on'), calm ? 0 : 500);
    const LINES = a => [['>', `new coin: $YOURCOIN`], ['●', `${a.name} hired: ${a.role}`], ['✓', 'read the brief'], ['✓', 'wrote the post'], ['✓', 'built the raid kit'], ['✓', 'made a meme from the coin picture'], ['▸', 'next shift in 6 hours']];
    let ai = 3;
    function run() {
      const a = AGENTS[ai % AGENTS.length]; ai++;
      img.classList.remove('in'); void img.offsetWidth; img.src = face(a); img.classList.add('in'); nm2.textContent = a.name; rl.textContent = a.role;
      log.innerHTML = ''; const ls = LINES(a); let i = 0;
      if (calm) { log.innerHTML = ls.map(([m, t]) => `<p><b>${m}</b>${esc(t)}</p>`).join(''); return; }
      (function next() {
        if (i >= ls.length) { setTimeout(run, 2600); return; }
        const [m, t] = ls[i++]; const p = document.createElement('p'); p.innerHTML = `<b>${m}</b><span></span>`; log.appendChild(p);
        const s = p.querySelector('span'); let k = 0;
        const iv = setInterval(() => { k += 2; s.textContent = t.slice(0, k); if (k >= t.length) { clearInterval(iv); cur.style.transform = `translate(${40 + Math.random() * 220}px, ${30 + i * 26}px)`; setTimeout(next, 420); } }, 22);
      })();
    }
    AGENTS.forEach(a => { const im = new Image(); im.src = face(a); });
    run();
  })();

  // ---------- reveals: sections rise, the how-it-works list checks itself off ----------
  (function reveal() {
    if (calm || !('IntersectionObserver' in window)) { $$('.todo li').forEach(li => li.classList.add('done')); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; en.target.classList.add('seen'); io.unobserve(en.target);
      if (en.target.id === 'todo') [...en.target.children].forEach((li, i) => setTimeout(() => li.classList.add('done'), 350 + i * 450)); }), { rootMargin: '0px 0px -10% 0px' });
    $$('.sh, .ag, .studio, .todo, .faq details').forEach((el, i) => { el.classList.add('rv'); if (el.classList.contains('ag')) el.style.setProperty('--d', (i % 5) * .07 + 's'); io.observe(el); });
    const links = $$('.nav a'); const nio = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle('on', a.hash === '#' + en.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
    ['agents', 'create', 'bagwork', 'coins', 'how'].forEach(id => nio.observe(document.getElementById(id)));
  })();

  splitShow(); briefCount(); refreshGo(); loadBoard();
  setInterval(() => { if (!document.hidden && !st.busy) loadBoard(); }, 20000);
  if (L) L.start();
})();

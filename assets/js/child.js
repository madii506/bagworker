// BAGWORKER: one coin's page. Its picture and its agent, the brief, the agent's bagwork (post it to X, copy the raid kit,
// save the meme), talking to the agent, its numbers
// (read by the cycle from the chain), the split locked into it and its live trades (PumpPortal). A token that landed on
// pump.fun without its split can be finished here by whoever launched it.
(function () {
  'use strict';
  const C = window.Core, X = window.Cross, L = window.Live, $ = C.$, esc = C.esc;
  const mint = (location.pathname.match(/\/c\/([1-9A-HJ-NP-Za-km-z]{32,44})/) || [])[1] || new URLSearchParams(location.search).get('mint');
  const STATE = { awake: 'on shift', rot: 'slowing down', dead: 'off shift', ascended: 'graduated' };
  const AG = { nico: ['Nico', 'the night shift', 2], mara: ['Mara', 'the thread writer', 6], vale: ['Vale', 'the closer', 7], pix: ['Pix', 'the meme lord', 8], rex: ['Rex', 'the raider', 9] };
  const intent = t => 'https://x.com/intent/post?text=' + encodeURIComponent(t);
  let chat = [];
  const when = t => t ? C.ago(new Date(t).getTime()) : '—';
  let data = null, solUsd = null;
  function lost(text) { $('#cw').innerHTML = `<div class="lost"><div><p>${esc(text)}</p><a class="btn" href="/">back to bagworker</a></div></div>`; }
  async function load() {
    if (!mint) return lost('No coin lives at that address.');
    let j; try { j = await C.get('/api/kid?mint=' + mint); } catch { j = { ok: false, error: 'bagworker didn’t answer. Try again.' }; }
    if (!j.ok) return lost(j.missing ? 'No coin lives at that address.' : j.error);
    data = j; render();
  }
  function render() {
    const k = data.infl, pending = k.status === 'pending';
    document.title = '$' + k.symbol + ' · bagworker';
    const a = AG[k.niche] || AG.nico; $('#agFace').src = '/api/ping?shot=' + a[2]; $('#agName').textContent = a[0]; $('#agRole').textContent = a[1];
    $('#cName').innerHTML = `$${esc(k.symbol)}<small>${esc(k.name)} · worked by ${a[0]}, ${a[1]}</small>`;
    $('#cState').innerHTML = (pending ? ['not launched yet'] : [STATE[k.state] || k.state, k.posts + ' shift' + (k.posts === 1 ? '' : 's'), 'live ' + when(k.born_at)]).join(' · ');
    $('#bio').textContent = k.voice;
    const img = $('#kidImg'); if (!img.getAttribute('src')) img.src = '/i/' + mint;
    const acts = [];
    if (!pending) acts.push(`<a class="btn" href="https://pump.fun/coin/${mint}" target="_blank" rel="noopener">buy on pump.fun ↗</a>`, `<button class="btn line" type="button" id="feedBtn">pay out its fees</button>`);
    else acts.push(`<button class="btn" type="button" id="finishBtn">finish it: lock its split</button>`);
    if (k.xhandle) acts.push(`<a class="btn line" href="https://x.com/${esc(k.xhandle)}" target="_blank" rel="noopener">@${esc(k.xhandle)} ↗</a>`);
    acts.push(`<a class="btn line" href="${C.solscan('token', mint)}" target="_blank" rel="noopener">solscan ↗</a>`);
    $('#cActs').innerHTML = acts.join('');
    if ($('#feedBtn')) $('#feedBtn').onclick = feed;
    if ($('#finishBtn')) $('#finishBtn').onclick = finish;
    const ps = data.posts || [];
    $('#posts').innerHTML = ps.length ? ps.map(p => { let x = {}; try { x = JSON.parse(p.scene || '{}'); } catch {} const kit = x.kit || [];
      return `<article class="bw"><a class="mi" href="/p/${p.id}" target="_blank" rel="noopener"><img src="/p/${p.id}" alt="" loading="lazy"></a><div class="bt"><span class="who2">${esc(C.ago(new Date(p.at).getTime()))}</span><p>${esc(p.caption)}</p><div class="row2b"><a class="btn sm" target="_blank" rel="noopener" href="${intent(p.caption)}">post on X ↗</a><button type="button" class="btn line sm" data-copy="${esc(p.caption)}">copy</button><a class="btn line sm" href="/p/${p.id}" download="${esc(k.symbol)}-meme-${p.id}.jpg">save meme</a></div>${kit.length ? `<ul class="kit">${kit.map(t => `<li><span>${esc(t)}</span><button type="button" class="cp" data-copy="${esc(t)}">copy</button></li>`).join('')}</ul>` : ''}</div></article>`; }).join('')
      : `<div class="bw ghost"><span class="gp">+</span><p>${pending ? 'Its agent starts once the coin is launched.' : 'Its agent’s first shift is on the way.'}</p></div>`;
    $('#log').innerHTML = (data.log || []).length ? data.log.map(e => `<p class="ev"><time>${when(e.at)}</time>${esc(e.text)}</p>`).join('') : '<p class="ev">Nothing yet.</p>';
    const cap = k.mcap_sol != null ? (solUsd ? C.usd(k.mcap_sol * solUsd) + ' · ' : '') + (+k.mcap_sol).toFixed(1) + ' SOL' : '—';
    $('#nums').innerHTML = [['market cap', pending ? '—' : cap], ['waiting in its vault', pending ? '—' : C.sol(k.vault_lamports || 0)], ['last trade', pending ? '—' : when(k.last_trade_at)], ['last shift', when(k.posted_at)], ['token', `<a href="${C.solscan('token', mint)}" target="_blank" rel="noopener">${C.short(mint, 6)}</a>`]]
      .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    const shares = typeof k.shares === 'string' ? JSON.parse(k.shares) : (k.shares || []);
    $('#split').innerHTML = shares.map(s => `<div><dt>${s.address === data.studio ? 'the house' : s.address === k.payer ? 'its creator' : 'a share'}</dt><dd>${s.bps / 100}% · <a href="${C.solscan('account', s.address)}" target="_blank" rel="noopener">${C.short(s.address)}</a></dd></div>`).join('');
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (!b) return; navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy).then(() => C.toast('Copied.')); });
  // talking to it, out loud
  const said = $('#said'), askIn = $('#askIn'), askBtn = $('#askBtn');
  function bubble(who, text, cls) { said.insertAdjacentHTML('beforeend', `<p class="${who}${cls ? ' ' + cls : ''}">${esc(text)}</p>`); said.scrollTop = said.scrollHeight; }
  $('#askForm').addEventListener('submit', async e => {
    e.preventDefault();
    const q = askIn.value.trim(); if (!q || !mint) return;
    askIn.value = ''; bubble('you', q); askBtn.disabled = true; said.classList.add('wait');
    try {
      const r = await C.post('/api/think', { mint, q, history: chat });
      if (r.ok) { bubble('it', r.text); chat.push({ q, a: r.text }); chat = chat.slice(-4); } else bubble('it', r.error, 'sys');
    } catch { bubble('it', 'It didn’t answer. Try again.', 'sys'); }
    finally { askBtn.disabled = false; said.classList.remove('wait'); askIn.focus(); }
  });
  async function feed() {
    const b = $('#feedBtn'); b.disabled = true; $('#cStatus').textContent = '';
    try { const r = await X.feed(mint); if (r) { C.toast('Paid out to every share.'); $('#cStatus').innerHTML = `<a href="${C.solscan('tx', r.sig)}" target="_blank" rel="noopener">the payout on solscan ↗</a>`; } }
    catch (e) { $('#cStatus').textContent = C.human(e); }
    finally { b.disabled = false; }
  }
  async function finish() {
    const b = $('#finishBtn'); $('#cStatus').textContent = '';
    if (!C.S.me) { const ok = await C.connect(); if (!ok) return; }
    if (C.S.me !== data.infl.payer) { $('#cStatus').textContent = 'Only the wallet that launched it can finish it.'; return; }
    b.disabled = true;
    try { const s = await C.post('/api/settle', { mint }); if (!(s && s.live)) await X.route(mint); C.toast('It’s live.'); await load(); }
    catch (e) { $('#cStatus').textContent = C.human(e); }
    finally { if ($('#finishBtn')) $('#finishBtn').disabled = false; }
  }
  if (L && mint) {
    L.births(false); L.watch([mint]);
    L.on('status', up => { const d = $('#lvDot'); if (d) d.classList.toggle('on', up); });
    L.on('trade', t => {
      if (t.mint !== mint) return;
      const first = $('#trN'); if (first) first.remove();
      const el = $('#trades'); el.insertAdjacentHTML('afterbegin', `<p class="ev ${t.side}"><time>now</time>${t.side} ${t.sol >= 1 ? t.sol.toFixed(2) : t.sol.toFixed(3)} SOL<small>${C.short(t.who || '')}</small></p>`);
      while (el.children.length > 10) el.lastChild.remove();
    });
    L.start();
  }
  C.get('/api/board').then(j => { if (j && j.solUsd) { solUsd = j.solUsd; if (data) render(); } }).catch(() => {});
  setInterval(() => { if (!document.hidden && data) load(); }, 30000);
  load();
})();

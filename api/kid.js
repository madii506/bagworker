// GET /api/kid?mint=  one coin: its record (its brief is public), its agent's bagwork and what happened to it.
const L = require('./_lib');
const COLS = `mint, slot, name, symbol, niche, voice, xhandle, vstyle, payer, shares, born_at, status, state, mcap_sol, complete, last_trade_at, vault_lamports, created_at, posts, posted_at`;
module.exports = async (req, res) => {
  const mint = String(L.query(req).mint || '').trim();
  if (!L.isAddr(mint)) return L.send(res, 200, { ok: false, error: 'That isn’t a token address.' });
  if (!L.dbReady()) return L.send(res, 200, { ok: false, error: 'Bagworker’s records are offline.' });
  try {
    await L.ready();
    const k = (await L.q(`SELECT ${COLS} FROM w0_coins WHERE mint=$1`, [mint]))[0];
    if (!k || k.status === 'void') return L.send(res, 200, { ok: false, missing: true, error: 'No coin lives at that address.' }, L.CACHE(10));
    const [posts, log] = await Promise.all([
      L.q(`SELECT id, caption, scene, at FROM w0_posts WHERE mint=$1 ORDER BY id DESC LIMIT 60`, [mint]),
      L.q(`SELECT kind, text, at FROM w0_log WHERE mint=$1 ORDER BY id DESC LIMIT 20`, [mint]),
    ]);
    L.send(res, 200, { ok: true, infl: k, posts, log, studio: L.STUDIO || null }, L.CACHE(6, 60));
  } catch (e) { L.send(res, 200, { ok: false, error: 'Bagworker’s records didn’t answer.' }); }
};

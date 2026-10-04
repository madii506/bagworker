// GET /api/board  every coin launched here (newest first) and the latest bagwork. Read from bagworker's records, which
// the cycle keeps in step with the chain.
const L = require('./_lib');
const COLS = `mint, slot, name, symbol, niche, payer, born_at, state, mcap_sol, complete, last_trade_at, vault_lamports, posts, posted_at`;
module.exports = async (req, res) => {
  const base = { open: !!L.STUDIO, studio: L.STUDIO || null };
  if (!L.dbReady()) return L.send(res, 200, { ok: true, offline: true, infl: [], posts: [], ...base });
  try {
    await L.ready();
    const [infl, posts, solUsd] = await Promise.all([
      L.q(`SELECT ${COLS} FROM w0_coins WHERE status='live' ORDER BY slot DESC LIMIT 500`),
      L.q(`SELECT p.id, p.mint, p.caption, p.at, i.symbol, i.name FROM w0_posts p JOIN w0_coins i ON i.mint = p.mint ORDER BY p.id DESC LIMIT 30`),
      L.solPrice().catch(() => null),
    ]);
    L.send(res, 200, { ok: true, infl, posts, solUsd, ...base }, L.CACHE(6, 60));
  } catch (e) { L.send(res, 200, { ok: false, error: 'Bagworker’s records didn’t answer.', ...base }); }
};

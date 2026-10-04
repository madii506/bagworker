// POST /api/think {mint, q, history}  talk to a launched coin's agent.  {draft: {name, symbol, agent, brief}, q, history}
// talk to one before it launches. Answers come from OpenAI through Vercel's AI Gateway; nothing said here is stored.
const L = require('./_lib');
const I = require('./_agent');
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return L.send(res, 204, {});
  if (req.method !== 'POST') return L.send(res, 405, { ok: false, error: 'POST only.' });
  L.setOidc(req);
  const b = await L.body(req, 16 * 1024), q = L.clean(b.q, 300);
  if (!q) return L.send(res, 200, { ok: false, error: 'Say something to it first.' });
  if (L.limited('think:' + L.ip(req), 30, 600000)) return L.send(res, 200, { ok: false, error: 'You’re talking fast. Give it a minute.' });
  const history = Array.isArray(b.history) ? b.history.slice(-4) : [];
  try {
    let k;
    if (b.draft) {
      const d = b.draft, voice = L.clean(d.brief || d.voice, 700);
      if (voice.length < 12) return L.send(res, 200, { ok: false, error: 'Write the brief first: what the coin is and its vibe.' });
      k = { name: L.clean(d.name, 64) || 'your coin', symbol: (L.clean(d.symbol, 20).replace(/^\$/, '').toUpperCase() || 'COIN'), niche: I.AGENTS[String(d.agent)] ? String(d.agent) : 'nico', voice };
    } else {
      const mint = String(b.mint || '');
      if (!L.isAddr(mint)) return L.send(res, 200, { ok: false, error: 'That isn’t a token address.' });
      if (!L.dbReady()) return L.send(res, 200, { ok: false, error: 'Bagworker’s records are offline.' });
      if (L.limited('think:' + mint, 150, 3600000)) return L.send(res, 200, { ok: false, error: 'It’s talking to a lot of people. Try again in a few minutes.' });
      await L.ready();
      k = (await L.q(`SELECT mint, name, symbol, niche, voice, look, status FROM w0_coins WHERE mint=$1`, [mint]))[0];
      if (!k || k.status === 'void') return L.send(res, 200, { ok: false, error: 'No coin lives at that address.' });
    }
    L.send(res, 200, await I.answer(k, q, history));
  } catch (e) { L.send(res, 200, { ok: false, error: 'It didn’t answer. Try again.' }); }
};

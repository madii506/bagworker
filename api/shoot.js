// POST /api/shoot {draft: {name, symbol, agent, brief}, image}  a test shift before launch: a post, a raid kit and a meme
//   made from the coin's picture. Nothing is kept.
// POST /api/shoot {mint}  the first shift of a freshly launched coin (only while it has none).
// Memes come from FLUX through Vercel's AI Gateway, inside the house's daily budget.
const L = require('./_lib');
const I = require('./_agent');
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return L.send(res, 204, {});
  if (req.method !== 'POST') return L.send(res, 405, { ok: false, error: 'POST only.' });
  L.setOidc(req);
  if (!L.dbReady()) return L.send(res, 200, { ok: false, error: 'Bagworker’s records are offline.' });
  const b = await L.body(req, 4.2 * 1024 * 1024);
  if (b.tooBig) return L.send(res, 200, { ok: false, error: 'That picture is too big. Try a smaller one.' });
  try {
    await L.ready();
    if (b.draft) {
      if (L.limited('shoot:' + L.ip(req), 3, 3600000)) return L.send(res, 200, { ok: false, error: 'Three test shifts an hour. Launch it and the agent works on its own.' });
      const d = b.draft, voice = L.clean(d.brief || d.voice, 700);
      if (voice.length < 12) return L.send(res, 200, { ok: false, error: 'Write the brief first: what the coin is and its vibe.' });
      const m = String(b.image || '').match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
      if (!m) return L.send(res, 200, { ok: false, error: 'Add the coin’s picture first.' });
      const face = await require('sharp')(Buffer.from(m[2], 'base64'), { animated: false, limitInputPixels: 40e6 }).resize(768, 768, { fit: 'cover', position: 'attention' }).flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toBuffer();
      const k = { name: L.clean(d.name, 64) || 'unnamed', symbol: (L.clean(d.symbol, 20).replace(/^\$/, '').toUpperCase() || 'COIN'), niche: I.AGENTS[String(d.agent)] ? String(d.agent) : 'nico', voice };
      k.look = await I.describe(face);
      return L.send(res, 200, await I.draft(k, face.toString('base64')));
    }
    const mint = String(b.mint || '');
    if (!L.isAddr(mint)) return L.send(res, 200, { ok: false, error: 'That isn’t a token address.' });
    if (L.limited('first:' + mint, 2, 600000)) return L.send(res, 200, { ok: false, error: 'Its agent is already on it.' });
    const k = (await L.q(`SELECT mint, name, symbol, niche, voice, look, img, status, posts FROM w0_coins WHERE mint=$1`, [mint]))[0];
    if (!k || k.status !== 'live') return L.send(res, 200, { ok: false, error: 'It isn’t launched yet.' });
    if (k.posts > 0) return L.send(res, 200, { ok: false, error: 'Its first shift is already done.', posted: true });
    L.send(res, 200, await I.post(k));
  } catch (e) { L.send(res, 200, { ok: false, error: 'The shift didn’t finish. Try again.' }); }
};

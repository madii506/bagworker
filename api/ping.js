// GET /api/ping  is everything bagworker needs answering?
// ?shot=N  the brand's bagworker agents (fictional adults, made with FLUX once and kept). 0 is the flagship agent's portrait;
// 1..5 are him at work, made from that portrait so it stays the same face; 6..9 are four other agents (every coin gets its own).
const L = require('./_lib');
const AGENT = 'Photorealistic portrait of a fictional 26-year-old man, a sleep-deprived crypto bagworker: messy dark hair, light stubble, black hoodie, slim black headset with a microphone, intense locked-in eyes, lit by the cold blue glow of several computer monitors in a dark room at 3 AM, energy drink can beside him, candid photo, natural skin texture, sharp face, no text';
const KEEP = ' Keep his face, hair, stubble, black hoodie and headset exactly the same. Photorealistic candid photo, natural skin texture, no text, no letters, no logos.';
const SHOTS = [
  null,
  'A new photo of this exact same man: at a desk at 3 AM in front of six monitors full of charts and social feeds, typing fast, empty energy drink cans everywhere, blue screen glow.',
  'A new photo of this exact same man: on a packed subway train posting from his phone with both thumbs, completely focused, headset around his neck.',
  'A new photo of this exact same man: leading a late-night war room, standing at the head of a table while a team works on laptops, pointing at a big screen.',
  'A new photo of this exact same man: asleep face-down on his keyboard at sunrise, monitors still glowing, phone buzzing beside him.',
  'A new photo of this exact same man: celebrating at his desk with both fists up, monitors glowing green behind him, at night.',
  'Photorealistic portrait of a fictional 24-year-old woman, a crypto bagworker: black baseball cap, slim headset with a microphone, oversized grey hoodie, focused eyes, lit by laptop glow in a dark room at night, candid photo, sharp face, no text',
  'Photorealistic portrait of a fictional 45-year-old man in a sharp navy suit wearing a slim headset with a microphone, a serious closer stare, in a dark office lit by trading screens at night, candid photo, sharp face, no text',
  'Photorealistic portrait of a fictional 22-year-old woman with pink-dyed hair and gaming headphones, a crypto bagworker in a neon-lit gaming room at night, grinning at her monitor, candid photo, sharp face, no text',
  'Photorealistic portrait of a fictional 30-year-old man in a black tracksuit and thin gold chain with a slim headset, holding two phones, in a dark apartment at night lit by screens, candid photo, sharp face, no text',
  "Photorealistic phone-camera selfie of a fictional 23-year-old woman TikTok creator with glossy dark hair and gold hoop earrings, filming herself in her bedroom at night, a round ring light reflected in her eyes, pink LED strip lights behind her, playful smile, subject centered, candid, natural skin texture, sharp face, no text",
  "Photorealistic photo of a fictional 25-year-old man TikTok creator in a black puffer jacket filming a street food review at a neon night market, holding skewers toward the camera, excited face, steam and blurred neon behind him, subject centered, candid, sharp face, no text, no letters",
  "Photorealistic photo of a fictional 22-year-old woman with a platinum bob doing a get-ready-with-me at a vanity mirror with round bulbs, holding a lip gloss toward the camera, ring light glow on her face, subject centered, candid, natural skin texture, no text",
  "Photorealistic photo of a fictional 27-year-old man fitness creator in a black sleeveless top filming himself in a gym mirror with his phone after a workout, sweaty and grinning, moody gym lighting, subject centered, sharp face, no text",
  "Photorealistic full-body photo of a fictional 24-year-old woman dancer in an oversized white t-shirt and cargo pants mid-dance on a rooftop at golden hour, city skyline behind her, hair moving, joyful, subject centered, no text",
  "Photorealistic full-body photo of a fictional 29-year-old man in a beige trench coat walking toward the camera through a bright airport terminal with a carry-on suitcase, confident airport-outfit vibe, subject centered, candid, no text, no signs",
  "Photorealistic photo of a fictional 21-year-old woman streamer with headphones and winged eyeliner making a shocked reaction face with her hand over her mouth, purple and blue RGB lights behind her, subject centered, sharp face, no text",
  "Photorealistic photo of a fictional 30-year-old man in a crisp navy suit filming a day-in-my-life vlog on a city sidewalk at sunrise, coffee in hand, talking to the camera, subject centered, candid, sharp face, no text, no signs",
];
module.exports = async (req, res) => {
  L.setOidc(req);
  const sq = L.query(req).shot;
  if (sq != null && /^(1[0-7]|[0-9])$/.test(String(sq)) && L.dbReady()) {
    try {
      await L.ready(); const n = Number(sq);
      let r = (await L.q('SELECT img FROM w0_brand WHERE n=$1', [n]))[0];
      if (!r && !L.limited('shot', 14, 3600000)) {
        let p;
        if (n === 0 || n >= 6) p = await L.photo(n === 0 ? AGENT : SHOTS[n], null, 55000);
        else {
          const f = (await L.q('SELECT img FROM w0_brand WHERE n=0'))[0];
          if (!f) return L.send(res, 200, { ok: false, error: 'make shot 0 first' });
          p = await L.photo(SHOTS[n] + KEEP, Buffer.from(f.img).toString('base64'), 55000);
        }
        if (!p.ok) return L.send(res, 200, { ok: false, error: p.error });
        const img = await require('sharp')(p.buf).jpeg({ quality: 92 }).toBuffer();
        await L.q('INSERT INTO w0_brand (n, img) VALUES ($1,$2) ON CONFLICT (n) DO UPDATE SET img=EXCLUDED.img, at=now()', [n, img]); r = { img };
      }
      if (!r) return L.send(res, 200, { ok: false, error: 'not made yet' });
      res.statusCode = 200; res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('Cache-Control', 'public, max-age=3600'); return res.end(Buffer.from(r.img));
    } catch (e) { return L.send(res, 200, { ok: false, error: String(e && e.message).slice(0, 200) }); }
  }
  L.send(res, 200, { ok: true, records: L.dbReady(), gateway: !!L.gatewayToken(), photos: L.IMG_EDIT });
};

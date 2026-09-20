const LD = require('../ld-core.js');
const N = 4000; let fails = 0; const seenFail = {};
function bad(g, seed, msg) { fails++; seenFail[g] = (seenFail[g] || 0) + 1; if (seenFail[g] <= 3) console.log('FAIL', g, seed, msg); }
const txt = o => typeof o === 'string' ? o : JSON.stringify(o);
for (const g of Object.keys(LD.GEN)) {
  for (let seed = 1; seed <= N; seed++) {
    let q;
    try { q = LD.makeQ(g, seed * 7919); } catch (e) { bad(g, seed, 'THROW ' + e.message); continue; }
    const all = txt(q.prompt) + txt(q.sol) + txt(q.hint) + txt(q.answer) + txt(q.choices || '');
    if (/undefined|NaN|\[object|Infinity|null/.test(all)) bad(g, seed, 'bad token: ' + all.match(/.{0,30}(undefined|NaN|\[object|Infinity|null).{0,30}/)[0]);
    for (const k of ['prompt', 'sol', 'hint']) if (!q[k] || !q[k].uk || !q[k].pl) bad(g, seed, 'missing ' + k);
    if (q.kind === 'input') {
      const res = q.check(String(q.sample));
      if (!res.ok) bad(g, seed, `sample "${q.sample}" rejected: ${JSON.stringify(res)} ans=${q.answer}`);
      if (q.check('???').ok) bad(g, seed, 'garbage accepted');
    } else {
      const set = new Set(q.choices.map(c => txt(c)));
      if (set.size !== q.choices.length) bad(g, seed, 'dup choices ' + txt(q.choices));
      if (!(q.correct >= 0 && q.correct < q.choices.length)) bad(g, seed, 'bad correct idx');
    }
    if (typeof q.lesson !== 'number') bad(g, seed, 'no lesson');
    // детермінізм
    if (seed % 500 === 0) { const q2 = LD.makeQ(g, seed * 7919); if (txt(q2.prompt) !== txt(q.prompt) || txt(q2.sol) !== txt(q.sol)) bad(g, seed, 'non-deterministic'); }
  }
}
console.log(fails ? `TOTAL FAILS: ${fails}` : 'SMOKE PASS (' + Object.keys(LD.GEN).length + ' generators × ' + N + ')');
process.exit(fails ? 1 : 0);

// Незалежна перевірка: умову задачі розбираємо з HTML і рахуємо точними раціональними числами (BigInt).
const LD = require(process.env.CORE||'../ld-core.js');
const gcdB = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
class R { constructor(n, d = 1n) { if (d < 0n) { n = -n; d = -d; } const g = gcdB(n, d) || 1n; this.n = n / g; this.d = d / g; }
  add(o) { return new R(this.n * o.d + o.n * this.d, this.d * o.d); } sub(o) { return new R(this.n * o.d - o.n * this.d, this.d * o.d); }
  cmp(o) { const x = this.n * o.d - o.n * this.d; return x < 0n ? -1 : x > 0n ? 1 : 0; } eq(o) { return this.cmp(o) === 0; }
  toString() { return this.n + '/' + this.d; } }
const B = x => BigInt(x);
const dec = s => { s = s.replace(',', '.'); const neg = s.startsWith('-'); if (neg) s = s.slice(1); const [i, f = ''] = s.split('.'); const v = new R(B(i + f), 10n ** BigInt(f.length)); return neg ? new R(-v.n, v.d) : v; };
// HTML → вираз
function htmlToExpr(h) {
  h = h.replace(/<span class="mx">(\d+)<\/span><span class="fr"><span class="n">(\d+)<\/span><span class="d">(\d+)<\/span><\/span>/g, '($1+$2/$3)');
  h = h.replace(/<span class="fr"><span class="n">([^<]+)<\/span><span class="d">([^<]+)<\/span><\/span>/g, '($1/$2)');
  return h.replace(/<[^>]+>/g, '').replace(/−/g, '-').replace(/&nbsp;/g, ' ').replace(/ /g, '');
}
// рекурсивний спуск: числа (цілі/десяткові), + - * / дужки, унарний мінус
function evalExpr(str) {
  let i = 0; const s = str.replace(/\s+/g, '').replace(/,/g, '.');
  const peek = () => s[i];
  function num() { let m = /^\d+(\.\d+)?/.exec(s.slice(i)); if (!m) throw new Error('num@' + i + ' in ' + s); i += m[0].length; return dec(m[0]); }
  function atom() { if (peek() === '(') { i++; const v = expr(); if (s[i++] !== ')') throw new Error('paren'); return v; } if (peek() === '-') { i++; const v = atom(); return new R(-v.n, v.d); } return num(); }
  function term() { let v = atom(); while (peek() === '/' || peek() === '*') { const op = s[i++]; const w = atom(); v = op === '/' ? new R(v.n * w.d, v.d * w.n) : new R(v.n * w.n, v.d * w.d); } return v; }
  function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const op = s[i++]; const w = term(); v = op === '+' ? v.add(w) : v.sub(w); } return v; }
  const v = expr(); if (i !== s.length) throw new Error('trailing: ' + s.slice(i)); return v;
}
const evalHtml = h => evalExpr(htmlToExpr(h));
// відповідь користувача (рядок) → R
function userVal(str) {
  str = str.trim().replace(/,/g, '.'); let m;
  if ((m = str.match(/^(-?)(\d+) (\d+)\/(\d+)$/))) { const v = new R(B(m[2]) * B(m[4]) + B(m[3]), B(m[4])); return m[1] ? new R(-v.n, v.d) : v; }
  if ((m = str.match(/^(-?\d+)\/(\d+)$/))) return new R(B(m[1]), B(m[2]));
  return dec(str);
}
// періодичний рядок → R
function perVal(s) {
  const m = s.replace(/\./g, ',').match(/^(\d+)(?:,(\d*)(?:\((\d+)\))?)?$/); const ip = B(m[1]), pre = m[2] || '', per = m[3] || '';
  let v = new R(ip); if (pre) v = v.add(new R(B(pre), 10n ** BigInt(pre.length)));
  if (per) v = v.add(new R(B(per), (10n ** BigInt(per.length) - 1n) * 10n ** BigInt(pre.length)));
  return v;
}
const eqOf = h => { const m = h.match(/<div class="eq">(.*?)<\/div>/s); return m ? m[1] : null; };
const stripBlankPrompt = h => eqOf(h.replace(/<span class="blank">\?<\/span>/g, '?'));
const N = +process.argv[2] || 2500; let fails = 0, checks = 0; const cnt = {};
function bad(g, seed, msg) { fails++; cnt[g] = (cnt[g] || 0) + 1; if (cnt[g] <= 3) console.log('FAIL', g, seed, msg); }
const floorDiv = (n, d) => (n >= 0n ? n / d : -((-n + d - 1n) / d));
const roundHalfUp = (v, k) => { const sc = 10n ** BigInt(k); const t = new R(v.n * sc * 2n + v.d, v.d * 2n); return new R(floorDiv(t.n, t.d) * 1n, sc); }; // floor((v*sc*2+1)/2)
function roundTo(v, kDec) { // kDec>=0 десяткових; <0 — розряди цілих
  if (kDec >= 0) { const sc = 10n ** BigInt(kDec); const x = v.n * sc * 2n + v.d; const f = floorDiv(x, v.d * 2n); return new R(f, sc); }
  const un = 10n ** BigInt(-kDec); const x = v.n * 2n + v.d * un; const f = floorDiv(x, v.d * un * 2n); return new R(f * un);
}
const PLACE = [[/десятків тисяч/, -4], [/тисяч \(/, -3], [/сотень/, -2], [/десятків/, -1], [/одиниць/, 0], [/десятих/, 1], [/сотих/, 2], [/тисячних/, 3]];
const placeOf = h => { for (const [re, k] of PLACE) if (re.test(h)) return k; return null; };


const eqE = uk => htmlToExpr(stripBlankPrompt(uk)).replace(/\s+/g, ' ').trim();   // чистий текст рівняння з '?'
for (const g of Object.keys(LD.GEN)) {
  for (let seed = 1; seed <= N; seed++) {
    const S = seed * 104729 + 13; const q = LD.makeQ(g, S); const uk = q.prompt.uk; checks++;
    try {
      switch (g) {
        case 'addSame': case 'addDiff': case 'addMixed': case 'subMixed': case 'addDec': case 'mixedTypes': {
          const e = eqE(uk).replace(/=\s*\?\s*$/, ''); const v = evalExpr(e);
          if (!v.eq(userVal(q.sample))) bad(g, S, `${e} = ${v} but sample=${q.sample}`);
          if (v.n < 0n) bad(g, S, 'negative result');
          break;
        }
        case 'divide': case 'mixDiv': {
          const parts = eqE(uk).split('='); const lhs = evalExpr(parts[0]);
          if (!lhs.eq(perVal(q.sample))) bad(g, S, `${lhs} vs ${q.sample}`);
          const m2 = q.sample.match(/^(\d+)(?:,(\d*)(?:\((\d+)\))?)?$/); const c = LD.canon(+m2[1], m2[2] || '', m2[3] || '');
          if (m2[3] && (c.pre !== (m2[2] || '') || c.per !== m2[3])) bad(g, S, 'not canonical ' + q.sample);
          break;
        }
        case 'expand': case 'mixImp': case 'dec2frac': case 'frac2dec': case 'zeros': {
          const [l, r] = eqE(uk).split('=').map(x => x.trim()); const lv = evalExpr(l);
          let m;
          if ((m = r.match(/^\(\?\/(\d+)\)$/))) { const den = B(m[1]); const want = lv.n * den / lv.d; if (lv.n * den % lv.d !== 0n || String(want) !== q.sample) bad(g, S, `num: ${l}=${r} want ${want} got ${q.sample}`); }
          else if ((m = r.match(/^\((\d+)\/\?\)$/))) { const num = B(m[1]); const want = num * lv.d / lv.n; if (num * lv.d % lv.n !== 0n || String(want) !== q.sample) bad(g, S, `den: ${l}=${r} want ${want} got ${q.sample}`); }
          else if (r === '?') { if (!lv.eq(userVal(q.sample))) bad(g, S, `${l} → ${q.sample}`); }
          else bad(g, S, 'unparsed ' + l + '=' + r);
          break;
        }
        case 'roundInt': case 'roundDec': case 'roundPer': {
          const lhs = evalExpr(eqE(uk).split('≈')[0]); const k = placeOf(uk); if (k === null) { bad(g, S, 'no place ' + uk); break; }
          const want = roundTo(lhs, k);
          if (!want.eq(userVal(q.sample))) bad(g, S, `${eqE(uk)} place=${k}: want ${want} got ${q.sample}`);
          break;
        }
        case 'floorCeil': {
          const lhs = evalExpr(eqE(uk).split('≈')[0]); const k = placeOf(uk); const up = /більшу/.test(uk);
          const sc = 10n ** BigInt(k); const f = floorDiv(lhs.n * sc, lhs.d); const want = new R(up ? (lhs.n * sc % lhs.d === 0n ? f : f + 1n) : f, sc);
          if (!want.eq(userVal(q.sample))) bad(g, S, `want ${want} got ${q.sample}`);
          break;
        }
        case 'compare': case 'cmpPer': {
          const parts = eqE(uk).split('?').map(x => x.trim());
          const conv = x => g === 'cmpPer' ? perVal(x) : evalExpr(x);
          const a = conv(parts[0]), b = conv(parts[1]); const c = a.cmp(b); if (q.choices[q.correct] !== ['&lt;', '=', '&gt;'][c + 1]) bad(g, S, `${parts} → ${q.choices[q.correct]} want cmp ${c}`);
          break;
        }
        case 'classify': {
          const opts = q.choices.map(h => evalHtml(h)); const isInt = v => v.d === 1n; const isNat = v => v.d === 1n && v.n >= 0n;
          const pred = /НЕ є цілим/.test(uk) ? v => !isInt(v) : /цілим, але не натуральним/.test(uk) ? v => isInt(v) && !isNat(v) : v => isNat(v);
          const hits = opts.map((v, i) => pred(v) ? i : -1).filter(i => i >= 0);
          if (hits.length !== 1 || hits[0] !== q.correct) bad(g, S, `hits=${hits} correct=${q.correct} opts=${opts}`);
          break;
        }
        case 'finite': {
          const fm = uk.match(/<span class="n">(\d+)<\/span><span class="d">(\d+)<\/span>/); const n = +fm[1], d = +fm[2];
          let x = d / LD.gcd(n, d); while (x % 2 === 0) x /= 2; while (x % 5 === 0) x /= 5; const e = LD.expand(n, d);
          const fin = e.per === ''; if (fin !== (x === 1) || (fin ? 0 : 1) !== q.correct) bad(g, S, `${n}/${d} fin=${fin} q.correct=${q.correct}`);
          break;
        }
        case 'digits6': {
          const m = eqE(uk).match(/^(\d+),(\d*)\((\d+)\)/); const v = perVal(`${m[1]},${m[2]}(${m[3]})`); const frac = new R(v.n - floorDiv(v.n, v.d) * v.d, v.d);
          let s = '', cur = frac; for (let i = 0; i < 6; i++) { const t = new R(cur.n * 10n, cur.d); const dg = floorDiv(t.n, t.d); s += dg; cur = new R(t.n - dg * t.d, t.d); }
          if (s !== q.sample) bad(g, S, `${m[0]} → ${s} vs ${q.sample}`);
          break;
        }
        case 'short': {
          const m = eqE(uk).match(/^(\d+,\d+)…$/); const shown = m[1].split(',')[1]; const sa = q.sample.match(/^(\d+)(?:,(\d*)(?:\((\d+)\))?)?$/);
          const exp = LD.digitsOf(sa[2] || '', sa[3] || '', shown.length); if (exp !== shown) bad(g, S, `${shown} vs ${q.sample}`);
          break;
        }
        case 'shop': {
          const listItems = [...uk.matchAll(/<li>(?:(\d) × )?[^<]*?<span class="muted">\([^)]*\)<\/span> — ([\d,]+) zł<\/li>/g)];
          const A = +uk.match(/<b>(\d+) zł<\/b>/)[1]; let exact = new R(0n), rounded = 0n;
          for (const it of listItems) { const qty = it[1] ? B(it[1]) : 1n; const price = dec(it[2]); exact = exact.add(new R(price.n * qty, price.d)); rounded += qty * roundTo(price, 0).n; }
          if (!listItems.length) { bad(g, S, 'no items parsed'); break; }
          const ex = exact.cmp(new R(B(A))) <= 0, ro = rounded <= B(A); if (ex !== ro) bad(g, S, `methods disagree ${A} exact=${exact} rounded=${rounded}`);
          if ((ro ? 0 : 1) !== q.correct) bad(g, S, `answer mismatch A=${A} rounded=${rounded} correct=${q.correct}`);
          break;
        }
        case 'axis': {
          const labels = [...q.art.matchAll(/>([−\-]?\d+)<\/text>/g)].map(m => +m[1].replace('−', '-')); const s = labels[0];
          const cx = +q.art.match(/<circle cx="([\d.]+)"/)[1]; const v = (cx - 20) / 100 + s;
          const opt = q.choices[q.correct]; const val = evalHtml(opt);
          if (Math.abs(Number(val.n) / Number(val.d) - v) > 1e-9) bad(g, S, `axis: point=${v} option=${htmlToExpr(opt)}`);
          break;
        }
        case 'missing': {
          const eq = eqE(uk); const ans = userVal(q.sample); const filled = eq.replace('?', '(' + (ans.d === 1n ? ans.n : `${ans.n}/${ans.d}`) + ')'); const [fl, fr_] = filled.split('=');
          if (!evalExpr(fl).eq(evalExpr(fr_))) bad(g, S, `${eq} ans=${q.sample}`);
          break;
        }
        case 'word': {
          const fracs = [...uk.matchAll(/((?:<span class="mx">\d+<\/span>)?<span class="fr">.*?<\/span><\/span>)/g)].map(m => evalHtml(m[1]));
          const ans = userVal(q.sample);
          if (/Кася/.test(uk)) { const nums = [...uk.matchAll(/([\d,]+) zł/g)].map(m => dec(m[1])); const pay = dec(uk.match(/заплатила (\d+) zł/)[1]); if (!pay.sub(nums[0]).sub(nums[1]).eq(ans)) bad(g, S, 'money'); }
          else if (/пройшла/.test(uk)) { if (!fracs[0].add(fracs[1]).eq(ans)) bad(g, S, 'walk ' + fracs); }
          else if (fracs.length === 2) { if (!fracs[0].sub(fracs[1]).eq(ans)) bad(g, S, 'sub ' + fracs + ' ' + q.sample); }
          else bad(g, S, 'unparsed word');
          break;
        }
        case 'which': {
          const num = uk.match(/округлюєш ([\d,]+) до/)[1]; const k = placeOf(uk); const digits = num.split(',')[1]; const want = digits[k];
          const got = q.choices[q.correct].uk.match(/цифра (\d)/)[1]; if (want !== got) bad(g, S, `${num} k=${k} want ${want} got ${got}`);
          break;
        }
      }
    } catch (e) { bad(g, S, 'EXC ' + e.message + ' :: ' + uk.slice(0, 200)); }
  }
}
console.log(fails ? `VERIFY FAILS: ${fails} / ${checks}` : `VERIFY PASS: ${checks} questions independently recomputed`);
process.exit(fails ? 1 : 0);

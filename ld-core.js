/* Liczby i działania · lekcje 1–4 — logika: математика, перевірка відповідей, генератори задач.
   Без DOM. Кожна задача відтворюється з (назва генератора, seed), тому помилки можна зберігати й повторювати. */
(function (root) {
'use strict';

/* ---------- утиліти ---------- */
const T = (uk, pl) => ({ uk, pl });
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
function shuffle(r, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
const lcm = (a, b) => a / gcd(a, b) * b;
const pow10 = k => Math.pow(10, k);

/* ---------- дроби ---------- */
const fr = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
const fadd = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const fsub = (a, b) => fr(a.n * b.d - b.n * a.d, a.d * b.d);
const fcmp = (a, b) => Math.sign(a.n * b.d - b.n * a.d);
const flt = f => f.n / f.d;

/* ---------- відображення (HTML) ---------- */
const MINUS = '−';
const F = (n, d) => `<span class="fr"><span class="n">${n}</span><span class="d">${d}</span></span>`;
const MX = (w, n, d) => `<span class="mx">${w}</span>${F(n, d)}`;
const BLANK = '<span class="blank">?</span>';
const fracH = f => (f.n < 0 ? MINUS : '') + (f.d === 1 ? Math.abs(f.n) : F(Math.abs(f.n), f.d));
const mixH = f => {
  const n = Math.abs(f.n), w = Math.floor(n / f.d), rem = n % f.d;
  const h = rem === 0 ? String(w) : w === 0 ? F(rem, f.d) : MX(w, rem, f.d);
  return (f.n < 0 ? MINUS : '') + h;
};
function decH(v, p) { // v — ціле, масштабоване на 10^p
  const neg = v < 0; let s = String(Math.abs(v));
  if (p > 0) { while (s.length <= p) s = '0' + s; s = s.slice(0, s.length - p) + ',' + s.slice(s.length - p); }
  return (neg ? MINUS : '') + s;
}
function decMin(v, p) { // без зайвих нулів у кінці
  while (p > 0 && v % 10 === 0) { v /= 10; p--; }
  return decH(v, p);
}
const grp = n => (n >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(n));
const B = s => `<b>${s}</b>`;

/* ---------- парсинг відповіді користувача ---------- */
function norm(s) {
  s = String(s).trim().replace(/[−–—]/g, '-').replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').replace(/,/g, '.');
  if (/^-?\d{1,3}( \d{3})+(\.\d+)?$/.test(s)) s = s.replace(/ /g, '');
  return s;
}
function parseNum(str) {
  const s = norm(str); let m;
  if (s.length > 24) return null;
  if ((m = s.match(/^(-?)(\d+)$/))) return { kind: 'int', v: fr(+(m[1] + m[2])) };
  if ((m = s.match(/^(-?)(\d+)\.(\d+)$/))) return { kind: 'dec', v: fr(+(m[1] + m[2] + m[3]), pow10(m[3].length)) };
  if ((m = s.match(/^(-?)(\d+)\/(\d+)$/))) {
    const n = +m[2], d = +m[3]; if (!d) return null;
    return { kind: 'frac', v: fr(+(m[1] + m[2]), d), reduced: gcd(n, d) === 1, proper: n < d };
  }
  if ((m = s.match(/^(-?)(\d+) (\d+)\/(\d+)$/))) {
    const w = +m[2], n = +m[3], d = +m[4]; if (!d) return null;
    const tot = w * d + n;
    return { kind: 'mixed', v: fr(m[1] ? -tot : tot, d), reduced: gcd(n, d) === 1, proper: n < d };
  }
  return null;
}

/* ---------- розвинення в десятковий дріб ---------- */
function expand(n, d) {
  const ip = Math.floor(n / d); let rem = n % d;
  const seen = {}, digs = [], rems = [];
  while (rem !== 0 && seen[rem] === undefined) {
    seen[rem] = digs.length; rems.push(rem); rem *= 10; digs.push(Math.floor(rem / d)); rem %= d;
  }
  let pre, per;
  if (rem === 0) { pre = digs.join(''); per = ''; }
  else { const s = seen[rem]; pre = digs.slice(0, s).join(''); per = digs.slice(s).join(''); }
  return { ip, pre, per, digs, rems, endRem: rem };
}
const fmtExp = e => String(e.ip) + (e.pre || e.per ? ',' + e.pre + (e.per ? '(' + e.per + ')' : '') : '');
const fmtExpH = e => fmtExp(e).replace('.', ',');
function digitsOf(pre, per, n) {
  const out = []; for (let i = 0; i < pre.length && out.length < n; i++) out.push(pre[i]);
  if (per) { let i = 0; while (out.length < n) out.push(per[i++ % per.length]); }
  while (out.length < n) out.push('0');
  return out.join('');
}
function primitive(per) {
  for (let k = 1; k <= per.length; k++) if (per.length % k === 0 && per.slice(0, k).repeat(per.length / k) === per) return per.slice(0, k);
  return per;
}
function canon(ip, pre, per) { // найкоротший запис: мінімальний передперіод і період
  if (!per) return { ip, pre, per };
  per = primitive(per);
  while (pre && pre.slice(-1) === per.slice(-1)) { pre = pre.slice(0, -1); per = per.slice(-1) + per.slice(0, -1); }
  return { ip, pre, per };
}
function parseDecStr(str) {
  const s = String(str).trim().replace(/[…]|\.\.\./g, '').replace(/\s+/g, '').replace(/\./g, ',');
  const m = s.match(/^(\d+)(?:,(\d*)(?:\((\d+)\))?)?$/);
  if (!m) return null;
  if (m[3] === undefined && /\(|\)/.test(s)) return null;
  return { ip: +m[1], pre: m[2] || '', per: m[3] || '', raw: s };
}
function perCheck(trueExp) {
  const N = 40;
  return function (s) {
    const u = parseDecStr(s); if (!u) return { ok: false, code: 'fmt' };
    if (u.ip === trueExp.ip && digitsOf(u.pre, u.per, N) === digitsOf(trueExp.pre, trueExp.per, N)) {
      const canonStr = fmtExp(trueExp);
      return { ok: true, equiv: u.raw !== canonStr ? canonStr : null };
    }
    if (!u.per && trueExp.per && u.ip === trueExp.ip && digitsOf(u.pre, '', 6) === digitsOf(trueExp.pre, trueExp.per, 6)) return { ok: false, code: 'per' };
    return { ok: false, code: 'val' };
  };
}

/* ---------- перевірка числових відповідей ---------- */
function numCheck(target, form) {
  return function (s) {
    const p = parseNum(s);
    if (!p) return { ok: false, code: 'fmt' };
    if (fcmp(p.v, target) !== 0) return { ok: false, code: 'val' };
    switch (form) {
      case 'int': return p.kind === 'int' ? { ok: true } : { ok: false, code: 'val' };
      case 'dec': return (p.kind === 'int' || p.kind === 'dec') ? { ok: true } : { ok: false, code: 'form-dec' };
      case 'frac':
        if (p.kind === 'mixed' || p.kind === 'dec') return { ok: false, code: 'form-frac' };
        if (p.kind === 'frac' && !p.reduced) return { ok: false, code: 'reduce' };
        return { ok: true };
      case 'mixed': {
        if (p.kind === 'int') return { ok: true };
        if (p.kind === 'dec') return { ok: false, code: 'form-mixed' };
        const proper = target.n >= 0 && target.n < target.d;
        if (p.kind === 'frac') {
          if (!p.reduced) return { ok: false, code: 'reduce' };
          return proper ? { ok: true } : { ok: false, code: 'form-mixed' };
        }
        if (!p.proper) return { ok: false, code: 'form-mixed' };
        if (!p.reduced) return { ok: false, code: 'reduce' };
        return { ok: true };
      }
      default: return { ok: true };
    }
  };
}
function digitsCheck(ans) {
  return function (s) {
    let t = String(s).replace(/[…]|\.\.\./g, '');
    if (/[,.]/.test(t)) t = t.split(/[,.]/).pop();
    t = t.replace(/[\s]/g, '');
    if (!/^\d+$/.test(t)) return { ok: false, code: 'fmt' };
    return t === ans ? { ok: true } : { ok: false, code: 'val' };
  };
}

/* ---------- каркас задачі ---------- */
function inputQ(o) { return Object.assign({ kind: 'input' }, o); }
function choiceQ(o, choices, correct) { return Object.assign({ kind: 'choice', fmt: 'choice', choices, correct, sample: correct }, o); }
const CMP_CHOICES = ['&lt;', '=', '&gt;'];
const cmpIdx = c => (c < 0 ? 0 : c === 0 ? 1 : 2);
const cmpSym = c => CMP_CHOICES[cmpIdx(c)];

/* назви розрядів */
const PL = {
  3: T('тисяч (do tysięcy)', 'do tysięcy'), 2: T('сотень (do setek)', 'do setek'), 1: T('десятків (do dziesiątek)', 'do dziesiątek'),
  0: T('одиниць (do jedności)', 'do jedności'), '-1': T('десятих (do dziesiątych)', 'do dziesiątych'),
  '-2': T('сотих (do setnych)', 'do setnych'), '-3': T('тисячних (do tysięcznych)', 'do tysięcznych')
};
const PLN = { // назви розряду цифри
  3: T('тисячі', 'tysiące'), 2: T('сотні', 'setki'), 1: T('десятки', 'dziesiątki'), 0: T('одиниці', 'jedności'),
  '-1': T('десяті', 'dziesiąte'), '-2': T('соті', 'setne'), '-3': T('тисячні', 'tysięczne'), '-4': T('десятитисячні', 'dziesięciotysięczne')
};

/* кінцівка розв'язку: скоротити + виділити цілу частину */
function finishSol(n, d) {
  const uk = [], pl = [];
  const g = gcd(n, d);
  let cn = n, cd = d;
  if (g > 1 && d !== 1) {
    cn = n / g; cd = d / g;
    uk.push(`Скорочуємо на ${g}: ${F(n, d)} = ${F(cn, cd)}.`);
    pl.push(`Skracamy przez ${g}: ${F(n, d)} = ${F(cn, cd)}.`);
  }
  if (cd !== 1 && cn > cd) {
    const w = Math.floor(cn / cd), rem = cn % cd;
    if (rem === 0) { uk.push(`${cn} : ${cd} = ${w}.`); pl.push(`${cn} : ${cd} = ${w}.`); }
    else {
      uk.push(`Виділяємо цілу частину: ${cn} : ${cd} = ${w}, залишок ${rem} → ${MX(w, rem, cd)}.`);
      pl.push(`Wyłączamy całości: ${cn} : ${cd} = ${w}, reszta ${rem} → ${MX(w, rem, cd)}.`);
    }
  } else if (cd === 1) { /* ціле */ }
  return { uk, pl };
}
const joinSol = (uk, pl) => T(uk.join('<br>'), pl.join('<br>'));

/* ============================================================
   ГЕНЕРАТОРИ
   ============================================================ */
const GEN = {};
const COPRIME_PAIRS = (lo, hi) => { const a = []; for (let q = lo; q <= hi; q++) for (let p = 1; p < q; p++) if (gcd(p, q) === 1) a.push([p, q]); return a; };

/* ---------- УРОК 1 · Liczby ---------- */
GEN.classify = function (r) {
  const mk = kind => {
    if (kind === 'nat') {
      if (r() < 0.65) { const n = ri(r, 0, 150); return { h: String(n), v: fr(n) }; }
      const m = ri(r, 2, 9), k = ri(r, 1, 15); return { h: F(k * m, m), v: fr(k) };
    }
    if (kind === 'neg') {
      if (r() < 0.6) { const n = ri(r, 1, 60); return { h: MINUS + n, v: fr(-n) }; }
      const m = ri(r, 2, 9), k = ri(r, 1, 12); return { h: MINUS + F(k * m, m), v: fr(-k) };
    }
    const t = r(), neg = r() < 0.4;
    if (t < 0.4) { const q = ri(r, 2, 12); let p; do { p = ri(r, 1, 30); } while (p % q === 0); return { h: (neg ? MINUS : '') + F(p, q), v: fr(neg ? -p : p, q) }; }
    if (t < 0.75) { const s = pick(r, ['0,5', '2,5', '1,25', '0,75', '3,4', '0,2', '7,8', '12,6', '0,125']); const v = parseNum(s).v; return { h: (neg ? MINUS : '') + s, v: neg ? fr(-v.n, v.d) : v }; }
    const w = ri(r, 1, 9), q = ri(r, 2, 9), p = ri(r, 1, q - 1); return { h: (neg ? MINUS : '') + MX(w, p, q), v: fr(neg ? -(w * q + p) : (w * q + p), q) };
  };
  const variant = ri(r, 0, 2);
  const spec = [
    { need: ['rat', 'nat', 'neg', 'nat'], q: T('Яке з чисел <b>НЕ є цілим</b>?', 'Która z liczb <b>NIE jest całkowita</b>?') },
    { need: ['neg', 'nat', 'nat', 'rat'], q: T('Яке з чисел є <b>цілим, але не натуральним</b>?', 'Która z liczb jest <b>całkowita, ale nie naturalna</b>?') },
    { need: ['nat', 'neg', 'rat', 'rat'], q: T('Яке з чисел є <b>натуральним</b>?', 'Która z liczb jest <b>naturalna</b>?') }
  ][variant];
  let opts, tries = 0;
  do { opts = spec.need.map(k => mk(k === 'rat' ? 'rat' : k)); tries++; } while (new Set(opts.map(o => o.h)).size < 4 && tries < 50);
  const order = shuffle(r, [0, 1, 2, 3]);
  const shown = order.map(i => opts[i]);
  const correct = order.indexOf(0);
  const cls = v => (v.d !== 1 ? 'rat' : v.n >= 0 ? 'nat' : 'neg');
  const NAME = { nat: T('натуральне (naturalna)', 'naturalna'), neg: T('ціле від’ємне, не натуральне (całkowita ujemna)', 'całkowita ujemna, nie naturalna'), rat: T('раціональне, не ціле (wymierna)', 'wymierna, nie całkowita') };
  const lines = shown.map(o => {
    const val = o.v.d === 1 ? String(o.v.n).replace('-', MINUS) : fracH(o.v);
    const disguised = !/^[−]?\d+$/.test(o.h);
    return { uk: `${o.h}${disguised ? ' = ' + val : ''} → ${NAME[cls(o.v)].uk}`, pl: `${o.h}${disguised ? ' = ' + val : ''} → ${NAME[cls(o.v)].pl}` };
  });
  return choiceQ({
    lesson: 1, prompt: spec.q,
    hint: T('Натуральні: 0, 1, 2, 3… Цілі: ще й від’ємні. Раціональні: усе, що можна записати дробом. Спочатку спрости дріб!', 'Naturalne: 0, 1, 2, 3… Całkowite: także ujemne. Wymierne: wszystko, co da się zapisać ułamkiem. Najpierw uprość ułamek!'),
    answer: shown[correct].h,
    sol: T(lines.map(l => l.uk).join('<br>'), lines.map(l => l.pl).join('<br>'))
  }, shown.map(o => o.h), correct);
};

GEN.expand = function (r) {
  const mode = pick(r, ['exp-num', 'exp-den', 'red-num', 'red-den', 'whole']);
  if (mode === 'whole') {
    const w = ri(r, 1, 15), m = ri(r, 2, 9), ans = w * m;
    return inputQ({
      lesson: 1, fmt: 'int',
      prompt: T(`Впиши пропущене число (liczbę), щоб рівність була правдивою:<div class="eq">${w} = ${F(BLANK, m)}</div>`, `Wpisz brakującą liczbę, aby równość była prawdziwa:<div class="eq">${w} = ${F(BLANK, m)}</div>`),
      hint: T('Ціле число = дріб зі знаменником 1. Знаменник збільшили — чисельник збільшуємо так само.', 'Liczba całkowita = ułamek o mianowniku 1. Mianownik rośnie — licznik rośnie tyle samo razy.'),
      answer: String(ans), check: numCheck(fr(ans), 'int'), sample: String(ans),
      sol: T(`${w} = ${F(w, 1)}. Знаменник 1 → ${m}: множимо на ${m}. Чисельник: ${w} · ${m} = ${B(ans)}.`, `${w} = ${F(w, 1)}. Mianownik 1 → ${m}: mnożymy przez ${m}. Licznik: ${w} · ${m} = ${B(ans)}.`)
    });
  }
  const pairs = COPRIME_PAIRS(2, 12); const [p, q] = pick(r, pairs); const k = ri(r, 2, 8);
  let eq, ans, ukS, plS;
  if (mode === 'exp-num') {
    eq = `${F(p, q)} = ${F(BLANK, q * k)}`; ans = p * k;
    ukS = `Знаменник ${q} → ${q * k}: помножили на ${k}. Чисельник теж множимо на ${k}: ${p} · ${k} = ${B(ans)}.`;
    plS = `Mianownik ${q} → ${q * k}: pomnożono przez ${k}. Licznik też mnożymy przez ${k}: ${p} · ${k} = ${B(ans)}.`;
  } else if (mode === 'exp-den') {
    eq = `${F(p, q)} = ${F(p * k, BLANK)}`; ans = q * k;
    ukS = `Чисельник ${p} → ${p * k}: помножили на ${k}. Знаменник теж множимо на ${k}: ${q} · ${k} = ${B(ans)}.`;
    plS = `Licznik ${p} → ${p * k}: pomnożono przez ${k}. Mianownik też mnożymy przez ${k}: ${q} · ${k} = ${B(ans)}.`;
  } else if (mode === 'red-num') {
    eq = `${F(p * k, q * k)} = ${F(BLANK, q)}`; ans = p;
    ukS = `Знаменник ${q * k} → ${q}: поділили на ${k}. Чисельник теж ділимо на ${k}: ${p * k} : ${k} = ${B(ans)}.`;
    plS = `Mianownik ${q * k} → ${q}: podzielono przez ${k}. Licznik też dzielimy przez ${k}: ${p * k} : ${k} = ${B(ans)}.`;
  } else {
    eq = `${F(p * k, q * k)} = ${F(p, BLANK)}`; ans = q;
    ukS = `Чисельник ${p * k} → ${p}: поділили на ${k}. Знаменник теж ділимо на ${k}: ${q * k} : ${k} = ${B(ans)}.`;
    plS = `Licznik ${p * k} → ${p}: podzielono przez ${k}. Mianownik też dzielimy przez ${k}: ${q * k} : ${k} = ${B(ans)}.`;
  }
  return inputQ({
    lesson: 1, fmt: 'int',
    prompt: T(`Впиши пропущене число (liczbę), щоб дроби були рівні:<div class="eq">${eq}</div>`, `Wpisz brakującą liczbę, aby ułamki były równe:<div class="eq">${eq}</div>`),
    hint: T('Розширення і скорочення: чисельник і знаменник множимо (ділимо) на те саме число.', 'Rozszerzanie i skracanie: licznik i mianownik mnożymy (dzielimy) przez tę samą liczbę.'),
    answer: String(ans), check: numCheck(fr(ans), 'int'), sample: String(ans), sol: T(ukS, plS)
  });
};

GEN.mixImp = function (r) {
  const mode = pick(r, ['toImp', 'num', 'toMixed']);
  const [p, q] = pick(r, COPRIME_PAIRS(2, 12)); const w = ri(r, 1, 9);
  const N = w * q + p;
  if (mode === 'toMixed') {
    return inputQ({
      lesson: 1, fmt: 'mixed',
      prompt: T(`Запиши як мішане число (liczba mieszana):<div class="eq">${F(N, q)} = ?</div>`, `Zapisz w postaci liczby mieszanej:<div class="eq">${F(N, q)} = ?</div>`),
      hint: T('Ділимо чисельник на знаменник: частка — ціла частина, залишок — новий чисельник.', 'Dzielimy licznik przez mianownik: iloraz to całość, reszta to nowy licznik.'),
      answer: MX(w, p, q), check: numCheck(fr(N, q), 'mixed'), sample: `${w} ${p}/${q}`,
      sol: T(`${N} : ${q} = ${w}, залишок ${p}. Отже ${F(N, q)} = ${B(MX(w, p, q))}.`, `${N} : ${q} = ${w}, reszta ${p}. Zatem ${F(N, q)} = ${B(MX(w, p, q))}.`)
    });
  }
  if (mode === 'num') {
    return inputQ({
      lesson: 1, fmt: 'int',
      prompt: T(`Впиши пропущений чисельник (licznik):<div class="eq">${MX(w, p, q)} = ${F(BLANK, q)}</div>`, `Wpisz brakujący licznik:<div class="eq">${MX(w, p, q)} = ${F(BLANK, q)}</div>`),
      hint: T('Ціла частина · знаменник + чисельник.', 'Całość · mianownik + licznik.'),
      answer: String(N), check: numCheck(fr(N), 'int'), sample: String(N),
      sol: T(`${w} · ${q} + ${p} = ${w * q} + ${p} = ${B(N)}.`, `${w} · ${q} + ${p} = ${w * q} + ${p} = ${B(N)}.`)
    });
  }
  return inputQ({
    lesson: 1, fmt: 'frac',
    prompt: T(`Перетвори на неправильний дріб (ułamek niewłaściwy):<div class="eq">${MX(w, p, q)} = ?</div>`, `Zamień na ułamek niewłaściwy:<div class="eq">${MX(w, p, q)} = ?</div>`),
    hint: T('Ціла частина · знаменник + чисельник — над тим самим знаменником.', 'Całość · mianownik + licznik — nad tym samym mianownikiem.'),
    answer: F(N, q), check: numCheck(fr(N, q), 'frac'), sample: `${N}/${q}`,
    sol: T(`${MX(w, p, q)} = ${w} + ${F(p, q)} = ${F(w * q, q)} + ${F(p, q)} = ${B(F(N, q))}.`, `${MX(w, p, q)} = ${w} + ${F(p, q)} = ${F(w * q, q)} + ${F(p, q)} = ${B(F(N, q))}.`)
  });
};

GEN.dec2frac = function (r) {
  const k = ri(r, 1, 3); let num;
  do { num = ri(r, 1, pow10(k) - 1); } while (num % 10 === 0);
  const ip = r() < 0.5 ? 0 : ri(r, 1, 4);
  const total = ip * pow10(k) + num, target = fr(total, pow10(k));
  const shownDec = decH(total, k);
  const g = gcd(num, pow10(k));
  const uk = [], pl = [];
  uk.push(`${shownDec}: ${k} ${k === 1 ? 'цифра' : k < 5 && k > 1 ? 'цифри' : 'цифр'} після коми → знаменник ${pow10(k)}.`);
  pl.push(`${shownDec}: ${k} ${k === 1 ? 'cyfra' : 'cyfry'} po przecinku → mianownik ${pow10(k)}.`);
  const numStr = String(num);
  uk.push(`${shownDec} = ${ip ? MX(ip, numStr, pow10(k)) : F(numStr, pow10(k))}${g === 1 ? ' — цей дріб вже нескоротний.' : '.'}`);
  pl.push(`${shownDec} = ${ip ? MX(ip, numStr, pow10(k)) : F(numStr, pow10(k))}${g === 1 ? ' — ten ułamek jest już nieskracalny.' : '.'}`);
  if (g > 1) {
    const uu = [`Скорочуємо на ${g}: ${F(num, pow10(k))} = ${F(num / g, pow10(k) / g)}.`], pp = [`Skracamy przez ${g}: ${F(num, pow10(k))} = ${F(num / g, pow10(k) / g)}.`];
    uk.push(...uu); pl.push(...pp);
  }
  const ansH = ip ? MX(ip, num / g, pow10(k) / g) : F(num / g, pow10(k) / g);
  const sm = ip ? `${ip} ${num / g}/${pow10(k) / g}` : `${num / g}/${pow10(k) / g}`;
  return inputQ({
    lesson: 1, fmt: ip ? 'mixed' : 'frac',
    prompt: T(`Запиши як ${ip ? 'мішане число' : 'звичайний дріб'} і <b>скороти</b> (${ip ? 'liczba mieszana' : 'ułamek zwykły'}):<div class="eq">${shownDec} = ?</div>`, `Zapisz w postaci ${ip ? 'liczby mieszanej' : 'ułamka zwykłego'} i <b>skróć</b>:<div class="eq">${shownDec} = ?</div>`),
    hint: T('Скільки цифр після коми — стільки нулів у знаменнику: 1 цифра → 10, 2 → 100, 3 → 1000.', 'Ile cyfr po przecinku — tyle zer w mianowniku: 1 cyfra → 10, 2 → 100, 3 → 1000.'),
    answer: ansH, check: numCheck(target, ip ? 'mixed' : 'frac'), sample: sm, sol: joinSol(uk, pl)
  });
};

GEN.frac2dec = function (r) {
  const q = pick(r, [2, 4, 5, 8, 20, 25, 40, 50]); const p = ri(r, 1, q - 1); const w = r() < 0.4 ? ri(r, 1, 5) : 0;
  const k = [2, 5].includes(q) ? 1 : [4, 20, 25, 50].includes(q) ? 2 : 3;
  const m = pow10(k) / q, N = w * q + p, scaled = N * m;
  const shown = w ? MX(w, p, q) : F(p, q);
  const ukL = [], plL = [];
  ukL.push(`Розширюємо знаменник ${q} до ${pow10(k)}: множимо на ${m}.`);
  plL.push(`Rozszerzamy mianownik ${q} do ${pow10(k)}: mnożymy przez ${m}.`);
  ukL.push(`${F(p, q)} = ${F(p * m, pow10(k))} = ${decH(p * m, k)}${w ? `; додаємо цілу частину ${w}: ${B(decH(scaled, k))}` : ''}.`);
  plL.push(`${F(p, q)} = ${F(p * m, pow10(k))} = ${decH(p * m, k)}${w ? `; dodajemy całość ${w}: ${B(decH(scaled, k))}` : ''}.`);
  return inputQ({
    lesson: 1, fmt: 'dec',
    prompt: T(`Запиши десятковим дробом (ułamek dziesiętny):<div class="eq">${shown} = ?</div>`, `Zapisz w postaci ułamka dziesiętnego:<div class="eq">${shown} = ?</div>`),
    hint: T('Розшир дріб так, щоб у знаменнику було 10, 100 або 1000.', 'Rozszerz ułamek tak, aby w mianowniku było 10, 100 lub 1000.'),
    answer: decMin(scaled, k), check: numCheck(fr(scaled, pow10(k)), 'dec'), sample: decH(scaled, k).replace(MINUS, '-'),
    sol: joinSol(ukL, plL)
  });
};

GEN.zeros = function (r) {
  const k = ri(r, 1, 3); const num = k === 1 ? ri(r, 1, 9) : ri(r, 1, k === 2 ? 20 : 30);
  const w = r() < 0.5 ? 0 : ri(r, 1, 3);
  const total = w * pow10(k) + num;
  const shown = w ? MX(w, num, pow10(k)) : F(num, pow10(k));
  return inputQ({
    lesson: 1, fmt: 'dec',
    prompt: T(`Запиши десятковим дробом. Уважно з нулями!<div class="eq">${shown} = ?</div>`, `Zapisz w postaci ułamka dziesiętnego. Uważaj na zera!<div class="eq">${shown} = ?</div>`),
    hint: T('Нулів у знаменнику стільки, скільки цифр після коми. Якщо чисельник коротший — доповни нулями зліва.', 'Tyle zer w mianowniku, ile cyfr po przecinku. Jeśli licznik jest krótszy — dopisz zera z lewej.'),
    answer: decH(total, k), check: numCheck(fr(total, pow10(k)), 'dec'), sample: decH(total, k).replace(MINUS, '-'),
    sol: T(`У знаменнику ${pow10(k)} — ${k} ${k === 1 ? 'нуль' : k < 5 ? 'нулі' : 'нулів'}, тому після коми має бути стільки ж цифр. Чисельник ${num} ${String(num).length < k ? 'коротший — дописуємо нулі зліва, щоб цифр стало стільки, скільки нулів у знаменнику' : 'має якраз потрібну кількість цифр'}: ${B(decH(total, k))}.`,
      `W mianowniku ${pow10(k)} jest ${k} ${k === 1 ? 'zero' : 'zera'}, więc po przecinku ma być tyle samo cyfr. Licznik ${num} ${String(num).length < k ? 'jest krótszy — dopisujemy zera z lewej, aby cyfr było tyle, ile zer w mianowniku' : 'ma dokładnie tyle cyfr, ile trzeba'}: ${B(decH(total, k))}.`)
  });
};

GEN.compare = function (r) {
  const v = ri(r, 1, 3);
  let aH, bH, c, uk, pl, hint;
  if (v === 1) { // десяткові, можливо від’ємні
    let A = ri(r, 10, 999), Bv;
    if (r() < 0.08) Bv = A; else { do { Bv = A + ri(r, -9, 9) * (r() < 0.5 ? 1 : 10); } while (Bv < 1 || Bv === A); }
    const neg = r() < 0.6;
    aH = (neg ? MINUS : '') + decMin(A, 2); bH = (neg ? MINUS : '') + decMin(Bv, 2);
    const a2 = neg ? -A : A, b2 = neg ? -Bv : Bv;
    c = Math.sign(a2 - b2);
    const pa = decH(A, 2), pb = decH(Bv, 2);
    uk = `Дописуємо нулі, щоб була однакова кількість цифр: ${pa} і ${pb}. Порівнюємо як цілі числа: ${A} ${cmpSym(Math.sign(A - Bv))} ${Bv}.` +
      (neg ? `<br>Числа <b>від’ємні</b> — знак змінюється на протилежний: ${aH} ${cmpSym(c)} ${bH}. (Ближче до нуля = більше.)` : `<br>Отже ${aH} ${cmpSym(c)} ${bH}.`);
    pl = `Dopisujemy zera, aby było tyle samo cyfr: ${pa} i ${pb}. Porównujemy jak liczby całkowite: ${A} ${cmpSym(Math.sign(A - Bv))} ${Bv}.` +
      (neg ? `<br>Liczby są <b>ujemne</b> — znak porównania się odwraca: ${aH} ${cmpSym(c)} ${bH}. (Bliżej zera = większa.)` : `<br>Zatem ${aH} ${cmpSym(c)} ${bH}.`);
    hint = T('Порівнюй розряди зліва направо. Для від’ємних чисел — навпаки: що ближче до нуля, то більше.', 'Porównuj rzędy od lewej do prawej. Dla liczb ujemnych odwrotnie: im bliżej zera, tym większa.');
  } else if (v === 2) { // дріб і десятковий
    const q = pick(r, [2, 4, 5, 8, 10, 20, 25]); const p = ri(r, 1, q * 2 - 1);
    const fs = p * (1000 / q); let D;
    if (r() < 0.1) D = fs; else { do { D = fs + ri(r, -10, 10) * 10; } while (D <= 0 || D === fs); }
    aH = F(p, q); bH = decMin(D, 3);
    c = Math.sign(fs - D);
    uk = `Перетворимо дріб у десятковий: ${F(p, q)} = ${p} : ${q} = ${decMin(fs, 3)}.<br>Порівнюємо: ${decMin(fs, 3)} ${cmpSym(c)} ${bH}, тому ${aH} ${cmpSym(c)} ${bH}.`;
    pl = `Zamieniamy ułamek na dziesiętny: ${F(p, q)} = ${p} : ${q} = ${decMin(fs, 3)}.<br>Porównujemy: ${decMin(fs, 3)} ${cmpSym(c)} ${bH}, więc ${aH} ${cmpSym(c)} ${bH}.`;
    hint = T('Приведи обидва числа до одного вигляду — обидва десяткові.', 'Sprowadź obie liczby do tej samej postaci — obie dziesiętne.');
  } else { // два дроби
    let q1, q2, p1, p2;
    do { q1 = ri(r, 2, 12); q2 = ri(r, 2, 12); } while (q1 === q2);
    p1 = ri(r, 1, q1 - 1); p2 = ri(r, 1, q2 - 1);
    const neg = r() < 0.25; const L = lcm(q1, q2);
    const n1 = p1 * (L / q1), n2 = p2 * (L / q2);
    aH = (neg ? MINUS : '') + F(p1, q1); bH = (neg ? MINUS : '') + F(p2, q2);
    c = Math.sign(n1 - n2) * (neg ? -1 : 1);
    uk = `Спільний знаменник — ${L}: ${F(p1, q1)} = ${F(n1, L)}, ${F(p2, q2)} = ${F(n2, L)}.<br>Порівнюємо чисельники: ${n1} ${cmpSym(Math.sign(n1 - n2))} ${n2}.` + (neg ? `<br>Числа від’ємні → знак порівняння обертається: ${aH} ${cmpSym(c)} ${bH}.` : `<br>Отже ${aH} ${cmpSym(c)} ${bH}.`);
    pl = `Wspólny mianownik — ${L}: ${F(p1, q1)} = ${F(n1, L)}, ${F(p2, q2)} = ${F(n2, L)}.<br>Porównujemy liczniki: ${n1} ${cmpSym(Math.sign(n1 - n2))} ${n2}.` + (neg ? `<br>Liczby ujemne → znak porównania się odwraca: ${aH} ${cmpSym(c)} ${bH}.` : `<br>Zatem ${aH} ${cmpSym(c)} ${bH}.`);
    hint = T('Знайди спільний знаменник (NWW) і порівняй чисельники.', 'Znajdź wspólny mianownik (NWW) i porównaj liczniki.');
  }
  return choiceQ({
    lesson: 1, prompt: T(`Постав знак (wstaw znak) &lt; , = або &gt; :<div class="eq">${aH} &nbsp;<span class="blank">?</span>&nbsp; ${bH}</div>`, `Wstaw znak &lt; , = lub &gt; :<div class="eq">${aH} &nbsp;<span class="blank">?</span>&nbsp; ${bH}</div>`),
    hint, answer: cmpSym(c), sol: T(uk, pl)
  }, CMP_CHOICES, cmpIdx(c));
};

function axisSVG(s, m, val, style) { // val — дріб; s — початок осі; 3 одиниці
  const x = v => 20 + (v - s) * 100, W = 340, y = 46;
  let g = `<line x1="8" y1="${y}" x2="${W - 8}" y2="${y}" stroke="currentColor" stroke-width="2"/><polygon points="${W - 8},${y} ${W - 17},${y - 4} ${W - 17},${y + 4}" fill="currentColor"/>`;
  for (let t = 0; t <= 3 * m; t++) {
    const v = s + t / m, major = t % m === 0, h = major ? 9 : 5;
    g += `<line x1="${x(v)}" y1="${y - h}" x2="${x(v)}" y2="${y + h}" stroke="currentColor" stroke-width="${major ? 2 : 1.3}"/>`;
    if (major) g += `<text x="${x(v)}" y="${y + 26}" text-anchor="middle" font-size="14" fill="currentColor">${String(v).replace('-', MINUS)}</text>`;
  }
  const cx = x(flt(val));
  g += `<circle cx="${cx}" cy="${y}" r="6.5" fill="#d65f5f"/><text x="${cx}" y="${y - 14}" text-anchor="middle" font-size="15" font-weight="700" fill="#d65f5f">A</text>`;
  return `<svg class="axis" viewBox="0 0 ${W} 74" role="img" aria-label="number line">${g}</svg>`;
}
GEN.axis = function (r) {
  const m = pick(r, [2, 3, 4, 5]); const s = pick(r, [-3, -2, -1, 0]);
  let t; do { t = ri(r, 1, 3 * m - 1); } while (t % m === 0);
  const N = s * m + t, val = fr(N, m);
  const style = (m === 3 || r() < 0.35) ? 'frac' : 'dec';
  const show = f => style === 'frac' ? mixH(f) : (() => { const k = m === 4 ? 2 : 1; return decMin(f.n * (pow10(k) / f.d), k); })();
  const cand = [fr(N + 1, m), fr(N - 1, m), fr(-N, m), fr(N + m, m), fr(N - m, m), fr(N + 2, m), fr(-N + 1, m)];
  const seen = new Set([show(val)]); const wrong = [];
  for (const c of shuffle(r, cand)) { const h = show(c); if (!seen.has(h) && wrong.length < 3) { seen.add(h); wrong.push(h); } }
  const opts = shuffle(r, [show(val)].concat(wrong)); const correct = opts.indexOf(show(val));
  const base = Math.floor(N / m), steps = N - base * m;
  return choiceQ({
    lesson: 1, art: axisSVG(s, m, val, style),
    prompt: T('Яке число позначено точкою <b>A</b> на осі (oś liczbowa)?', 'Jaką liczbę oznaczono punktem <b>A</b> na osi liczbowej?'),
    hint: T('Порахуй, на скільки рівних частинок поділено одиничний відрізок. Йди від найближчого цілого числа ліворуч.', 'Policz, na ile równych części podzielono jednostkowy odcinek. Idź od najbliższej liczby całkowitej po lewej.'),
    answer: show(val),
    sol: T(`Одиничний відрізок поділено на ${m} рівних частин → один крок = ${F(1, m)}. Від ${String(base).replace('-', MINUS)} точка A зсунута на ${steps} ${steps === 1 ? 'крок' : 'кроки'} праворуч: ${B(show(val))}.`,
      `Odcinek jednostkowy podzielono na ${m} równych części → jeden krok = ${F(1, m)}. Od ${String(base).replace('-', MINUS)} punkt A jest przesunięty o ${steps} ${steps === 1 ? 'krok' : 'kroki'} w prawo: ${B(show(val))}.`)
  }, opts, correct);
};

/* ---------- УРОК 2 · Rozwinięcia dziesiętne ---------- */
function divisionSol(n, d, e) {
  const uk = [], pl = [];
  uk.push(`Ділимо стовпчиком ${n} : ${d}. Ціла частина: ${e.ip}${n % d ? `, залишок ${n % d}` : ''}.`);
  pl.push(`Dzielimy pisemnie ${n} : ${d}. Całość: ${e.ip}${n % d ? `, reszta ${n % d}` : ''}.`);
  const show = Math.min(e.digs.length, 9);
  for (let i = 0; i < show; i++) {
    const cur = e.rems[i] * 10, nr = cur % d;
    uk.push(`${cur} : ${d} = ${e.digs[i]}, залишок ${nr}${e.per && i >= e.pre.length && nr === e.rems[e.pre.length] ? ' <b>← вже було!</b>' : ''}`);
    pl.push(`${cur} : ${d} = ${e.digs[i]}, reszta ${nr}${e.per && i >= e.pre.length && nr === e.rems[e.pre.length] ? ' <b>← już było!</b>' : ''}`);
  }
  if (!e.per) { uk.push(`Залишок 0 — ділення закінчилось: ${B(fmtExpH(e))} (скінченний дріб).`); pl.push(`Reszta 0 — dzielenie się kończy: ${B(fmtExpH(e))} (ułamek skończony).`); }
  else {
    uk.push(`Залишок повторився → цифри <u>${e.per}</u> повторюються: ${B(fmtExpH(e))}.`);
    pl.push(`Reszta się powtórzyła → cyfry <u>${e.per}</u> się powtarzają: ${B(fmtExpH(e))}.`);
  }
  return joinSol(uk, pl);
}
GEN.divide = function (r) {
  const roll = r();
  const d = roll < 0.6 ? pick(r, [3, 6, 9, 11, 12, 15, 18, 22]) : roll < 0.8 ? pick(r, [7, 13, 27, 37]) : pick(r, [4, 5, 8, 16, 20, 25, 40]);
  let n; do { n = ri(r, 1, d - 1); } while (n % d === 0);
  const e = expand(n, d);
  return inputQ({
    lesson: 2, fmt: 'per',
    prompt: T(`Знайди десяткове розвинення (rozwinięcie dziesiętne). Період запиши в дужках.<div class="eq">${F(n, d)} = ${n} : ${d} = ?</div>`, `Znajdź rozwinięcie dziesiętne. Okres zapisz w nawiasie.<div class="eq">${F(n, d)} = ${n} : ${d} = ?</div>`),
    hint: T('Ділимо чисельник на знаменник стовпчиком, доки залишок не стане 0 або не повториться.', 'Dzielimy licznik przez mianownik pisemnie, aż reszta będzie 0 albo się powtórzy.'),
    answer: fmtExpH(e), check: perCheck(e), sample: fmtExp(e), sol: divisionSol(n, d, e)
  });
};
GEN.mixDiv = function (r) {
  const d = pick(r, [3, 6, 9, 11, 12, 15, 18, 22, 4, 8, 5, 20]); const n = ri(r, 1, d - 1); const w = ri(r, 1, 12);
  const e0 = expand(n, d), e = { ip: w, pre: e0.pre, per: e0.per };
  return inputQ({
    lesson: 2, fmt: 'per',
    prompt: T(`Знайди розвинення мішаного числа (liczba mieszana):<div class="eq">${MX(w, n, d)} = ?</div>`, `Znajdź rozwinięcie dziesiętne liczby mieszanej:<div class="eq">${MX(w, n, d)} = ?</div>`),
    hint: T('Ціла частина залишається. Розвинення шукай тільки для дробової частини.', 'Całość zostaje. Rozwinięcia szukaj tylko dla części ułamkowej.'),
    answer: fmtExpH(e), check: perCheck(e), sample: fmtExp(e),
    sol: T(`Ціла частина ${w} залишається. Ділимо ${n} : ${d}: ${F(n, d)} = ${fmtExpH(e0)}.<br>Тому ${MX(w, n, d)} = ${w} + ${fmtExpH(e0)} = ${B(fmtExpH(e))}.`, `Całość ${w} zostaje. Dzielimy ${n} : ${d}: ${F(n, d)} = ${fmtExpH(e0)}.<br>Zatem ${MX(w, n, d)} = ${w} + ${fmtExpH(e0)} = ${B(fmtExpH(e))}.`)
  });
};
GEN.finite = function (r) {
  const mode = ri(r, 0, 3); let n, d;
  if (mode === 0) { d = pick(r, [4, 5, 8, 10, 16, 20, 25, 40, 50]); n = ri(r, 1, d - 1); }
  else if (mode === 1) { d = pick(r, [3, 6, 7, 9, 11, 12, 13, 15, 18, 22]); do { n = ri(r, 1, d - 1); } while (gcd(n, d) !== 1); }
  else if (mode === 2) { // пастка: скорочується до знаменника з 2 і 5
    const base = pick(r, [2, 4, 5, 8, 10, 20]), k = pick(r, [3, 6, 9, 12]); d = base * k; n = ri(r, 1, base - 1) * k;
  } else { const base = pick(r, [3, 7, 9, 11]), k = pick(r, [2, 4, 5, 10]); d = base * k; n = ri(r, 1, base - 1) * k; }
  const g = gcd(n, d), sn = n / g, sd = d / g;
  let x = sd; while (x % 2 === 0) x /= 2; while (x % 5 === 0) x /= 5;
  const fin = x === 1; const e = expand(n, d);
  const uk = [], pl = [];
  if (g > 1) { uk.push(`Спочатку скорочуємо: ${F(n, d)} = ${F(sn, sd)}.`); pl.push(`Najpierw skracamy: ${F(n, d)} = ${F(sn, sd)}.`); }
  uk.push(`Знаменник ${sd} = ${factorStr(sd)}. ${fin ? 'Тільки множники 2 і 5' : 'Є інший множник, крім 2 і 5'} → ${fin ? B('скінченне') : B('нескінченне періодичне')}.`);
  pl.push(`Mianownik ${sd} = ${factorStr(sd)}. ${fin ? 'Tylko czynniki 2 i 5' : 'Jest inny czynnik niż 2 i 5'} → ${fin ? B('skończone') : B('nieskończone okresowe')}.`);
  uk.push(`Перевірка: ${F(n, d)} = ${fmtExpH(e)}.`); pl.push(`Sprawdzenie: ${F(n, d)} = ${fmtExpH(e)}.`);
  return choiceQ({
    lesson: 2, prompt: T(`Яке розвинення має дріб ${F(n, d)}?`, `Jakie rozwinięcie dziesiętne ma ułamek ${F(n, d)}?`),
    hint: T('Скороти дріб. Якщо в знаменнику лишилися тільки множники 2 і 5 — розвинення скінченне.', 'Skróć ułamek. Jeśli w mianowniku zostały tylko czynniki 2 i 5 — rozwinięcie jest skończone.'),
    answer: fin ? T('скінченне', 'skończone') : T('нескінченне періодичне', 'nieskończone okresowe'), sol: joinSol(uk, pl), choiceTexts: true
  }, [T('скінченне', 'skończone'), T('нескінченне періодичне', 'nieskończone okresowe')], fin ? 0 : 1);
};
function factorStr(n) { const f = []; let x = n; for (let p = 2; p * p <= x; p++) while (x % p === 0) { f.push(p); x /= p; } if (x > 1) f.push(x); return f.length ? f.join(' · ') : '1'; }

function randPeriodic(r, o = {}) {
  let pre, per, ip = ri(r, 0, 40);
  for (let i = 0; i < 100; i++) {
    const preLen = o.preMax === undefined ? ri(r, 0, 2) : ri(r, 0, o.preMax), perLen = ri(r, 1, o.perMax || 3);
    const dg = n => Array.from({ length: n }, () => String(ri(r, 0, 9))).join('');
    pre = dg(preLen); per = dg(perLen);
    if (/^0+$/.test(per) || /^9+$/.test(per)) continue;
    const c = canon(ip, pre, per);
    if (c.pre === pre && c.per === per && primitive(per) === per) return { ip, pre, per };
  }
  return { ip, pre: '', per: '3' };
}
GEN.digits6 = function (r) {
  const p = randPeriodic(r, { preMax: 2, perMax: 4 });
  const ans = digitsOf(p.pre, p.per, 6);
  const shown = `${p.ip},${p.pre}(${p.per})`;
  return inputQ({
    lesson: 2, fmt: 'digits',
    prompt: T(`Запиши <b>шість перших цифр після коми</b> (sześć pierwszych cyfr po przecinku):<div class="eq">${shown} = ${p.ip},</div>`, `Zapisz <b>sześć pierwszych cyfr po przecinku</b>:<div class="eq">${shown} = ${p.ip},</div>`),
    hint: T('Спочатку цифри перед дужкою, потім період повторюється знову й знову.', 'Najpierw cyfry przed nawiasem, potem okres powtarza się w kółko.'),
    answer: ans, check: digitsCheck(ans), sample: ans,
    sol: T(`Цифри до дужки: «${p.pre || '—'}», потім період «${p.per}» повторюється: ${B(p.ip + ',' + ans)}…`, `Cyfry przed nawiasem: „${p.pre || '—'}”, potem okres „${p.per}” się powtarza: ${B(p.ip + ',' + ans)}…`)
  });
};
GEN.short = function (r) {
  const p = randPeriodic(r, { preMax: 3, perMax: 3 });
  let digs = p.pre; const need = Math.max(10, p.pre.length + p.per.length * 3 + 1); digs = digitsOf(p.pre, p.per, need);
  const shownLong = `${p.ip},${digs}…`;
  const e = { ip: p.ip, pre: p.pre, per: p.per };
  const marked = `${p.ip},${p.pre}<u>${p.per}</u>` + digitsOf('', p.per, digs.length - p.pre.length - p.per.length) + '…';
  return inputQ({
    lesson: 2, fmt: 'per',
    prompt: T(`Це число має нескінченне періодичне розвинення. Запиши його у <b>скороченій формі</b> — період у дужках (zapis skrócony):<div class="eq">${shownLong}</div>`, `To liczba o nieskończonym rozwinięciu okresowym. Zapisz ją w <b>postaci skróconej</b> — okres w nawiasie:<div class="eq">${shownLong}</div>`),
    hint: T('Знайди групу цифр, що повторюється. Цифри до неї — це передперіод, він лишається перед дужкою.', 'Znajdź grupę powtarzających się cyfr. Cyfry przed nią zostają przed nawiasem.'),
    answer: fmtExpH(e), check: perCheck(e), sample: fmtExp(e),
    sol: T(`Підкреслюємо період: ${marked}<br>Цифри перед періодом: «${p.pre || '—'}», період: «${p.per}». Відповідь: ${B(fmtExpH(e))}.`, `Podkreślamy okres: ${marked}<br>Cyfry przed okresem: „${p.pre || '—'}”, okres: „${p.per}”. Odpowiedź: ${B(fmtExpH(e))}.`)
  });
};
GEN.cmpPer = function (r) {
  for (let tries = 0; tries < 200; tries++) {
    const ip = ri(r, 0, 20); const x = String(ri(r, 0, 8)), y = String(ri(r, 0, 8));
    if (x === y) continue;
    const forms = [
      { s: `${ip},(${x}${y})`, pre: '', per: x + y }, { s: `${ip},(${y}${x})`, pre: '', per: y + x }, { s: `${ip},${x}${y}`, pre: x + y, per: '' },
      { s: `${ip},${x}(${y})`, pre: x, per: y }, { s: `${ip},${y}(${x})`, pre: y, per: x }, { s: `${ip},(${x})`, pre: '', per: x }, { s: `${ip},${x}`, pre: x, per: '' }, { s: `${ip},(${y})`, pre: '', per: y }
    ];
    const A = pick(r, forms), Bf = pick(r, forms);
    const da = digitsOf(A.pre, A.per, 40), db = digitsOf(Bf.pre, Bf.per, 40);
    if (da === db) continue;
    const c = da < db ? -1 : 1;
    let k = 0; while (da[k] === db[k]) k++;
    const sa = `${ip},${da.slice(0, 8)}…`, sb = `${ip},${db.slice(0, 8)}…`;
    const uk = `Випишемо цифри:<br>${A.s} = ${sa}<br>${Bf.s} = ${sb}<br>Порівнюємо зліва направо. Перша різниця — на ${k + 1}-й цифрі після коми: ${da[k]} ${cmpSym(c)} ${db[k]}. Тому ${A.s} ${cmpSym(c)} ${Bf.s}.`;
    const pl = `Wypiszmy cyfry:<br>${A.s} = ${sa}<br>${Bf.s} = ${sb}<br>Porównujemy od lewej do prawej. Pierwsza różnica na ${k + 1}. cyfrze po przecinku: ${da[k]} ${cmpSym(c)} ${db[k]}. Zatem ${A.s} ${cmpSym(c)} ${Bf.s}.`;
    return choiceQ({
      lesson: 2, prompt: T(`Постав знак &lt; , = або &gt; :<div class="eq">${A.s} &nbsp;<span class="blank">?</span>&nbsp; ${Bf.s}</div>`, `Wstaw znak &lt; , = lub &gt; :<div class="eq">${A.s} &nbsp;<span class="blank">?</span>&nbsp; ${Bf.s}</div>`),
      hint: T('Випиши обидва розвинення з кількома цифрами і порівняй цифру за цифрою зліва направо.', 'Wypisz oba rozwinięcia z kilkoma cyframi i porównaj cyfra po cyfrze od lewej.'),
      answer: cmpSym(c), sol: T(uk, pl)
    }, CMP_CHOICES, cmpIdx(c));
  }
  return GEN.divide(r);
};

/* ---------- УРОК 3 · Zaokrąglanie ---------- */
function roundable(r, s, e, carry, intDigits) { // число (масштаб 10^s), розряд e; s+e >= 1; intDigits — цифр у цілій частині
  const unit = pow10(e + s), top = pow10(s + intDigits);
  let n;
  if (carry) {
    const maxZ = Math.max(0, Math.floor((top - 1) / (10 * unit)) - 1);
    n = (10 * ri(r, 0, maxZ) + 9) * unit + ri(r, Math.ceil(unit / 2), unit - 1);
  } else n = ri(r, Math.max(unit, top / 10), top - 1);
  if (n % 10 === 0) n += 1;
  if (n % unit === 0) n += 1;
  return n;
}
function roundStd(n, unit) { return Math.floor((n + unit / 2) / unit) * unit; }
function roundSol(shownStr, digit, placeName, resStr, isInt) {
  const up = digit >= 5;
  return T(`Розряд округлення: ${placeName.uk}. Дивимось на наступну цифру праворуч — це <b>${digit}</b>. ${up ? `${digit} ≥ 5 → цифру розряду збільшуємо на 1 (округлюємо <b>вгору</b>)` : `${digit} &lt; 5 → цифра розряду не змінюється (округлюємо <b>вниз</b>)`}; ${isInt ? 'усі цифри праворуч замінюємо нулями' : 'усі цифри праворуч відкидаємо'}.<br>${shownStr} ≈ ${B(resStr)}.`,
    `Rząd zaokrąglania: ${placeName.pl}. Patrzymy na następną cyfrę po prawej — to <b>${digit}</b>. ${up ? `${digit} ≥ 5 → cyfrę rzędu zwiększamy o 1 (zaokrąglamy <b>w górę</b>)` : `${digit} &lt; 5 → cyfra rzędu się nie zmienia (zaokrąglamy <b>w dół</b>)`}; ${isInt ? 'wszystkie cyfry po prawej zastępujemy zerami' : 'wszystkie cyfry po prawej odrzucamy'}.<br>${shownStr} ≈ ${B(resStr)}.`);
}
GEN.roundInt = function (r) {
  const digits = ri(r, 3, 6); const e = ri(r, 1, Math.min(3, digits - 1));
  const n = roundable(r, 0, e, r() < 0.25, digits);
  const res = roundStd(n, pow10(e)); const dgt = Math.floor(n / pow10(e - 1)) % 10;
  const P = PL[e];
  return inputQ({
    lesson: 3, fmt: 'int',
    prompt: T(`Округли число ${grp(n)} до ${P.uk}:<div class="eq">${grp(n)} ≈ ?</div>`, `Zaokrąglij liczbę ${grp(n)} ${P.pl}:<div class="eq">${grp(n)} ≈ ?</div>`),
    hint: T('Дивись на цифру одразу праворуч від розряду округлення: 0–4 → вниз, 5–9 → вгору.', 'Patrz na cyfrę tuż po prawej od rzędu zaokrąglania: 0–4 → w dół, 5–9 → w górę.'),
    answer: grp(res), check: numCheck(fr(res), 'int'), sample: String(res),
    sol: roundSol(grp(n), dgt, PLN[e], grp(res), true)
  });
};
GEN.roundDec = function (r) {
  const s = ri(r, 2, 4); const e = -ri(r, 0, s - 1);
  const n = roundable(r, s, e, r() < 0.25, ri(r, 1, 3));
  const unit = pow10(e + s), res = roundStd(n, unit) / unit;
  const dgt = Math.floor(n / (unit / 10)) % 10;
  const p = -e; const P = PL[e]; const shown = decH(n, s);
  const placeName = e === 0 ? T('одиниці', 'jedności') : PLN[e];
  return inputQ({
    lesson: 3, fmt: 'dec',
    prompt: T(`Округли число ${shown} до ${P.uk}:<div class="eq">${shown} ≈ ?</div>`, `Zaokrąglij liczbę ${shown} ${P.pl}:<div class="eq">${shown} ≈ ?</div>`),
    hint: T('Дивись на цифру одразу праворуч від розряду округлення. Не забудь: 9 + 1 дає перенесення!', 'Patrz na cyfrę tuż po prawej od rzędu zaokrąglania. Pamiętaj: 9 + 1 daje przeniesienie!'),
    answer: decH(res, p), check: numCheck(fr(res, pow10(p)), 'dec'), sample: decH(res, p).replace(MINUS, '-'),
    sol: roundSol(shown, dgt, placeName, decH(res, p), false)
  });
};
GEN.which = function (r) {
  const s = ri(r, 3, 4); const e = -ri(r, 1, s - 1);
  const n = roundable(r, s, e, false, ri(r, 1, 2));
  const shown = decH(n, s); const look = e - 1;
  const digitAt = x => Math.floor(n / pow10(x + s)) % 10;
  const cand = shuffle(r, [e + 1, e, e - 1, e - 2, 0].filter(x => x >= -s && x <= 0 && x !== look));
  const pos = shuffle(r, [look].concat(Array.from(new Set(cand)).slice(0, 3)));
  const opt = x => T(`цифра ${digitAt(x)} (${PLN[x].uk})`, `cyfra ${digitAt(x)} (${PLN[x].pl})`);
  return choiceQ({
    lesson: 3, choiceTexts: true,
    prompt: T(`Ти округлюєш ${shown} до ${PL[e].uk}. На яку цифру треба дивитись, щоб вирішити — вгору чи вниз?`, `Zaokrąglasz ${shown} ${PL[e].pl}. Na którą cyfrę patrzysz, aby zdecydować — w górę czy w dół?`),
    hint: T('Дивимось на цифру одразу ПІСЛЯ розряду, до якого округлюємо.', 'Patrzymy na cyfrę tuż PO rzędzie, do którego zaokrąglamy.'),
    answer: opt(look),
    sol: T(`Округляємо до ${PL[e].uk}, тому розряд округлення — ${PLN[e].uk}. Рішення приймає наступна цифра праворуч: ${B(`${digitAt(look)} (${PLN[look].uk})`)}.`, `Zaokrąglamy ${PL[e].pl}, więc rząd zaokrąglania to ${PLN[e].pl}. O wyniku decyduje następna cyfra po prawej: ${B(`${digitAt(look)} (${PLN[look].pl})`)}.`)
  }, pos.map(opt), pos.indexOf(look));
};
GEN.roundPer = function (r) {
  const d = pick(r, [3, 6, 9, 11, 12, 15, 18, 22, 7, 8]); const n = ri(r, 1, d - 1); const w = r() < 0.4 ? ri(r, 1, 9) : 0;
  const k = ri(r, 1, 3); const Tn = w * d + n;
  const resScaled = Math.floor((2 * Tn * pow10(k) + d) / (2 * d));
  const e0 = expand(n, d); const dg7 = digitsOf(e0.pre, e0.per, 7);
  const dgt = +digitsOf(e0.pre, e0.per, k + 1)[k];
  const shown = w ? MX(w, n, d) : F(n, d);
  const longForm = `${w},${dg7}…`;
  const P = PL[-k];
  return inputQ({
    lesson: 3, fmt: 'dec',
    prompt: T(`Округли до ${P.uk}:<div class="eq">${shown} ≈ ?</div>`, `Zaokrąglij ${P.pl}:<div class="eq">${shown} ≈ ?</div>`),
    hint: T('Спочатку знайди десяткове розвинення (ділення стовпчиком), потім округли за звичайним правилом.', 'Najpierw znajdź rozwinięcie dziesiętne (dzielenie pisemne), potem zaokrąglij wg zwykłej zasady.'),
    answer: decH(resScaled, k), check: numCheck(fr(resScaled, pow10(k)), 'dec'), sample: decH(resScaled, k).replace(MINUS, '-'),
    sol: T(`${n} : ${d} → ${F(n, d)} = ${fmtExpH(e0)}, тому ${shown} = ${longForm}<br>Наступна цифра після потрібного розряду — <b>${dgt}</b> → ${dgt >= 5 ? 'вгору' : 'вниз'}. Відповідь: ${B(decH(resScaled, k))}.`,
      `${n} : ${d} → ${F(n, d)} = ${fmtExpH(e0)}, więc ${shown} = ${longForm}<br>Następna cyfra po żądanym rzędzie to <b>${dgt}</b> → ${dgt >= 5 ? 'w górę' : 'w dół'}. Odpowiedź: ${B(decH(resScaled, k))}.`)
  });
};
GEN.floorCeil = function (r) {
  const s = ri(r, 2, 3); const e = -ri(r, 0, s - 1); const unit = pow10(e + s);
  let n; do { n = ri(r, unit * 2, pow10(s + 2)); } while (n % unit === 0 || n % 10 === 0);
  const up = r() < 0.5; const res = (up ? Math.ceil(n / unit) : Math.floor(n / unit)) * unit / unit;
  const p = -e; const shown = decH(n, s);
  return inputQ({
    lesson: 3, fmt: 'dec',
    prompt: T(`Округли <b>${up ? 'у більшу сторону (w górę, z nadmiarem)' : 'у меншу сторону (w dół, z niedomiarem)'}</b> до ${PL[e].uk}, незалежно від наступної цифри:<div class="eq">${shown} ≈ ?</div>`,
      `Zaokrąglij <b>${up ? 'w górę (z nadmiarem)' : 'w dół (z niedomiarem)'}</b> ${PL[e].pl}, niezależnie od następnej cyfry:<div class="eq">${shown} ≈ ?</div>`),
    hint: T('«Вгору» — беремо найближче БІЛЬШЕ число з такою кількістю знаків; «вниз» — найближче МЕНШЕ (просто відкидаємо зайві цифри).', '„W górę” — bierzemy najbliższą WIĘKSZĄ liczbę z taką liczbą cyfr; „w dół” — najbliższą MNIEJSZĄ (po prostu odrzucamy cyfry).'),
    answer: decH(res, p), check: numCheck(fr(res, pow10(p)), 'dec'), sample: decH(res, p).replace(MINUS, '-'),
    sol: T(up ? `Відкидаємо зайві цифри і збільшуємо останню на 1, бо число не «кругле»: ${shown} → ${B(decH(res, p))}.` : `Просто відкидаємо зайві цифри: ${shown} → ${B(decH(res, p))}.`, up ? `Odrzucamy nadmiarowe cyfry i zwiększamy ostatnią o 1, bo liczba nie jest „okrągła”: ${shown} → ${B(decH(res, p))}.` : `Po prostu odrzucamy nadmiarowe cyfry: ${shown} → ${B(decH(res, p))}.`)
  });
};
const ITEMS = [
  { uk: 'булочка', pl: 'bułka', p: [79, 89, 95, 99, 109, 129] }, { uk: 'сік', pl: 'sok', p: [389, 429, 459, 519] },
  { uk: 'зошит', pl: 'zeszyt', p: [205, 249, 295, 349] }, { uk: 'олівці', pl: 'kredki', p: [1149, 1289, 1399] },
  { uk: 'йогурт', pl: 'jogurt', p: [199, 239, 265, 279] }, { uk: 'яблука', pl: 'jabłka', p: [545, 589, 615, 669] },
  { uk: 'печиво', pl: 'ciastka', p: [605, 649, 689, 729] }, { uk: 'шоколад', pl: 'czekolada', p: [389, 449, 589, 649] },
  { uk: 'ручка', pl: 'długopis', p: [155, 219, 249, 289] }, { uk: 'сир', pl: 'ser', p: [799, 845, 899, 1049] }
];
GEN.shop = function (r) {
  const cnt = ri(r, 2, 3); const its = shuffle(r, ITEMS).slice(0, cnt).map(it => ({ it, price: pick(r, it.p), qty: ri(r, 1, 3) }));
  const S = its.reduce((a, x) => a + x.price * x.qty, 0), R = its.reduce((a, x) => a + Math.round(x.price / 100) * x.qty, 0);
  if (R < 8) return GEN.shop(r);
  const yes = r() < 0.5; let A;
  if (yes) A = Math.max(R, Math.ceil(S / 100)) + ri(r, 0, 2);
  else { A = Math.min(R, Math.floor(S / 100)) - ri(r, 1, 2); if (A < 1) A = Math.max(1, Math.min(R, Math.floor(S / 100)) - 1); }
  const ok = A >= R && A * 100 >= S;
  if ((A >= R) !== (A * 100 >= S)) return GEN.shop(r);
  const ans = ok ? 0 : 1;
  const listH = its.map(x => `<li>${x.qty > 1 ? x.qty + ' × ' : ''}${x.it.uk} <span class="muted">(${x.it.pl})</span> — ${decH(x.price, 2)} zł</li>`).join('');
  const listP = its.map(x => `<li>${x.qty > 1 ? x.qty + ' × ' : ''}${x.it.pl} — ${decH(x.price, 2)} zł</li>`).join('');
  const rounds = its.map(x => `${x.qty > 1 ? x.qty + ' · ' : ''}${Math.round(x.price / 100)}`).join(' + ');
  return choiceQ({
    lesson: 3, choiceTexts: true,
    prompt: T(`Оціни (oszacuj), чи вистачить <b>${A} zł</b> на такі покупки? Впиши TAK або NIE.<ul class="items">${listH}</ul>`, `Oszacuj, czy wystarczy <b>${A} zł</b> na takie zakupy? Wybierz TAK lub NIE.<ul class="items">${listP}</ul>`),
    hint: T('Округли кожну ціну до цілих злотих, додай і порівняй із заданою сумою. Не рахуй точно — це оцінка!', 'Zaokrąglij każdą cenę do pełnych złotych, dodaj i porównaj z daną kwotą. Nie licz dokładnie — to oszacowanie!'),
    answer: ok ? 'TAK' : 'NIE',
    sol: T(`Округлюємо ціни до цілих zł: ${rounds} = <b>${R} zł</b>.<br>${R} zł ${R <= A ? '≤' : '&gt;'} ${A} zł → ${B(ok ? 'TAK, вистачить' : 'NIE, не вистачить')}.<br><span class="muted">(Точна сума: ${decH(S, 2)} zł.)</span>`,
      `Zaokrąglamy ceny do pełnych zł: ${rounds} = <b>${R} zł</b>.<br>${R} zł ${R <= A ? '≤' : '&gt;'} ${A} zł → ${B(ok ? 'TAK, wystarczy' : 'NIE, nie wystarczy')}.<br><span class="muted">(Dokładna suma: ${decH(S, 2)} zł.)</span>`)
  }, [T('TAK', 'TAK'), T('NIE', 'NIE')], ans);
};

/* ---------- УРОК 4 · Dodawanie i odejmowanie ---------- */
const DENS = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15];
function pickFrac(r, d) { let p; do { p = ri(r, 1, d - 1); } while (gcd(p, d) !== 1 && d > 3); return fr(p, d) ; }
function tw(a, L) { return { n: a.n * (L / a.d), d: L }; }
function opSol(A, Bf, sub, wholeA = 0, wholeB = 0) { // A, B — правильні дроби (не скорочені до змішаних)
  const L = lcm(A.d, Bf.d);
  const a = tw(A, L), b = tw(Bf, L);
  return { L, a, b };
}
GEN.addSame = function (r) {
  const d = ri(r, 4, 15); const sub = r() < 0.3; let a, b;
  if (sub) { a = ri(r, 2, d - 1); b = ri(r, 1, a - 1); } else { a = ri(r, Math.ceil(d / 2), d - 1); b = ri(r, Math.ceil(d / 2), d - 1); }
  const res = sub ? a - b : a + b; const target = fr(res, d);
  const fin = finishSol(res, d);
  const sm = target.d === 1 ? String(target.n) : (target.n > target.d ? `${Math.floor(target.n / target.d)} ${target.n % target.d}/${target.d}` : `${target.n}/${target.d}`);
  return inputQ({
    lesson: 4, fmt: 'mixed',
    prompt: T(`Обчисли. Результат подай як мішане число (liczba mieszana), якщо він більший за 1:<div class="eq">${F(a, d)} ${sub ? '−' : '+'} ${F(b, d)} = ?</div>`, `Oblicz. Wynik przedstaw w postaci liczby mieszanej, jeśli jest większy od 1:<div class="eq">${F(a, d)} ${sub ? '−' : '+'} ${F(b, d)} = ?</div>`),
    hint: T('Знаменники однакові — додаємо (віднімаємо) тільки чисельники, знаменник переписуємо.', 'Mianowniki są takie same — dodajemy (odejmujemy) same liczniki, mianownik przepisujemy.'),
    answer: mixH(target), check: numCheck(target, 'mixed'), sample: sm,
    sol: T(`${F(a, d)} ${sub ? '−' : '+'} ${F(b, d)} = ${F(res, d)}.${fin.uk.length ? '<br>' + fin.uk.join('<br>') : ''}<br>Відповідь: ${B(mixH(target))}.`, `${F(a, d)} ${sub ? '−' : '+'} ${F(b, d)} = ${F(res, d)}.${fin.pl.length ? '<br>' + fin.pl.join('<br>') : ''}<br>Odpowiedź: ${B(mixH(target))}.`)
  });
};
function sampleMixed(f) { if (f.d === 1) return String(f.n); const w = Math.floor(f.n / f.d), rem = f.n % f.d; return w ? `${w} ${rem}/${f.d}` : `${rem}/${f.d}`; }
GEN.addDiff = function (r) {
  let d1, d2; do { d1 = pick(r, DENS); d2 = pick(r, DENS); } while (d1 === d2 || lcm(d1, d2) > 60);
  let A = pickFrac(r, d1), Bf = pickFrac(r, d2); let sub = r() < 0.35;
  if (sub && fcmp(A, Bf) < 0) [A, Bf] = [Bf, A];
  if (sub && fcmp(A, Bf) === 0) sub = false;
  const target = sub ? fsub(A, Bf) : fadd(A, Bf); const { L, a, b } = opSol(A, Bf);
  const resN = sub ? a.n - b.n : a.n + b.n; const fin = finishSol(resN, L);
  return inputQ({
    lesson: 4, fmt: 'mixed',
    prompt: T(`Обчисли. Скороти і, якщо треба, виділи цілу частину:<div class="eq">${fracH(A)} ${sub ? '−' : '+'} ${fracH(Bf)} = ?</div>`, `Oblicz. Skróć i, jeśli trzeba, wyłącz całości:<div class="eq">${fracH(A)} ${sub ? '−' : '+'} ${fracH(Bf)} = ?</div>`),
    hint: T('Знайди спільний знаменник (NWW), розшир обидва дроби, дій із чисельниками.', 'Znajdź wspólny mianownik (NWW), rozszerz oba ułamki, działaj na licznikach.'),
    answer: mixH(target), check: numCheck(target, 'mixed'), sample: sampleMixed(target),
    sol: T(`NWW(${d1}, ${d2}) = ${L}.<br>${fracH(A)} = ${F(a.n, L)}, ${fracH(Bf)} = ${F(b.n, L)}.<br>${F(a.n, L)} ${sub ? '−' : '+'} ${F(b.n, L)} = ${F(resN, L)}.${fin.uk.length ? '<br>' + fin.uk.join('<br>') : ''}<br>Відповідь: ${B(mixH(target))}.`,
      `NWW(${d1}, ${d2}) = ${L}.<br>${fracH(A)} = ${F(a.n, L)}, ${fracH(Bf)} = ${F(b.n, L)}.<br>${F(a.n, L)} ${sub ? '−' : '+'} ${F(b.n, L)} = ${F(resN, L)}.${fin.pl.length ? '<br>' + fin.pl.join('<br>') : ''}<br>Odpowiedź: ${B(mixH(target))}.`)
  });
};
function mixedOf(w, f) { return fr(w * f.d + f.n, f.d); }
GEN.addMixed = function (r) {
  let d1, d2; do { d1 = pick(r, DENS); d2 = r() < 0.2 ? d1 : pick(r, DENS); } while (lcm(d1, d2) > 60);
  const f1 = pickFrac(r, d1), f2 = pickFrac(r, d2); const w1 = ri(r, 1, 7), w2 = ri(r, 1, 7);
  const L = lcm(d1, d2); const a = tw(f1, L), b = tw(f2, L);
  const target = fadd(mixedOf(w1, f1), mixedOf(w2, f2)); const fsum = a.n + b.n;
  const W = w1 + w2; const carry = fsum >= L;
  const fin = finishSol(fsum, L);
  return inputQ({
    lesson: 4, fmt: 'mixed',
    prompt: T(`Обчисли (мішані числа, liczby mieszane). Результат — мішане число:<div class="eq">${MX(w1, f1.n, f1.d)} + ${MX(w2, f2.n, f2.d)} = ?</div>`, `Oblicz. Wynik przedstaw w postaci liczby mieszanej:<div class="eq">${MX(w1, f1.n, f1.d)} + ${MX(w2, f2.n, f2.d)} = ?</div>`),
    hint: T('Цілі додаємо з цілими, дробові частини — з дробовими (спільний знаменник). Якщо дробова частина ≥ 1 — «переносимо» 1 до цілих.', 'Całości dodajemy do całości, części ułamkowe do ułamkowych (wspólny mianownik). Jeśli część ułamkowa ≥ 1 — „przenosimy” 1 do całości.'),
    answer: mixH(target), check: numCheck(target, 'mixed'), sample: sampleMixed(target),
    sol: T(`Цілі: ${w1} + ${w2} = ${W}.<br>Дроби: ${F(f1.n, d1)} + ${F(f2.n, d2)}${L !== d1 || L !== d2 ? ` = ${F(a.n, L)} + ${F(b.n, L)}` : ''} = ${F(fsum, L)}${fin.uk.length ? '<br>' + fin.uk.join('<br>') : ''}<br>Разом: ${W} + ${mixH(fr(fsum, L))}${carry ? ` = ${B(mixH(target))} (перенесли ціле)` : ` = ${B(mixH(target))}`}.`,
      `Całości: ${w1} + ${w2} = ${W}.<br>Ułamki: ${F(f1.n, d1)} + ${F(f2.n, d2)}${L !== d1 || L !== d2 ? ` = ${F(a.n, L)} + ${F(b.n, L)}` : ''} = ${F(fsum, L)}${fin.pl.length ? '<br>' + fin.pl.join('<br>') : ''}<br>Razem: ${W} + ${mixH(fr(fsum, L))}${carry ? ` = ${B(mixH(target))} (przenieśliśmy całość)` : ` = ${B(mixH(target))}`}.`)
  });
};
function subSteps(A, Bv, aH, bH) { // покрокове віднімання мішаних чисел (A > Bv)
  const target = fsub(A, Bv);
  const wa = Math.floor(A.n / A.d), fa = fr(A.n - wa * A.d, A.d), wb = Math.floor(Bv.n / Bv.d), fb = fr(Bv.n - wb * Bv.d, Bv.d);
  const L = lcm(fa.n === 0 ? 1 : fa.d, fb.n === 0 ? 1 : fb.d);
  const aN = fa.n * (L / fa.d), bN = fb.n * (L / fb.d);
  const part = (w, n) => (w ? w + ' ' : '') + F(n, L);
  const uk = [], pl = [];
  const same = (fa.n === 0 || fa.d === L) && (fb.n === 0 || fb.d === L);
  if (same) { uk.push(`Знаменники однакові — ${L}.`); pl.push(`Mianowniki są jednakowe — ${L}.`); }
  else {
    uk.push(`Спільний знаменник — ${L}: ${aH} = ${aN ? part(wa, aN) : wa}, ${bH} = ${bN ? part(wb, bN) : wb}.`);
    pl.push(`Wspólny mianownik — ${L}: ${aH} = ${aN ? part(wa, aN) : wa}, ${bH} = ${bN ? part(wb, bN) : wb}.`);
  }
  let resN;
  if (aN >= bN) {
    resN = aN - bN;
    uk.push(`Цілі: ${wa} − ${wb} = ${wa - wb}. Дроби: ${F(aN, L)} − ${F(bN, L)} = ${F(resN, L)}.`);
    pl.push(`Całości: ${wa} − ${wb} = ${wa - wb}. Ułamki: ${F(aN, L)} − ${F(bN, L)} = ${F(resN, L)}.`);
  } else {
    resN = aN + L - bN;
    uk.push(`${aN} &lt; ${bN} — дробу не вистачає. «Позичаємо» 1 у цілих: ${aN ? part(wa, aN) : wa} = ${wa - 1} ${F(aN + L, L)}.`);
    pl.push(`${aN} &lt; ${bN} — brakuje ułamka. „Pożyczamy” 1 z całości: ${aN ? part(wa, aN) : wa} = ${wa - 1} ${F(aN + L, L)}.`);
    uk.push(`Цілі: ${wa - 1} − ${wb} = ${wa - 1 - wb}. Дроби: ${F(aN + L, L)} − ${F(bN, L)} = ${F(resN, L)}.`);
    pl.push(`Całości: ${wa - 1} − ${wb} = ${wa - 1 - wb}. Ułamki: ${F(aN + L, L)} − ${F(bN, L)} = ${F(resN, L)}.`);
  }
  const g = gcd(resN, L);
  if (resN > 0 && g > 1) { uk.push(`Скорочуємо на ${g}: ${F(resN, L)} = ${F(resN / g, L / g)}.`); pl.push(`Skracamy przez ${g}: ${F(resN, L)} = ${F(resN / g, L / g)}.`); }
  uk.push(`Відповідь: ${B(mixH(target))}.`); pl.push(`Odpowiedź: ${B(mixH(target))}.`);
  return joinSol(uk, pl);
}
GEN.subMixed = function (r) {
  const mode = pick(r, ['mm', 'mm', 'mm', 'wm', 'mf']);
  let d1, d2; do { d1 = pick(r, DENS); d2 = r() < 0.25 ? d1 : pick(r, DENS); } while (lcm(d1, d2) > 60);
  const f1 = pickFrac(r, d1), f2 = pickFrac(r, d2);
  let A, Bv, aH, bH;
  if (mode === 'wm') { const w1 = ri(r, 3, 10), w2 = ri(r, 1, w1 - 1); A = fr(w1); aH = String(w1); Bv = mixedOf(w2, f2); bH = MX(w2, f2.n, f2.d); }
  else if (mode === 'mf') { const w1 = ri(r, 2, 9); A = mixedOf(w1, f1); aH = MX(w1, f1.n, f1.d); Bv = f2; bH = F(f2.n, f2.d); }
  else {
    const w1 = ri(r, 2, 9), w2 = ri(r, 1, w1 - 1);
    A = mixedOf(w1, f1); aH = MX(w1, f1.n, f1.d); Bv = mixedOf(w2, f2); bH = MX(w2, f2.n, f2.d);
  }
  if (fcmp(A, Bv) <= 0) { [A, Bv] = [Bv, A]; [aH, bH] = [bH, aH]; }
  const target = fsub(A, Bv);
  const sol = subSteps(A, Bv, aH, bH);
  return inputQ({
    lesson: 4, fmt: 'mixed',
    prompt: T(`Обчисли. Результат — мішане число або дріб:<div class="eq">${aH} − ${bH} = ?</div>`, `Oblicz. Wynik: liczba mieszana lub ułamek:<div class="eq">${aH} − ${bH} = ?</div>`),
    hint: T('Якщо дробова частина зменшуваного менша — «позич» 1 у цілої частини: 3 ¼ = 2 ⁵⁄₄.', 'Jeśli część ułamkowa odjemnej jest mniejsza — „pożycz” 1 z całości: 3 ¼ = 2 ⁵⁄₄.'),
    answer: mixH(target), check: numCheck(target, 'mixed'), sample: sampleMixed(target), sol
  });
};
function colBlock(a, b, res, op) {
  const w = Math.max(a.length, b.length, res.length) + 2;
  const pad = s => s.padStart(w, ' ');
  return `<br><pre class="col">${pad(a)}\n${op} ${pad(b).slice(2)}\n${'─'.repeat(w)}\n${pad(res)}</pre><br>`;
}
GEN.addDec = function (r) {
  const p1 = ri(r, 0, 3), p2 = ri(r, 1, 3), P = Math.max(p1, p2);
  const mk = p => { const ip = ri(r, 0, 60); let fr0 = 0; if (p) { do { fr0 = ri(r, 1, pow10(p) - 1); } while (fr0 % 10 === 0); } return (ip * pow10(p) + fr0) * pow10(P - p); };
  let A = mk(p1), Bv = mk(p2); let sub = r() < 0.5;
  if (sub && A < Bv) [A, Bv] = [Bv, A]; if (sub && A === Bv) sub = false;
  const res = sub ? A - Bv : A + Bv;
  const sa = decH(A, P), sb = decH(Bv, P), sr = decH(res, P);
  const shownA = decMin(A, P), shownB = decMin(Bv, P);
  return inputQ({
    lesson: 4, fmt: 'dec',
    prompt: T(`Обчисли стовпчиком (pisemnie):<div class="eq">${shownA} ${sub ? '−' : '+'} ${shownB} = ?</div>`, `Oblicz pisemnie:<div class="eq">${shownA} ${sub ? '−' : '+'} ${shownB} = ?</div>`),
    hint: T('Пиши кому під комою. Де бракує цифр — дописуй нулі справа.', 'Pisz przecinek pod przecinkiem. Gdzie brakuje cyfr — dopisz zera z prawej.'),
    answer: decMin(res, P), check: numCheck(fr(res, pow10(P)), 'dec'), sample: decMin(res, P).replace(MINUS, '-'),
    sol: T(`Кома під комою, дописуємо нулі:${colBlock(sa, sb, sr, sub ? '−' : '+')}Відповідь: ${B(decMin(res, P))}.`, `Przecinek pod przecinkiem, dopisujemy zera:${colBlock(sa, sb, sr, sub ? '−' : '+')}Odpowiedź: ${B(decMin(res, P))}.`)
  });
};
GEN.mixedTypes = function (r) {
  const [p, q] = pick(r, COPRIME_PAIRS(2, 25).filter(x => [2, 4, 5, 8, 10, 20, 25].includes(x[1]))); const w = r() < 0.4 ? ri(r, 1, 4) : 0;
  const k = q === 8 ? 3 : [4, 20, 25].includes(q) ? 2 : 1; const fs = (w * q + p) * (pow10(k) / q);
  const dp = ri(r, 1, Math.max(1, k)); let D; do { D = ri(r, 1, pow10(dp) * 5 - 1); } while (D % 10 === 0 && dp > 0);
  const Ds = D * pow10(k - dp); let sub = r() < 0.4; if (sub && fs < Ds) sub = false; if (sub && fs === Ds) sub = false;
  const flip = r() < 0.3 && !sub; const res = sub ? fs - Ds : fs + Ds;
  const fH = w ? MX(w, p, q) : F(p, q), dH = decMin(Ds, k);
  const expr = flip ? `${dH} + ${fH}` : `${fH} ${sub ? '−' : '+'} ${dH}`;
  return inputQ({
    lesson: 4, fmt: 'dec',
    prompt: T(`Обчисли. Результат запиши <b>десятковим дробом</b>:<div class="eq">${expr} = ?</div>`, `Oblicz. Wynik zapisz w postaci <b>ułamka dziesiętnego</b>:<div class="eq">${expr} = ?</div>`),
    hint: T('Перетвори звичайний дріб на десятковий (розшир до 10, 100 або 1000) і додавай/віднімай як десяткові.', 'Zamień ułamek zwykły na dziesiętny (rozszerz do 10, 100 lub 1000) i dodawaj/odejmuj jak dziesiętne.'),
    answer: decMin(res, k), check: numCheck(fr(res, pow10(k)), 'dec'), sample: decMin(res, k).replace(MINUS, '-'),
    sol: T(`${fH} = ${decMin(fs, k)}.<br>${flip ? `${dH} + ${decMin(fs, k)}` : `${decMin(fs, k)} ${sub ? '−' : '+'} ${dH}`} = ${B(decMin(res, k))}.`, `${fH} = ${decMin(fs, k)}.<br>${flip ? `${dH} + ${decMin(fs, k)}` : `${decMin(fs, k)} ${sub ? '−' : '+'} ${dH}`} = ${B(decMin(res, k))}.`)
  });
};
GEN.missing = function (r) {
  let d1, d2; do { d1 = pick(r, [2, 3, 4, 5, 6, 8, 10, 12]); d2 = pick(r, [2, 3, 4, 5, 6, 8, 10, 12]); } while (lcm(d1, d2) > 24);
  const A = pickFrac(r, d1), Bf = pickFrac(r, d2); const C = fadd(A, Bf);
  const v = ri(r, 1, 4); let eq, ans, ukS, plS;
  const cH = mixH(C);
  if (v === 1) { eq = `${fracH(A)} + ${BLANK} = ${cH}`; ans = Bf; ukS = `${BLANK} = ${cH} − ${fracH(A)}`; plS = ukS; }
  else if (v === 2) { eq = `${BLANK} + ${fracH(Bf)} = ${cH}`; ans = A; ukS = `${BLANK} = ${cH} − ${fracH(Bf)}`; plS = ukS; }
  else if (v === 3) { eq = `${cH} − ${BLANK} = ${fracH(A)}`; ans = Bf; ukS = `${BLANK} = ${cH} − ${fracH(A)}`; plS = ukS; }
  else { eq = `${BLANK} − ${fracH(Bf)} = ${fracH(A)}`; ans = C; ukS = `${BLANK} = ${fracH(A)} + ${fracH(Bf)}`; plS = ukS; }
  return inputQ({
    lesson: 4, fmt: 'mixed',
    prompt: T(`Знайди пропущене число (brakującą liczbę):<div class="eq">${eq}</div>`, `Znajdź brakującą liczbę:<div class="eq">${eq}</div>`),
    hint: T('Невідомий доданок = сума − відомий доданок. Невідоме зменшуване = різниця + від’ємник.', 'Nieznany składnik = suma − znany składnik. Nieznana odjemna = różnica + odjemnik.'),
    answer: mixH(ans), check: numCheck(ans, 'mixed'), sample: sampleMixed(ans),
    sol: T(`${ukS} = ${B(mixH(ans))}.<br><span class="muted">Перевірка: підстав відповідь у рівність.</span>`, `${plS} = ${B(mixH(ans))}.<br><span class="muted">Sprawdzenie: podstaw wynik do równości.</span>`)
  });
};
GEN.word = function (r) {
  const kind = pick(r, ['walk', 'ribbon', 'juice', 'money']);
  if (kind === 'money') {
    const a = ri(r, 300, 1800), b = ri(r, 100, 900); const total = a + b; const pay = pick(r, [20, 30, 50, 50, 100]) * 100; if (pay <= total) return GEN.word(r);
    const res = pay - total;
    return inputQ({
      lesson: 4, fmt: 'dec',
      prompt: T(`Кася купила хліб за ${decH(a, 2)} zł і молоко за ${decH(b, 2)} zł. Вона заплатила ${pay / 100} zł. Скільки решти (reszty) вона отримала? (у zł)`, `Kasia kupiła chleb za ${decH(a, 2)} zł i mleko za ${decH(b, 2)} zł. Zapłaciła ${pay / 100} zł. Ile reszty dostała? (w zł)`),
      hint: T('Спочатку додай ціни покупок, потім відніми суму від того, що заплатила.', 'Najpierw dodaj ceny zakupów, potem odejmij sumę od tego, co zapłaciła.'),
      answer: decH(res, 2), check: numCheck(fr(res, 100), 'dec'), sample: decH(res, 2).replace(MINUS, '-'),
      sol: T(`Покупки: ${decH(a, 2)} + ${decH(b, 2)} = ${decH(total, 2)} zł.<br>Решта: ${pay / 100} − ${decH(total, 2)} = ${B(decH(res, 2))} zł.`, `Zakupy: ${decH(a, 2)} + ${decH(b, 2)} = ${decH(total, 2)} zł.<br>Reszta: ${pay / 100} − ${decH(total, 2)} = ${B(decH(res, 2))} zł.`)
    });
  }
  let d1, d2; do { d1 = pick(r, [2, 3, 4, 5, 6, 8, 10]); d2 = pick(r, [2, 3, 4, 5, 6, 8, 10]); } while (d1 === d2 || lcm(d1, d2) > 30);
  const f1 = pickFrac(r, d1), f2 = pickFrac(r, d2); let w1 = ri(r, 1, 4), w2 = ri(r, 1, 4);
  const L = lcm(d1, d2);
  if (kind === 'walk') {
    const A = mixedOf(w1, f1), Bv = mixedOf(w2, f2), tot = fadd(A, Bv);
    return inputQ({
      lesson: 4, fmt: 'mixed',
      prompt: T(`Аня вранці пройшла ${mixH(A)} км, а після обіду ще ${mixH(Bv)} км. Скільки км вона пройшла разом? (мішане число)`, `Ania rano przeszła ${mixH(A)} km, a po południu jeszcze ${mixH(Bv)} km. Ile km przeszła łącznie? (liczba mieszana)`),
      hint: T('Разом — додавання. Додай цілі й дробові частини окремо.', '„Łącznie” — dodawanie. Dodaj całości i ułamki osobno.'),
      answer: mixH(tot), check: numCheck(tot, 'mixed'), sample: sampleMixed(tot),
      sol: T(`${mixH(A)} + ${mixH(Bv)}: цілі ${w1}+${w2}=${w1 + w2}; дроби ${F(f1.n, d1)} + ${F(f2.n, d2)} = ${F(f1.n * L / d1, L)} + ${F(f2.n * L / d2, L)} = ${F(f1.n * L / d1 + f2.n * L / d2, L)}.<br>Відповідь: ${B(mixH(tot))} км.`, `${mixH(A)} + ${mixH(Bv)}: całości ${w1}+${w2}=${w1 + w2}; ułamki ${F(f1.n, d1)} + ${F(f2.n, d2)} = ${F(f1.n * L / d1, L)} + ${F(f2.n * L / d2, L)} = ${F(f1.n * L / d1 + f2.n * L / d2, L)}.<br>Odpowiedź: ${B(mixH(tot))} km.`)
    });
  }
  const bigW = Math.max(w1, w2) + 2;
  let A = mixedOf(bigW, f1), Bv = mixedOf(Math.min(w1, w2), f2); if (fcmp(A, Bv) <= 0) { A = mixedOf(bigW + 1, f1); }
  const res = fsub(A, Bv);
  if (kind === 'ribbon') {
    return inputQ({
      lesson: 4, fmt: 'mixed',
      prompt: T(`Зі стрічки завдовжки ${mixH(A)} м відрізали ${mixH(Bv)} м. Скільки метрів стрічки залишилось?`, `Z wstążki o długości ${mixH(A)} m odcięto ${mixH(Bv)} m. Ile metrów wstążki zostało?`),
      hint: T('«Залишилось» — віднімання. Якщо дробу не вистачає — позич 1 у цілих.', '„Zostało” — odejmowanie. Jeśli brakuje ułamka — pożycz 1 z całości.'),
      answer: mixH(res), check: numCheck(res, 'mixed'), sample: sampleMixed(res),
      sol: subSteps(A, Bv, mixH(A), mixH(Bv))
    });
  }
  const A2 = mixedOf(ri(r, 1, 3), pickFrac(r, d1)), B2 = pickFrac(r, d2); const res2 = fsub(A2, B2);
  return inputQ({
    lesson: 4, fmt: 'mixed',
    prompt: T(`У глечику було ${mixH(A2)} л соку. Випили ${mixH(B2)} л. Скільки літрів соку залишилось?`, `W dzbanku było ${mixH(A2)} l soku. Wypito ${mixH(B2)} l. Ile litrów soku zostało?`),
    hint: T('Віднімання дробів: спільний знаменник, потім відніми.', 'Odejmowanie ułamków: wspólny mianownik, potem odejmij.'),
    answer: mixH(res2), check: numCheck(res2, 'mixed'), sample: sampleMixed(res2),
    sol: subSteps(A2, B2, mixH(A2), mixH(B2))
  });
};

/* ---------- реєстр ---------- */
const LESSONS = {
  1: { gens: [['classify', 2], ['expand', 3], ['mixImp', 3], ['dec2frac', 2], ['frac2dec', 2], ['zeros', 2], ['compare', 3], ['axis', 2]] },
  2: { gens: [['divide', 4], ['mixDiv', 2], ['finite', 2], ['digits6', 2], ['short', 3], ['cmpPer', 3]] },
  3: { gens: [['roundInt', 3], ['roundDec', 3], ['which', 1], ['roundPer', 2], ['floorCeil', 1], ['shop', 3]] },
  4: { gens: [['addSame', 2], ['addDiff', 3], ['addMixed', 3], ['subMixed', 3], ['addDec', 2], ['mixedTypes', 1], ['missing', 2], ['word', 2]] }
};
function makeQ(g, seed) {
  const r = mulberry32(seed); const q = GEN[g](r); q.g = g; q.seed = seed >>> 0; return q;
}
function weighted(r, lesson) {
  const list = LESSONS[lesson].gens, tot = list.reduce((a, x) => a + x[1], 0); let x = r() * tot;
  for (const [g, w] of list) { if ((x -= w) < 0) return g; } return list[0][0];
}
function makeSet(lesson, n, baseSeed) {
  const r = mulberry32(baseSeed); const out = []; const used = new Set();
  const list = LESSONS[lesson].gens.map(x => x[0]);
  // спершу по одному з кожного типу (у довільному порядку), далі за вагами
  const order = shuffle(r, list);
  for (let i = 0; i < n; i++) {
    const g = i < order.length ? order[i] : weighted(r, lesson);
    let q, tries = 0;
    do { q = makeQ(g, Math.floor(r() * 4294967296)); tries++; } while (used.has(g + '|' + JSON.stringify(q.prompt.uk)) && tries < 20);
    used.add(g + '|' + JSON.stringify(q.prompt.uk)); out.push(q);
  }
  return shuffle(r, out);
}
function makeFinal(baseSeed, perLesson) {
  const r = mulberry32(baseSeed); let all = [];
  for (const l of [1, 2, 3, 4]) all = all.concat(makeSet(l, perLesson, Math.floor(r() * 4294967296)));
  return all;
}
const MSG = {
  fmt: T('Не розумію запис. Приклади: 5/7 · 1 4/7 · 0,25 · 0,8(3)', 'Nie rozumiem zapisu. Przykłady: 5/7 · 1 4/7 · 0,25 · 0,8(3)'),
  'form-mixed': T('Значення правильне, але треба записати як <b>мішане число</b> (liczba mieszana), напр. 1 4/7.', 'Wartość jest dobra, ale zapisz jako <b>liczbę mieszaną</b>, np. 1 4/7.'),
  'form-frac': T('Значення правильне, але треба записати як <b>звичайний дріб</b>, напр. 11/7.', 'Wartość jest dobra, ale zapisz jako <b>ułamek zwykły</b>, np. 11/7.'),
  'form-dec': T('Значення правильне, але треба записати <b>десятковим дробом</b> (з комою).', 'Wartość jest dobra, ale zapisz jako <b>ułamek dziesiętny</b> (z przecinkiem).'),
  reduce: T('Значення правильне, але дріб можна ще <b>скоротити</b>!', 'Wartość jest dobra, ale ułamek można jeszcze <b>skrócić</b>!'),
  per: T('Це не той запис: розвинення нескінченне — познач <b>період у дужках</b>, напр. 0,8(3).', 'To nie ten zapis: rozwinięcie jest nieskończone — zaznacz <b>okres w nawiasie</b>, np. 0,8(3).'),
  val: T('Не збігається з правильною відповіддю.', 'Nie zgadza się z poprawną odpowiedzią.')
};
const NEAR = new Set(['form-mixed', 'form-frac', 'form-dec', 'reduce', 'fmt', 'per']);

const API = { F, MX, BLANK, fracH, mixH, decH, GEN, LESSONS, makeQ, makeSet, makeFinal, weighted, mulberry32, parseNum, expand, fmtExp, digitsOf, canon, MSG, NEAR, T, cmpSym, gcd, lcm, fr, fadd, fsub, fcmp };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.LD = API;
})(typeof self !== 'undefined' ? self : this);

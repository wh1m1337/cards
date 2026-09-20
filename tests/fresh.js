// Перевірка: нові спроби дають нові задачі (немає повторів у межах історії «побачених», як у браузері).
const LD = require('../ld-core.js');
let seed = 1; const seedFn = () => (seed = (seed * 1664525 + 1013904223) >>> 0);
const CAP = 500; let seen = [];
const seenSet = () => new Set(seen);
const mark = q => { const k = LD.sig(q); seen = seen.filter(x => x !== k); seen.push(k); if (seen.length > CAP) seen = seen.slice(-CAP); };
let repeats = 0, total = 0, inTest = 0;
function note(q) { total++; if (seenSet().has(LD.sig(q))) repeats++; mark(q); }
// 1) тести: 100 по кожному уроку + 50 підсумкових
for (let round = 0; round < 100; round++) for (const l of [1, 2, 3, 4]) {
  const qs = LD.makeSet(l, 10, seedFn(), seenSet());
  if (new Set(qs.map(LD.sig)).size !== qs.length) inTest++;
  qs.forEach(note);
}
for (let i = 0; i < 50; i++) { const qs = LD.makeFinal(seedFn(), 5, seenSet()); if (new Set(qs.map(LD.sig)).size !== qs.length) inTest++; qs.forEach(note); }
// 2) тренажер: 3000 задач поспіль
for (let i = 0; i < 3000; i++) { const l = 1 + (i % 4); const r = LD.mulberry32(seedFn()); note(LD.freshQ(LD.weighted(r, l), seenSet(), seedFn)); }
// 3) «Помилки»: нова задача того ж типу, не та сама
let sameAsOriginal = 0, n = 0;
for (const g of Object.keys(LD.GEN)) for (let k = 0; k < 200; k++) { const orig = LD.makeQ(g, seedFn()); const av = seenSet(); av.add(LD.sig(orig)); const f = LD.freshQ(g, av, seedFn); n++; if (LD.sig(f) === LD.sig(orig)) sameAsOriginal++; }
console.log(`задач показано: ${total}; повторів у межах останніх ${CAP}: ${repeats}; тестів із дублями всередині: ${inTest}`);
console.log(`«Помилки»: з ${n} повторень типу — така сама задача як оригінал: ${sameAsOriginal}`);
process.exit(repeats || inTest || sameAsOriginal ? 1 : 0);

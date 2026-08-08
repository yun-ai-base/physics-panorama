// physics-panorama 数据完整性测试：nodes.json / physics-data.json / experiments.js / 肖像 引用一致性
// 运行：node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf-8'));
}

const nodes = loadJson('nodes.json');
const ids = new Set(nodes.map(n => n.id));
const eras = new Set(['classical', 'relativity', 'quantum', 'standard-model', 'frontier']);

test('nodes.json：id 唯一且 38 个节点', () => {
  assert.equal(ids.size, nodes.length);
  assert.equal(nodes.length, 38);
});

test('nodes.json：必填字段齐全（19 字段，unifyLevel 可选）', () => {
  const REQUIRED = ['id','type','name','nameEn','era','year','scale','depth','tier','maturity','figures','aha','summary','formula','limitation','prevIds','layout','deepContent','terms'];
  for (const n of nodes) {
    const missing = REQUIRED.filter(k => !(k in n));
    assert.deepEqual(missing, [], `nodes.json[${n.id}] 缺字段`);
    assert.ok(eras.has(n.era), `nodes.json[${n.id}] era 非法: ${n.era}`);
    assert.ok(n.terms.length >= 0);
  }
});

test('nodes.json：prevIds 无悬空引用', () => {
  for (const n of nodes) {
    for (const p of n.prevIds || []) {
      assert.ok(ids.has(p), `nodes.json[${n.id}] prevIds 悬空: ${p}`);
    }
  }
});

test('nodes.json：terms 结构齐全', () => {
  for (const n of nodes) {
    for (const t of n.terms || []) {
      assert.ok(t.name, `nodes.json[${n.id}] term 缺 name`);
      assert.ok(t.definition, `nodes.json[${n.id}] term「${t.name}」缺 definition`);
      assert.ok(t.nameEn, `nodes.json[${n.id}] term「${t.name}」缺 nameEn`);
    }
  }
});

test('physics-data.json：conflicts 引用有效', () => {
  const pd = loadJson('physics-data.json');
  for (const c of pd.conflicts || []) {
    assert.ok(ids.has(c.from), `conflict from 悬空: ${c.from}`);
    assert.ok(ids.has(c.to), `conflict to 悬空: ${c.to}`);
  }
});

test('experiments.js：theoryId 全部命中 nodes.json', () => {
  const src = readFileSync(join(root, 'js/data/experiments.js'), 'utf-8');
  const theoryIds = [...src.matchAll(/theoryId:\s*'([^']+)'/g)].map(m => m[1]);
  assert.ok(theoryIds.length >= 28, `实验数不足: ${theoryIds.length}`);
  for (const tid of theoryIds) {
    assert.ok(ids.has(tid), `experiments theoryId 悬空: ${tid}`);
  }
});

test('nobel-physics.js：1901–2025 共 125 个年份', () => {
  const src = readFileSync(join(root, 'js/data/nobel-physics.js'), 'utf-8');
  const years = [...src.matchAll(/"year":\s*"(\d{4})"/g)].map(m => m[1]);
  assert.equal(years.length, 125);
  assert.equal(years[0], '1901');
  assert.equal(years[years.length - 1], '2025');
});

test('肖像文件：figures 人名存在对应文件或 PORTRAIT_ALIASES 映射', () => {
  const portraitDir = join(root, 'assets', 'portraits');
  let files = [];
  try { files = readdirSync(portraitDir); } catch (e) { files = []; }
  const aliasSrc = readFileSync(join(root, 'js/data/portraitMap.js'), 'utf-8');
  const people = new Set();
  for (const n of nodes) for (const p of n.figures || []) people.add(p);
  const missing = [];
  for (const p of people) {
    const enc = encodeURIComponent(p);
    const hit = files.some(f => [p + '.jpg', p + '.png', enc + '.jpg', enc + '.png'].includes(f));
    if (hit) continue;
    const m = aliasSrc.match(new RegExp(`'${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*'([^']+)'`));
    const aliasHit = m && files.some(f => [m[1] + '.jpg', m[1] + '.png', encodeURIComponent(m[1]) + '.jpg'].includes(f));
    if (!aliasHit) missing.push(p);
  }
  // 已知缺口允许存在（回退字母占位），但不应超过 40 人；若补齐后此断言收紧
  assert.ok(missing.length <= 40, `无肖像人物过多(${missing.length}): ${missing.slice(0, 8).join('、')}…`);
});

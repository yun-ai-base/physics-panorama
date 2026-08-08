// physics-panorama 单元测试：utils.js 纯函数（Node 内置 test runner，无第三方依赖）
// 运行：node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, buildEdges, relatedSet, chain, edgePath, bezierMidpoint } from '../js/utils.js';

test('esc 转义 HTML 特殊字符', () => {
  assert.equal(esc('<b>&"\'</b>'), '&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
  assert.equal(esc(undefined), '');
  assert.equal(esc(null), '');
  assert.equal(esc('普通文本'), '普通文本');
});

const sampleNodes = [
  { id: 'a', prevIds: [], tier: 'core' },
  { id: 'b', prevIds: ['a'], tier: 'core' },
  { id: 'c', prevIds: ['a'], tier: 'branch' },
  { id: 'd', prevIds: ['b', 'x'], tier: 'core' },   // x 为悬空引用，应被跳过
];

test('buildEdges 继承边 + 跳过悬空引用', () => {
  const edges = buildEdges(sampleNodes, []);
  const pairs = edges.map(e => `${e.from}->${e.to}:${e.type}`);
  assert.ok(pairs.includes('a->b:inherit'));
  assert.ok(pairs.includes('a->c:branch'));   // branch tier → branch 类型
  assert.ok(pairs.includes('b->d:inherit'));  // 悬空 x 被跳过
  assert.equal(edges.length, 3);
});

test('buildEdges 冲突边', () => {
  const edges = buildEdges(sampleNodes, [{ from: 'a', to: 'd', type: 'conflict' }]);
  const conflict = edges.find(e => e.type === 'conflict');
  assert.ok(conflict && conflict.from === 'a' && conflict.to === 'd');
});

test('relatedSet 一级关联（默认）', () => {
  const set = relatedSet(sampleNodes, 'b', false);
  assert.ok(set.has('b'));        // 自身
  assert.ok(set.has('a'));        // 前驱
  assert.ok(set.has('d'));        // 后继
  assert.ok(!set.has('c'));       // 无关分支
});

test('relatedSet 全链路（expandAll）', () => {
  const set = relatedSet(sampleNodes, 'b', true);
  assert.ok(set.has('a') && set.has('b') && set.has('d'));
  assert.ok(!set.has('c'), '兄弟分支（经 a 相连的非直系）不应包含');
});

test('chain 上下游', () => {
  const { parents, children } = chain(sampleNodes, 'b');
  assert.deepEqual(parents, ['a']);
  assert.deepEqual(children.sort(), ['d']);
});

test('edgePath / bezierMidpoint 几何', () => {
  const p = edgePath({ x: 0, y: 0 }, { x: 100, y: 0 });
  assert.ok(p.startsWith('M 0 0 C 50 0'));
  const m = bezierMidpoint({ x: 0, y: 0 }, { x: 100, y: 0 });
  assert.equal(m.x, 50);
  assert.equal(m.y, 0);
});

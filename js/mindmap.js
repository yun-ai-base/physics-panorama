// ════════════════════════════════════════════════════════════════
//  虚无-图景 · 思维导图模块
//  水平树：根 → 五纪元 → 31 节点 →（点击展开）14 维度叶子
//  跨纪元连线复用 buildEdges 生成的 EDGES（inherit/branch/revolution/unify/conflict）
//  自带缩放 / 拖拽 / 重置，维度叶子点击回调打开侧栏对应维度
// ════════════════════════════════════════════════════════════════

import { ERAS, ERA_ORDER, DIMENSIONS } from './config.js';

// ── 布局常量（画布坐标，单位 px，最终由 transform 缩放适配视口） ──
const X_ROOT = 150;
const X_ERA  = 470;
const X_NODE = 830;
const X_DIM  = 1210;
const ROOT_W = 196, ROOT_H = 58;
const ERA_W  = 176, ERA_H  = 50;
const NODE_W = 236, NODE_H = 44;
const DIM_W  = 244, DIM_H  = 27;
const GAP_Y = 16;       // 同纪元内节点纵向间隔
const BLOCK_GAP = 64;   // 纪元块之间间隔

const SVGNS = 'http://www.w3.org/2000/svg';

let NODES = [];
let EDGES = [];
let SVG = null;
let VIEWPORT = null;
let onOpenDimension = null;

let expanded = new Set();   // 手动展开维度的节点 id
let expandAll = false;      // 一键展开全部维度
let posMap = new Map();     // key → { x,y,w,h,kind,... }
let tf = { tx: 0, ty: 0, k: 1 };
let dragging = false, moved = false, lastX = 0, lastY = 0;

// ── 对外接口 ──
export function initMindmap({ nodes, edges, svg, viewport, onOpenDimension: cb }) {
  NODES = nodes || [];
  EDGES = edges || [];
  SVG = svg;
  VIEWPORT = viewport;
  onOpenDimension = cb;
  bind();
}
export function renderMindmap() { render(); requestAnimationFrame(() => fit()); }
export function resetMindmap() {
  expanded.clear(); expandAll = false;
  const c = document.getElementById('mmExpandAll'); if (c) c.checked = false;
  render(); requestAnimationFrame(() => fit());
}
export function setExpandAll(v) {
  expandAll = !!v;
  if (expandAll) expanded.clear();
  const c = document.getElementById('mmExpandAll'); if (c) c.checked = expandAll;
  render(); requestAnimationFrame(() => fit());
}

// ── 维度内容判断：某节点某维度是否有可读内容 ──
function dimContent(node, key) {
  switch (key) {
    case 'summary':     return !!(node.deepContent?.summary || node.summary);
    case 'history':     return !!node.deepContent?.history;
    case 'figures':     return !!(node.figures?.length || node.deepContent?.figures_detail);
    case 'branches':    return !!node.deepContent?.branches;
    case 'works':       return !!node.deepContent?.works;
    case 'impact':      return !!node.deepContent?.impact;
    case 'paradigm':    return !!node.deepContent?.paradigm;
    case 'tools':       return !!node.deepContent?.tools;
    case 'experiments': return !!node.deepContent?.experiments;
    case 'debate':      return !!node.deepContent?.debate;
    case 'limits':      return !!(node.deepContent?.limits || node.limitation);
    case 'future':      return !!node.deepContent?.future;
    case 'formula':     return !!(node.formula?.length);
    case 'terms':       return !!(node.terms?.length);
  }
  return false;
}
function nodeDims(node) { return DIMENSIONS.filter(d => dimContent(node, d.key)); }
function yearNum(n) {
  const y = n.year;
  if (typeof y === 'number') return y;
  if (typeof y === 'string') { const m = y.match(/\d{4}/); return m ? parseInt(m[0], 10) : 1900; }
  return 1900;
}
function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ── 计算布局，填充 posMap ──
function computeLayout() {
  posMap = new Map();
  const erasData = ERA_ORDER.map(e => ({
    era: e,
    nodes: NODES.filter(n => n.era === e).sort((a, b) => yearNum(a) - yearNum(b)),
  }));

  let yCursor = 0;
  const eraCenters = [];
  for (const blk of erasData) {
    const list = blk.nodes;
    if (!list.length) { eraCenters.push({ era: blk.era, y: yCursor }); continue; }
    const occ = list.map(n => {
      const dimCount = (expandAll || expanded.has(n.id)) ? nodeDims(n).length : 0;
      return Math.max(NODE_H, dimCount * DIM_H + 16);
    });
    const blockH = occ.reduce((s, h) => s + h, 0) + GAP_Y * (list.length - 1);
    const eraY = yCursor + blockH / 2;
    eraCenters.push({ era: blk.era, y: eraY });
    posMap.set('era:' + blk.era, { x: X_ERA, y: eraY, w: ERA_W, h: ERA_H, kind: 'era', era: blk.era });

    let cy = yCursor;
    list.forEach((n, i) => {
      const h = occ[i];
      const ny = cy + h / 2;
      posMap.set(n.id, { x: X_NODE, y: ny, w: NODE_W, h: NODE_H, kind: 'node', era: blk.era, node: n });
      if (expandAll || expanded.has(n.id)) {
        const dims = nodeDims(n);
        dims.forEach((d, di) => {
          const dy = ny + (di - (dims.length - 1) / 2) * DIM_H;
          posMap.set(n.id + ':dim:' + d.key, {
            x: X_DIM, y: dy, w: DIM_W, h: DIM_H,
            kind: 'dim', dimKey: d.key, dimLabel: d.label, nodeId: n.id,
          });
        });
      }
      cy += h + GAP_Y;
    });
    yCursor += blockH + BLOCK_GAP;
  }
  const totalBottom = yCursor - BLOCK_GAP;
  const rootY = totalBottom / 2;
  posMap.set('root', { x: X_ROOT, y: rootY, w: ROOT_W, h: ROOT_H, kind: 'root' });
}

function bounds() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of posMap.values()) {
    minX = Math.min(minX, p.x - p.w / 2);
    maxX = Math.max(maxX, p.x + p.w / 2);
    minY = Math.min(minY, p.y - p.h / 2);
    maxY = Math.max(maxY, p.y + p.h / 2);
  }
  return { minX, minY, maxX, maxY };
}

function applyTransform() {
  if (VIEWPORT) VIEWPORT.setAttribute('transform', `translate(${tf.tx} ${tf.ty}) scale(${tf.k})`);
}
function fit() {
  if (!SVG) return;
  const cw = SVG.clientWidth || 960, ch = SVG.clientHeight || 640;
  // SVG 尚未完成布局（如刚从 hidden 变可见）时跳过，由 rAF 重试
  if (cw < 50 || ch < 50) return;
  const b = bounds();
  const boxW = (b.maxX - b.minX) || 1, boxH = (b.maxY - b.minY) || 1;
  const k = Math.min(cw / boxW, ch / boxH) * 0.92;
  tf.k = k;
  tf.tx = (cw - boxW * k) / 2 - b.minX * k;
  tf.ty = (ch - boxH * k) / 2 - b.minY * k;
  applyTransform();
}

// ── SVG 元素创建 ──
function mk(tag, attrs, parent) {
  const e = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  (parent || VIEWPORT).appendChild(e);
  return e;
}

function edgePathEl(a, b, color, cls, dashed, parent) {
  const aLeft = a.x <= b.x;
  const x1 = aLeft ? a.x + a.w / 2 : a.x - a.w / 2;
  const x2 = aLeft ? b.x - b.w / 2 : b.x + b.w / 2;
  const y1 = a.y, y2 = b.y;
  const mx = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  const attrs = { d, class: cls, fill: 'none', stroke: color, 'stroke-linecap': 'round' };
  if (dashed) attrs['stroke-dasharray'] = '6 4';
  mk('path', attrs, parent);
}

function edgeColor(t) {
  return ({
    inherit: '#C9A24E', branch: '#5E9E6E',
    revolution: '#C0392B', unify: '#2E8B57', conflict: '#E67E22',
  })[t] || '#C9A24E';
}

// ── 渲染主流程 ──
function render() {
  if (!VIEWPORT) return;
  computeLayout();
  while (VIEWPORT.firstChild) VIEWPORT.removeChild(VIEWPORT.firstChild);

  const gEdges = mk('g', { class: 'mm-edges' });
  const root = posMap.get('root');
  for (const [, p] of posMap) {
    if (p.kind === 'era') {
      edgePathEl(root, p, ERAS[p.era].raw, 'mm-edge mm-edge-era', false, gEdges);
    } else if (p.kind === 'node') {
      const era = posMap.get('era:' + p.era);
      if (era) edgePathEl(era, p, ERAS[p.era].raw, 'mm-edge mm-edge-era-node', false, gEdges);
    } else if (p.kind === 'dim') {
      const nd = posMap.get(p.nodeId);
      if (nd) edgePathEl(nd, p, '#B7AB97', 'mm-edge mm-edge-dim', false, gEdges);
    }
  }
  for (const e of EDGES) {
    const a = posMap.get(e.from), b = posMap.get(e.to);
    if (!a || !b) continue;
    const dashed = (e.type === 'revolution' || e.type === 'conflict');
    edgePathEl(a, b, edgeColor(e.type), 'mm-edge mm-edge-' + e.type, dashed, gEdges);
  }

  const gNodes = mk('g', { class: 'mm-nodes' });
  for (const [, p] of posMap) {
    if (p.kind === 'root') drawRoot(p, gNodes);
    else if (p.kind === 'era') drawEra(p, gNodes);
    else if (p.kind === 'node') drawNode(p, gNodes);
    else if (p.kind === 'dim') drawDim(p, gNodes);
  }
}

function drawRoot(p, parent) {
  const g = mk('g', { class: 'mm-node mm-root', 'data-kind': 'root' }, parent);
  mk('rect', { x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: 14, class: 'mm-rect mm-rect--root' }, g);
  mk('text', { x: p.x, y: p.y + 6, 'text-anchor': 'middle', class: 'mm-text mm-text--root' }, g).textContent = '物理学全景';
}
function drawEra(p, parent) {
  const g = mk('g', { class: 'mm-node mm-era', 'data-kind': 'era', 'data-era': p.era }, parent);
  mk('rect', { x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: 12, class: 'mm-rect mm-rect--era', style: `fill:${ERAS[p.era].raw}` }, g);
  mk('text', { x: p.x, y: p.y + 6, 'text-anchor': 'middle', class: 'mm-text mm-text--era' }, g).textContent = ERAS[p.era].name;
}
function drawNode(p, parent) {
  const n = p.node;
  const isCore = n.tier === 'core';
  const g = mk('g', { class: 'mm-node mm-theory' + (isCore ? ' is-core' : ''), 'data-kind': 'node', 'data-id': n.id }, parent);
  mk('rect', { x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: 9, class: 'mm-rect mm-rect--node' + (isCore ? ' mm-rect--core' : '') }, g);
  mk('rect', { x: p.x - p.w / 2, y: p.y - p.h / 2, width: 5, height: p.h, rx: 2, class: 'mm-bar', style: `fill:${ERAS[p.era].raw}` }, g);
  mk('text', { x: p.x - p.w / 2 + 15, y: p.y + 5, class: 'mm-text mm-text--node' }, g).textContent = truncate(n.name, 13);
  if (!expandAll && nodeDims(n).length) {
    const open = expanded.has(n.id);
    mk('text', { x: p.x + p.w / 2 - 13, y: p.y + 6, 'text-anchor': 'middle', class: 'mm-text mm-text--toggle' }, g).textContent = open ? '−' : '+';
  }
}
function drawDim(p, parent) {
  const g = mk('g', { class: 'mm-node mm-dim', 'data-kind': 'dim', 'data-id': p.nodeId, 'data-dim': p.dimKey }, parent);
  mk('rect', { x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: 7, class: 'mm-rect mm-rect--dim' }, g);
  mk('text', { x: p.x - p.w / 2 + 12, y: p.y + 4, class: 'mm-text mm-text--dim' }, g).textContent = p.dimLabel;
}

// ── 交互：缩放 / 拖拽 / 点击 ──
function onWheel(e) {
  e.preventDefault();
  const r = SVG.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const f = e.deltaY < 0 ? 1.12 : 0.892;
  const k0 = tf.k;
  const k1 = Math.min(3.2, Math.max(0.18, k0 * f));
  const wx = (mx - tf.tx) / k0, wy = (my - tf.ty) / k0;
  tf.tx = mx - wx * k1; tf.ty = my - wy * k1; tf.k = k1;
  applyTransform();
}
function onDown(e) {
  dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY;
}
function onMove(e) {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
  tf.tx += dx; tf.ty += dy; lastX = e.clientX; lastY = e.clientY;
  applyTransform();
}
function onUp() { dragging = false; }
function onClick(e) {
  if (moved) return;
  const g = e.target.closest('.mm-node');
  if (!g) return;
  const kind = g.dataset.kind;
  if (kind === 'node') {
    const id = g.dataset.id;
    if (!expandAll) {
      if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
      render(); fit();
    }
  } else if (kind === 'dim') {
    const id = g.dataset.id, dim = g.dataset.dim;
    if (onOpenDimension) onOpenDimension(id, dim);
  }
}
function bind() {
  if (!SVG || !VIEWPORT) return;
  SVG.addEventListener('wheel', onWheel, { passive: false });
  SVG.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  VIEWPORT.addEventListener('click', onClick);
}

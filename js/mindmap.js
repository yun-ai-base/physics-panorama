// ══════════════════════════════════════════════════════════════
//  虚无-图景 · 思维导图模块
//  水平树：根 → 五纪元 → 31 节点 →（点击展开）14 维度叶子
//  跨纪元连线复用 buildEdges 生成的 EDGES（inherit/branch/revolution/unify/conflict）
//  自带缩放 / 拖拽 / 重置，维度叶子点击回调打开侧栏对应维度
//
//  交互增强（无侵入增量）：
//   · 悬浮聚焦：悬停某学说/纪元时，该分支高亮、其余分支淡出，悬停节点局部放大，
//     并弹出含完整名称 + 综述的浮层卡片（解决全维度展示时文字过小的可读性问题）。
//   · 搜索联动：focusMindmapNode(id) 由 app.js 搜索结果点击调用，自动展开该学说维度、
//     高亮其分支路径（根 → 纪元 → 学说）并缩放定位，实现「按图索骥」。
// ════════════════════════════════════════════════════════════════

import { ERAS, ERA_ORDER, DIMENSIONS, UI_LABELS } from './config.js?v=20260808v';
import { esc } from './utils.js?v=20260808v';
import { state } from './state.js?v=20260808v';

function t(key) {
  return UI_LABELS[state.lang]?.[key] ?? UI_LABELS.zh[key] ?? key;
}

// ── 布局常量（画布坐标，单位 px，最终由 transform 缩放适配视口） ──
const X_ROOT = 150;
const X_ERA  = 470;
const X_NODE = 830;
const X_DIM  = 1210;
const ROOT_W = 196, ROOT_H = 58;
const ERA_W  = 176, ERA_H = 50;
const NODE_W = 236, NODE_H = 44;
const DIM_W  = 244, DIM_H = 27, DIM_H_DESC = 48;  // DIM_H_DESC：带内容摘要的维度节点高度
const GAP_Y = 16;       // 同纪元内节点纵向间隔
const BLOCK_GAP = 64;   // 纪元块之间间隔

const SVGNS = 'http://www.w3.org/2000/svg';

let NODES = [];
let EDGES = [];
let SVG = null;
let VIEWPORT = null;
let onOpenDimension = null;
let gBranchesEl = null;     // 渲染后的分支容器（hover / 搜索聚焦用）
let MM_BY_ID = new Map();   // id → node（预览卡取数据）
let persistFocus = null;     // 搜索联动的持久聚焦：{ era, id } 或 null

let expanded = new Set();   // 手动展开维度的节点 id
let expandAll = false;      // 一键展开全部维度
let posMap = new Map();     // key → { x,y,w,h,kind,... }
let tf = { tx: 0, ty: 0, k: 1 };
let dragging = false, moved = false, lastX = 0, lastY = 0;
let downNode = null;   // pointerdown 时点中的节点（避开 setPointerCapture 导致的 click.target 错乱）

// ── 对外接口 ──
export function initMindmap({ nodes, edges, svg, viewport, onOpenDimension: cb }) {
  NODES = nodes || [];
  EDGES = edges || [];
  SVG = svg;
  VIEWPORT = viewport;
  onOpenDimension = cb;
  MM_BY_ID = new Map((NODES || []).map(n => [n.id, n]));
  bind();
}
export function renderMindmap() { persistFocus = null; render(); requestAnimationFrame(() => fit()); }
export function resetMindmap() {
  expanded.clear(); expandAll = false; persistFocus = null;
  const c = document.getElementById('mmExpandAll'); if (c) c.checked = false;
  render(); requestAnimationFrame(() => fit());
}
export function setExpandAll(v) {
  expandAll = !!v;
  persistFocus = null;
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
    case 'particles':    return !!(node.particles?.groups?.length);
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
      return Math.max(NODE_H, dimCount * DIM_H_DESC + 16);
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
          const dy = ny + (di - (dims.length - 1) / 2) * DIM_H_DESC;
          posMap.set(n.id + ':dim:' + d.key, {
            x: X_DIM, y: dy, w: DIM_W, h: DIM_H_DESC,
            kind: 'dim', dimKey: d.key, dimLabel: d.label, nodeId: n.id, nodeName: n.name,
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
  const isFS = typeof document !== 'undefined' && document.body.classList.contains('mm-fs');
  // 全屏时用窗口内宽作为权威画布宽，确保画布【正好等于屏幕宽度】、左右零边距。
  // 不依赖 SVG.clientWidth —— 替换元素在 flex 中的宽度计算在不同布局下并不可靠。
  const fsW = (isFS && typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : cw;
  let k, tx, ty;
  if (isFS) {
    k = fsW / boxW;
    tx = -b.minX * k;            // 内容左缘 → 屏幕左缘（右边距=0）
    ty = 40 - b.minY * k;     // 顶部对齐 40px，给工具栏留呼吸空间
  } else {
    // 普通视图：默认完整看全树（contain），高度优先
    k = Math.min(cw / boxW, ch / boxH) * 0.92;
    tx = (cw - boxW * k) / 2 - b.minX * k;
    ty = (ch - boxH * k) / 2 - b.minY * k;
  }
  tf.k = k; tf.tx = tx; tf.ty = ty;
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

// ── 渲染主流程（分支分组：根组 + 每纪元一个 mm-branch，学说包成 mm-sub） ──
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

  // 节点按分支分组，便于悬浮聚焦 / 搜索高亮时整支淡出或局部放大
  const gB = mk('g', { class: 'mm-branches' });
  gBranchesEl = gB;

  const gRoot = mk('g', { class: 'mm-root-group' }, gB);
  drawRoot(posMap.get('root'), gRoot);

  for (const era of ERA_ORDER) {
    const ep = posMap.get('era:' + era);
    if (!ep) continue;
    const gE = mk('g', { class: 'mm-branch', 'data-era': era }, gB);
    gE.dataset.cx = ep.x; gE.dataset.cy = ep.y;
    drawEra(ep, gE);
    const list = NODES.filter(n => n.era === era).sort((a, b) => yearNum(a) - yearNum(b));
    for (const n of list) {
      const np = posMap.get(n.id);
      if (!np) continue;
      const gS = mk('g', { class: 'mm-sub', 'data-id': n.id }, gE);
      gS.dataset.cx = np.x; gS.dataset.cy = np.y;
      drawNode(np, gS);
      if (expandAll || expanded.has(n.id)) {
        const dims = nodeDims(n);
        dims.forEach((d, di) => {
          const dp = posMap.get(n.id + ':dim:' + d.key);
          if (dp) drawDim(dp, gS);
        });
      }
    }
  }

  // 持久聚焦（搜索联动）在重建后自动恢复
  if (persistFocus) applyFocusVisual(persistFocus.era, persistFocus.id, false);
}

function drawRoot(p, parent) {
  const rootLabel = state.lang === 'en' ? 'Physics Panorama' : '物理学全景';
  const rootAria = state.lang === 'en' ? 'Physics Panorama · Root' : '物理学全景 · 根节点';
  const g = mk('g', { class: 'mm-node mm-root', 'data-kind': 'root', tabindex: '0', role: 'button', 'aria-label': rootAria }, parent);
  mk('rect', { x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: 14, class: 'mm-rect mm-rect--root' }, g);
  mk('text', { x: p.x, y: p.y + 6, 'text-anchor': 'middle', class: 'mm-text mm-text--root' }, g).textContent = rootLabel;
}
function drawEra(p, parent) {
  const eraName = state.lang === 'en' ? (ERAS[p.era].nameEn || ERAS[p.era].name) : ERAS[p.era].name;
  const eraSuffix = state.lang === 'en' ? ' Era' : ' 纪元';
  const g = mk('g', { class: 'mm-node mm-era', 'data-kind': 'era', 'data-era': p.era, tabindex: '0', role: 'button', 'aria-label': eraName + eraSuffix }, parent);
  mk('rect', { x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: 12, class: 'mm-rect mm-rect--era', style: `fill:${ERAS[p.era].raw}` }, g);
  mk('text', { x: p.x, y: p.y + 6, 'text-anchor': 'middle', class: 'mm-text mm-text--era' }, g).textContent = eraName;
}
function drawNode(p, parent) {
  const n = p.node;
  const isCore = n.tier === 'core';
  const hasDims = nodeDims(n).length > 0;
  const dispName = state.lang === 'en' ? (n.nameEn || n.name) : n.name;
  const a11yLabel = state.lang === 'en'
    ? (dispName + (hasDims ? ' — press Enter to expand dimensions' : ''))
    : (n.name + (hasDims ? ' 理论节点，回车展开维度' : ' 理论节点'));
  const a11y = { class: 'mm-node mm-theory' + (isCore ? ' is-core' : ''), 'data-kind': 'node', 'data-id': n.id, tabindex: '0', role: 'button' };
  a11y['aria-label'] = a11yLabel;
  if (hasDims && !expandAll) a11y['aria-expanded'] = String(expanded.has(n.id));
  const g = mk('g', a11y, parent);
  mk('rect', { x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: 9, class: 'mm-rect mm-rect--node' + (isCore ? ' mm-rect--core' : '') }, g);
  mk('rect', { x: p.x - p.w / 2, y: p.y - p.h / 2, width: 5, height: p.h, rx: 2, class: 'mm-bar', style: `fill:${ERAS[p.era].raw}` }, g);
  mk('text', { x: p.x - p.w / 2 + 15, y: p.y + 5, class: 'mm-text mm-text--node' }, g).textContent = truncate(dispName, 13);
  if (!expandAll && hasDims) {
    const open = expanded.has(n.id);
    mk('text', { x: p.x + p.w / 2 - 13, y: p.y + 6, 'text-anchor': 'middle', class: 'mm-text mm-text--toggle' }, g).textContent = open ? '−' : '+';
  }
}
// 把维度里的数组元素安全转成字符串（兼容 字符串 / {latex,desc,name,...} 等形态）
function safeDimItem(x) {
  if (typeof x === 'string') return x;
  if (x == null) return '';
  if (typeof x === 'object') return x.latex || x.desc || x.name || x.title || x.label || '';
  return String(x);
}
// 取维度具体内容摘要（去 markdown 标记后截断），用于在维度条内显示「第五级内容」
function dimSummaryText(node, key) {
  let raw = '';
  if (node.deepContent && typeof node.deepContent[key] === 'string') {
    raw = node.deepContent[key];
  } else if (key === 'terms') {
    raw = (node.terms || []).slice(0, 6).map(safeDimItem).filter(Boolean).join('、');
  } else if (key === 'formula') {
    raw = (node.formula || []).slice(0, 4).map(safeDimItem).filter(Boolean).join('，');
  } else if (key === 'particles') {
    const gs = (node.particles && node.particles.groups) || [];
    raw = gs.slice(0, 4).map(safeDimItem).filter(Boolean).join('、');
  }
  if (!raw) return '';
  raw = raw.replace(/\*\*/g, '').replace(/[*_`>#]/g, '').replace(/\s+/g, ' ').trim();
  const MAX = 24;
  return raw.length > MAX ? raw.slice(0, MAX) + '…' : raw;
}
function drawDim(p, parent) {
  const dimDef = DIMENSIONS.find(d => d.key === p.dimKey);
  const dimLabel = dimDef ? (state.lang === 'en' ? (dimDef.labelEn || dimDef.label) : dimDef.label) : (p.dimLabel || '');
  const node = MM_BY_ID.get(p.nodeId);
  const ariaLabel = (state.lang === 'en' ? 'Open ' : '打开 ') + dimLabel;
  const g = mk('g', { class: 'mm-node mm-dim', 'data-kind': 'dim', 'data-id': p.nodeId, 'data-dim': p.dimKey, tabindex: '0', role: 'button', 'aria-label': ariaLabel }, parent);
  mk('rect', { x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: 7, class: 'mm-rect mm-rect--dim' }, g);
  // 第一行：维度名
  mk('text', { x: p.x - p.w / 2 + 12, y: p.y - p.h / 2 + 17, class: 'mm-text mm-text--dim' }, g).textContent = dimLabel;
  // 第二行：内容摘要（第五级内容的精简呈现）
  const summary = node ? dimSummaryText(node, p.dimKey) : '';
  if (summary) {
    mk('text', { x: p.x - p.w / 2 + 12, y: p.y - p.h / 2 + 34, class: 'mm-text mm-text--dim-desc' }, g).textContent = summary;
  }
}

// ── 交互：缩放 / 拖拽 / 点击（Pointer Events，兼容鼠标 + 触屏 + 双指缩放） ──
const pointers = new Map();   // pointerId → { x, y }（SVG 本地坐标）
let pinch = null;             // 双指缩放快照

function svgPoint(e) {
  const r = SVG.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function onWheel(e) {
  e.preventDefault();
  const p = svgPoint(e);
  const f = e.deltaY < 0 ? 1.12 : 0.892;
  const k0 = tf.k;
  const k1 = Math.min(3.2, Math.max(0.18, k0 * f));
  const wx = (p.x - tf.tx) / k0, wy = (p.y - tf.ty) / k0;
  tf.tx = p.x - wx * k1; tf.ty = p.y - wy * k1; tf.k = k1;
  applyTransform();
}

function onPointerDown(e) {
  SVG.setPointerCapture?.(e.pointerId);
  // 在捕获前记录真实点中节点（setPointerCapture 会让后续 click.target 变成 SVG 本身）
  downNode = e.target.closest?.('.mm-node') || null;
  const p = svgPoint(e);
  pointers.set(e.pointerId, p);
  if (pointers.size === 1) {
    dragging = true; moved = false; lastX = p.x; lastY = p.y;
  } else if (pointers.size === 2) {
    // 进入双指缩放：固定初始变换与双指中点
    const pts = [...pointers.values()];
    const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
    pinch = {
      dist: Math.hypot(dx, dy) || 1,
      midX: (pts[0].x + pts[1].x) / 2,
      midY: (pts[0].y + pts[1].y) / 2,
      k0: tf.k, tx0: tf.tx, ty0: tf.ty,
    };
    dragging = false; moved = true;   // 阻止缩放收尾时的 click 误触
  }
}

function onPointerMove(e) {
  if (!pointers.has(e.pointerId)) return;
  const p = svgPoint(e);
  pointers.set(e.pointerId, p);

  // 双指缩放：以两指中点为锚点，按距离比缩放
  if (pointers.size >= 2 && pinch) {
    const pts = [...pointers.values()];
    const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
    const dist = Math.hypot(dx, dy) || 1;
    const midX = (pts[0].x + pts[1].x) / 2;
    const midY = (pts[0].y + pts[1].y) / 2;
    const f = dist / pinch.dist;
    const k1 = Math.min(3.2, Math.max(0.18, pinch.k0 * f));
    const wx = (midX - pinch.tx0) / pinch.k0;
    const wy = (midY - pinch.ty0) / pinch.k0;
    tf.k = k1;
    tf.tx = midX - wx * k1;
    tf.ty = midY - wy * k1;
    applyTransform();
    return;
  }

  // 单指 / 鼠标拖拽
  if (dragging) {
    const dx = p.x - lastX, dy = p.y - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    tf.tx += dx; tf.ty += dy; lastX = p.x; lastY = p.y;
    applyTransform();
  }
}

function onPointerUp(e) {
  pointers.delete(e.pointerId);
  SVG.releasePointerCapture?.(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (pointers.size === 1) {
    // 双指退回单指：重置基准避免跳变，且抑制本次 click
    const [p] = [...pointers.values()];
    dragging = true; moved = true; lastX = p.x; lastY = p.y;
  } else if (pointers.size === 0) {
    dragging = false;
  }
}

function activateNode(g) {
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

function onClick(e) {
  if (moved) return;
  // 用 pointerdown 时记录的真实节点，避免 setPointerCapture 后 click.target 变成 SVG
  const g = downNode;
  downNode = null;
  if (!g) return;
  clearFocus(true);   // 点击导图内任意节点即清除搜索持久聚焦，恢复正常交互
  activateNode(g);
}

// 键盘可达性：聚焦节点后 Enter / Space 触发与点击一致的行为
function onKeyDown(e) {
  if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
  const el = document.activeElement;
  if (el && el.classList && el.classList.contains('mm-node') && el.dataset && el.dataset.kind) {
    e.preventDefault();
    activateNode(el);
  }
}

// ── 悬浮聚焦 + 搜索高亮 ──
function scaleGroup(g, cx, cy, s) {
  s = s || 1.14;
  if (!g || cx == null || cy == null) return;
  g.setAttribute('transform', `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
}
// 高亮某分支（纪元 + 其下学说），其余分支淡出；doScale=true 时对悬停节点/纪元做局部放大
function applyFocusVisual(era, id, doScale) {
  if (!gBranchesEl) return;
  gBranchesEl.classList.add('is-focusing');
  gBranchesEl.querySelectorAll('.is-focus').forEach(e => e.classList.remove('is-focus'));
  gBranchesEl.querySelectorAll('.mm-sub,.mm-branch').forEach(e => e.removeAttribute('transform'));
  const b = era ? gBranchesEl.querySelector(`.mm-branch[data-era="${era}"]`) : null;
  const sub = (b && id) ? b.querySelector(`.mm-sub[data-id="${id}"]`) : null;
  if (b) b.classList.add('is-focus');
  if (sub) {
    sub.classList.add('is-focus');
    if (doScale) scaleGroup(sub, +sub.dataset.cx, +sub.dataset.cy);
  }
  if (b && doScale && !sub) scaleGroup(b, +b.dataset.cx, +b.dataset.cy);
}
function clearFocus(includePersist) {
  if (includePersist) persistFocus = null;
  if (!gBranchesEl) return;
  // 仅清除瞬时聚焦、保留搜索持久聚焦时，重新应用持久高亮
  if (persistFocus && !includePersist) { applyFocusVisual(persistFocus.era, persistFocus.id, false); return; }
  gBranchesEl.classList.remove('is-focusing');
  gBranchesEl.querySelectorAll('.is-focus').forEach(e => e.classList.remove('is-focus'));
  gBranchesEl.querySelectorAll('.mm-sub,.mm-branch').forEach(e => e.removeAttribute('transform'));
}

function onMmOver(e) {
  const g = e.target.closest && e.target.closest('.mm-node');
  if (!g) return;
  const kind = g.dataset.kind;
  if (kind === 'root') { if (!persistFocus) clearFocus(false); hideMmPreview(); return; }
  const b = g.closest('.mm-branch');
  const sub = g.closest('.mm-sub');
  const era = b && b.dataset.era;
  const id = sub && sub.dataset.id;
  applyFocusVisual(era, id, true);   // 悬浮：局部放大
  if ((kind === 'node' || kind === 'dim') && id) {
    const n = MM_BY_ID.get(id);
    if (n) showMmPreview(n, e.clientX, e.clientY);
  }
}
function onMmOut(e) {
  const to = e.relatedTarget;
  if (to && to.closest && to.closest('.mm-node')) return; // 仍在某分支节点内，交给下一次 over
  hideMmPreview();
  if (persistFocus) applyFocusVisual(persistFocus.era, persistFocus.id, false);
  else clearFocus(false);
}

function showMmPreview(n, x, y) {
  const pv = document.getElementById('mmPreview');
  if (!pv) return;
  const nm = state.lang === 'en' ? (n.nameEn || n.name) : n.name;
  const en = n.nameEn ? (state.lang === 'en' ? n.name : n.nameEn) : '';
  const sum = n.summary || (n.deepContent && n.deepContent.summary) || '—';
  pv.innerHTML =
    `<div class="mm-preview__name">${esc(nm)}</div>` +
    (en ? `<div class="mm-preview__en">${esc(en)}</div>` : '') +
    `<div class="mm-preview__sum">${esc(sum)}</div>`;
  pv.hidden = false;
  const pad = 14, r = pv.getBoundingClientRect();
  let px = x + 16, py = y + 16;
  if (px + r.width > window.innerWidth - pad) px = x - r.width - 16;
  if (py + r.height > window.innerHeight - pad) py = y - r.height - 16;
  pv.style.left = Math.max(pad, px) + 'px';
  pv.style.top = Math.max(pad, py) + 'px';
}
function hideMmPreview() { const pv = document.getElementById('mmPreview'); if (pv) pv.hidden = true; }

// 搜索联动：展开该学说维度、高亮其分支路径（根 → 纪元 → 学说）并缩放定位
export function focusMindmapNode(id) {
  const n = MM_BY_ID.get(id);
  if (!n) return;
  persistFocus = { era: n.era, id };
  expanded.add(id);
  expandAll = false;
  const c = document.getElementById('mmExpandAll'); if (c) c.checked = false;
  render();
  fitToNode(id);
}
function fitToNode(id) {
  if (!SVG) return;
  const np = posMap.get(id);
  if (!np) return;
  const dims = [...posMap.values()].filter(p => p.kind === 'dim' && p.nodeId === id);
  const pts = [np, ...dims];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x - p.w / 2); maxX = Math.max(maxX, p.x + p.w / 2);
    minY = Math.min(minY, p.y - p.h / 2); maxY = Math.max(maxY, p.y + p.h / 2);
  }
  const cw = SVG.clientWidth || 960, ch = SVG.clientHeight || 640;
  if (cw < 50 || ch < 50) return;
  const boxW = (maxX - minX) || 1, boxH = (maxY - minY) || 1;
  const k = Math.min(cw / boxW, ch / boxH) * 0.72;   // 比整体 fit 更放大
  tf.k = k;
  tf.tx = (cw - boxW * k) / 2 - minX * k;
  tf.ty = (ch - boxH * k) / 2 - minY * k;
  applyTransform();
}

function bind() {
  if (!SVG || !VIEWPORT) return;
  SVG.addEventListener('wheel', onWheel, { passive: false });
  SVG.addEventListener('pointerdown', onPointerDown);
  SVG.addEventListener('pointermove', onPointerMove);
  SVG.addEventListener('pointerup', onPointerUp);
  SVG.addEventListener('pointercancel', onPointerUp);
  SVG.addEventListener('mouseover', onMmOver);   // 悬浮聚焦 + 预览卡
  SVG.addEventListener('mouseout', onMmOut);
  SVG.addEventListener('click', onClick);   // 监听器必须绑在 SVG（节点的祖先）：setPointerCapture 会把 click.target 重定向到 SVG，且不经过 #mmViewport
  SVG.addEventListener('keydown', onKeyDown);
}

// ── 导出：整张思维导图存为 PNG 位图 / SVG 矢量 ──
// 导出的是「完整全景」——以画布坐标直接包裹全树，不受当前缩放/平移影响。
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
const FALLBACK_VARS = {
  '--gold': '#B8893B', '--gold-dark': '#8B6914', '--gold-tint': 'rgba(184,137,59,.12)',
  '--ink': '#2A2620', '--ink-2': '#6B6253', '--ink-3': '#9A8F7E',
  '--bg': '#FBF9F4', '--bg-2': '#F6F2EA',
  '--font-serif': 'serif', '--font-sans': 'system-ui, sans-serif',
};
function rootVarStyle() {
  const decl = Object.keys(FALLBACK_VARS)
    .map(n => `${n}:${cssVar(n) || FALLBACK_VARS[n]};`).join('');
  return `:root{${decl}}`;
}
function triggerDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
// 构建内联样式的完整 SVG 字符串（导出两种格式共用）
async function buildExportSVG() {
  const b = bounds();
  if (!isFinite(b.minX)) return null;
  const pad = 40;
  const vbX = b.minX - pad, vbY = b.minY - pad;
  const vbW = (b.maxX - b.minX) + pad * 2;
  const vbH = (b.maxY - b.minY) + pad * 2;
  const clone = SVG.cloneNode(true);
  clone.setAttribute('xmlns', SVGNS);
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
  clone.setAttribute('width', String(vbW));
  clone.setAttribute('height', String(vbH));
  const vp = clone.querySelector('#mmViewport');
  if (vp) vp.removeAttribute('transform');           // 内容已是画布坐标，去掉屏幕缩放/平移
  const branches = clone.querySelector('.mm-branches');
  if (branches) branches.classList.remove('is-focusing');  // 去掉悬浮聚焦淡出态
  clone.querySelectorAll('.is-focus').forEach(e => e.classList.remove('is-focus'));
  // 背景矩形（SVG 自身无 .mindmap-svg 的背景）
  const bgRect = document.createElementNS(SVGNS, 'rect');
  bgRect.setAttribute('x', String(vbX)); bgRect.setAttribute('y', String(vbY));
  bgRect.setAttribute('width', String(vbW)); bgRect.setAttribute('height', String(vbH));
  bgRect.setAttribute('fill', cssVar('--bg') || FALLBACK_VARS['--bg']);
  clone.insertBefore(bgRect, clone.firstChild);
  // 把 :root 变量 + 思维导图样式内联进 SVG（否则导出图无颜色/字体）
  let cssText = '';
  try { cssText = await (await fetch('css/mindmap.css')).text(); } catch (e) { /* 离线时不致命 */ }
  const styleEl = document.createElementNS(SVGNS, 'style');
  styleEl.textContent = rootVarStyle() + '\n' + cssText;
  clone.insertBefore(styleEl, clone.firstChild);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}
export async function exportMindmap(format) {
  // 临时全展开所有维度，确保第三级（维度叶子）一并导出；导出后还原页面状态
  const prevExpandAll = expandAll;
  const prevExpanded = new Set(expanded);
  expandAll = true; expanded.clear();
  computeLayout();
  render();
  let svgStr, fullVbW = 0, fullVbH = 0;
  try {
    svgStr = await buildExportSVG();
    const fb = bounds();               // 此时仍是全展开布局
    const pad = 40;
    fullVbW = (fb.maxX - fb.minX) + pad * 2;
    fullVbH = (fb.maxY - fb.minY) + pad * 2;
  } finally {
    expandAll = prevExpandAll; expanded = prevExpanded;
    computeLayout(); render();         // 还原用户原本的展开/折叠状态
  }
  if (!svgStr) { console.warn('[mindmap] 导出失败：导图尚未渲染'); return; }
  const lang = state.lang || 'zh';
  const base = `physics-mindmap-${lang}`;
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  if (format === 'svg') {
    triggerDownload(dataUrl, `${base}.svg`);
    return;
  }
  // PNG：把 SVG 画到高分辨率 canvas 再导出（自适应缩放，避免全展开后画布超限）
  const scale = Math.min(2, 16384 / Math.max(fullVbW, fullVbH, 1));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(fullVbW * scale));
    canvas.height = Math.max(1, Math.round(fullVbH * scale));
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, fullVbW, fullVbH);
    try {
      triggerDownload(canvas.toDataURL('image/png'), `${base}.png`);
    } catch (e) {
      console.error('[mindmap] PNG 导出失败', e);
      window.alert('PNG 导出失败（可能因浏览器安全限制），请改用 SVG 格式。');
    }
  };
  img.onerror = () => {
    console.error('[mindmap] SVG 转图片失败');
    window.alert('PNG 导出失败，请改用 SVG 格式。');
  };
  img.src = dataUrl;
}

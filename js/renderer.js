import { state } from './state.js';
import { el, esc, edgePath, bezierMidpoint } from './utils.js';
import { ERAS, ERA_ORDER, EDGE_CLASS, SCALE_ORDER, SCALE_LABEL, SCALE_LABEL_EN, SCALE_COLORS, SCALE_DESC } from './config.js';

const EDGE_LABELS = {
  inherit: '继承',
  branch: '分支',
  revolution: '革命',
  unify: '统一',
  conflict: '冲突',
};
// 关系边英文标签（界面双语切换用，仅 UI 文案）
const EDGE_LABELS_EN = {
  inherit: 'Inherit',
  branch: 'Branch',
  revolution: 'Revolution',
  unify: 'Unify',
  conflict: 'Conflict',
};

let NODES = [], EDGES = [], SUMMARIES = {}, POS = {};
const byId = new Map();
let nodeEls = new Map();
let edgeEls = [];
let currentView = 'timeline';
let scaleBandY = {}; // scale 视图每行的 y 范围，用于绘制跨尺度关系连线

export function initRenderer(nodes, edges, summaries) {
  NODES = nodes; EDGES = edges; SUMMARIES = summaries || {};
  byId.clear(); nodes.forEach(n => byId.set(n.id, n));
}

function clear(layer) { while (layer.firstChild) layer.removeChild(layer.firstChild); }

// 估算文字渲染宽度（CJK 按字号宽，其余约 0.6 倍），用于标签底板尺寸
function labelW(text, size) {
  let w = 0;
  for (const ch of String(text)) {
    w += /[一-鿿]/.test(ch) ? size : size * 0.6;
  }
  return w;
}

export function renderGraph(view, layoutList) {
  currentView = view;
  POS = Object.fromEntries(layoutList.map(p => [p.id, p]));
  const L = {
    era: document.getElementById('layer-era'),
    edges: document.getElementById('layer-edges'),
    nodes: document.getElementById('layer-nodes'),
    scaleLabels: document.getElementById('layer-scale-labels'),
  };
  clear(L.era); clear(L.edges); clear(L.nodes); clear(L.scaleLabels);
  nodeEls = new Map(); edgeEls = [];
  scaleBandY = {};

  if (view === 'scale') {
    drawScaleBands(L.era, L.scaleLabels);
  } else {
    drawEraBands(L.era);
  }
  drawEdges(L.edges);
  drawNodes(L.nodes);
  applyState();
}

function drawEraBands(layer) {
  // 统一背景带高度：取所有节点中最高/最低点，让五个纪元色卡上下对齐
  const all = NODES.map(n => POS[n.id]).filter(Boolean);
  if (!all.length) return;
  const globalMinY = Math.min(...all.map(p => p.y)) - 90;
  const globalMaxY = Math.max(...all.map(p => p.y)) + 90;

  for (const era of ERA_ORDER) {
    const xs = NODES.filter(n => n.era === era).map(n => POS[n.id]).filter(Boolean);
    if (!xs.length) continue;
    const minX = Math.min(...xs.map(p => p.x)) - 60;
    const maxX = Math.max(...xs.map(p => p.x)) + 60;
    const active = era === state.activeEra;
    const rect = el('rect', {
      x: minX, y: globalMinY, width: maxX - minX, height: globalMaxY - globalMinY,
      fill: `url(#eraGrad-${era})`, 'fill-opacity': active ? 0.14 : 0.08, rx: 18, class: 'era-band',
    }, layer);
    if (active) {
      const hlW = ERAS[era].name.length * 20 + 22;
      el('rect', { class: 'era-band__hl', x: minX + 6, y: globalMinY + 4, width: hlW, height: 38, rx: 10,
        fill: ERAS[era].raw, 'fill-opacity': 0.20 }, layer);
    }
    el('text', { x: minX + 16, y: globalMinY + 30, class: 'era-band__label' + (active ? ' is-active-era' : ''),
      text: state.lang === 'en' ? (ERAS[era].nameEn || ERAS[era].name) : ERAS[era].name, fill: active ? '#2A2620' : ERAS[era].raw, 'data-era': era }, layer);
    el('text', { x: minX + 16, y: globalMinY + 50, class: 'era-band__range',
      text: ERAS[era].range, fill: active ? '#2A2620' : ERAS[era].raw }, layer);
  }
}

function drawScaleBands(layer, labelLayer) {
  // 尺度维度：按 microscopic / mesoscopic / cosmic / unified / feedback 分行显示
  const all = NODES.map(n => POS[n.id]).filter(Boolean);
  if (!all.length) return;
  const globalMinX = Math.min(...all.map(p => p.x)) - 160;
  const globalMaxX = Math.max(...all.map(p => p.x)) + 80;
  // 若顶层标签层不存在，回退到原 layer（兼容旧 HTML）
  const labelL = labelLayer || layer;

  for (const scale of SCALE_ORDER) {
    const xs = NODES.filter(n => n.scale === scale).map(n => POS[n.id]).filter(Boolean);
    if (!xs.length) continue;
    const minY = Math.min(...xs.map(p => p.y)) - 70;
    const maxY = Math.max(...xs.map(p => p.y)) + 70;
    scaleBandY[scale] = { minY, maxY, midY: (minY + maxY) / 2 };
    const cfg = SCALE_COLORS[scale];

    // 背景带仍放在底层 layer，节点在其上方经过
    el('rect', {
      x: globalMinX, y: minY, width: globalMaxX - globalMinX, height: maxY - minY,
      fill: cfg.raw, 'fill-opacity': 0.09, rx: 16, class: 'scale-band',
    }, layer);

    // 标签与说明文字放到顶层 labelLayer，避免被节点圆圈遮挡
    el('text', {
      x: globalMinX + 18, y: minY + 32,
      class: 'scale-band__label' + (state.activeScale === scale ? ' is-active-scale' : ''),
      text: state.lang === 'en' ? (SCALE_LABEL_EN[scale] || SCALE_LABEL[scale]) : SCALE_LABEL[scale],
      fill: cfg.raw,
      'data-scale': scale,
      style: 'cursor:pointer;',
    }, labelL);

    // 标签下加一行概念解析小字
    const desc = SCALE_DESC[scale];
    if (desc && desc.tag) {
      el('text', {
        x: globalMinX + 20, y: minY + 54,
        class: 'scale-band__tag',
        text: desc.tag,
        fill: cfg.raw,
      }, labelL);
    }

    // 标签下加通俗认知提示（面向非专业读者，最多两行）
    if (desc && desc.hint) {
      const hintLines = String(desc.hint).split('\n');
      const hintEl = el('text', {
        x: globalMinX + 20, y: minY + 73,
        class: 'scale-band__hint',
      }, labelL);
      hintLines.forEach((ln, i) => {
        el('tspan', { x: globalMinX + 20, dy: i === 0 ? 0 : 18, text: ln }, hintEl);
      });
    }

    // 淡淡的下边界分隔线
    el('line', {
      x1: globalMinX + 12, y1: maxY - 10,
      x2: globalMaxX - 12, y2: maxY - 10,
      stroke: cfg.raw, 'stroke-width': 1.2, 'stroke-opacity': 0.22,
      class: 'scale-band__line',
    }, layer);
  }

  // ── 尺度间桥接标签（涌现 / 引力桥梁 / 统一 / 反哺）──
  // 在相邻尺度带的交界处绘制关系标签线 + 文字
  for (let i = 0; i < SCALE_ORDER.length - 1; i++) {
    const sA = SCALE_ORDER[i];
    const sB = SCALE_ORDER[i + 1];
    const bandA = scaleBandY[sA];
    const bandB = scaleBandY[sB];
    if (!bandA || !bandB) continue;

    // 交界 Y 坐标（两个带的中点之间）
    const gapY = (bandA.maxY + bandB.minY) / 2;

    // 从当前尺度的 extend 中找"明确指向相邻下一尺度"的渗透标签（箭头 →/↔ 后紧跟目标尺度名或英文 key）
    const descA = SCALE_DESC[sA];
    const targetLabel = SCALE_LABEL[sB];
    const relEntry = (descA?.extend || []).find(e => {
      const rel = e.rel || '';
      return rel.includes('→ ' + targetLabel) || rel.includes('→ ' + sB) ||
             rel.includes('↔ ' + targetLabel) || rel.includes('↔ ' + sB);
    });
    const relLabel = relEntry ? relEntry.rel : '';

    if (!relLabel) continue;

    // 画虚线分隔
    el('line', {
      x1: globalMinX + 20, y1: gapY,
      x2: globalMaxX - 20, y2: gapY,
      stroke: '#9E8B66', 'stroke-width': 1,
      'stroke-dasharray': '6 4', 'stroke-opacity': 0.45,
    }, layer);

    // 画标签背景（圆角矩形）
    const labelW = relLabel.length * 13 + 24;
    const labelX = globalMinX + 50;
    el('rect', {
      x: labelX, y: gapY - 11,
      width: labelW, height: 22, rx: 11,
      fill: '#FFF9F0', stroke: '#C4A96A', 'stroke-width': 0.8, 'stroke-opacity': 0.5,
    }, layer);

    // 画标签文字
    el('text', {
      x: labelX + labelW / 2, y: gapY + 4,
      class: 'scale-gap__label',
      text: relLabel,
      fill: '#8B7340',
    }, layer);
  }
}

function scaleEdgePath(a, b) {
  // 尺度维度视图用正交折线：同行水平，跨行先垂后平再垂，像地铁图
  const dy = Math.abs(b.y - a.y);
  if (dy < 2) {
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }
  const my = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} L ${a.x} ${my} L ${b.x} ${my} L ${b.x} ${b.y}`;
}

function scaleLabelMid(a, b) {
  const dy = Math.abs(b.y - a.y);
  if (dy < 2) return { x: (a.x + b.x) / 2, y: a.y - 8 };
  const my = (a.y + b.y) / 2;
  return { x: (a.x + b.x) / 2, y: my - 8 };
}

function drawEdges(layer) {
  const isScale = currentView === 'scale';
  for (const e of EDGES) {
    const a = POS[e.from], b = POS[e.to];
    if (!a || !b) continue;
    const d = isScale ? scaleEdgePath(a, b) : edgePath(a, b);
    const path = el('path', {
      d, class: `edge ${EDGE_CLASS[e.type]}`,
    }, layer);
    // 继承边：叠加一条金色流动光点（从父 a 流向子 b），父→子方向天然正确
    if (e.type === 'inherit') {
      el('path', { d, class: 'edge edge--inherit-flow' }, layer);
    }
    const m = isScale ? scaleLabelMid(a, b) : bezierMidpoint(a, b);
    const text = (state.lang === 'en' ? EDGE_LABELS_EN : EDGE_LABELS)[e.type] || e.type;
    const lw = labelW(text, 10) + 10;
    el('rect', {
      class: 'edge__label-bg',
      x: m.x - lw / 2, y: m.y - 10,
      width: lw, height: 13, rx: 3,
    }, layer);
    const label = el('text', {
      x: m.x, y: m.y,
      class: 'edge__label',
      text,
    }, layer);
    edgeEls.push({ from: e.from, to: e.to, el: path, label });
  }
}

function drawNodes(layer) {
  for (const n of NODES) {
    const p = POS[n.id];
    if (!p) continue;
    let r = 18;
    if (n.type === 'event') r = 14;
    else     if (n.tier === 'core') r = 26;
    else if (n.tier === 'hub') r = 22;
    const g = el('g', {
      class: 'node', 'data-id': n.id, 'data-era': n.era,
      'data-maturity': n.maturity, 'data-type': n.type,
      transform: `translate(${p.x},${p.y})`,
    }, layer);
    el('circle', { class: 'node__circle', r, cx: 0, cy: 0 }, g);
    // 标签策略 + 界面双语：EN 模式节点名取 nameEn（无则回退中文）
    const nameText = state.lang === 'en' ? (n.nameEn || n.name) : n.name;
    const isLarge = n.tier === 'core' || n.tier === 'hub';
    if (isLarge) {
      // 圆圈内：名字居中偏下，年份在更下面
      el('text', { class: 'node__label node__label--inner', x: 0, y: r * 0.28, text: nameText }, g);
      if (typeof n.year === 'number') {
        el('text', { class: 'node__year node__year--inner', x: 0, y: r * 0.62, text: String(n.year) }, g);
      }
    } else {
      // 圆圈外：名字和年份在正下方
      const nameY = r + 20;
      el('text', { class: 'node__label', x: 0, y: nameY, text: nameText }, g);
      if (typeof n.year === 'number') {
        const yearY = r + 36;
        el('text', { class: 'node__year', x: 0, y: yearY, text: String(n.year) }, g);
      }
    }
    nodeEls.set(n.id, g);
  }
}

export function applyState() {
  const visible = new Set();
  for (const n of NODES) {
    const g = nodeEls.get(n.id);
    if (!g) continue;
    let show = true;
    if (state.filterEra && n.era !== state.filterEra) show = false;
    if (state.onlyCore && n.tier !== 'core' && n.type !== 'event') show = false;
    // 选中关联强制显示
    if (state.selected && state.highlight.has(n.id)) show = true;
    g.style.display = show ? '' : 'none';
    if (show) visible.add(n.id);
  }
  // 节点高亮
  for (const n of NODES) {
    const g = nodeEls.get(n.id);
    if (!g || !visible.has(n.id)) continue;
    const isSel = n.id === state.selected;
    g.classList.toggle('is-selected', isSel);
    // 关联节点（选中节点的直系父子，非选中本身）→ 明确高亮，让它在画布上"显出来"
    const related = state.selected ? state.highlight.has(n.id) : false;
    g.classList.toggle('is-related', related && !isSel);
    const dim = state.selected ? !state.highlight.has(n.id) : false;
    g.classList.toggle('is-dim', dim);
  }
  // 边：两端可见且不 dim 才亮
  for (const e of edgeEls) {
    const vis = visible.has(e.from) && visible.has(e.to);
    e.el.style.display = vis ? '' : 'none';
    if (e.label) e.label.style.display = vis ? '' : 'none';
    const relatedEdge = state.selected && state.highlight.has(e.from) && state.highlight.has(e.to);
    const dim = state.selected ? !relatedEdge : false;
    e.el.classList.toggle('is-related', relatedEdge);
    e.el.classList.toggle('is-dim', dim);
    if (e.label) {
      e.label.classList.toggle('is-related', relatedEdge);
      e.label.classList.toggle('is-dim', dim);
    }
  }
}

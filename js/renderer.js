import { state } from './state.js';
import { el, esc, edgePath, bezierMidpoint } from './utils.js';
import { ERAS, ERA_ORDER, EDGE_CLASS } from './config.js';

const EDGE_LABELS = {
  inherit: '继承',
  branch: '分支',
  revolution: '革命',
  unify: '统一',
  conflict: '冲突',
};

let NODES = [], EDGES = [], SUMMARIES = {}, POS = {};
const byId = new Map();
let nodeEls = new Map();
let edgeEls = [];
let prefaceEls = [];

export function initRenderer(nodes, edges, summaries) {
  NODES = nodes; EDGES = edges; SUMMARIES = summaries || {};
  byId.clear(); nodes.forEach(n => byId.set(n.id, n));
}

function clear(layer) { while (layer.firstChild) layer.removeChild(layer.firstChild); }

export function renderGraph(view, layoutList) {
  POS = Object.fromEntries(layoutList.map(p => [p.id, p]));
  const L = {
    era: document.getElementById('layer-era'),
    edges: document.getElementById('layer-edges'),
    nodes: document.getElementById('layer-nodes'),
    preface: document.getElementById('layer-preface'),
  };
  clear(L.era); clear(L.edges); clear(L.nodes); clear(L.preface);
  nodeEls = new Map(); edgeEls = []; prefaceEls = [];

  drawEraBands(L.era);
  drawEdges(L.edges);
  drawNodes(L.nodes);
  if (view === 'timeline') /* drawPrefaces(L.preface); 已移除 —— 序言卡片为视觉噪音 */;
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
    const rect = el('rect', {
      x: minX, y: globalMinY, width: maxX - minX, height: globalMaxY - globalMinY,
      fill: ERAS[era].raw, 'fill-opacity': 0.08, rx: 18, class: 'era-band',
    }, layer);
    el('text', { x: minX + 16, y: globalMinY + 28, class: 'era-band__label',
      text: ERAS[era].name, fill: ERAS[era].raw, 'data-era': era }, layer);
    el('text', { x: minX + 16, y: globalMinY + 48, class: 'era-band__range',
      text: ERAS[era].range, fill: ERAS[era].raw }, layer);
  }
}

function drawEdges(layer) {
  for (const e of EDGES) {
    const a = POS[e.from], b = POS[e.to];
    if (!a || !b) continue;
    const d = edgePath(a, b);
    const path = el('path', {
      d, class: `edge ${EDGE_CLASS[e.type]}`,
    }, layer);
    const m = bezierMidpoint(a, b);
    const label = el('text', {
      x: m.x, y: m.y - 5,
      class: 'edge__label',
      text: EDGE_LABELS[e.type] || e.type,
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
    else if (n.tier === 'core') r = 26;
    else if (n.tier === 'hub') r = 22;
    const g = el('g', {
      class: 'node', 'data-id': n.id, 'data-era': n.era,
      'data-maturity': n.maturity, 'data-type': n.type,
      transform: `translate(${p.x},${p.y})`,
    }, layer);
    el('circle', { class: 'node__circle', r, cx: 0, cy: 0 }, g);
    el('text', { class: 'node__label', x: 0, y: r + 24, text: n.name }, g);
    if (typeof n.year === 'number') {
      el('text', { class: 'node__year', x: 0, y: r + 41, text: String(n.year) }, g);
    }
    nodeEls.set(n.id, g);
  }
}

function drawPrefaces(layer) {
  for (const era of ERA_ORDER) {
    const sum = SUMMARIES[era];
    const xs = NODES.filter(n => n.era === era).map(n => POS[n.id]);
    if (!xs.length) continue;
    const minX = Math.min(...xs.map(p => p.x));
    const topY = Math.min(...xs.map(p => p.y)) - 130;
    const quote = typeof sum === 'string' ? sum : (sum?.quote || sum?.text || '');
    const g = el('g', { class: 'preface', 'data-era': era, transform: `translate(${minX},${topY})` }, layer);
    el('rect', { class: 'preface__rect', x: 0, y: 0, width: 230, height: 104, rx: 14 }, g);
    el('text', { class: 'preface__era', x: 16, y: 28, text: ERAS[era].name }, g);
    const qt = quote ? quote.replace(/\s+/g, ' ').slice(0, 56) + (quote.length > 56 ? '…' : '') : '';
    // 多行引言
    const words = qt.split('');
    let line = '', ly = 52;
    for (const ch of words) {
      if (line.length > 14) { el('text', { class: 'preface__quote', x: 16, y: ly, text: line }); line = ''; ly += 18; }
      line += ch;
    }
    if (line) el('text', { class: 'preface__quote', x: 16, y: ly, text: line });
    prefaceEls.push(g);
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
  // 序言卡随筛选
  for (const g of prefaceEls) {
    g.style.display = (state.filterEra && g.dataset.era !== state.filterEra) ? 'none' : '';
  }
  // 节点高亮
  for (const n of NODES) {
    const g = nodeEls.get(n.id);
    if (!g || !visible.has(n.id)) continue;
    g.classList.toggle('is-selected', n.id === state.selected);
    const dim = state.selected ? !state.highlight.has(n.id) : false;
    g.classList.toggle('is-dim', dim);
  }
  // 边：两端可见且不 dim 才亮
  for (const e of edgeEls) {
    const vis = visible.has(e.from) && visible.has(e.to);
    e.el.style.display = vis ? '' : 'none';
    if (e.label) e.label.style.display = vis ? '' : 'none';
    const dim = state.selected ? !(state.highlight.has(e.from) && state.highlight.has(e.to)) : false;
    e.el.classList.toggle('is-dim', dim);
    if (e.label) e.label.classList.toggle('is-dim', dim);
  }
}

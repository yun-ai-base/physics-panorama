import { state } from './state.js';
import { el, esc, edgePath, bezierMidpoint } from './utils.js';
import { ERAS, ERA_ORDER, EDGE_CLASS, SCALE_ORDER, SCALE_LABEL, SCALE_COLORS, SCALE_DESC, SCALE_RELATIONS } from './config.js';

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
let relationEls = [];
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
    preface: document.getElementById('layer-preface'),
  };
  clear(L.era); clear(L.edges); clear(L.nodes); clear(L.preface);
  nodeEls = new Map(); edgeEls = []; prefaceEls = []; relationEls = [];
  scaleBandY = {};

  if (view === 'scale') {
    drawScaleBands(L.era);
    drawScaleRelations(L.era);
  } else {
    drawEraBands(L.era);
  }
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
    const active = era === state.activeEra;
    const rect = el('rect', {
      x: minX, y: globalMinY, width: maxX - minX, height: globalMaxY - globalMinY,
      fill: ERAS[era].raw, 'fill-opacity': active ? 0.14 : 0.08, rx: 18, class: 'era-band',
    }, layer);
    if (active) {
      const hlW = ERAS[era].name.length * 20 + 22;
      el('rect', { class: 'era-band__hl', x: minX + 6, y: globalMinY + 4, width: hlW, height: 38, rx: 10,
        fill: ERAS[era].raw, 'fill-opacity': 0.20 }, layer);
    }
    el('text', { x: minX + 16, y: globalMinY + 30, class: 'era-band__label' + (active ? ' is-active-era' : ''),
      text: ERAS[era].name, fill: active ? '#2A2620' : ERAS[era].raw, 'data-era': era }, layer);
    el('text', { x: minX + 16, y: globalMinY + 50, class: 'era-band__range',
      text: ERAS[era].range, fill: active ? '#2A2620' : ERAS[era].raw }, layer);
  }
}

function drawScaleBands(layer) {
  // 尺度维度：按 microscopic / mesoscopic / cosmic / unified / feedback 分行显示
  const all = NODES.map(n => POS[n.id]).filter(Boolean);
  if (!all.length) return;
  const globalMinX = Math.min(...all.map(p => p.x)) - 160;
  const globalMaxX = Math.max(...all.map(p => p.x)) + 80;

  for (const scale of SCALE_ORDER) {
    const xs = NODES.filter(n => n.scale === scale).map(n => POS[n.id]).filter(Boolean);
    if (!xs.length) continue;
    const minY = Math.min(...xs.map(p => p.y)) - 70;
    const maxY = Math.max(...xs.map(p => p.y)) + 70;
    scaleBandY[scale] = { minY, maxY, midY: (minY + maxY) / 2 };
    const cfg = SCALE_COLORS[scale];
    const active = state.filterEra ? false : true; // 在 scale 视图下默认全部高亮

    el('rect', {
      x: globalMinX, y: minY, width: globalMaxX - globalMinX, height: maxY - minY,
      fill: cfg.raw, 'fill-opacity': 0.09, rx: 16, class: 'scale-band',
    }, layer);

    el('text', {
      x: globalMinX + 18, y: minY + 32,
      class: 'scale-band__label' + (state.activeScale === scale ? ' is-active-scale' : ''),
      text: SCALE_LABEL[scale],
      fill: cfg.raw,
      'data-scale': scale,
      style: 'cursor:pointer;',
    }, layer);

    // 标签下加一行概念解析小字
    const desc = SCALE_DESC[scale];
    if (desc && desc.tag) {
      el('text', {
        x: globalMinX + 20, y: minY + 54,
        class: 'scale-band__tag',
        text: desc.tag,
        fill: cfg.raw,
      }, layer);
    }

    // 淡淡的下边界分隔线
    el('line', {
      x1: globalMinX + 12, y1: maxY - 10,
      x2: globalMaxX - 12, y2: maxY - 10,
      stroke: cfg.raw, 'stroke-width': 1.2, 'stroke-opacity': 0.22,
      class: 'scale-band__line',
    }, layer);
  }
}

function drawScaleRelations(layer) {
  if (currentView !== 'scale' || !Object.keys(scaleBandY).length) return;
  const all = NODES.map(n => POS[n.id]).filter(Boolean);
  if (!all.length) return;
  const globalMaxX = Math.max(...all.map(p => p.x)) + 80;
  const spineX = globalMaxX + 55;

  // 每个尺度在右侧脊柱上的节点
  for (const scale of SCALE_ORDER) {
    const y = scaleBandY[scale]; if (!y) continue;
    el('circle', {
      cx: spineX, cy: y.midY, r: 4,
      fill: SCALE_COLORS[scale].raw, 'fill-opacity': 0.55,
      class: 'scale-relation__dot',
    }, layer);
  }

  // 跨尺度渗透曲线（默认低透明度，active 时高亮）
  for (const r of SCALE_RELATIONS) {
    const y1 = scaleBandY[r.from], y2 = scaleBandY[r.to];
    if (!y1 || !y2) continue;
    const my = (y1.midY + y2.midY) / 2;
    const d = `M ${spineX} ${y1.midY} C ${spineX + 70} ${y1.midY}, ${spineX + 70} ${y2.midY}, ${spineX} ${y2.midY}`;
    const path = el('path', {
      d, fill: 'none', stroke: r.color, 'stroke-width': 2, 'stroke-opacity': 0.32,
      class: 'scale-relation__line', 'data-rel': r.rel,
    }, layer);

    // 箭头指向目标尺度
    const dir = y2.midY > y1.midY ? 1 : -1;
    const ay = y2.midY - dir * 5;
    el('path', {
      d: `M ${spineX} ${ay} l -4 ${-dir * 3} l 8 0 z`,
      fill: r.color, 'fill-opacity': 0.55, class: 'scale-relation__arrow', 'data-rel': r.rel,
    }, layer);

    // 标签
    const lw = labelW(r.label, 12) + 10;
    const lx = spineX + 78;
    el('rect', {
      x: lx - lw / 2, y: my - 8, width: lw, height: 14, rx: 4,
      fill: '#fff', 'fill-opacity': 0.82, class: 'scale-relation__label-bg', 'data-rel': r.rel,
    }, layer);
    el('text', {
      x: lx, y: my + 3, 'text-anchor': 'middle', class: 'scale-relation__label',
      text: r.label, fill: r.color, 'data-rel': r.rel,
    }, layer);

    relationEls.push({ path, rel: r.rel });
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
    const m = isScale ? scaleLabelMid(a, b) : bezierMidpoint(a, b);
    const text = EDGE_LABELS[e.type] || e.type;
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
    else if (n.tier === 'core') r = 26;
    else if (n.tier === 'hub') r = 22;
    const g = el('g', {
      class: 'node', 'data-id': n.id, 'data-era': n.era,
      'data-maturity': n.maturity, 'data-type': n.type,
      transform: `translate(${p.x},${p.y})`,
    }, layer);
    el('circle', { class: 'node__circle', r, cx: 0, cy: 0 }, g);
    // 标签策略：大节点(core/hub)名字写在圆圈内部底部，小节点写在外面下方
    const isLarge = n.tier === 'core' || n.tier === 'hub';
    if (isLarge) {
      // 圆圈内：名字居中偏下，年份在更下面
      el('text', { class: 'node__label node__label--inner', x: 0, y: r * 0.28, text: n.name }, g);
      if (typeof n.year === 'number') {
        el('text', { class: 'node__year node__year--inner', x: 0, y: r * 0.62, text: String(n.year) }, g);
      }
    } else {
      // 圆圈外：名字和年份在正下方
      const nameY = r + 20;
      el('text', { class: 'node__label', x: 0, y: nameY, text: n.name }, g);
      if (typeof n.year === 'number') {
        const yearY = r + 36;
        el('text', { class: 'node__year', x: 0, y: yearY, text: String(n.year) }, g);
      }
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
  // 跨尺度渗透关系线：默认低透明度，active 时高亮
  for (const r of relationEls) {
    const active = !!state.activeRelation && r.rel === state.activeRelation;
    r.path.classList.toggle('is-active', active);
    r.path.setAttribute('stroke-width', active ? 3 : 2);
    r.path.setAttribute('stroke-opacity', active ? 1 : 0.32);
  }
}

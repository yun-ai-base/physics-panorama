import { REVOLUTION_SET, UNIFY_NODES, EDGE_CLASS } from './config.js?v=20260808u';

export const SVGNS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) {
    if (k === 'text') e.textContent = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(e);
  return e;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}

// 由 prevIds 单向生成边；conflict 边来自 physics-data
export function buildEdges(nodes, conflicts = []) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const edges = [];
  for (const n of nodes) {
    for (const pid of (n.prevIds || [])) {
      if (!byId.has(pid)) continue;
      let type = 'inherit';
      if (REVOLUTION_SET.has(`${pid}|${n.id}`)) type = 'revolution';
      else if (UNIFY_NODES.has(n.id)) type = 'unify';
      else if (n.tier === 'branch' && byId.get(pid).tier === 'core') type = 'branch';
      edges.push({ from: pid, to: n.id, type });
    }
  }
  for (const c of conflicts) {
    if (byId.has(c.from) && byId.has(c.to)) edges.push({ from: c.from, to: c.to, type: 'conflict' });
  }
  return edges;
}

// 路径高亮节点集合：一级直系（默认）或全链路（展开全部）
export function relatedSet(nodes, id, expandAll) {
  const parents = new Map(nodes.map(n => [n.id, n.prevIds || []]));
  const children = new Map(nodes.map(n => [n.id, []]));
  for (const n of nodes) for (const p of n.prevIds || []) (children.get(p) || []).push(n.id);
  const set = new Set([id]);
  if (expandAll) {
    const up = x => { for (const p of parents.get(x) || []) if (!set.has(p)) { set.add(p); up(p); } };
    const down = x => { for (const c of children.get(x) || []) if (!set.has(c)) { set.add(c); down(c); } };
    up(id); down(id);
  } else {
    for (const p of parents.get(id) || []) set.add(p);
    for (const c of children.get(id) || []) set.add(c);
  }
  return set;
}

// 上下游链路（用于侧边栏「路径上下文」）
export function chain(nodes, id) {
  const parents = new Map(nodes.map(n => [n.id, n.prevIds || []]));
  const children = new Map(nodes.map(n => [n.id, []]));
  for (const n of nodes) for (const p of n.prevIds || []) (children.get(p) || []).push(n.id);
  return { parents: parents.get(id) || [], children: children.get(id) || [] };
}

export function edgePath(a, b) {
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
}

// 取上述 cubic-bezier 在 t=0.5 处的点，用于放置边标签
export function bezierMidpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

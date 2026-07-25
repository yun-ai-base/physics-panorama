import { ERA_RANK, SCALE_RANK } from './config.js';

const YEAR_MIN = 1600, YEAR_MAX = 2025;
const W = 2600; // 画布宽度
const NODE_R = 32; // 节点碰撞半径（含标签）
const MIN_DIST = NODE_R * 2.4; // 最小中心距 ≈ 77px

export function computeLayout(nodes, view) {
  let pos;

  if (view === 'timeline') {
    pos = nodes.map(n => ({
      id: n.id,
      x: n.layout?.timeline?.x ?? 0,
      y: n.layout?.timeline?.y ?? 0,
    }));
  } else if (view === 'scale') {
    pos = computeScaleLayout(nodes);
  } else if (view === 'unification') {
    pos = computeUnificationLayout(nodes);
  } else {
    pos = nodes.map(n => ({ id: n.id, x: 200, y: 200 }));
  }

  // 通用防重叠（多轮推开）
  resolveOverlaps(pos);

  return pos;
}

/* ── 尺度维度视图 ──
 * 按 scale 分行，行内均匀分布（年份只决定排序，不决定 x 位置），
 * 同行节点在同一 y 线上，避免 era 偏移带来的杂乱。
 */
function computeScaleLayout(nodes) {
  const scales = ['microscopic', 'mesoscopic', 'cosmic', 'unified', 'feedback'];
  const ROW_H = 320;
  const START_Y = 140;
  const PAD_X = 220; // 左右留白加大，避免左侧 scale 标签被截断

  const groups = {};
  for (const s of scales) groups[s] = [];
  for (const n of nodes) {
    const s = n.scale || 'microscopic';
    (groups[s] || groups.microscopic).push(n);
  }

  const pos = [];
  for (let si = 0; si < scales.length; si++) {
    const list = groups[scales[si]] || [];
    if (!list.length) continue;

    const yBase = START_Y + si * ROW_H;

    // 按年份排序，让同 scale 内的理论演进从左到右
    list.sort((a, b) => (a.year ?? 1900) - (b.year ?? 1900));

    const availW = W - PAD_X * 2;
    const count = list.length;
    const step = count > 1 ? availW / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const n = list[i];
      const x = count === 1 ? W / 2 : PAD_X + i * step;
      pos.push({ id: n.id, x, y: yBase });
    }
  }
  return pos;
}

/* ── 统一之路视图 ── */
function computeUnificationLayout(nodes) {
  const COL_W = 520;
  const ROW_H = 230;
  const START_X = 160, START_Y = 120;

  return nodes.map((n, i) => ({
    id: n.id,
    x: START_X + (ERA_RANK[n.era] ?? 0) * COL_W + (SCALE_RANK[n.scale] ?? 2) * 40,
    y: START_Y + (SCALE_RANK[n.scale] ?? 2) * ROW_H + (i % 3) * 36,
  }));
}

/* ── 多轮防重叠 ──
 * 迭代推开距离 < MIN_DIST 的节点对。
 * 简单力导向：每对过近的节点沿连线方向各推一半。
 */
function resolveOverlaps(pos) {
  const map = new Map(pos.map(p => [p.id, p]));
  const maxIter = 8;

  for (let iter = 0; iter < maxIter; iter++) {
    let moved = 0;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const a = pos[i], b = pos[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < MIN_DIST) {
          const push = (MIN_DIST - dist) * 0.52; // 稍微过量推开加速收敛
          const ux = dx / dist, uy = dy / dist;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
          moved++;
        }
      }
    }
    if (!moved) break; // 已收敛
  }
}

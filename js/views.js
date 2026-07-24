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
 * 按 scale 分行，行内按年份排布并均匀散开，
 * 同一 scale 内的节点用年份映射到 x，但保证最小间距。
 */
function computeScaleLayout(nodes) {
  const scales = ['mesoscopic', 'cosmic', 'microscopic', 'unified', 'feedback'];
  const ROW_H = 300; // 行高加大，避免多节点拥挤
  const START_Y = 120;
  const PAD_X = 180; // 左右留白

  const groups = {};
  for (const s of scales) groups[s] = [];
  for (const n of nodes) {
    const s = n.scale || 'mesoscopic';
    (groups[s] || groups.mesoscopic).push(n);
  }

  const pos = [];
  for (let si = 0; si < scales.length; si++) {
    const list = groups[scales[si]] || [];
    if (!list.length) continue;

    const yBase = START_Y + si * ROW_H;

    // 按年份排序
    list.sort((a, b) => (a.year ?? 1900) - (b.year ?? 1900));

    // 计算可用宽度，均匀分布
    const availW = W - PAD_X * 2;
    const step = list.length > 1 ? availW / (list.length - 1) : 0;

    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      // 年份作为主 x，但在均匀网格上对齐
      let x;
      if (list.length === 1) {
        x = W / 2;
      } else if (n.year != null) {
        // 混合：60% 年份位置 + 40% 均匀位置，避免纯年份过度聚集
        const yrRatio = (n.year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN);
        const uniformRatio = i / (list.length - 1);
        x = PAD_X + (yrRatio * 0.55 + uniformRatio * 0.45) * availW;
      } else {
        x = PAD_X + i * step;
      }

      // 同一 scale 内按 era 微调 y 偏移（拉开同 x 的节点）
      const eraOff = (ERA_RANK[n.era] ?? 0) * 28;

      pos.push({ id: n.id, x, y: yBase + eraOff });
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

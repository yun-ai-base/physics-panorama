import { ERA_RANK, SCALE_RANK } from './config.js';

const YEAR_MIN = 1600, YEAR_MAX = 2025;

// 返回 [{id,x,y}]；timeline 用数据 layout，scale/unification 用算法布局
export function computeLayout(nodes, view) {
  const pos = nodes.map(n => {
    let x = 0, y = 0;
    if (view === 'timeline') {
      x = n.layout?.timeline?.x ?? 0;
      y = n.layout?.timeline?.y ?? 0;
    } else if (view === 'scale') {
      const yr = typeof n.year === 'number' ? n.year : 1900;
      x = (yr - YEAR_MIN) / (YEAR_MAX - YEAR_MIN) * 2400 + 140;
      y = 130 + (SCALE_RANK[n.scale] ?? 2) * 215 + (ERA_RANK[n.era] ?? 0) * 20;
    } else if (view === 'unification') {
      x = 150 + (ERA_RANK[n.era] ?? 0) * 470 + (SCALE_RANK[n.scale] ?? 2) * 36;
      y = 130 + (SCALE_RANK[n.scale] ?? 2) * 205 + (ERA_RANK[n.era] ?? 0) * 16;
    }
    return { id: n.id, x, y };
  });
  // 去重叠：同坐标向下微调
  const occ = new Map();
  for (const p of pos) {
    let off = 0;
    let k = `${Math.round(p.x)},${Math.round(p.y + off)}`;
    while (occ.has(k)) { off += 46; k = `${Math.round(p.x)},${Math.round(p.y + off)}`; }
    if (off) p.y += off;
    occ.set(k, true);
  }
  return pos;
}

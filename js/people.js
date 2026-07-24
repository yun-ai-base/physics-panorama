// 人物索引视图：从节点列表提取唯一人物，渲染为卡片网格
import { esc } from './utils.js';
import { ERAS } from './config.js';
import { avatarImg, bindAvatars } from './data/portraitMap.js';

// 从节点列表提取唯一人物及其关联学说（按关联数降序）
export function buildPeople(nodes) {
  const map = new Map();
  for (const n of nodes) {
    for (const f of (n.figures || [])) {
      const name = typeof f === 'string' ? f : (f && f.name) || '';
      if (!name) continue;
      if (!map.has(name)) map.set(name, { name, eras: new Set(), nodeIds: [] });
      const e = map.get(name);
      if (n.era) e.eras.add(n.era);
      e.nodeIds.push(n.id);
    }
  }
  return [...map.values()]
    .map(p => ({ name: p.name, eras: [...p.eras], nodeIds: p.nodeIds }))
    .sort((a, b) => b.nodeIds.length - a.nodeIds.length || a.name.localeCompare(b.name, 'zh'));
}

// 渲染人物网格到 container；onPick(name) 回调
export function renderPeople(container, people, onPick) {
  if (!people || !people.length) {
    container.innerHTML = '<div class="people-empty">暂无人物的数据</div>';
    return;
  }
  container.innerHTML = people.map(p => {
    const sw = p.eras
      .map(e => `<i class="swatch" style="background:${ERAS[e] ? ERAS[e].raw : 'var(--ink-3)'}"></i>`)
      .join(' ');
    return `<button class="person-card" data-name="${esc(p.name)}" title="${esc(p.name)}">
      <span class="person-card__avatar">${avatarImg(p.name)}</span>
      <span class="person-card__name">${esc(p.name)}</span>
      <span class="person-card__meta">${sw}<span>${p.nodeIds.length} 个关联</span></span>
    </button>`;
  }).join('');
  bindAvatars(container);
  container.querySelectorAll('.person-card').forEach(c => {
    c.addEventListener('click', () => onPick(c.dataset.name));
  });
}

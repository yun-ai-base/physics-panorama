// 人物索引视图：从节点列表提取唯一人物，渲染为卡片网格
import { esc } from './utils.js';
import { ERAS, UI_LABELS } from './config.js';
import { state } from './state.js';
import { avatarImg, bindAvatars, portraitName } from './data/portraitMap.js';

function t(key, ...args) {
  const v = UI_LABELS[state.lang]?.[key] ?? UI_LABELS.zh[key];
  return typeof v === 'function' ? v(...args) : v ?? key;
}

// 从节点列表提取唯一人物及其关联学说（按关联数降序）。
// 同一人物的不同称呼（如"阿尔伯特·爱因斯坦（预言）"）按肖像别名归一合并为一张卡，避免重复。
export function buildPeople(nodes) {
  const map = new Map();
  for (const n of nodes) {
    for (const f of (n.figures || [])) {
      const raw = typeof f === 'string' ? f : (f && f.name) || '';
      if (!raw) continue;
      const key = portraitName(raw); // 归一 key（合并别名 / 连字符差异）
      if (!map.has(key)) map.set(key, { key, aliases: new Set([raw]), eras: new Set(), nodeIds: [] });
      const e = map.get(key);
      e.aliases.add(raw);
      if (n.era) e.eras.add(n.era);
      e.nodeIds.push(n.id);
    }
  }
  return [...map.values()]
    .map(p => {
      // 显示名：优先不含括号且最长的原始称呼（剥离"预言"/"开尔文勋爵"等别名后缀）
      const disp = [...p.aliases].sort((a, b) => {
        const ca = (a.includes('（') || a.includes('(')) ? 1 : 0;
        const cb = (b.includes('（') || b.includes('(')) ? 1 : 0;
        return ca - cb || b.length - a.length;
      })[0];
      return { key: p.key, name: disp, eras: [...p.eras], nodeIds: [...new Set(p.nodeIds)] };
    })
    .sort((a, b) => b.nodeIds.length - a.nodeIds.length || a.name.localeCompare(b.name, 'zh'));
}

// 渲染人物网格到 container；onPick(name) 回调
export function renderPeople(container, people, onPick) {
  if (!people || !people.length) {
    container.innerHTML = `<div class="people-empty">${t('peopleEmpty')}</div>`;
    return;
  }
  container.innerHTML = people.map(p => {
    const sw = p.eras
      .map(e => `<i class="swatch" style="background:${ERAS[e] ? ERAS[e].raw : 'var(--ink-3)'}"></i>`)
      .join(' ');
    return `<button class="person-card" data-name="${esc(p.name)}" title="${esc(p.name)}" aria-label="${esc(p.name)}, ${t('peopleRelated', p.nodeIds.length)}">
      <span class="person-card__avatar">${avatarImg(p.name)}</span>
      <span class="person-card__name">${esc(p.name)}</span>
      <span class="person-card__meta">${sw}<span>${t('peopleRelated', p.nodeIds.length)}</span></span>
    </button>`;
  }).join('');
  bindAvatars(container);
  container.querySelectorAll('.person-card').forEach(c => {
    c.addEventListener('click', () => onPick(c.dataset.name));
  });
}

// 按姓名实时过滤人物网格（不重渲染，仅切换隐藏态）。供搜索框调用。
export function filterPeopleGrid(query) {
  const grid = document.getElementById('peopleGrid');
  if (!grid) return;
  if (grid.querySelector('.people-empty')) { const c = document.getElementById('peopleCount'); if (c) c.textContent = ''; return; }
  const q = (query || '').trim().toLowerCase();
  let shown = 0;
  grid.querySelectorAll('.person-card').forEach(c => {
    const hit = !q || (c.dataset.name || '').toLowerCase().includes(q);
    c.classList.toggle('is-hidden', !hit);
    if (hit) shown++;
  });
  const cnt = document.getElementById('peopleCount');
  if (cnt) cnt.textContent = q ? t('peopleCountMatch', shown, grid.children.length) : t('peopleCountTotal', grid.children.length);
}

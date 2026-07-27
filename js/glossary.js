// A.9 全局术语表：聚合全站 nodes.json 的 terms，支持搜索 / 排序 / 难度筛选
import { state } from './state.js';
import { esc } from './utils.js';

let ALL_TERMS = [];
let glossaryReady = false;

// 难度按术语所属节点的纪元粗略分级（数据无独立 difficulty 字段时的默认映射）
const ERA_DIFF_KEY = {
  classical: 'basic',
  relativity: 'intermediate',
  quantum: 'intermediate',
  'standard-model': 'advanced',
  frontier: 'advanced',
};
const DIFF_LABEL = {
  zh: { basic: '基础', intermediate: '进阶', advanced: '专业' },
  en: { basic: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced' },
};

export function initGlossary(NODES) {
  ALL_TERMS = [];
  for (const n of NODES) {
    if (!n.terms || !n.terms.length) continue;
    for (const t of n.terms) {
      const key = ERA_DIFF_KEY[n.era] || 'basic';
      ALL_TERMS.push({
        name: t.name || '',
        icon: t.icon || '',
        definition: t.definition || '',
        details: t.details || '',
        nodeName: n.name || '',
        diffKey: key,
      });
    }
  }
  glossaryReady = true;
  bindGlossaryUI();
  renderGlossary();
}

function bindGlossaryUI() {
  const view = document.getElementById('glossaryView');
  if (!view) return;
  const search = view.querySelector('#glossarySearch');
  const sort = view.querySelector('#glossarySort');
  const diff = view.querySelector('#glossaryDiff');
  if (search) search.addEventListener('input', renderGlossary);
  if (sort) sort.addEventListener('change', renderGlossary);
  if (diff) diff.addEventListener('change', renderGlossary);
}

export function renderGlossary() {
  if (!glossaryReady) return;
  const view = document.getElementById('glossaryView');
  if (!view) return;
  const grid = view.querySelector('#glossaryGrid');
  if (!grid) return;
  const lang = state.lang === 'en' ? 'en' : 'zh';
  const q = (view.querySelector('#glossarySearch')?.value || '').trim().toLowerCase();
  const sortBy = view.querySelector('#glossarySort')?.value || 'name';
  const diffF = view.querySelector('#glossaryDiff')?.value || 'all';
  let list = ALL_TERMS.slice();
  if (q) list = list.filter(t => t.name.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));
  if (diffF !== 'all') list = list.filter(t => t.diffKey === diffF);
  if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  else list.sort((a, b) => diffRank(a.diffKey) - diffRank(b.diffKey));
  if (!list.length) {
    grid.innerHTML = '<div class="glossary-empty">无匹配术语</div>';
    return;
  }
  grid.innerHTML = list.map(t => {
    const cls = t.diffKey === 'advanced' ? 'gterm--adv' : t.diffKey === 'intermediate' ? 'gterm--mid' : 'gterm--basic';
    return `<div class="gterm ${cls}">
      <div class="gterm__head"><span class="gterm__icon">${t.icon || ''}</span><span class="gterm__name">${esc(t.name)}</span><span class="gterm__diff">${esc(DIFF_LABEL[lang][t.diffKey])}</span></div>
      <div class="gterm__def">${esc(t.definition)}</div>
      ${t.details ? `<div class="gterm__detail">${esc(t.details)}</div>` : ''}
      <div class="gterm__src">来源：${esc(t.nodeName)}</div>
    </div>`;
  }).join('');
}

function diffRank(k) { return k === 'basic' ? 0 : k === 'intermediate' ? 1 : 2; }

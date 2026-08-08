// 理论·实验视图：著名实验卡片网格 + 纪元筛选 + 搜索
// 卡片点击 → dispatch 'pp:gotoExp' → app.js 调用 sidebar.openExperiment(id) 打开实验详情
import { EXPERIMENTS } from './data/experiments.js';
import { ERAS, ERA_ORDER } from './config.js';
import { esc } from './utils.js';
import { portraitName, personNameEn } from './data/portraitMap.js';

let expEraFilter = 'all';   // 当前纪元筛选
let expQuery = '';          // 当前搜索词
let onPick = null;          // 点击卡片回调（由 app.js 注入）

export function initExperiments(cb) { onPick = cb; }

// 实验 → 对应理论节点名（由 app.js 通过回调注入节点数据，避免模块耦合）
export function renderExperiments(grid, nodeById) {
  if (!grid) return;
  const list = EXPERIMENTS.filter(matchFilter);
  grid.innerHTML = list.map(exp => {
    const era = ERAS[exp.era];
    const eraName = era ? era.name : exp.era;
    const theory = exp.theoryId && nodeById ? nodeById.get(exp.theoryId) : null;
    const theoryName = theory ? (theory.name || exp.theoryId) : exp.theoryId;
    const figs = (exp.figures || []).slice(0, 2).join(' · ');
    return `
    <button class="exp-card" data-id="${esc(exp.id)}" type="button">
      <span class="exp-card__top">
        <span class="exp-card__year" style="color:${era ? era.raw : 'var(--gold)'}">${esc(String(exp.year))}</span>
        <span class="exp-card__era" style="background:${era ? era.raw + '18' : 'transparent'};color:${era ? era.raw : 'var(--ink-2)'}">${esc(eraName)}</span>
      </span>
      <span class="exp-card__icon" aria-hidden="true">${exp.icon || '🧪'}</span>
      <span class="exp-card__name">${esc(exp.name)}</span>
      ${figs ? `<span class="exp-card__fig">${esc(figs)}</span>` : ''}
      <span class="exp-card__sum">${esc(exp.summary || '')}</span>
      <span class="exp-card__theory">→ 对应理论：<b>${esc(theoryName)}</b></span>
    </button>`;
  }).join('') || `<div class="exp-empty">未找到匹配的实验，换个关键词试试</div>`;
  grid.querySelectorAll('.exp-card').forEach(btn => {
    btn.addEventListener('click', () => onPick && onPick(btn.dataset.id));
  });
}

// 纪元 + 搜索双过滤
function matchFilter(exp) {
  if (expEraFilter !== 'all' && exp.era !== expEraFilter) return false;
  if (!expQuery) return true;
  const q = expQuery.toLowerCase();
  const hay = [exp.name, exp.nameEn, (exp.figures || []).join(' '), exp.summary]
    .map(s => (s || '').toLowerCase()).join(' ');
  // 同时匹配对应理论名（理论节点 name）
  return hay.includes(q);
}

export function setExpEraFilter(era, grid, nodeById) {
  expEraFilter = era;
  renderExperiments(grid, nodeById);
}
export function setExpQuery(q, grid, nodeById) {
  expQuery = q;
  renderExperiments(grid, nodeById);
}
export function expCount() { return EXPERIMENTS.length; }
export function getExp(id) { return EXPERIMENTS.find(e => e.id === id) || null; }
export { EXPERIMENTS };

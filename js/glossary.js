// A.9 全局术语表：聚合全站 nodes.json 的 terms，按纪元分组（顶部五选项 + 横向图片式展示框），支持搜索
import { state } from './state.js';
import { esc } from './utils.js';

let ALL_TERMS = [];
let glossaryReady = false;

// 难度按术语所属节点的纪元粗略分级
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
const ERA_LABEL = {
  zh: { classical: '经典物理', relativity: '相对论', quantum: '量子论', 'standard-model': '标准模型', frontier: '前沿探索' },
  en: { classical: 'Classical', relativity: 'Relativity', quantum: 'Quantum', 'standard-model': 'Standard Model', frontier: 'Frontier' },
};
// 纪元显示顺序
const ERA_ORDER = ['classical', 'relativity', 'quantum', 'standard-model', 'frontier'];

/** 轻量 Markdown → HTML：**粗体** 作为小节标题独占一行，段落自动分隔 */
function md(s) {
  if (!s) return '';
  const t = esc(s);
  const parts = t.split(/(\*\*.+?\*\*)/);
  const out = [];
  let buf = '';
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (/\*\*.+?\*\*/.test(p)) {
      if (buf.trim()) out.push('<p>' + buf.trim() + '</p>');
      buf = '';
      out.push('<strong class="gterm__sub">' + p.replace(/\*\*/g, '') + '</strong>');
    } else {
      const segs = p.split(/\n\s*\n/);
      for (let j = 0; j < segs.length; j++) {
        const trimmed = segs[j].trim();
        if (!trimmed) continue;
        if (buf && !/[。！？.!?]$/.test(buf.trim())) buf += trimmed;
        else { if (buf.trim()) out.push('<p>' + buf.trim() + '</p>'); buf = trimmed; }
      }
    }
  }
  if (buf.trim()) out.push('<p>' + buf.trim() + '</p>');
  return out.join('\n');
}

export function initGlossary(NODES) {
  ALL_TERMS = [];
  for (const n of NODES) {
    if (!n.terms || !n.terms.length) continue;
    for (const t of n.terms) {
      ALL_TERMS.push({
        name: t.name || '',
        icon: t.icon || '',
        definition: t.definition || '',
        details: t.details || '',
        nodeName: n.name || '',
        era: n.era || 'classical',
        diffKey: ERA_DIFF_KEY[n.era] || 'basic',
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
  if (search) search.addEventListener('input', renderGlossary);
}

function renderTabs() {
  const tabs = document.getElementById('glossaryTabs');
  if (!tabs) return;
  const lang = state.lang === 'en' ? 'en' : 'zh';
  tabs.innerHTML = ERA_ORDER.map(era =>
    `<button type="button" class="glossary-tab${state.glossaryEra === era ? ' is-active' : ''}" data-era="${era}" role="tab">${esc(ERA_LABEL[lang][era] || era)}</button>`
  ).join('');
  tabs.querySelectorAll('.glossary-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.glossaryEra = btn.dataset.era;
      renderTabs();
      renderGlossary();
    });
  });
}

function termCard(t, lang) {
  const cls = t.diffKey === 'advanced' ? 'gterm--adv' : t.diffKey === 'intermediate' ? 'gterm--mid' : 'gterm--basic';
  return `<div class="gterm ${cls}">
    <div class="gterm__head"><span class="gterm__icon">${t.icon || ''}</span><span class="gterm__name">${esc(t.name)}</span><span class="gterm__diff">${esc(DIFF_LABEL[lang][t.diffKey])}</span></div>
    <div class="gterm__body">
      <div class="gterm__def">${md(t.definition)}</div>
      ${t.details ? `<div class="gterm__detail">${md(t.details)}</div>` : ''}
    </div>
    <div class="gterm__src">来源：${esc(t.nodeName)}</div>
  </div>`;
}

export function renderGlossary() {
  if (!glossaryReady) return;
  const view = document.getElementById('glossaryView');
  if (!view) return;
  const rail = view.querySelector('#glossaryRail');
  if (!rail) return;
  const lang = state.lang === 'en' ? 'en' : 'zh';
  const q = (view.querySelector('#glossarySearch')?.value || '').trim().toLowerCase();

  // 顶部五选项随语言刷新
  renderTabs();

  let list = ALL_TERMS.filter(t => t.era === state.glossaryEra);
  if (q) list = list.filter(t => t.name.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));

  if (!list.length) {
    rail.innerHTML = '<div class="glossary-empty">' + (lang === 'en' ? 'No matching terms' : '无匹配术语') + '</div>';
    return;
  }
  rail.innerHTML = list.map(t => termCard(t, lang)).join('');
}

function diffRank(k) { return k === 'basic' ? 0 : k === 'intermediate' ? 1 : 2; }

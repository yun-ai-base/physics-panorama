import { state } from './state.js';
import { esc, chain } from './utils.js';
import { ERAS, DIMENSIONS } from './config.js';
import { avatarImg, bindAvatars } from './data/portraitMap.js';

let NODES = [], SUMMARIES = {};
const byId = new Map();
const SCALE_LABEL = { mesoscopic:'中观', cosmic:'宇观', microscopic:'微观', unified:'统一', feedback:'反哺' };
const MATURITY_LABEL = { foundation:'🏛 地基型', established:'🔬 成熟型', speculative:'🔮 探索型' };

export function initSidebar(nodes, summaries) {
  NODES = nodes; SUMMARIES = summaries || {};
  byId.clear(); nodes.forEach(n => byId.set(n.id, n));
}

function figuresHTML(n) {
  if (!n.figures || !n.figures.length) return '<span class="empty-note">暂无代表人物</span>';
  return n.figures.map(f => `<span class="figure">${avatarImg(f)}<span>${esc(f)}</span></span>`).join('');
}
function formatDim(val) {
  if (Array.isArray(val)) return '<ul>' + val.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>';
  if (typeof val === 'string' && val.trim()) {
    return val.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  }
  return '<p class="empty-note">暂无内容</p>';
}
function renderDim(node, key) {
  if (key === 'formula') {
    const fs = node.formula || [];
    if (!fs.length) return '<p class="empty-note">该节点未提供公式</p>';
    return fs.map(f => {
      let tex = '';
      try { tex = window.katex ? katex.renderToString(f.latex || '', { throwOnError: false, displayMode: false }) : esc(f.latex || ''); }
      catch (e) { tex = esc(f.latex || ''); }
      return `<div class="formula"><div class="formula__latex">${tex}</div><div class="formula__plain">${esc(f.plain || '')}</div></div>`;
    }).join('');
  }
  let val = '';
  if (key === 'figures') {
    const a = node.deepContent?.figures_detail || '';
    const b = node.deepContent?.biography || '';
    val = (a ? a : '') + (b ? '\n\n' + b : '');
    if (!val.trim()) return '<p class="empty-note">暂无人物详情</p>';
  } else {
    val = node.deepContent?.[key] || '';
  }
  return formatDim(val);
}
function miniMapHTML(node) {
  const pts = NODES.map(n => ({ id: n.id, x: n.layout?.timeline?.x ?? 0, y: n.layout?.timeline?.y ?? 0 }));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 300, H = 118, pad = 8;
  const sx = W / (maxX - minX || 1), sy = H / (maxY - minY || 1);
  const dots = pts.map(p => `<circle class="${p.id === node.id ? 'dot--cur' : 'dot--other'}" cx="${pad + (p.x - minX) * sx}" cy="${pad + (p.y - minY) * sy}" r="2.4"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${dots}</svg>`;
}
function pathCtxHTML(node) {
  const c = chain(NODES, node.id);
  const nm = id => byId.get(id)?.name || id;
  const up = c.parents.length ? c.parents.map(nm).join('、') : '（理论起点）';
  const down = c.children.length ? c.children.map(nm).join('、') : '（脉络延续）';
  return `<div class="path-ctx"><b>继承自</b>：${esc(up)}<br><b>影响至</b>：${esc(down)}</div>`;
}

export function openNode(id) {
  const node = byId.get(id); if (!node) return;
  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebarBody');
  const era = ERAS[node.era];
  const isDeep = node.depth === 'deep' && node.deepContent;
  const scaleLabel = SCALE_LABEL[node.scale] || node.scale;
  const maturityLabel = MATURITY_LABEL[node.maturity] || '';
  const dims = isDeep ? DIMENSIONS : DIMENSIONS.filter(d => d.key !== 'formula' || (node.formula && node.formula.length));
  const defaultTab = isDeep ? 'history' : 'history';
  body.innerHTML = `
    <div class="sum-card">
      <div class="sum-card__era"><span class="swatch" style="background:${era.raw}"></span>${era.name} · ${era.range}</div>
      <div class="sum-card__name">${esc(node.name)}<small>${esc(node.nameEn || '')}</small></div>
      <div class="sum-card__aha">${esc(node.aha || '')}</div>
      <div class="sum-card__meta">
        <span class="chip">${scaleLabel}</span>
        <span class="chip chip--gold">${maturityLabel}</span>
        <span class="chip">${esc(String(node.year))}</span>
      </div>
      <div class="figures">${figuresHTML(node)}</div>
    </div>
    <div class="mini-map">${miniMapHTML(node)}</div>
    <div class="tabs">${dims.map(d => `<button class="tab" data-key="${d.key}">${d.label}</button>`).join('')}</div>
    <div class="tab__body" id="tabBody"></div>
    ${pathCtxHTML(node)}
  `;
  bindAvatars(body);
  const tabs = body.querySelectorAll('.tab');
  const tabBody = body.querySelector('#tabBody');
  const show = key => {
    tabBody.innerHTML = renderDim(node, key);
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.key === key));
  };
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.key)));
  show(defaultTab);
  sb.classList.add('is-open'); sb.setAttribute('aria-hidden', 'false');
  state.sidebarOpen = true;
}

export function openEra(era) {
  const sum = SUMMARIES[era]; const e = ERAS[era];
  const sb = document.getElementById('sidebar'); const body = document.getElementById('sidebarBody');
  const txt = typeof sum === 'string' ? sum : (sum?.quote || sum?.text || '');
  body.innerHTML = `<div class="sum-card">
    <div class="sum-card__era"><span class="swatch" style="background:${e.raw}"></span>${e.name} · ${e.range}</div>
    <div class="sum-card__name">${esc(e.name)}</div>
    <div class="sum-card__aha">${esc(txt || '')}</div>
  </div>`;
  sb.classList.add('is-open'); sb.setAttribute('aria-hidden', 'false');
  state.sidebarOpen = true;
}

export function closeSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.remove('is-open'); sb.setAttribute('aria-hidden', 'true');
  state.sidebarOpen = false;
}

export function openPerson(name, nodeIds) {
  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebarBody');
  const ids = nodeIds || [];
  const rel = ids.map(id => `<button class="rel-node" data-id="${esc(id)}">${esc(byId.get(id)?.name || id)}</button>`).join('');
  body.innerHTML = `
    <div class="sum-card">
      <div class="sum-card__era">人物索引</div>
      <div class="sum-card__name"><span class="person-head">${avatarImg(name)}<span class="person-head__name">${esc(name)}</span></span></div>
      <div class="sum-card__aha">关联 ${ids.length} 个学说 / 事件</div>
      <div class="rel-nodes">${rel}</div>
    </div>`;
  bindAvatars(body);
  body.querySelectorAll('.rel-node').forEach(b => b.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('pp:gotoNode', { detail: b.dataset.id }));
  }));
  sb.classList.add('is-open'); sb.setAttribute('aria-hidden', 'false');
  state.sidebarOpen = true;
}

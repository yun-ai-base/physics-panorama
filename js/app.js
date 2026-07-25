import { state } from './state.js';
import { esc, buildEdges, relatedSet } from './utils.js';
import { ERAS, ERA_ORDER } from './config.js';
import { computeLayout } from './views.js';
import { initRenderer, renderGraph, applyState } from './renderer.js';
import { initSidebar, openNode, openEra, openScale, closeSidebar, openPerson, openSidebarTab, focusTerm } from './sidebar.js';
import { initInteraction, fitView, consumeDrag } from './interaction.js';
import { startTour } from './tour.js';
import { buildPeople, renderPeople } from './people.js';

let NODES = [], EDGES = [], SUMMARIES = {}, byId = new Map();
let currentLayout = [];
let PEOPLE_MAP = new Map();

const stage = document.getElementById('stage');

// 搜索高亮的极简样式注入
const st = document.createElement('style');
st.textContent = '.node.is-search .node__circle{stroke:var(--gold)!important;stroke-width:3.6!important;}';
document.head.appendChild(st);

// 移动端首页提醒：检测到移动设备后弹出，停留 2 秒自动淡出
function maybeShowMobileNotice() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
  if (!isMobile) return;
  const box = document.createElement('div');
  box.className = 'mobile-notice';
  box.id = 'mobileNotice';
  box.innerHTML = '<div class="mobile-notice__box">' +
    '<div class="mobile-notice__icon">🖥️</div>' +
    '<div class="mobile-notice__text">为了更好浏览体验，请电脑网页端查看</div>' +
    '</div>';
  document.body.appendChild(box);
  setTimeout(() => {
    box.classList.add('is-hide');
    setTimeout(() => box.remove(), 600);
  }, 2000);
}

async function boot() {
  maybeShowMobileNotice(); // 移动端首页提醒（在任何 await 之前弹出，确保首屏即可见）
  try {
    const [nodeRes, metaRes] = await Promise.all([
      fetch('nodes.json').then(r => { if (!r.ok) throw new Error('nodes.json → ' + r.status); return r.json(); }),
      fetch('physics-data.json').then(r => { if (!r.ok) throw new Error('physics-data.json → ' + r.status); return r.json(); }),
    ]);
    NODES = nodeRes;
    EDGES = buildEdges(NODES, metaRes.conflicts || []);
    SUMMARIES = metaRes.summaries || {};
    NODES.forEach(n => byId.set(n.id, n));
  } catch (err) {
    console.error('[boot] 数据加载失败：', err);
    toast('数据加载失败，请检查网络后刷新重试');
    return;
  }

  initRenderer(NODES, EDGES, SUMMARIES);
  initSidebar(NODES, SUMMARIES);
  initInteraction();
  PEOPLE_MAP = buildPeople(NODES).reduce((m, p) => m.set(p.name, p), new Map());
  wireUI();

  const node = readURL();
  const restoreTab = state.sidebarTab;
  const restoreTerm = state.termFocus;
  setView(state.view); // 统一走视图切换逻辑（激活 tab、body class、尺度关联条显隐等）
  if (node && byId.has(node)) {
    selectNode(node);
    if (restoreTab) openSidebarTab(restoreTab);
    if (restoreTerm) focusTerm(restoreTerm);
  }
}

function renderCurrent() {
  currentLayout = computeLayout(NODES, state.view);
  renderGraph(state.view, currentLayout);
}
function bounds() {
  const xs = currentLayout.map(p => p.x), ys = currentLayout.map(p => p.y);
  let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  // scale 视图左侧要容纳尺度标签（如“中观”“宇观”），需额外留白
  if (state.view === 'scale') {
    minX -= 220;
    minY -= 80;
    maxX += 80;
    maxY += 80;
  }
  return { minX, maxX, minY, maxY };
}
function fit() { fitView(bounds(), stage.clientWidth, stage.clientHeight); }

function selectNode(id) {
  state.selected = id;
  state.highlight = relatedSet(NODES, id, state.expandAll);
  applyState();
  openNode(id);
  // 移动端：点击节点后自动聚焦到选中节点及其关联节点，避免缩略画布上看不清关联高亮
  if (window.matchMedia('(max-width:768px)').matches) focusNode(id);
  updateURL();
}

// 计算选中节点 + 关联节点的包围盒并 fit 到视口（移动端聚焦用）
function focusNode(id) {
  const ids = new Set([id, ...state.highlight]);
  const pts = currentLayout.filter(p => ids.has(p.id));
  if (!pts.length) return;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  fitView(
    { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
    stage.clientWidth, stage.clientHeight, 120
  );
}
function nodeEl(id) { return document.querySelector(`.node[data-id="${id}"]`); }
function clearSearchGlow() { document.querySelectorAll('.node.is-search').forEach(n => n.classList.remove('is-search')); }

function wireUI() {
  document.getElementById('viewTabs').addEventListener('click', e => {
    const b = e.target.closest('.view-tab'); if (!b) return;
    setView(b.dataset.view);
  });

  const eraTabs = document.getElementById('eraTabs');
  eraTabs.innerHTML = `<button class="era-tab is-active" data-era="all"><span class="swatch" style="background:var(--gold)"></span>全部</button>` +
    ERA_ORDER.map(e => `<button class="era-tab" data-era="${e}"><span class="swatch" style="background:${ERAS[e].raw}"></span>${ERAS[e].name}</button>`).join('');
  eraTabs.addEventListener('click', e => {
    const b = e.target.closest('.era-tab'); if (!b) return;
    const a = b.dataset.era;
    if (a === 'all') {
      state.filterEra = null; state.activeEra = null; closeSidebar();
    } else {
      state.filterEra = a; state.activeEra = a; openEra(a); // 激活纪元：聚焦筛选 + 高亮 + 综述
    }
    reflectEraActive(); applyState(); updateURL();
  });

  document.getElementById('onlyCore').addEventListener('change', e => { state.onlyCore = e.target.checked; applyState(); updateURL(); });
  // 关闭侧栏只收起面板，保留选中节点与关联高亮——关掉后应能在画布上看到关联节点（移动端侧栏全屏遮挡，尤为关键）
  document.getElementById('sidebarClose').addEventListener('click', () => { closeSidebar(); });

  stage.addEventListener('click', e => {
    if (consumeDrag()) return;
    const g = e.target.closest('.node');
    if (g) { selectNode(g.dataset.id); return; }
    const lbl = e.target.closest('.era-band__label');
    if (lbl) { toggleEraLabel(lbl.dataset.era); return; } // 时间线纪元大字：轻量激活（高亮 + 综述，不改筛选）
    const sl = e.target.closest('.scale-band__label');
    if (sl) { toggleScaleLabel(sl.dataset.scale); return; } // 尺度维度标签：点击展开概念解析面板
    const pf = e.target.closest('.preface');
    if (pf) { openEra(pf.dataset.era); return; }
    // 点击画布空白（非节点/非标签/非前言）：退出聚焦态，清除选中与关联高亮
    if (state.selected || state.activeEra || state.activeScale) {
      state.selected = null; state.highlight = new Set(); state.activeEra = null; state.activeScale = null;
      reflectEraActive(); reflectScaleActive(); applyState(); updateURL();
    }
  });

  // 顶部尺度维度关联图：chip 打开概念解析面板，arrow 打开目标尺度的「尺度间渗透」说明
  const scaleMapBar = document.getElementById('scaleMapBar');
  if (scaleMapBar) {
    scaleMapBar.addEventListener('click', e => {
      const arrow = e.target.closest('.scale-map-bar__arrow');
      if (arrow) {
        state.activeScale = arrow.dataset.scale;
        openScale(arrow.dataset.scale, arrow.dataset.rel);
        reflectScaleActive();
        applyState();
        return;
      }
      const chip = e.target.closest('.scale-map-bar__chip');
      if (chip) {
        toggleScaleLabel(chip.dataset.scale);
        return;
      }
    });
  }

  const si = document.getElementById('searchInput');
  const sr = document.getElementById('searchResults');
  si.addEventListener('input', () => {
    const q = si.value.trim().toLowerCase();
    if (!q) { sr.hidden = true; sr.innerHTML = ''; clearSearchGlow(); return; }
    const hits = NODES.filter(n => (n.name + (n.nameEn || '') + (n.figures || []).join('') + (n.summary || '') + (n.aha || '')).toLowerCase().includes(q));
    sr.hidden = false;
    sr.innerHTML = hits.slice(0, 24).map(n => `<button data-id="${n.id}">${esc(n.name)} <span style="color:var(--ink-3)">· ${esc(String(n.year))}</span></button>`).join('') || '<div style="padding:10px;color:var(--ink-3)">无匹配</div>';
    clearSearchGlow();
    hits.forEach(h => nodeEl(h.id)?.classList.add('is-search'));
  });
  sr.addEventListener('click', e => {
    const b = e.target.closest('button[data-id]'); if (!b) return;
    si.value = ''; sr.hidden = true; clearSearchGlow(); selectNode(b.dataset.id);
  });

  window.addEventListener('pp:esc', () => {
    if (state.sidebarOpen) {
      // 第一下 Esc：只收起侧栏，保留选中与关联高亮，方便在画布上查看关联节点
      closeSidebar();
    } else if (state.selected || state.activeEra || state.activeScale) {
      // 侧栏已收起：再次 Esc 才彻底退出聚焦态
      state.selected = null; state.highlight = new Set(); state.activeEra = null; state.activeScale = null;
      reflectEraActive(); reflectScaleActive(); applyState(); updateURL();
    }
  });

  document.getElementById('shareBtn').addEventListener('click', () => {
    updateURL(); navigator.clipboard?.writeText(location.href); toast('当前视图链接已复制');
  });
  document.getElementById('tour3').addEventListener('click', () => startTour('3min'));
  document.getElementById('tour10').addEventListener('click', () => startTour('10min'));
  window.addEventListener('pp:gotoNode', e => { setView('timeline'); selectNode(e.detail); });

  // 术语链接：跳转到术语释义锚点，并记录回退位置
  window.addEventListener('pp:gotoTerm', e => {
    const { nodeId, termName } = e.detail || {};
    if (!nodeId || !byId.has(nodeId) || !termName) return;
    const back = { node: state.selected, tab: state.sidebarTab };
    const url = new URL(location.href);
    url.searchParams.set('node', nodeId);
    url.searchParams.set('tab', 'terms');
    url.searchParams.set('term', termName);
    history.pushState({ ppBack: back }, '', url.toString());
    selectNode(nodeId);
    focusTerm(termName);
  });

  // 浏览器回退：恢复跳转前的节点与标签
  window.addEventListener('popstate', e => {
    const back = e.state?.ppBack;
    if (!back) return;
    state.termFocus = null;
    if (!back.node || !byId.has(back.node)) {
      closeSidebar();
      state.selected = null;
      state.highlight = new Set();
      applyState();
      updateURL();
      return;
    }
    selectNode(back.node);
    if (back.tab) openSidebarTab(back.tab);
  });

  // 侧边栏内部状态变化时同步 URL
  window.addEventListener('pp:updateURL', updateURL);

  window.addEventListener('resize', fit);
}

// 纪元激活态：统一反映顶部导航 + 时间线大字的 UI 改造
function reflectEraActive() {
  document.querySelectorAll('.era-tab').forEach(t => {
    const era = t.dataset.era;
    const on = era === 'all' ? (!state.activeEra && !state.filterEra)
                             : (state.activeEra === era || state.filterEra === era);
    t.classList.toggle('is-active', on);
  });
}
// 时间线纪元大字点击：轻量激活（高亮 + 综述，不改筛选）；再次点击同纪元取消
function toggleEraLabel(era) {
  if (state.activeEra === era) { state.activeEra = null; closeSidebar(); }
  else { state.activeEra = era; openEra(era); }
  document.querySelectorAll('.era-band__label').forEach(l => l.classList.toggle('is-active-era', l.dataset.era === state.activeEra));
  reflectEraActive(); updateURL();
}
// 尺度维度标签点击：展开概念解析面板；再次点击同尺度取消
function toggleScaleLabel(scale) {
  if (state.activeScale === scale) { state.activeScale = null; closeSidebar(); }
  else { state.activeScale = scale; openScale(scale); }
  document.querySelectorAll('.scale-band__label').forEach(l => l.classList.toggle('is-active-scale', l.dataset.scale === state.activeScale));
  reflectScaleActive(); updateURL();
}
// 尺度激活态：统一反映尺度标签的高亮
function reflectScaleActive() {
  document.querySelectorAll('.scale-band__label').forEach(l =>
    l.classList.toggle('is-active-scale', l.dataset.scale === state.activeScale));
}

// 统一视图切换（含人物索引覆盖层）
function setView(v) {
  state.view = v;
  document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === v));
  const isPeople = v === 'people';
  document.body.classList.remove('view-timeline','view-unification','view-scale','view-people');
  document.body.classList.add(`view-${v}`);
  const stageEl = document.getElementById('stage');
  const pv = document.getElementById('peopleView');
  const smb = document.getElementById('scaleMapBar');
  if (stageEl) stageEl.style.visibility = isPeople ? 'hidden' : '';
  if (pv) pv.hidden = !isPeople;
  if (smb) smb.hidden = (v !== 'scale');
  if (isPeople) {
    renderPeople(document.getElementById('peopleGrid'), [...PEOPLE_MAP.values()], onPickPerson);
    closeSidebar();
  } else {
    renderCurrent(); fit();
  }
  updateURL();
}
function onPickPerson(name) {
  const p = PEOPLE_MAP.get(name);
  if (p) openPerson(name, p.nodeIds);
}

function updateURL() {
  const p = new URLSearchParams();
  if (state.view !== 'timeline') p.set('view', state.view);
  if (state.filterEra) p.set('era', state.filterEra);
  if (!state.onlyCore) p.set('core', '0');
  if (state.selected) p.set('node', state.selected);
  if (state.sidebarTab) p.set('tab', state.sidebarTab);
  if (state.termFocus) p.set('term', state.termFocus);
  const qs = p.toString();
  const targetQS = qs ? '?' + qs : '';
  if (location.search === targetQS) return;
  history.replaceState(history.state, '', targetQS || location.pathname);
}
function readURL() {
  const p = new URLSearchParams(location.search);
  if (p.get('view')) state.view = p.get('view');
  if (p.get('era')) state.filterEra = p.get('era');
  if (p.get('core') === '0') state.onlyCore = false;
  if (p.get('tab')) state.sidebarTab = p.get('tab');
  if (p.get('term')) state.termFocus = p.get('term');
  document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === state.view));
  state.activeEra = state.filterEra; // 激活态随筛选态恢复（刷新后保留高亮 + 综述）
  reflectEraActive();
  document.getElementById('onlyCore').checked = state.onlyCore;
  return p.get('node');
}

let toastTimer;
function toast(msg) {
  let t = document.getElementById('pp-toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'pp-toast';
    t.style.cssText = 'position:fixed;left:50%;bottom:64px;transform:translateX(-50%);background:#2A2620;color:#fff;padding:9px 18px;border-radius:999px;font-size:13px;z-index:80;box-shadow:0 8px 28px rgba(0,0,0,.25);opacity:0;transition:opacity .2s;pointer-events:none;';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 1800);
}

boot();

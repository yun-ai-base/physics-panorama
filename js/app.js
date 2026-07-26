import { state } from './state.js';
import { esc, buildEdges, relatedSet, getFavorites, isFavorite } from './utils.js';
import { ERAS, ERA_ORDER, LEARNING_PATHS } from './config.js';
import { computeLayout } from './views.js';
import { initRenderer, renderGraph, applyState, onApplyState } from './renderer.js';
import { initSidebar, openNode, openEra, openScale, closeSidebar, openPerson, openSidebarTab, focusTerm, updateMiniMap } from './sidebar.js';
import { initInteraction, fitView, consumeDrag } from './interaction.js';
import { startTour } from './tour.js';
import { buildPeople, renderPeople, filterPeopleGrid } from './people.js';
import { initMindmap, renderMindmap, resetMindmap, setExpandAll } from './mindmap.js';

let NODES = [], EDGES = [], SUMMARIES = {}, byId = new Map(), PREFACES = {};
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
    PREFACES = metaRes.prefaces || {};
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
  onApplyState(updateMiniMap);
  updateMiniMap();
  updateFavCount();

  // 思维导图模块初始化（仅缓存数据与绑定事件，渲染推迟到首次进入 void→思维导图）
  try {
    initMindmap({
      nodes: NODES,
      edges: EDGES,
      svg: document.getElementById('mindmapSvg'),
      viewport: document.getElementById('mmViewport'),
      onOpenDimension: (id, dim) => { openNode(id); openSidebarTab(dim); },
    });
  } catch (err) { console.error('[mindmap] init failed', err); }

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

// 界面双语：取节点显示名（EN 取 nameEn，无则回退中文）
function langName(n) { return state.lang === 'en' ? (n.nameEn || n.name) : n.name; }

// 纪元顶栏标签（随语言切换重建；点击监听在 wireUI 用事件委托一次绑定）
function buildEraTabs() {
  const en = state.lang === 'en';
  const eraTabs = document.getElementById('eraTabs');
  if (!eraTabs) return;
  eraTabs.innerHTML = `<button class="era-tab is-active" data-era="all"><span class="swatch" style="background:var(--gold)"></span>${en ? 'All' : '全部'}</button>` +
    ERA_ORDER.map(e => `<button class="era-tab" data-era="${e}"><span class="swatch" style="background:${ERAS[e].raw}"></span>${en ? ERAS[e].nameEn : ERAS[e].name}</button>`).join('');
}

// 切换界面语言：重绘画布 + 顶栏纪元标签 + 重渲侧栏头部
function applyLang() {
  const en = state.lang === 'en';
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = en ? '中' : 'EN';
  document.documentElement.lang = en ? 'en' : 'zh';
  renderGraph(state.view, currentLayout);
  buildEraTabs();
  if (state.selected) openNode(state.selected);
  updateURL();
}

// ── 本地收藏面板（依赖 utils 的 localStorage 工具） ──
function renderFavList() {
  const list = document.getElementById('favList');
  if (!list) return;
  const ids = getFavorites();
  if (!ids.length) { list.innerHTML = '<div class="fav-empty">还没有收藏。打开任意节点，点「☆ 收藏」即可加入。</div>'; return; }
  list.innerHTML = ids.map(id => {
    const n = byId.get(id); if (!n) return '';
    return `<button class="fav-item" data-id="${esc(id)}">
      <span class="fav-item__sw" style="background:${ERAS[n.era].raw}"></span>
      <span class="fav-item__name">${esc(langName(n))}</span>
      <span class="fav-item__en">${esc(n.nameEn || '')}</span>
    </button>`;
  }).join('');
  list.querySelectorAll('.fav-item').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id;
    setView('timeline'); selectNode(id);
    const fp = document.getElementById('favPanel'); if (fp) fp.hidden = true;
  }));
}
function updateFavCount() {
  const c = document.getElementById('favCount');
  if (c) c.textContent = String(getFavorites().length);
}

// ── 预设学习路径面板 ──
function renderPathList() {
  const list = document.getElementById('pathList');
  if (!list) return;
  const en = state.lang === 'en';
  list.innerHTML = LEARNING_PATHS.map(p => {
    const chips = p.nodes.map(id => {
      const n = byId.get(id); if (!n) return '';
      return `<button class="path-chip" data-id="${esc(id)}" style="--c:${ERAS[n.era].raw}">${esc(en ? (n.nameEn || n.name) : n.name)}</button>`;
    }).join('');
    return `<div class="path-card">
      <div class="path-card__title">${esc(en ? p.nameEn : p.name)}</div>
      <div class="path-card__desc">${esc(p.desc)}</div>
      <div class="path-card__chips">${chips}</div>
      <button class="path-card__go linkbtn" data-path="${esc(p.id)}" type="button">高亮此路径</button>
    </div>`;
  }).join('');
  list.querySelectorAll('.path-chip').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id; setView('timeline'); selectNode(id);
  }));
  list.querySelectorAll('.path-card__go').forEach(b => b.addEventListener('click', () => {
    const p = LEARNING_PATHS.find(x => x.id === b.dataset.path);
    if (!p) return;
    state.highlight = new Set(p.nodes);
    state.filterEra = null; state.activeEra = null;
    reflectEraActive(); applyState(); updateURL(); fit();
    const pp = document.getElementById('pathPanel'); if (pp) pp.hidden = true;
  }));
}

// ===== 新增：纪元序言卡（纯增量，复用 PREFACES 数据与 ERAS 配色） =====
function showEraPreface(era) {
  const ep = document.getElementById('eraPreface');
  if (!ep || !PREFACES[era]) { if (ep) ep.hidden = true; return; }
  const d = PREFACES[era];
  const info = ERAS[era];
  const tag = document.getElementById('epTag');
  tag.textContent = (info ? info.name : era) + (d.range ? ' · ' + d.range : '');
  tag.style.color = info ? info.raw : 'var(--gold)';
  document.getElementById('epTitle').textContent = d.title || (info ? info.name : era);
  document.getElementById('epLead').textContent = d.lead || '';
  document.getElementById('epPuzzle').textContent = d.puzzle || '';
  document.getElementById('epFigs').textContent = (d.figures || []).join('、');
  ep.hidden = false;
}

// ===== 新增：悬停节点迷你预览卡（pointer-events:none，不干扰拖拽/点击） =====
function showNodePreview(n, x, y) {
  const pv = document.getElementById('nodePreview');
  if (!pv) return;
  const sum = n.summary || (n.deepContent && n.deepContent.summary) || '—';
  pv.innerHTML =
    `<div class="node-preview__name">${esc(langName(n))}</div>` +
    (n.nameEn ? `<div class="node-preview__en">${esc(state.lang === 'en' ? n.name : n.nameEn)}</div>` : '') +
    `<div class="node-preview__sum">${esc(sum)}</div>`;
  pv.hidden = false;
  const pad = 14, r = pv.getBoundingClientRect();
  let px = x + 16, py = y + 16;
  if (px + r.width > window.innerWidth - pad) px = x - r.width - 16;
  if (py + r.height > window.innerHeight - pad) py = y - r.height - 16;
  pv.style.left = Math.max(pad, px) + 'px';
  pv.style.top = Math.max(pad, py) + 'px';
}
function hideNodePreview() { const pv = document.getElementById('nodePreview'); if (pv) pv.hidden = true; }

function wireUI() {
  document.getElementById('viewTabs').addEventListener('click', e => {
    const b = e.target.closest('.view-tab'); if (!b) return;
    setView(b.dataset.view);
  });

  // 虚无-图景子选项（意境 / 思维导图）切换
  const vsEl = document.getElementById('voidSubtabs');
  if (vsEl) vsEl.addEventListener('click', e => {
    const b = e.target.closest('.void-subtab'); if (!b) return;
    voidTab = b.dataset.void;
    activateVoidTab(voidTab);
    updateURL();
  });
  const mmExpand = document.getElementById('mmExpandAll');
  if (mmExpand) mmExpand.addEventListener('change', e => setExpandAll(e.target.checked));
  const mmResetBtn = document.getElementById('mmReset');
  if (mmResetBtn) mmResetBtn.addEventListener('click', () => resetMindmap());

  const eraTabs = document.getElementById('eraTabs');
  buildEraTabs();
  eraTabs.addEventListener('click', e => {
    const b = e.target.closest('.era-tab'); if (!b) return;
    const a = b.dataset.era;
    if (a === 'all') {
      state.filterEra = null; state.activeEra = null; closeSidebar();
    } else {
      state.filterEra = a; state.activeEra = a; openEra(a); showEraPreface(a); // 激活纪元：聚焦筛选 + 高亮 + 综述 + 序言卡
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
    if (pf) { openEra(pf.dataset.era); showEraPreface(pf.dataset.era); return; }
    // 点击画布空白（非节点/非标签/非前言）：退出聚焦态，清除选中与关联高亮
    if (state.selected || state.activeEra || state.activeScale) {
      state.selected = null; state.highlight = new Set(); state.activeEra = null; state.activeScale = null;
      reflectEraActive(); reflectScaleActive(); applyState(); updateURL();
    }
  });

  // 悬停节点迷你预览卡（纯新增，不影响点击/拖拽/缩放）
  stage.addEventListener('mouseover', e => {
    const g = e.target.closest('.node');
    if (!g) return;
    const n = byId.get(g.dataset.id);
    if (!n) return;
    showNodePreview(n, e.clientX, e.clientY);
  });
  stage.addEventListener('mouseout', e => {
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.node')) return;
    hideNodePreview();
  });
  document.addEventListener('mousedown', hideNodePreview);
  // 纪元序言卡关闭交互
  const epEl = document.getElementById('eraPreface');
  const epClose = document.getElementById('eraPrefaceClose');
  if (epClose) epClose.addEventListener('click', () => { if (epEl) epEl.hidden = true; });
  if (epEl) epEl.addEventListener('click', e => { if (e.target === epEl) epEl.hidden = true; });

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
  // 全文检索：在「名称/人名/脉络/范式」之外，额外覆盖 deep 节点的
  // 历史/分支/著作/影响/工具/实验/争论/局限/未来 正文、术语释义与公式
  const DIM_KEY_MAP = { '历史':'history','分支':'branches','著作':'works','影响':'impact','工具':'tools','实验':'experiments','争论':'debate','局限':'limits','未来':'future' };
  const EXTRA_TAGS = new Set(['历史','分支','著作','影响','工具','实验','争论','局限','未来','术语','公式']);
  let lastQ = '';
  function searchNode(n, q) {
    const fields = [
      ['名称', (n.name || '') + ' ' + (n.nameEn || '')],
      ['人物', (n.figures || []).join(' ')],
      ['脉络', n.summary || ''],
      ['范式', n.aha || ''],
      ['历史', n.deepContent?.history || ''],
      ['分支', n.deepContent?.branches || ''],
      ['著作', n.deepContent?.works || ''],
      ['影响', n.deepContent?.impact || ''],
      ['工具', n.deepContent?.tools || ''],
      ['实验', n.deepContent?.experiments || ''],
      ['争论', n.deepContent?.debate || ''],
      ['局限', n.deepContent?.limits || ''],
      ['未来', n.deepContent?.future || ''],
      ['术语', (n.terms || []).map(t => (t.name || '') + ' ' + (t.definition || '')).join(' ')],
      ['公式', (n.formula || []).map(f => (f.latex || '') + ' ' + (f.plain || '') + ' ' + (f.name || '')).join(' ')],
    ];
    const tags = [];
    for (const [key, text] of fields) {
      if (text && text.toLowerCase().includes(q)) tags.push(key);
    }
    return tags;
  }
  si.addEventListener('input', () => {
    const q = si.value.trim().toLowerCase();
    lastQ = q;
    if (!q) { sr.hidden = true; sr.innerHTML = ''; clearSearchGlow(); return; }
    const hits = NODES.map(n => ({ n, tags: searchNode(n, q) })).filter(x => x.tags.length);
    sr.hidden = false;
    sr.innerHTML = hits.slice(0, 40).map(({ n, tags }) => {
      const extra = tags.filter(t => EXTRA_TAGS.has(t));
      return `<button data-id="${n.id}" data-tags="${esc(tags.join(','))}">${esc(langName(n))} <span style="color:var(--ink-3)">· ${esc(String(n.year))}</span>${extra.length ? ` <span style="color:var(--gold);font-size:11px">命中：${esc(extra.join('/'))}</span>` : ''}</button>`;
    }).join('') || '<div style="padding:10px;color:var(--ink-3)">无匹配</div>';
    clearSearchGlow();
    hits.forEach(({ n }) => nodeEl(n.id)?.classList.add('is-search'));
  });
  sr.addEventListener('click', e => {
    const b = e.target.closest('button[data-id]'); if (!b) return;
    const id = b.dataset.id;
    const tags = (b.dataset.tags || '').split(',').filter(Boolean);
    si.value = ''; sr.hidden = true; clearSearchGlow();
    if (tags.includes('术语')) {
      // 命中术语：跳到该节点术语释义锚点（复用既有 pp:gotoTerm 通道）
      const term = (byId.get(id)?.terms || []).find(t => (t.name || '').toLowerCase().includes(lastQ));
      if (term) { window.dispatchEvent(new CustomEvent('pp:gotoTerm', { detail: { nodeId: id, termName: term.name } })); return; }
    }
    selectNode(id);
    if (!window.matchMedia('(max-width:768px)').matches) focusNode(id);
    const dimZh = tags.find(t => DIM_KEY_MAP[t]);
    if (dimZh) openSidebarTab(DIM_KEY_MAP[dimZh]);
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
  const expandAllBtn = document.getElementById('expandAllBtn');
  expandAllBtn.addEventListener('click', () => {
    state.expandAll = !state.expandAll;
    expandAllBtn.textContent = state.expandAll ? '收起关联' : '展开全部关联';
    if (state.selected) {
      state.highlight = relatedSet(NODES, state.selected, state.expandAll);
      applyState();
    }
    updateURL();
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    state.selected = null;
    state.highlight = new Set();
    state.activeEra = null;
    state.activeScale = null;
    reflectEraActive(); reflectScaleActive();
    applyState(); updateURL(); fit();
  });
  // 界面中/英切换（仅 UI 文案，正文综述/术语保持中文）
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.addEventListener('click', () => {
    state.lang = state.lang === 'en' ? 'zh' : 'en';
    applyLang();
  });
  // 本地收藏面板
  const favBtn = document.getElementById('favBtn');
  const favPanel = document.getElementById('favPanel');
  if (favBtn && favPanel) {
    favBtn.addEventListener('click', () => { renderFavList(); updateFavCount(); favPanel.hidden = !favPanel.hidden; });
    document.getElementById('favClose')?.addEventListener('click', () => { favPanel.hidden = true; });
    favPanel.addEventListener('click', e => { if (e.target === favPanel) favPanel.hidden = true; });
  }
  window.addEventListener('pp:favChange', () => { renderFavList(); updateFavCount(); });
  // 预设学习路径面板
  const pathBtn = document.getElementById('pathBtn');
  const pathPanel = document.getElementById('pathPanel');
  if (pathBtn && pathPanel) {
    pathBtn.addEventListener('click', () => { renderPathList(); pathPanel.hidden = !pathPanel.hidden; });
    document.getElementById('pathClose')?.addEventListener('click', () => { pathPanel.hidden = true; });
    pathPanel.addEventListener('click', e => { if (e.target === pathPanel) pathPanel.hidden = true; });
  }
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

  window.addEventListener('resize', () => {
    fit();
    if (state.view === 'void' && voidTab === 'mindmap') renderMindmap();
  });

  // ── 手机端 <480px：竖排卡片列表（设计 4.4，仅超小屏生效，桌面/平板不受影响） ──
  const mobileList = document.getElementById('mobileList');
  let _mobileBuilt = false;
  function renderMobileList() {
    if (!mobileList) return;
    mobileList.innerHTML = ERA_ORDER.map(era => {
      const e = ERAS[era];
      const cards = NODES.filter(n => n.era === era).map(n => `
        <button class="ml-card" data-id="${esc(n.id)}">
          <span class="ml-card__tag" style="background:${e.raw}"></span>
          <span class="ml-card__name">${esc(n.name)}</span>
          <span class="ml-card__year">${esc(String(n.year))}</span>
          <span class="ml-card__aha">${esc(n.aha || '')}</span>
        </button>`).join('');
      return `<div class="ml-group"><div class="ml-group__title" style="color:${e.raw}">${e.name}</div>${cards}</div>`;
    }).join('');
    mobileList.querySelectorAll('.ml-card').forEach(btn => {
      btn.addEventListener('click', () => { selectNode(btn.dataset.id); openNode(btn.dataset.id); });
    });
  }
  function syncMobile() {
    if (!mobileList) return;
    const isMobile = window.matchMedia('(max-width:480px)').matches;
    if (isMobile && !_mobileBuilt) { renderMobileList(); _mobileBuilt = true; }
    else if (!isMobile && _mobileBuilt) { mobileList.innerHTML = ''; _mobileBuilt = false; }
  }
  window.addEventListener('resize', syncMobile);
  syncMobile();
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
  else { state.activeEra = era; openEra(era); showEraPreface(era); }
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

// 虚无-图景子选项（意境 / 思维导图）
let voidTab = 'poem';
function activateVoidTab(v) {
  document.querySelectorAll('.void-subtab').forEach(t => t.classList.toggle('is-active', t.dataset.void === v));
  const poem = document.getElementById('voidPoem');
  const mm = document.getElementById('voidMindmap');
  if (poem) poem.hidden = (v !== 'poem');
  if (mm) mm.hidden = (v !== 'mindmap');
  if (v === 'mindmap') renderMindmap();
}

// 统一视图切换（含人物索引与虚无-图景覆盖层）
function setView(v) {
  state.view = v;
  document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === v));
  const isPeople = v === 'people';
  const isVoid = v === 'void';
  document.body.classList.remove('view-timeline','view-unification','view-scale','view-people','view-void');
  document.body.classList.add(`view-${v}`);
  const stageEl = document.getElementById('stage');
  const pv = document.getElementById('peopleView');
  const vv = document.getElementById('voidView');
  const smb = document.getElementById('scaleMapBar');
  if (stageEl) stageEl.style.visibility = (isPeople || isVoid) ? 'hidden' : '';
  if (pv) pv.hidden = !isPeople;
  if (vv) vv.hidden = !isVoid;
  if (smb) smb.hidden = (v !== 'scale');
  const eraNav = document.getElementById('eraNav');
  if (eraNav) eraNav.style.display = isVoid ? 'none' : '';
  if (isPeople) {
    const pg = document.getElementById('peopleGrid');
    renderPeople(pg, [...PEOPLE_MAP.values()], onPickPerson);
    const ps = document.getElementById('peopleSearch');
    if (ps) { ps.oninput = () => filterPeopleGrid(ps.value); filterPeopleGrid(ps.value); }
    closeSidebar();
  } else if (isVoid) {
    closeSidebar();
    activateVoidTab(voidTab);
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
  if (state.view === 'void' && voidTab !== 'poem') p.set('vtab', voidTab);
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
  if (p.get('vtab')) voidTab = p.get('vtab');
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

import { state } from './state.js';
import { esc, buildEdges, relatedSet } from './utils.js';
import { ERAS, ERA_ORDER, UI_LABELS } from './config.js';
import { computeLayout } from './views.js';
import { initRenderer, renderGraph, applyState } from './renderer.js';
import { initSidebar, openNode, openEra, openScale, closeSidebar, openPerson, openSidebarTab, focusTerm } from './sidebar.js';
import { initInteraction, fitView, consumeDrag } from './interaction.js';
import { startTour } from './tour.js';
import { buildPeople, renderPeople, filterPeopleGrid } from './people.js';
import { initMindmap, renderMindmap, resetMindmap, setExpandAll, focusMindmapNode } from './mindmap.js';

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
    `<div class="mobile-notice__text">${t('mobileNotice')}</div>` +
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
    toast(t('dataLoadFailed'));
    return;
  }

  initRenderer(NODES, EDGES, SUMMARIES);
  initSidebar(NODES, SUMMARIES);
  initInteraction();
  PEOPLE_MAP = buildPeople(NODES).reduce((m, p) => m.set(p.name, p), new Map());
  wireUI();

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

  // 若 URL 带 ?lang=en，启动即进入英文界面
  if (state.lang === 'en') applyLang();
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

// 通用 UI 文案取译（支持字符串或函数模板）
function t(key, ...args) {
  const v = UI_LABELS[state.lang]?.[key] ?? UI_LABELS.zh[key];
  return typeof v === 'function' ? v(...args) : v ?? key;
}

// 统一刷新所有静态 UI 文案（视图 tab、底栏、尺度导航条、人物索引、面板标题等）
function applyUILanguage() {
  const en = state.lang === 'en';

  // data-i18n 通用标签
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });

  // 顶栏视图 tab
  document.querySelectorAll('#viewTabs .view-tab').forEach(btn => {
    const map = { timeline: 'viewTimeline', unification: 'viewUnification', scale: 'viewScale', people: 'viewPeople', void: 'viewVoid' };
    const k = map[btn.dataset.view];
    if (k) btn.textContent = t(k);
  });

  // 底栏按钮
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) shareBtn.textContent = t('shareView');
  const expandAllBtn = document.getElementById('expandAllBtn');
  if (expandAllBtn) expandAllBtn.textContent = state.expandAll ? t('collapseAll') : t('expandAll');
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.textContent = t('resetView');

  // 提示条
  const hint = document.getElementById('zoomHint');
  if (hint) hint.textContent = t('hint');

  // 搜索框占位符
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.placeholder = t('searchPlaceholder');

  // only-core
  const onlyCoreLabel = document.querySelector('#onlyCore + span');
  if (onlyCoreLabel) onlyCoreLabel.textContent = t('onlyCore');

  // 尺度导航条
  const scaleChipMap = {
    microscopic: 'scaleMicroscopic', mesoscopic: 'scaleMesoscopic', cosmic: 'scaleCosmic',
    unified: 'scaleUnified', feedback: 'scaleFeedback'
  };
  document.querySelectorAll('#scaleMapBar .scale-map-bar__chip').forEach(btn => {
    const k = scaleChipMap[btn.dataset.scale];
    if (k) btn.textContent = t(k);
  });
  const scaleArrowMap = {
    '微观 → 宏观 · 涌现': 'scaleEmergence',
    '宏观 ↔ 宇观 · 引力桥梁': 'scaleGravityBridge',
    '统一 → 宇观': 'scaleGrandUnification',
    '统一 → 反哺': 'scaleTechFeedback',
    '反哺 ← 微观': 'scaleClosedLoop'
  };
  document.querySelectorAll('#scaleMapBar .scale-map-bar__arrow').forEach(span => {
    const k = scaleArrowMap[span.dataset.rel];
    if (k) span.textContent = t(k);
  });

  // 人物索引视图
  const peopleTitle = document.querySelector('#peopleView h2');
  if (peopleTitle) peopleTitle.textContent = t('peopleTitle');
  const peopleSub = document.querySelector('.people-view__sub');
  if (peopleSub) peopleSub.textContent = t('peopleSubtitle');
  const peopleSearch = document.getElementById('peopleSearch');
  if (peopleSearch) peopleSearch.placeholder = t('peopleSearchPlaceholder');

  // 面板标题
  // 导览按钮
  const tour3 = document.getElementById('tour3');
  if (tour3) tour3.textContent = t('tour3min');
  const tour10 = document.getElementById('tour10');
  if (tour10) tour10.textContent = t('tour10min');

  // 更新日记按钮标题
  const clHead = document.querySelector('#changelog .changelog__head > span');
  if (clHead) clHead.textContent = t('changelogTitle');

  // 虚无-图景子选项
  document.querySelectorAll('#voidSubtabs .void-subtab').forEach(btn => {
    const map = { poem: 'voidPoem', mindmap: 'voidMindmap' };
    const k = map[btn.dataset.void];
    if (k) btn.textContent = t(k);
  });

  // 思维导图全屏按钮
  const mmFs = document.getElementById('mmFullscreen');
  if (mmFs) mmFs.textContent = mindmapFs ? t('exitFullscreen') : t('fullscreen');
  // 全屏浮动退出按钮（仅全屏时可见，但语言切换时也要更新）
  const mmExitFs = document.getElementById('mmExitFs');
  if (mmExitFs) mmExitFs.textContent = t('exitFullscreen') || '✕ 退出全屏';

  // 手机端 <480px 竖排卡片列表：同步语言（仅超小屏生效）
  if (typeof syncMobile === 'function' && window.matchMedia('(max-width:480px)').matches) syncMobile();

  // 移动端 ::after 提示文案（CSS 变量驱动）
  const hintMobile = en ? 'Drag · Pinch to zoom · Tap node' : '单指拖拽平移 · 双指捏合缩放 · 点击节点';
  document.documentElement.style.setProperty('--hint-mobile', `"${hintMobile}"`);
}

// 纪元顶栏标签（随语言切换重建；点击监听在 wireUI 用事件委托一次绑定）
function buildEraTabs() {
  const en = state.lang === 'en';
  const eraTabs = document.getElementById('eraTabs');
  if (!eraTabs) return;
  eraTabs.innerHTML = `<button class="era-tab is-active" data-era="all"><span class="swatch" style="background:var(--gold)"></span>${en ? 'All' : '全部'}</button>` +
    ERA_ORDER.map(e => `<button class="era-tab" data-era="${e}"><span class="swatch" style="background:${ERAS[e].raw}"></span>${en ? ERAS[e].nameEn : ERAS[e].name}</button>`).join('');
}

// 切换界面语言：重绘画布 + 顶栏纪元标签 + 重渲侧栏头部 + 刷新所有静态 UI 文案
function applyLang() {
  const en = state.lang === 'en';
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = en ? '中' : 'EN';
  document.documentElement.lang = en ? 'en' : 'zh';
  renderGraph(state.view, currentLayout);
  buildEraTabs();
  applyUILanguage();
  if (state.selected) openNode(state.selected);
  // 切语言时重渲染思维导图（mindmap.js 内部按 state.lang 取 nameEn/labelEn/nameEn）
  if (state.view === 'void') renderMindmap();
  // 切语言时重渲染人物索引（people.js 内部按 state.lang 取 personNameEn）
  if (state.view === 'people') {
    const pg = document.getElementById('peopleGrid');
    if (pg) renderPeople(pg, [...PEOPLE_MAP.values()], onPickPerson);
  }
  updateURL();
}

// ===== 新增：纪元序言卡（纯增量，复用 PREFACES 数据与 ERAS 配色） =====
function showEraPreface(era) {
  const ep = document.getElementById('eraPreface');
  if (!ep || !PREFACES[era]) { if (ep) ep.hidden = true; return; }
  const d = PREFACES[era];
  const info = ERAS[era];
  const tag = document.getElementById('epTag');
  const eraName = state.lang === 'en' ? (info?.nameEn || info?.name || era) : (info?.name || era);
  tag.textContent = eraName + (d.range ? ' · ' + d.range : '');
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
  // 全屏模式切换
  const mmFsBtn = document.getElementById('mmFullscreen');
  if (mmFsBtn) mmFsBtn.addEventListener('click', () => toggleMindmapFullscreen());
  // 全屏浮动退出按钮（右上角固定）
  const mmExitFsBtn = document.getElementById('mmExitFs');
  if (mmExitFsBtn) mmExitFsBtn.addEventListener('click', () => toggleMindmapFullscreen());

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
  const DIM_KEY_MAP = { history:'history', branches:'branches', works:'works', impact:'impact', tools:'tools', experiments:'experiments', debate:'debate', limits:'limits', future:'future' };
  const EXTRA_TAGS = new Set(['history','branches','works','impact','tools','experiments','debate','limits','future','terms','formula']);
  const FIELD_LABEL = { name:'searchFieldName', figures:'searchFieldFigures', summary:'searchFieldSummary', aha:'searchFieldAha', history:'searchFieldHistory', branches:'searchFieldBranches', works:'searchFieldWorks', impact:'searchFieldImpact', tools:'searchFieldTools', experiments:'searchFieldExperiments', debate:'searchFieldDebate', limits:'searchFieldLimits', future:'searchFieldFuture', terms:'searchFieldTerms', formula:'searchFieldFormula' };
  let lastQ = '';
  function searchNode(n, q) {
    const fields = [
      ['name', (n.name || '') + ' ' + (n.nameEn || '')],
      ['figures', (n.figures || []).join(' ')],
      ['summary', n.summary || ''],
      ['aha', n.aha || ''],
      ['history', n.deepContent?.history || ''],
      ['branches', n.deepContent?.branches || ''],
      ['works', n.deepContent?.works || ''],
      ['impact', n.deepContent?.impact || ''],
      ['tools', n.deepContent?.tools || ''],
      ['experiments', n.deepContent?.experiments || ''],
      ['debate', n.deepContent?.debate || ''],
      ['limits', n.deepContent?.limits || ''],
      ['future', n.deepContent?.future || ''],
      ['terms', (n.terms || []).map(t => (t.name || '') + ' ' + (t.definition || '')).join(' ')],
      ['formula', (n.formula || []).map(f => (f.latex || '') + ' ' + (f.plain || '') + ' ' + (f.name || '')).join(' ')],
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
      const extra = tags.filter(t => EXTRA_TAGS.has(t)).map(t => t('FIELD_LABEL'[t] || t));
      return `<button data-id="${n.id}" data-tags="${esc(tags.join(','))}">${esc(langName(n))} <span style="color:var(--ink-3)">· ${esc(String(n.year))}</span>${extra.length ? ` <span style="color:var(--gold);font-size:11px">${t('searchHit')}${esc(extra.join('/'))}</span>` : ''}</button>`;
    }).join('') || `<div style="padding:10px;color:var(--ink-3)">${t('searchNoMatch')}</div>`;
    clearSearchGlow();
    hits.forEach(({ n }) => nodeEl(n.id)?.classList.add('is-search'));
  });
  sr.addEventListener('click', e => {
    const b = e.target.closest('button[data-id]'); if (!b) return;
    const id = b.dataset.id;
    const tags = (b.dataset.tags || '').split(',').filter(Boolean);
    si.value = ''; sr.hidden = true; clearSearchGlow();
    if (tags.includes('terms')) {
      // 命中术语：跳到该节点术语释义锚点（复用既有 pp:gotoTerm 通道）
      const term = (byId.get(id)?.terms || []).find(t => (t.name || '').toLowerCase().includes(lastQ));
      if (term) { window.dispatchEvent(new CustomEvent('pp:gotoTerm', { detail: { nodeId: id, termName: term.name } })); return; }
    }
    selectNode(id);
    if (!window.matchMedia('(max-width:768px)').matches) focusNode(id);
    // 联动思维导图：自动切到思维导图、展开该学说维度、高亮其分支路径并缩放定位（按图索骥）
    if (state.view !== 'void') setView('void');
    voidTab = 'mindmap';
    activateVoidTab('mindmap');
    focusMindmapNode(id);
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
    updateURL(); navigator.clipboard?.writeText(location.href); toast(t('linkCopied'));
  });
  const expandAllBtn = document.getElementById('expandAllBtn');
  if (expandAllBtn) expandAllBtn.textContent = state.expandAll ? t('collapseAll') : t('expandAll');
  expandAllBtn.addEventListener('click', () => {
    state.expandAll = !state.expandAll;
    expandAllBtn.textContent = state.expandAll ? t('collapseAll') : t('expandAll');
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
      const eraName = state.lang === 'en' ? e.nameEn : e.name;
      const cards = NODES.filter(n => n.era === era).map(n => {
        const nm = state.lang === 'en' ? (n.nameEn || n.name) : n.name;
        return `
        <button class="ml-card" data-id="${esc(n.id)}">
          <span class="ml-card__tag" style="background:${e.raw}"></span>
          <span class="ml-card__name">${esc(nm)}</span>
          <span class="ml-card__year">${esc(String(n.year))}</span>
          <span class="ml-card__aha">${esc(n.aha || '')}</span>
        </button>`;
      }).join('');
      return `<div class="ml-group"><div class="ml-group__title" style="color:${e.raw}">${eraName}</div>${cards}</div>`;
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

// 思维导图全屏模式
let mindmapFs = false;
function toggleMindmapFullscreen() {
  mindmapFs = !mindmapFs;
  document.body.classList.toggle('mm-fs', mindmapFs);
  // 切换按钮文字
  const btn = document.getElementById('mmFullscreen');
  if (btn) btn.textContent = mindmapFs ? t('exitFullscreen') : t('fullscreen');
  // 浮动退出按钮双语
  const exitBtn = document.getElementById('mmExitFs');
  if (exitBtn) exitBtn.textContent = mindmapFs ? (t('exitFullscreen') || '✕ 退出全屏') : '✕ 退出全屏';
  // 进入全屏时重置拖拽偏移（防止残留 tx/ty 导致内容偏移到看不见的位置）
  if (mindmapFs) {
    // 通过暴露在 window 上的函数重置（mindmap.js 的 resetMindmap 已做 tf={tx:0,ty:0,k:1} + fit()）
    if (typeof resetMindmap === 'function') resetMindmap();
  }
  // 全屏切换后等布局稳定再重排
  requestAnimationFrame(() => { renderMindmap(); });
}
// ESC 退出全屏
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && mindmapFs) {
    toggleMindmapFullscreen();
  }
});

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
  if (p.get('lang') === 'en') state.lang = 'en';
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

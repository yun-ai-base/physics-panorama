import { state } from './state.js?v=20260808x';
import { esc, buildEdges, relatedSet } from './utils.js?v=20260808x';
import { ERAS, ERA_ORDER, UI_LABELS, READER_PATHS } from './config.js?v=20260808x';
import { computeLayout } from './views.js?v=20260808x';
import { initRenderer, renderGraph, applyState } from './renderer.js?v=20260808x';
import { initSidebar, openNode, openEra, openScale, closeSidebar, openPerson, openSidebarTab, focusTerm, openExperiment } from './sidebar.js?v=20260808x';
import { initInteraction, fitView, consumeDrag } from './interaction.js?v=20260808x';
import { startTour } from './tour.js?v=20260808x';
import { buildPeople, renderPeople, filterPeopleGrid } from './people.js?v=20260808x';
import { initExperiments, renderExperiments, setExpEraFilter, setExpQuery, expCount, getExp } from './experiments.js?v=20260808x';
import { initMindmap, renderMindmap, resetMindmap, setExpandAll, focusMindmapNode, exportMindmap } from './mindmap.js?v=20260808x';
import { renderHonor, refreshHonorLang, closeHonorPop, searchHonor, scrollHonorToOldest, scrollHonorToNewest } from './honor.js?v=20260808x';
import { initSky, renderSky, refreshSkyLang } from './sky.js?v=20260808x';
import { initMicro, renderMicro, refreshMicroLang } from './micro.js?v=20260808x';
import { initGlossary, renderGlossary } from './glossary.js?v=20260808x';

let NODES = [], EDGES = [], SUMMARIES = {}, byId = new Map(), PREFACES = {};
let currentLayout = [];
let PEOPLE_MAP = new Map();

const stage = document.getElementById('stage');

// 搜索高亮的极简样式注入
const st = document.createElement('style');
st.textContent = '.node.is-search .node__circle{stroke:var(--gold)!important;stroke-width:3.6!important;}';
document.head.appendChild(st);

async function boot() {
  // 移动端首页提示框：仅手机端显示、可关闭、关闭后记住不再打扰（fixed 浮层不占文档流）
  const pcTip = document.getElementById('pcTip');
  if (pcTip) {
    const tipClosed = (() => { try { return localStorage.getItem('pp-pc-tip') === '1'; } catch (e) { return false; } })();
    if (window.matchMedia('(max-width:768px)').matches && !tipClosed) {
      pcTip.hidden = false;
      const closeBtn = document.getElementById('pcTipClose');
      if (closeBtn) closeBtn.addEventListener('click', () => {
        pcTip.hidden = true;
        try { localStorage.setItem('pp-pc-tip', '1'); } catch (e) { /* ignore */ }
      });
    }
  }
  try {
    const [nodeRes, metaRes] = await Promise.all([
      fetch('nodes.json?v=20260808x').then(r => { if (!r.ok) throw new Error('nodes.json → ' + r.status); return r.json(); }),
      fetch('physics-data.json?v=20260808x').then(r => { if (!r.ok) throw new Error('physics-data.json → ' + r.status); return r.json(); }),
    ]);
    NODES = nodeRes;
    EDGES = buildEdges(NODES, metaRes.conflicts || []);
    SUMMARIES = metaRes.summaries || {};
    PREFACES = metaRes.prefaces || {};
    NODES.forEach(n => byId.set(n.id, n));
  } catch (err) {
    console.error('[boot] 数据加载失败：', err);
    showBootError();
    return;
  }

  initRenderer(NODES, EDGES, SUMMARIES);
  initSidebar(NODES, SUMMARIES);
  initGlossary(NODES);
  initInteraction();
  PEOPLE_MAP = buildPeople(NODES).reduce((m, p) => m.set(p.name, p), new Map());
  initExperiments(id => {
    expOpen = id;
    openExperiment(getExp(id), byId);
    updateURL();
  });
  wireUI();

  // A.5 统一之路图例：纯 CSS hover tooltip，无需 JS 状态管理

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

  // 仰望星空 / 探幽识微 模块初始化（仅缓存数据并创建 DOM，渲染推迟到首次进入对应子选项）
  try { initSky(document.getElementById('voidSky')); } catch (err) { console.error('[sky] init failed', err); }
  try { initMicro(document.getElementById('voidMicro')); } catch (err) { console.error('[micro] init failed', err); }

  // sky/micro 内的「返回图景」按钮 → 切换回虚无-图景默认子视图（意境）
  document.getElementById('voidSky')?.addEventListener('journey:back', () => activateVoidTab('poem'));
  document.getElementById('voidMicro')?.addEventListener('journey:back', () => activateVoidTab('poem'));

  const node = readURL();
  const restoreTab = state.sidebarTab;
  const restoreTerm = state.termFocus;
  setView(state.view); // 统一走视图切换逻辑（激活 tab、body class、尺度关联条显隐等）
  // 仅在有节点图的视图下才根据 URL hash 自动选中节点并打开侧栏
  const nodeViews = new Set(['timeline', 'scale', 'unification']);
  if (node && byId.has(node) && nodeViews.has(state.view)) {
    selectNode(node);
    if (restoreTab) openSidebarTab(restoreTab);
    if (restoreTerm) focusTerm(restoreTerm);
  }
  // URL 带 ?exp= 时恢复实验详情（理论·实验视图）
  if (state.view === 'experiments' && expOpen) {
    const e = getExp(expOpen);
    if (e) openExperiment(e, byId);
  }

  // 若 URL 带 ?lang=en，启动即进入英文界面
  if (state.lang === 'en') applyLang();

  // 首次渲染完成，移除骨架屏
  const sk = document.getElementById('bootSkeleton');
  if (sk) sk.remove();
}

// 数据加载失败：骨架屏切换为错误态 + 重试按钮（替代原先仅弹 toast 后白屏）
function showBootError() {
  const sk = document.getElementById('bootSkeleton');
  if (!sk) { toast(t('dataLoadFailed')); return; }
  const errEl = sk.querySelector('[data-skel="err"]');
  const retryEl = sk.querySelector('[data-skel="retry"]');
  const textEl = sk.querySelector('[data-skel="loading"]');
  if (errEl) errEl.hidden = false;
  if (retryEl) retryEl.hidden = false;
  if (textEl) textEl.hidden = true;
  if (retryEl) {
    retryEl.onclick = () => location.reload();
  }
}

function renderCurrent() {
  currentLayout = computeLayout(NODES, state.view);
  renderGraph(state.view, currentLayout);
}
function bounds() {
  // 非时间线视图（experiments/people/void/glossary）时 currentLayout 为空，直接返回画布尺寸兜底，
  // 避免 Math.min/max 空数组得 ±Infinity 把 state.scale/tx/ty 置成 NaN
  if (!currentLayout.length) return { minX: 0, maxX: stage.clientWidth || 1200, minY: 0, maxY: stage.clientHeight || 800 };
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

// 计算选中节点 + 关联节点的包围盒并 fit 到视口（移动端聚焦用；搜索结果点击定位用）
function focusNode(id) {
  const ids = new Set([id, ...state.highlight]);
  const pts = currentLayout.filter(p => ids.has(p.id));
  if (!pts.length) return;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  // 平滑聚焦：临时加 transition，动画结束后移除，避免拖拽/缩放被拖慢
  const vp = document.getElementById('viewport');
  if (vp) vp.classList.add('is-smoothing');
  fitView(
    { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
    stage.clientWidth, stage.clientHeight, 120
  );
  if (vp) setTimeout(() => vp.classList.remove('is-smoothing'), 650);
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

  // 顶栏视图 tab（主标题 + 副标题分层更新，避免 textContent 清空副标题）
  document.querySelectorAll('#viewTabs .view-tab').forEach(btn => {
    const map = { timeline: 'viewTimeline', unification: 'viewUnification', scale: 'viewScale', experiments: 'viewExperiments', people: 'viewPeople', void: 'viewVoid', glossary: 'viewGlossary' };
    const k = map[btn.dataset.view];
    const main = btn.querySelector('.view-tab__main');
    if (main && k) main.textContent = t(k);
    const sub = btn.querySelector('.view-tab__sub');
    if (sub) sub.textContent = t(sub.dataset.navsub);
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

  // 理论·实验视图
  const expSearch = document.getElementById('expSearch');
  if (expSearch) expSearch.placeholder = t('expSearchPlaceholder');
  // 实验计数副标题（随实验数量动态更新）
  const expSub = document.querySelector('.exp-view__sub');
  if (expSub) expSub.textContent = t('expSubtitle', expCount());
  // 重建纪元筛选 chips（语言切换时文案随 ERAS 变化）
  const expTabsEl = document.getElementById('expTabs');
  if (expTabsEl && expTabsEl.children.length === 0) buildExpTabs();

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
    const map = { poem: 'voidPoem', mindmap: 'voidMindmap', honor: 'voidHonor', sky: 'voidSky', micro: 'voidMicro' };
    const k = map[btn.dataset.void];
    if (k) btn.textContent = t(k);
  });

  // 荣誉殿堂标题（随语言切换）
  const honorCap = document.querySelector('.honor-caption');
  if (honorCap) honorCap.textContent = t('honorCaption');

  // 思维导图全屏按钮
  const mmFs = document.getElementById('mmFullscreen');
  if (mmFs) mmFs.textContent = mindmapFs ? t('exitFullscreen') : t('fullscreen');
  // 全屏浮动退出按钮（始终带 ✕ 前缀）
  const mmExitFs = document.getElementById('mmExitFs');
  if (mmExitFs) mmExitFs.textContent = '✕ ' + (t('exitFullscreen') || '退出全屏');

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

// A.4 阅读路径：按读者背景生成的预设路线 tab（含「全部」）
function buildPathTabs() {
  const en = state.lang === 'en';
  const pathTabs = document.getElementById('pathTabs');
  if (!pathTabs) return;
  const activeId = activePathId();
  const allOn = !state.pathIds ? ' is-active' : '';
  const allLabel = t('pathAll') || '全部';
  const allTitle = en ? 'Show all nodes' : '显示全部节点';
  const allBtn = `<button class="path-tab${allOn}" data-path="all" title="${allTitle}"><span class="path-tab__dot"></span>${allLabel}</button>`;
  pathTabs.innerHTML = allBtn + READER_PATHS.map(p => {
    const on = activeId === p.id ? ' is-active' : '';
    const label = en ? p.nameEn : p.name;
    return `<button class="path-tab${on}" data-path="${p.id}" title="${p.desc}"><span class="path-tab__dot"></span>${label}</button>`;
  }).join('');
}
// 当前激活路径 id（state.pathIds 与某条 READER_PATHS 完全匹配时）
function activePathId() {
  if (!state.pathIds) return null;
  for (const p of READER_PATHS) {
    if (p.nodeIds.length === state.pathIds.size && p.nodeIds.every(id => state.pathIds.has(id))) return p.id;
  }
  return null;
}

// 切换界面语言：重绘画布 + 顶栏纪元标签 + 重渲侧栏头部 + 刷新所有静态 UI 文案
function applyLang() {
  const en = state.lang === 'en';
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = en ? '🌐 English' : '🌐 中文';
  document.documentElement.lang = en ? 'en' : 'zh';
  renderGraph(state.view, currentLayout);
  buildEraTabs();
  buildPathTabs();
  applyUILanguage();
  if (state.selected) openNode(state.selected);
  // 切语言时重渲染思维导图（mindmap.js 内部按 state.lang 取 nameEn/labelEn/nameEn）
  if (state.view === 'void') renderMindmap();
  // 切语言时重渲染人物索引（people.js 内部按 state.lang 取 personNameEn）
  if (state.view === 'people') {
    const pg = document.getElementById('peopleGrid');
    if (pg) renderPeople(pg, [...PEOPLE_MAP.values()], onPickPerson);
  }
  // 切语言时重渲染理论·实验（纪元 chips 文案随语言变化；实验正文保持中文）
  if (state.view === 'experiments') {
    const expTabsEl = document.getElementById('expTabs');
    if (expTabsEl) expTabsEl.innerHTML = '';
    buildExpTabs();
    renderExperiments(document.getElementById('expGrid'), byId);
    if (expOpen) { const e = getExp(expOpen); if (e) openExperiment(e, byId); }
  }
  // 切语言时重渲染全局术语表（glossary.js 内部按 state.lang 取 nameEn/labelEn）
  if (state.view === 'glossary') renderGlossary();
  // 切语言时刷新荣誉殿堂（重建时间线 + 刷新当前面板内容，避免面板仍显示旧语言）
  if (state.view === 'void' && voidTab === 'honor') { renderHonor(); refreshHonorLang(); }
  if (state.view === 'void' && voidTab === 'sky') refreshSkyLang();
  if (state.view === 'void' && voidTab === 'micro') refreshMicroLang();
  const hs = document.getElementById('honorSearch');
  if (hs) hs.placeholder = en ? 'Search laureate or year…' : '搜索获奖者或年份…';
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
    // 主动点顶栏导航进入虚无-图景时，回到默认意境引导页（poem），
    // 不被 URL 残留的 vtab 劫持（刷新页面仍由 readURL 保留上次子页）
    if (b.dataset.view === 'void') voidTab = 'poem';
    setView(b.dataset.view, true);
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

  // 荣誉殿堂：搜索 / 年份导航
  const honorSearch = document.getElementById('honorSearch');
  if (honorSearch) {
    let deb;
    honorSearch.addEventListener('input', () => {
      if (voidTab !== 'honor') return;
      clearTimeout(deb);
      deb = setTimeout(() => {
        const n = searchHonor(honorSearch.value);
        honorSearch.classList.toggle('is-empty', honorSearch.value.trim() !== '' && n === 0);
      }, 200);
    });
    honorSearch.addEventListener('keydown', e => { if (e.key === 'Escape') { honorSearch.value = ''; searchHonor(''); } });
  }
  const honorToOldest = document.getElementById('honorToOldest');
  if (honorToOldest) honorToOldest.addEventListener('click', () => scrollHonorToOldest());
  const honorToNewest = document.getElementById('honorToNewest');
  if (honorToNewest) honorToNewest.addEventListener('click', () => scrollHonorToNewest());
  // 思维导图导出（PNG / SVG 下拉菜单）
  const mmExportBtn = document.getElementById('mmExport');
  const mmExportMenu = document.getElementById('mmExportMenu');
  if (mmExportBtn && mmExportMenu) {
    mmExportBtn.addEventListener('click', e => {
      e.stopPropagation();
      mmExportMenu.hidden = !mmExportMenu.hidden;
    });
    mmExportMenu.querySelectorAll('button[data-fmt]').forEach(btn => {
      btn.addEventListener('click', () => {
        mmExportMenu.hidden = true;
        const fmt = btn.getAttribute('data-fmt');
        if (fmt === 'png' || fmt === 'svg') exportMindmap(fmt);
      });
    });
    document.addEventListener('click', () => { if (mmExportMenu) mmExportMenu.hidden = true; });
  }

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

  const pathTabs = document.getElementById('pathTabs');
  if (pathTabs) {
    buildPathTabs();
    pathTabs.addEventListener('click', e => {
      const b = e.target.closest('.path-tab'); if (!b) return;
      const id = b.dataset.path;
      if (id === 'all') {
        // 「全部」：清除阅读路径筛选，显示全部节点
        state.pathIds = null;
      } else {
        const p = READER_PATHS.find(x => x.id === id);
        // 再次点击同一路径 → 取消
        if (state.pathIds && activePathId() === id) {
          state.pathIds = null;
        } else {
          state.pathIds = new Set(p.nodeIds);
        }
      }
      reflectPathActive(); applyState(); updateURL();
    });
  }

  document.getElementById('onlyCore').addEventListener('change', e => { state.onlyCore = e.target.checked; applyState(); updateURL(); });
  // 关闭侧栏只收起面板，保留选中节点与关联高亮——关掉后应能在画布上看到关联节点（移动端侧栏全屏遮挡，尤为关键）
  document.getElementById('sidebarClose').addEventListener('click', () => { closeSidebar(); if (state.view === 'experiments' && expOpen) { expOpen = null; updateURL(); } });

  // 理论·实验：搜索框（200ms 防抖）
  const expSearchEl = document.getElementById('expSearch');
  if (expSearchEl) {
    let expDeb;
    expSearchEl.addEventListener('input', () => {
      clearTimeout(expDeb);
      expDeb = setTimeout(() => {
        setExpQuery(expSearchEl.value, document.getElementById('expGrid'), byId);
      }, 200);
    });
    expSearchEl.addEventListener('keydown', e => {
      if (e.key === 'Escape') { expSearchEl.value = ''; setExpQuery('', document.getElementById('expGrid'), byId); }
    });
  }

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
  // ── 搜索增强：纪元 / 人物筛选 chips（不动 searchNode 匹配逻辑，仅对命中做后置过滤） ──
  let searchFilter = null;   // { type:'era', value } | { type:'figures' } | null
  function renderSearchChips() {
    const chipData = [
      { key: 'all', label: t('searchAll') || '全部', type: null },
      ...ERA_ORDER.map(era => ({ key: era, label: state.lang === 'en' ? (ERAS[era].nameEn || ERAS[era].name) : ERAS[era].name, type: 'era' })),
      { key: 'figures', label: t('searchFigures') || '人物', type: 'figures' },
    ];
    const isActive = c => (searchFilter == null && c.key === 'all') ||
      (searchFilter && searchFilter.type === 'era' && searchFilter.value === c.key) ||
      (searchFilter && searchFilter.type === 'figures' && c.key === 'figures');
    return '<div class="search__chips">' + chipData.map(c =>
      `<button type="button" class="search__chip${isActive(c) ? ' is-active' : ''}" data-sf="${c.key}">${esc(c.label)}</button>`
    ).join('') + '</div>';
  }
  function renderSearch(q) {
    lastQ = q;
    if (!q) { sr.hidden = true; sr.innerHTML = ''; clearSearchGlow(); return; }
    const hits = NODES.map(n => ({ n, tags: searchNode(n, q) })).filter(x => x.tags.length);
    const filtered = searchFilter ? hits.filter(({ n, tags }) => {
      if (searchFilter.type === 'era') return n.era === searchFilter.value;
      if (searchFilter.type === 'figures') return tags.includes('figures');
      return true;
    }) : hits;
    sr.hidden = false;
    sr.innerHTML = renderSearchChips() + (filtered.slice(0, 40).map(({ n, tags }) => {
      // 注意：map 回调参数用 tag 而非 t，避免遮蔽外层翻译函数 t（此前 terms/formula 命中时抛 TypeError 致结果空白）
      const extra = tags.filter(tag => EXTRA_TAGS.has(tag)).map(tag => t(FIELD_LABEL[tag] || tag));
      return `<button data-id="${n.id}" data-tags="${esc(tags.join(','))}">${esc(langName(n))} <span style="color:var(--ink-3)">· ${esc(String(n.year))}</span>${extra.length ? ` <span style="color:var(--gold);font-size:11px">${t('searchHit')}${esc(extra.join('/'))}</span>` : ''}</button>`;
    }).join('') || `<div style="padding:10px;color:var(--ink-3)">${t('searchNoMatch')}</div>`);
    clearSearchGlow();
    filtered.forEach(({ n }) => nodeEl(n.id)?.classList.add('is-search'));
  }
  si.addEventListener('input', () => renderSearch(si.value.trim().toLowerCase()));
  sr.addEventListener('click', e => {
    const chip = e.target.closest('.search__chip');
    if (chip) {
      const k = chip.dataset.sf;
      searchFilter = k === 'all' ? null : (k === 'figures' ? { type: 'figures' } : { type: 'era', value: k });
      renderSearch(lastQ);
      return;
    }
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
    // 先设 voidTab 再 setView，避免 setView 内部按旧 voidTab 先渲染一次旧子页
    voidTab = 'mindmap';
    if (state.view !== 'void') setView('void', true);
    else activateVoidTab('mindmap');
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

  document.getElementById('shareBtn').addEventListener('click', async () => {
    updateURL();
    const url = location.href;
    // 移动端优先调用系统分享面板；用户取消（AbortError）不算失败，静默返回
    if (navigator.share) {
      try { await navigator.share({ title: document.title, url }); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    // 桌面端 / 分享不可用时回退：复制链接 + 提示
    try { await navigator.clipboard.writeText(url); } catch (e) { /* 剪贴板不可用时静默 */ }
    toast(t('linkCopied'));
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

  // ── 深色/浅色主题切换（localStorage 记忆） ──
  const themeBtn = document.getElementById('themeBtn');
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeBtn) themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    try { localStorage.setItem('pp-theme', theme); } catch (e) { /* 隐私模式忽略 */ }
  }
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('pp-theme'); } catch (e) { /* ignore */ }
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
    // 主题切换后重渲染，避免深色下残留浅色 SVG 文字/节点
    if (state.view === 'timeline' || state.view === 'unification' || state.view === 'scale') { renderCurrent(); fit(); }
    else if (state.view === 'void' && voidTab === 'mindmap') renderMindmap();
  });

  // ── 本地收藏（localStorage） ──
  function loadFavs() { try { return JSON.parse(localStorage.getItem('pp-favs') || '[]'); } catch (e) { return []; } }
  function saveFavs(favs) { try { localStorage.setItem('pp-favs', JSON.stringify(favs)); } catch (e) { /* ignore */ } }
  function isFaved(id) { return loadFavs().includes(id); }
  window.__ppToggleFav = id => {
    const favs = loadFavs();
    const i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1); else favs.unshift(id);
    saveFavs(favs);
    renderFavPanel();
    const btn = document.getElementById('sbFavBtn');
    if (btn) btn.classList.toggle('is-faved', isFaved(id));
    toast(i >= 0 ? t('favRemoved') || '已取消收藏' : t('favAdded') || '已收藏');
  };
  const favWrap = document.getElementById('favWrap');
  function renderFavPanel() {
    if (!favWrap || !favWrap.hidden) return;
    const list = document.getElementById('favList');
    if (!list) return;
    const favs = loadFavs();
    const hint = document.getElementById('favHint');
    if (hint) hint.hidden = favs.length > 0;
    list.innerHTML = favs.map(id => {
      const n = byId.get(id);
      if (!n) return '';
      return `<div class="fav-item" data-id="${esc(id)}">
        <span class="fav-item__name">${esc(langName(n))}</span>
        <span class="fav-item__year">${esc(String(n.year))}</span>
        <button class="fav-item__del" type="button" aria-label="移除收藏">×</button>
      </div>`;
    }).join('') || '<div style="padding:8px;color:var(--ink-3);font-size:12.5px;text-align:center">暂无收藏</div>';
    list.querySelectorAll('.fav-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.fav-item__del')) return;
        const id = item.dataset.id;
        favWrap.hidden = true;
        setView('timeline', true);
        selectNode(id);
        if (!window.matchMedia('(max-width:768px)').matches) focusNode(id);
      });
      item.querySelector('.fav-item__del').addEventListener('click', e => {
        e.stopPropagation();
        window.__ppToggleFav(item.dataset.id);
      });
    });
  }
  const favBtn = document.getElementById('favBtn');
  if (favBtn) favBtn.addEventListener('click', () => {
    if (!favWrap) return;
    favWrap.hidden = !favWrap.hidden;
    if (!favWrap.hidden) renderFavPanel();
  });
  const favClose = document.getElementById('favClose');
  if (favClose) favClose.addEventListener('click', () => { if (favWrap) favWrap.hidden = true; });
  document.addEventListener('click', e => {
    if (favWrap && !favWrap.hidden && !favWrap.contains(e.target) && !e.target.closest('#favBtn')) favWrap.hidden = true;
  });

  // ── 导出当前时间线视图为 PNG ──
  const exportPngBtn = document.getElementById('exportPngBtn');
  if (exportPngBtn) exportPngBtn.addEventListener('click', () => {
    if (state.view !== 'timeline' && state.view !== 'unification' && state.view !== 'scale') {
      toast(t('exportHint') || '请先切到时间线/统一/尺度视图');
      setView('timeline', true);
      return;
    }
    const svgEl = document.getElementById('panorama');
    if (!svgEl) return;
    try {
      const clone = svgEl.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', svgEl.viewBox.baseVal.width);
      clone.setAttribute('height', svgEl.viewBox.baseVal.height);
      const xml = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const k = 2;
        const cv = document.createElement('canvas');
        cv.width = svgEl.viewBox.baseVal.width * k;
        cv.height = svgEl.viewBox.baseVal.height * k;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#F7F3EA';
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        const a = document.createElement('a');
        a.download = 'physics-panorama.png';
        a.href = cv.toDataURL('image/png');
        a.click();
        toast(t('exported') || '已导出 PNG');
      };
      img.onerror = () => toast('导出失败：SVG 渲染异常');
      img.src = url;
    } catch (err) {
      console.error('PNG 导出失败', err);
      toast('导出失败');
    }
  });
  document.getElementById('tour3').addEventListener('click', () => startTour('3min'));
  document.getElementById('tour10').addEventListener('click', () => startTour('10min'));
  window.addEventListener('pp:gotoNode', e => { setView('timeline', true); selectNode(e.detail); });
  // 仰望星空/探幽识微卡片「相关理论」chips 跳转：按理论名匹配时间线节点（尽力匹配，找不到静默）
  window.addEventListener('pp:gotoTheory', e => {
    const name = e.detail;
    if (!name) return;
    const n = NODES.find(x => x.name === name || (x.nameEn && x.nameEn.toLowerCase() === String(name).toLowerCase()));
    if (!n) return;
    setView('timeline', true);
    selectNode(n.id);
    if (!window.matchMedia('(max-width:768px)').matches) focusNode(n.id);
  });

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

  // 浏览器回退：优先恢复术语跳转前的节点与标签；否则按 URL 参数还原完整视图状态（跨视图历史）
  window.addEventListener('popstate', e => {
    const back = e.state?.ppBack;
    if (back) {
      state.termFocus = null;
      const nodeViews = new Set(['timeline', 'scale', 'unification']);
      if (!back.node || !byId.has(back.node) || !nodeViews.has(state.view)) {
        closeSidebar();
        state.selected = null;
        state.highlight = new Set();
        applyState();
        updateURL();
        return;
      }
      selectNode(back.node);
      if (back.tab) openSidebarTab(back.tab);
      return;
    }
    restoreStateFromURL();
  });

  // 按 URL 查询参数还原视图/筛选/选中节点（popstate 触发，不产生新历史）
  function restoreStateFromURL() {
    const p = new URLSearchParams(location.search);
    const v = p.get('view') || 'timeline';
    state.filterEra = p.get('era') || null;
    state.activeEra = state.filterEra;
    state.onlyCore = p.get('core') !== '0';
    document.getElementById('onlyCore').checked = state.onlyCore;
    if (p.get('vtab')) voidTab = p.get('vtab');
    reflectEraActive();
    setView(v, false);
    const node = p.get('node');
    if (node && byId.has(node)) {
      state.sidebarTab = p.get('tab') || null;
      state.termFocus = p.get('term') || null;
      selectNode(node);
      if (state.sidebarTab) openSidebarTab(state.sidebarTab);
      if (state.termFocus) focusTerm(state.termFocus);
    } else {
      state.selected = null;
      state.highlight = new Set();
      closeSidebar();
      applyState();
    }
  }

  // 侧边栏内部状态变化时同步 URL
  window.addEventListener('pp:updateURL', updateURL);

  // resize 防抖：窗口拖动时避免连续重建大型 SVG（思维导图/荣誉殿堂）
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      fit();
      if (state.view === 'void' && voidTab === 'mindmap') renderMindmap();
      if (state.view === 'void' && voidTab === 'honor') renderHonor();
    }, 200);
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
    // 显式管理 hidden：≤480px 显示卡片列表（CSS #mobileList{display:flex} 生效），
    // >480px 隐藏（配合 #mobileList[hidden]{display:none} 兜底，防止 display:flex 覆盖 hidden）
    mobileList.hidden = !isMobile;
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

// A.4 阅读路径激活态：反映路径 tab 的高亮（「全部」= 未筛选时高亮）
function reflectPathActive() {
  const id = activePathId();
  document.querySelectorAll('.path-tab').forEach(t => {
    const on = t.dataset.path === 'all' ? !state.pathIds : t.dataset.path === id;
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

// 虚无-图景子选项（意境 / 思维导图 / 仰望星空 / 探幽识微 / 荣誉殿堂）
let voidTab = 'poem';
const VOID_TABS = ['poem','mindmap','honor','sky','micro'];
// 理论·实验视图状态
let expEra = 'all';      // 纪元筛选
let expOpen = null;      // 当前打开的实验 id（URL 分享用）

// 纪元筛选 chips（全部 / 经典 / 相对论 / 量子 / 标准模型 / 前沿）
function buildExpTabs() {
  const wrap = document.getElementById('expTabs');
  if (!wrap) return;
  const en = state.lang === 'en';
  const chips = [{ id: 'all', name: en ? 'All' : '全部' }].concat(
    ERA_ORDER.map(e => ({ id: e, name: en ? ERAS[e].nameEn : ERAS[e].name }))
  );
  wrap.innerHTML = chips.map(c =>
    `<button class="exp-chip${expEra === c.id ? ' is-active' : ''}" data-era="${c.id}" type="button">${en ? c.name : c.name}</button>`
  ).join('');
  wrap.querySelectorAll('.exp-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      expEra = btn.dataset.era;
      wrap.querySelectorAll('.exp-chip').forEach(b => b.classList.toggle('is-active', b === btn));
      setExpEraFilter(expEra, document.getElementById('expGrid'), byId);
    });
  });
}
function activateVoidTab(v) {
  if (!VOID_TABS.includes(v)) v = 'poem';   // 旧链接 / 未知 vtab 回退默认
  document.querySelectorAll('.void-subtab').forEach(t => t.classList.toggle('is-active', t.dataset.void === v));
  const map = { poem:'voidPoem', mindmap:'voidMindmap', honor:'voidHonor', sky:'voidSky', micro:'voidMicro' };
  for (const key in map) { const el = document.getElementById(map[key]); if (el) el.hidden = (v !== key); }
  if (v !== 'honor') closeHonorPop();   // 离开荣誉殿堂时清理残留的获奖者简介 popover
  if (v === 'mindmap') renderMindmap();
  if (v === 'honor') renderHonor();
  if (v === 'sky') renderSky();
  if (v === 'micro') renderMicro();
}

// 思维导图全屏模式
let mindmapFs = false;
function toggleMindmapFullscreen() {
  mindmapFs = !mindmapFs;
  document.body.classList.toggle('mm-fs', mindmapFs);
  // 切换按钮文字
  const btn = document.getElementById('mmFullscreen');
  if (btn) btn.textContent = mindmapFs ? t('exitFullscreen') : t('fullscreen');
  // 浮动退出按钮（始终带 ✕ 前缀，独立悬浮按钮需要图标标识）
  const exitBtn = document.getElementById('mmExitFs');
  if (exitBtn) {
    const fsLabel = mindmapFs ? (t('exitFullscreen') || '退出全屏') : '退出全屏';
    exitBtn.textContent = '✕ ' + fsLabel;
  }
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
// push=true 时产生浏览器历史条目（可后退还原）；boot 首次调用与 popstate 还原传 false
function setView(v, push) {
  state.view = v;
  closeHonorPop();   // 切换任何视图时都清除残留的诺贝尔奖 popover（防止从荣誉殿堂切走后浮层残留在其他页）
  document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === v));
  const isPeople = v === 'people';
  const isVoid = v === 'void';
  const isGlossary = v === 'glossary';
  const isExp = v === 'experiments';
  document.body.classList.remove('view-timeline','view-unification','view-scale','view-people','view-void','view-glossary','view-experiments');
  document.body.classList.add(`view-${v}`);
  const stageEl = document.getElementById('stage');
  const pv = document.getElementById('peopleView');
  const vv = document.getElementById('voidView');
  const gv = document.getElementById('glossaryView');
  const ev = document.getElementById('experimentsView');
  const smb = document.getElementById('scaleMapBar');
  if (stageEl) stageEl.style.visibility = (isPeople || isVoid || isGlossary || isExp) ? 'hidden' : '';
  if (pv) pv.hidden = !isPeople;
  if (vv) vv.hidden = !isVoid;
  if (gv) gv.hidden = !isGlossary;
  if (ev) ev.hidden = !isExp;
  if (smb) smb.hidden = (v !== 'scale');
  const eraNav = document.getElementById('eraNav');
  if (eraNav) eraNav.style.display = (isVoid || isGlossary || isExp) ? 'none' : '';
  if (isExp) {
    closeSidebar();
    if (!document.getElementById('expTabs').children.length) buildExpTabs();
    renderExperiments(document.getElementById('expGrid'), byId);
    // 副标题动态计数（初始 boot 时 applyUILanguage 未跑，这里补一次）
    const expSub = document.querySelector('.exp-view__sub');
    if (expSub) expSub.textContent = t('expSubtitle', expCount());
  } else if (isPeople) {
    const pg = document.getElementById('peopleGrid');
    renderPeople(pg, [...PEOPLE_MAP.values()], onPickPerson);
    const ps = document.getElementById('peopleSearch');
    if (ps) { ps.oninput = () => filterPeopleGrid(ps.value); filterPeopleGrid(ps.value); }
    closeSidebar();
  } else if (isVoid) {
    closeSidebar();
    activateVoidTab(voidTab);
  } else if (isGlossary) {
    closeSidebar();
    renderGlossary();
  } else {
    renderCurrent(); fit();
    if (v === 'unification') renderUnifPanel();
  }
  updateURL(push ? 'push' : undefined);
}

// A.5 统一之路「统一程度」阶梯面板渲染（仅 view-unification 左侧列，零遮挡）
function renderUnifPanel() {
  const ladder = document.getElementById('unifLadder');
  if (!ladder) return;
  const steps = [
    { t: 'unifStepT1', d: 'unifStepD1' },
    { t: 'unifStepT2', d: 'unifStepD2' },
    { t: 'unifStepT3', d: 'unifStepD3' },
    { t: 'unifStepT4', d: 'unifStepD4' },
    { t: 'unifStepT5', d: 'unifStepD5' },
  ];
  ladder.innerHTML = steps.map((s, i) => {
    const lvl = i + 1;
    const cls = lvl <= 4 ? 'unif-step--filled' : 'unif-step--aspirational';
    return `<div class="unif-step ${cls}" style="--lvl:${lvl}">
      <span class="unif-step__num">${lvl}</span>
      <div class="unif-step__body">
        <div class="unif-step__title" data-i18n="${s.t}"></div>
        <div class="unif-step__desc" data-i18n="${s.d}"></div>
      </div>
    </div>`;
  }).join('');
  applyUILanguage();   // 立即填充 data-i18n 文本（语言切换时也会自动重跑）
}
function onPickPerson(name) {
  const p = PEOPLE_MAP.get(name);
  if (p) openPerson(name, p.nodeIds);
}

function updateURL(mode) {
  const p = new URLSearchParams();
  if (state.view !== 'timeline') p.set('view', state.view);
  if (state.view === 'void' && voidTab !== 'poem') p.set('vtab', voidTab);
  if (state.view === 'experiments' && expOpen) p.set('exp', expOpen);
  if (state.filterEra) p.set('era', state.filterEra);
  if (!state.onlyCore) p.set('core', '0');
  if (state.selected) p.set('node', state.selected);
  if (state.sidebarTab) p.set('tab', state.sidebarTab);
  if (state.termFocus) p.set('term', state.termFocus);
  const qs = p.toString();
  const targetQS = qs ? '?' + qs : '';
  if (location.search === targetQS) return;
  // mode='push' 用于跨视图切换（可后退）；默认 replace 用于节点/筛选等高频状态（避免历史堆栈膨胀）
  if (mode === 'push') history.pushState(null, '', targetQS || location.pathname);
  else history.replaceState(history.state, '', targetQS || location.pathname);
}
function readURL() {
  const p = new URLSearchParams(location.search);
  if (p.get('lang') === 'en') state.lang = 'en';
  // 首页强制从时间线开始：不再从 URL 恢复 view/vtab（2026-08-10 用户确认）。
  // 避免「打开带 ?view=void&vtab=sky 的历史链接/刷新」时直接跳到虚无图景子页。
  // 代价：分享带视图参数的链接打开后落回时间线（用户已接受）；node/tab/term 等内容定位参数仍生效。
  if (p.get('era')) state.filterEra = p.get('era');
  if (p.get('core') === '0') state.onlyCore = false;
  if (p.get('tab')) state.sidebarTab = p.get('tab');
  if (p.get('term')) state.termFocus = p.get('term');
  document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === state.view));
  state.activeEra = state.filterEra; // 激活态随筛选态恢复（刷新后保留高亮 + 综述）
  reflectEraActive();
  document.getElementById('onlyCore').checked = state.onlyCore;
  const expId = p.get('exp');
  if (expId) { const e = getExp(expId); if (e) expOpen = expId; }
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

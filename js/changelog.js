/* 更新日记：固定在页面左下角的低调浮层，默认只显示一个小圆点，
   点击/悬停才展开。纯静态脚本，不依赖 app.js 模块。 */
(function () {
  'use strict';

  // 更新日记数据（新 → 旧）。如需新增条目，在此数组头部插入即可。
  var LOG = [
    { date: '2026-07-27', title: '社区建议第一批落地', desc: '采纳社区建议的高性价比 5 项：尺度维度每个尺度加通俗认知提示；5 个主栏目加中英双语副标题；语言切换按钮显示 🌐 图标与当前语言（中文 / English 可一键回切）；首页顶部「最近更新」摘要；新增「关于本项目」独立页与页脚链接。' },
    { date: '2026-07-26', title: '思维导图全屏模式升级', desc: '全屏下画布精确铺满屏幕宽度（左右零边距）；工具栏内容居中；右上角新增「退出全屏」悬浮按钮，点击或按 ESC 均可退出。' },
    { date: '2026-07-26', title: '虚无·意境页诗文轮换', desc: '意境页新增左右两侧淡墨水印名句轮换展示，每首出现时短暂高亮加黑后淡回，增强沉浸层次感。' },
    { date: '2026-07-26', title: '英文模式全面修复', desc: '英文模式下 77 位物理学家改为显示英文名；信息面板空态、尺度标签、思维导图、导览等 31 处中文 UI 文案切换到英文；英文译名（含重音字符如 Lagrange、Boltzmann、Poincaré）审查通过。' },
    { date: '2026-07-25', title: '接入公共聚合门户', desc: 'physics-panorama 已收录进孪生宇宙（twinverse）门户、书签导航（bookmarks）与 psychscope 公共数据源，归类为「内容精选」；并修复了聚合页缺失项目的数据兼容，确保门户列表完整。' },
    { date: '2026-07-25', title: '尺度导航层打磨', desc: '尺度顺序修正为微观→宏观→宇观→统一→反哺；概念卡片结构化（定义/特征尺度/代表理论/典型现象 + 尺度间渗透）；尺度标签放大凸显。' },
    { date: '2026-07-25', title: '译名勘误', desc: '物理学家 Abhay Ashtekar 统一规范为「阿希提卡」（原"阿什特卡尔"为误译，全站 16 处已更正）。' },
    { date: '2026-07-25', title: '移动端访问引导', desc: '首页加载弹 2 秒「为更好浏览体验，请电脑网页端查看」提示；修复移动端弹窗右下角溢出（旧 Safari 不识 inset:0）。' },
    { date: '2026-07-25', title: '移动端适配补全', desc: '术语跳转角标、返回按钮、公式「应用拓展」在手机上更易用。' },
    { date: '2026-07-25', title: '术语互链 + 回退锚点', desc: '正文里的术语词可点击跳转到释义卡片，并支持一键返回跳转前的页面。' },
    { date: '2026-07-25', title: '新增「术语释义」维度', desc: '每个节点补充术语图文卡片：普朗克尺度、奇点、暗物质、暗能量、引力透镜等。' },
    { date: '2026-07-25', title: '公式「应用拓展」', desc: '每条公式新增实用场景按钮，如质能方程用于核电站、原子弹、PET 扫描。' },
    { date: '2026-07-22', title: '尺度维度升级', desc: '物理尺度认知导航层，结构化定义与尺度间渗透关系（涌现 / 引力桥梁 / 统一 / 反哺）。' },
    { date: '2026-07-21', title: '关系字段视觉区分', desc: '「继承自 / 影响至」标签改为浅灰小标签，与理论链接明确区分。' }
  ];

  var root = document.getElementById('changelog');
  if (!root) return;
  var list = document.getElementById('clList');
  var toggle = document.getElementById('clToggle');
  var panel = document.getElementById('clPanel');
  var closeBtn = document.getElementById('clClose');

  if (list) {
    list.innerHTML = LOG.map(function (e) {
      return '<div class="changelog__item">' +
        '<div class="changelog__date">' + e.date + '</div>' +
        '<div class="changelog__title">' + e.title + '</div>' +
        '<div class="changelog__desc">' + e.desc + '</div>' +
        '</div>';
    }).join('');
  }

  // 首页顶部「最近更新」摘要（取最新一条，单一数据源 = LOG[0]）
  var upd = document.getElementById('lastUpdate');
  if (upd && LOG.length) {
    upd.textContent = '最近更新：' + LOG[0].date + ' · ' + LOG[0].title;
  }

  function setOpen(v) {
    if (!panel || !toggle) return;
    panel.hidden = !v;
    toggle.classList.toggle('is-open', v);
    toggle.setAttribute('aria-expanded', String(v));
  }

  if (toggle && panel) {
    toggle.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setOpen(panel.hidden);
    });
    if (closeBtn) closeBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setOpen(false);
    });
    document.addEventListener('click', function (ev) {
      if (!root.contains(ev.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') setOpen(false);
    });
  }
})();

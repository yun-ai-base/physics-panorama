/* 更新日记：固定在页面左下角的低调浮层，默认只显示一个小圆点，
   点击/悬停才展开。纯静态脚本，不依赖 app.js 模块。 */
(function () {
  'use strict';

  // 更新日记数据（新 → 旧）。如需新增条目，在此数组头部插入即可。
  var LOG = [
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

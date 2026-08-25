/* 更新日记：固定在页面左下角的低调浮层，默认只显示一个小圆点，
   点击/悬停才展开。纯静态脚本，不依赖 app.js 模块。 */
(function () {
  'use strict';

  // 更新日记数据（新 → 旧）。如需新增条目，在此数组头部插入即可。
  var LOG = [
    { date: '2026-08-25', title: 'UI 质感升级', desc: '在既有「古籍金色 · 玻璃拟态」基调上整体提升优雅度：阴影改为双层柔和投影、新增金色渐变与发丝线等设计令牌；品牌标识金色渐变光晕；视图标签选中态金色渐变填充并微浮起，悬停轻抬升；纪元导航统一胶囊形并加色点光晕；时间线节点立体光晕与弹性缩放；搜索筛选 chips 悬停抬升。深浅两套主题同步升级，移动端布局零溢出。' },
    { date: '2026-08-10', title: '新增「暴胀理论」学说节点', desc: '时间线新增第 39 个学说「暴胀理论」（1981，古斯）：宇宙极早期约 10⁻³⁶ 秒的指数级膨胀，把量子涨落拉伸为今天宇宙结构的种子，同时解决平直性、视界、磁单极三大疑难；预言的原初扰动谱（nₛ≈0.965）已被 WMAP/Planck 证实。含完整双语内容、两条公式（慢滚近似与曲率扰动谱）、五个术语与深度解读十二维；仰望星空「大爆炸与暴胀」卡片的暴胀理论标签现可一键跳转到该节点。' },
    { date: '2026-08-08', title: '搜索筛选 · 深色主题 · 收藏与导出', desc: '顶部搜索下拉新增「全部 / 纪元 / 人物」筛选 chips，点击即过滤命中结果；顶栏新增 🌙 深色 / ☀ 浅色主题一键切换（本地记忆）；节点侧栏支持 ★ 收藏学说，底栏「☆ 收藏」面板集中管理与跳转；时间线 / 统一 / 尺度视图可一键导出 PNG 图片；侧栏新增前驱→当前→后继的迷你时间线导航条，点击直达相邻学说。' },
    { date: '2026-08-08', title: '阅读路径新增「全部」选项', desc: '顶栏阅读路径选择器新增「全部」（默认选中），点击即清除路径筛选、显示全部 38 个学说节点；其余四档路径（高中生 / 科普读者 / 大学生 / 物理系学生）照常按读者背景筛选。' },
    { date: '2026-08-08', title: '移动端体验优化', desc: '手机端首页新增提示「为了更好的浏览效果，请移步到PC端」（可关闭并记住，不打扰）；修复超小屏下时间线 / 统一之路 / 尺度维度视图画布空白问题，竖排学说卡片列表恢复正常显示。' },
    { date: '2026-08-08', title: '新增「荣誉殿堂」', desc: '虚无·图景页新增第三个子选项「荣誉殿堂」：以蛇形折绕的单向时间线串联 1901–2025 年全部 125 个年份节点（共 119 届颁奖）；点击任意节点即可查看该年获奖者及其获奖理论贡献，无奖年份明确标注，默认展示最新一届。支持按姓名 / 年份 / 获奖理由搜索、中英双语切换、一键跳转最早 / 最新一届、聚焦指定年份，详情面板可一键关闭。' },
    { date: '2026-08-08', title: '术语表新增「量子真空」「量子涨落」', desc: '补录两个量子场论核心概念词条（挂于 QED 节点）：量子真空——能量最低的量子场基态，并非空无一物，充满虚粒子对与零点能涨落；量子涨落——虚粒子对自发生灭的能量起伏，是兰姆移位、真空极化、卡西米尔效应的根源，也被视为宇宙暴胀原初涨落的种子。全站术语词条增至 140 条。' },
    { date: '2026-07-31', title: '移动端适配大改', desc: '针对手机端系统性重构：消除整页横向溢出（侧栏滑出不再撑宽页面）；全景图在窄屏降级为竖排学说卡片列表；顶栏视图标签改为横滑并加右侧渐变遮罩、搜索与语言按钮同行；纪元导航单行横滑；各子视图（意境/星空/荣誉/人物/术语表等）收紧留白；移除原先「请电脑网页端查看」的引导弹窗，移动端现可完整体验。' },
    { date: '2026-07-27', title: '社区建议第一批落地', desc: '采纳社区建议的高性价比 5 项：尺度维度每个尺度加通俗认知提示；5 个主栏目加中英双语副标题；语言切换按钮显示 🌐 图标与当前语言（中文 / English 可一键回切）；首页顶部「最近更新」摘要；新增「关于本项目」独立页与页脚链接。' },
    { date: '2026-07-26', title: '思维导图全屏模式升级', desc: '全屏下画布精确铺满屏幕宽度（左右零边距）；工具栏内容居中；右上角新增「退出全屏」悬浮按钮，点击或按 ESC 均可退出。' },
    { date: '2026-07-26', title: '虚无·意境页诗文轮换', desc: '意境页新增左右两侧淡墨水印名句轮换展示，每首出现时短暂高亮加黑后淡回，增强沉浸层次感。' },
    { date: '2026-07-26', title: '英文模式全面修复', desc: '英文模式下 77 位物理学家改为显示英文名；信息面板空态、尺度标签、思维导图、导览等 31 处中文 UI 文案切换到英文；英文译名（含重音字符如 Lagrange、Boltzmann、Poincaré）审查通过。' },
    { date: '2026-07-25', title: '接入公共聚合门户', desc: 'physics-panorama 已收录进孪生宇宙（twinverse）门户、书签导航（bookmarks）与 psychscope 公共数据源，归类为「内容精选」；并修复了聚合页缺失项目的数据兼容，确保门户列表完整。' },
    { date: '2026-07-25', title: '尺度导航层打磨', desc: '尺度顺序修正为微观→宏观→宇观→统一→反哺；概念卡片结构化（定义/特征尺度/代表理论/典型现象 + 尺度间渗透）；尺度标签放大凸显。' },
    { date: '2026-07-25', title: '译名勘误', desc: '物理学家 Abhay Ashtekar 统一规范为「阿希提卡」（原"阿什特卡尔"为误译，全站 16 处已更正）。' },
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

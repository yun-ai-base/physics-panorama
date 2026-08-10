// 引导式漫游（3 分钟概览 / 10 分钟全览 + 文字旁白）
// 设计原则：纯增量增强，复用既有接口，不改动任何已完成的模块逻辑。
//   · 聚焦节点      → 派发 window 事件 'pp:gotoNode'（app.js 已监听：切到时间线 + 高亮 + 开侧栏）
//   · 聚焦术语释义  → 直接调用 sidebar.js 导出的 focusTerm()
//   · 切换视图      → 点击顶部 .view-tab（与用户手动点击完全一致）
// 因此本文件不会触碰 state 之外的任何已有渲染/交互逻辑。

import { state } from './state.js?v=20260808u';
import { closeSidebar, focusTerm } from './sidebar.js?v=20260808u';
import { UI_LABELS } from './config.js?v=20260808u';

function t(key, ...args) {
  const v = UI_LABELS[state.lang]?.[key] ?? UI_LABELS.zh[key];
  return typeof v === 'function' ? v(...args) : v ?? key;
}

/* ── 复用既有的「聚焦节点」通道（零侵入） ─────────────── */
function gotoNode(id) {
  window.dispatchEvent(new CustomEvent('pp:gotoNode', { detail: id }));
}
function gotoView(v) {
  closeSidebar();
  document.querySelector(`.view-tab[data-view="${v}"]`)?.click();
}
function gotoNodeTerm(id, term) {
  gotoNode(id);
  focusTerm(term);
}

/* ── 漫游脚本 ───────────────────────────────────────────
 * step 字段：
 *   spot    要被聚光灯高亮的 CSS 选择器（必在视口内）；null = 居中气泡、无高亮
 *   title   卡片标题
 *   text    卡片正文（支持内联 HTML）
 *   onEnter 进入该步时执行的导航（复用既有通道）
 */
const TOURS = {
  '3min': [
    {
      spot: null,
      title: '欢迎来到《物理学全景图》',
      text: '这是一张把物理学 300+ 年的演化铺成一张可探索图谱的作品。下面用 3 分钟带你走完「经典 → 相对论 → 量子 → 标准模型」的主干。随时可按 <b>Esc</b> 或点「跳过」退出。',
      onEnter: () => closeSidebar(),
    },
    {
      spot: '.sb-head',
      title: '牛顿力学 · 一切的起点',
      text: '1687 年《自然哲学的数学原理》用三大定律与万有引力，第一次把天上的行星和地上的苹果统一进同一套方程。这就是图谱最左端红色标记的「地基型」节点。',
      onEnter: () => gotoNode('newton-mechanics'),
    },
    {
      spot: '.sb-head',
      title: '麦克斯韦电磁学 · 光就是电磁波',
      text: '19 世纪，麦克斯韦把电、磁、光写成一组方程，预言了电磁波的存在——后来赫兹用实验证实。今天的无线电、Wi-Fi、5G，根源都在这组方程里。',
      onEnter: () => gotoNode('maxwell-em'),
    },
    {
      spot: '.sb-head',
      title: '狭义相对论 · 时空观革命',
      text: '当电磁学与牛顿的绝对时空观冲突，爱因斯坦在 1905 年把「光速不变」当作公理，推导出时间会膨胀、长度会收缩，以及最著名的质能等价 E=mc²。',
      onEnter: () => gotoNode('special-relativity'),
    },
    {
      spot: '.sb-head',
      title: '普朗克量子假说 · 量子的第一声啼哭',
      text: '黑体辐射逼出了「能量必须一份份交换」的假设。这个小小的常数 h（普朗克常数）撬开了量子世界的大门。',
      onEnter: () => gotoNode('planck-quantum'),
    },
    {
      spot: '.sb-head',
      title: '量子力学 · 概率的宇宙',
      text: '薛定谔方程、不确定性原理、量子纠缠……20 年代建立的量子力学，至今仍是支撑芯片、激光、核磁共振的根基理论。',
      onEnter: () => gotoNode('quantum-mechanics'),
    },
    {
      spot: '.sb-head',
      title: '标准模型 · 粒子物理的集大成',
      text: '把电磁、弱、强三种相互作用收进同一个「规范场」框架，并借希格斯机制赋予粒子质量。这是人类目前最精确、经受住最多实验检验的理论之一。',
      onEnter: () => gotoNode('standard-model'),
    },
    {
      spot: null,
      title: '主干走完了，接下来交给你',
      text: '右侧（或左侧）侧栏里，每个节点都能展开 <b>脉络 / 公式 / 术语 / 人物 / 应用拓展</b> 等维度。试试顶部切换 <b>统一之路</b>、<b>尺度维度</b>、<b>人物索引</b> 视图，或在搜索框里搜「暗物质」「薛定谔」。',
      onEnter: () => closeSidebar(),
    },
  ],

  '10min': [
    {
      spot: null,
      title: '10 分钟全览 · 深度漫游',
      text: '这次我们放慢脚步，沿着时间线逐个点亮里程碑，并在关键处钻进「术语释义」和不同视图。同样可随时按 <b>Esc</b> 退出，或用 ← / → 翻页。',
      onEnter: () => closeSidebar(),
    },
    {
      spot: '.sb-head',
      title: '牛顿力学 · 机械宇宙观',
      text: '力、质量、加速度，再加上连接天地的万有引力——牛顿给出的是一幅「钟表式」的确定性宇宙。点开右侧术语卡里的 <b>万有引力</b>，看看这股力如何被精确量化。',
      onEnter: () => gotoNodeTerm('newton-mechanics', '万有引力'),
    },
    {
      spot: '.sb-head',
      title: '热力学 · 混沌与有序的度量',
      text: '蒸汽机时代催生了能量守恒与熵增定律。熵告诉我们：孤立系统的无序度只增不减。点开术语 <b>熵</b>，理解为什么「覆水难收」。',
      onEnter: () => gotoNodeTerm('thermodynamics', '熵'),
    },
    {
      spot: '.sb-head',
      title: '麦克斯韦电磁学 · 「场」的诞生',
      text: '电磁学最大的概念革命，是引入了「场」这种遍布空间的物理实在——它自己能携带能量、传播扰动。点开术语 <b>场</b>，体会这种新实在观。',
      onEnter: () => gotoNodeTerm('maxwell-em', '场'),
    },
    {
      spot: '.sb-head',
      title: '狭义相对论 · 两朵乌云之一',
      text: '19 世纪末，迈克尔逊-莫雷实验发现「以太风」并不存在，经典物理的确定性开始松动。爱因斯坦顺着光速不变，重建了时间观。点开术语 <b>时间膨胀</b>。',
      onEnter: () => gotoNodeTerm('special-relativity', '时间膨胀'),
    },
    {
      spot: '.sb-head',
      title: '广义相对论 · 时空会弯曲',
      text: '引力不再是神秘的超距作用，而是质量弯曲时空的几何效应。它预言了引力波、黑洞与宇宙膨胀。点开术语 <b>引力透镜</b>，看光线如何被大质量天体掰弯。',
      onEnter: () => gotoNodeTerm('general-relativity', '引力透镜'),
    },
    {
      spot: '.sb-head',
      title: '普朗克量子假说 · 离散的世界',
      text: '能量并非连续，而是以 hν 为最小单位的「量子」出现。这一假说拉开了量子革命序幕，也定义了我们衡量微观的标尺——普朗克尺度。',
      onEnter: () => gotoNode('planck-quantum'),
    },
    {
      spot: '.sb-head',
      title: '玻尔原子模型 · 不连续的轨道',
      text: '电子只能在特定的「能级」上运行，跃迁时吸收或放出一份光子。这是量子化第一次被用于原子结构，解释了光谱的离散谱线。',
      onEnter: () => gotoNode('bohr-model'),
    },
    {
      spot: '.sb-head',
      title: '量子力学 · 纠缠的幽灵',
      text: '两个粒子可以处于叠加态，测量一个会瞬间影响另一个——爱因斯坦称之为「鬼魅般的超距作用」。点开术语 <b>量子纠缠</b>，这是量子计算与量子通信的核心资源。',
      onEnter: () => gotoNodeTerm('quantum-mechanics', '量子纠缠'),
    },
    {
      spot: '.sb-head',
      title: '量子电动力学 QED · 最精确的理论',
      text: '用「重整化」把无穷大的发散项驯服，QED 把光与物质的相互作用算到小数点后十几位，与实验惊人吻合。点开术语 <b>重整化</b>。',
      onEnter: () => gotoNodeTerm('qed', '重整化'),
    },
    {
      spot: '.sb-head',
      title: '电弱统一理论 · 力可以合并',
      text: '在足够高的能量下，电磁力与弱核力会融合成同一种「电弱相互作用」。这是人类第一次成功地把两种看似不同的力统一起来。',
      onEnter: () => gotoNode('electroweak'),
    },
    {
      spot: '.sb-head',
      title: '标准模型 · 希格斯赋予质量',
      text: '电磁、弱、强三力 + 费米子，全部收进「规范场」框架。粒子之所以有质量，是因为穿过无处不在的希格斯场时产生了阻力。点开术语 <b>希格斯机制</b>。',
      onEnter: () => gotoNodeTerm('standard-model', '希格斯机制'),
    },
    {
      spot: '.view-tab[data-view="scale"]',
      title: '尺度维度视图 · 从微观到宇观',
      text: '切换到了「尺度维度」视图：微观、宏观、宇观、统一、反哺，五层尺度环环相扣。顶部的关联图揭示了尺度之间如何互相渗透——比如宏观的引力，是大尺度时空弯曲的桥梁。',
      onEnter: () => gotoView('scale'),
    },
    {
      spot: '.sb-head',
      title: '宇宙学标准模型 ΛCDM · 看不见的九成',
      text: '我们熟悉的原子物质，只占宇宙总质能的约 5%。剩下的是暗物质与暗能量。点开术语 <b>暗物质</b>，看它如何用引力塑造了星系。',
      onEnter: () => gotoNodeTerm('lcdm', '暗物质'),
    },
    {
      spot: '.sb-head',
      title: '暗物质 / 暗能量 · 前沿未解之谜',
      text: '我们至今不知道暗物质粒子到底是什么——热门候选包括 WIMP 与轴子。点开术语 <b>WIMP</b>，了解正在地下实验室里守株待兔的探测实验。',
      onEnter: () => gotoNodeTerm('dark-matter-energy', 'WIMP'),
    },
    {
      spot: '.sb-head',
      title: '弦理论 / M 理论 · 统一的梦想',
      text: '把粒子看作振动的一维「弦」，并在时空中加入额外维度，试图把引力也纳入量子框架、实现万有理论。点开术语 <b>额外维度</b>，看我们熟悉的空间为何可能不止三维。',
      onEnter: () => gotoNodeTerm('string-theory', '额外维度'),
    },
    {
      spot: '.sb-head',
      title: '量子信息 / 量子计算 · 走向应用',
      text: '不再只是解释自然，而是主动造机器：用叠加与纠缠做并行计算、用纠缠做不可破译的通信。这是物理学从「认识世界」走向「重塑世界」的前沿。',
      onEnter: () => gotoNode('quantum-computing'),
    },
    {
      spot: '.view-tab[data-view="unification"]',
      title: '统一之路视图 · 收束的线索',
      text: '切换到了「统一之路」视图：它把各学说按「继承 → 影响」的关系串成一条演化主线，让你直观看到物理学如何一步步走向大统一的理论梦想。',
      onEnter: () => gotoView('unification'),
    },
    {
      spot: null,
      title: '漫游结束 · 去亲手探索吧',
      text: '你已经走完了物理学的核心脉络。现在随意点击任意节点深入，切换四个视图，或用搜索框检索「E=mc²」「量子纠缠」「暗物质」。这张图谱值得慢慢逛。',
      onEnter: () => closeSidebar(),
    },
  ],
};

/* ── 运行时状态 ─────────────────────────────────────── */
let cur = null;                 // { steps, idx, kind }
let overlay, spot, card;
let keyHandler, resizeHandler;

function buildDom() {
  overlay = document.createElement('div');
  overlay.className = 'pp-tour-overlay';
  spot = document.createElement('div');
  spot.className = 'pp-tour-spot';
  card = document.createElement('div');
  card.className = 'pp-tour-card';
  overlay.append(spot, card);
  document.body.appendChild(overlay);
}

function placeSpot(sel) {
  if (!sel) {
    spot.style.display = 'none';
    card.style.left = '50%';
    card.style.right = '';
    card.style.transform = 'translate(-50%, -50%)';
    return;
  }
  const el = document.querySelector(sel);
  if (!el) {
    spot.style.display = 'none';
    card.style.left = '50%';
    card.style.right = '';
    card.style.transform = 'translate(-50%, -50%)';
    return;
  }
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) {
    spot.style.display = 'none';
    card.style.left = '50%';
    card.style.right = '';
    card.style.transform = 'translate(-50%, -50%)';
    return;
  }
  const pad = 10;
  spot.style.display = 'block';
  spot.style.left = (r.left - pad) + 'px';
  spot.style.top = (r.top - pad) + 'px';
  spot.style.width = (r.width + pad * 2) + 'px';
  spot.style.height = (r.height + pad * 2) + 'px';

  // 气泡位置：目标在视口右半 → 气泡靠左；否则靠右，避免遮挡聚光灯
  const vw = window.innerWidth;
  card.style.transform = 'translateY(-50%)';
  if (r.left > vw * 0.5) {
    card.style.right = '';
    card.style.left = '24px';
  } else {
    card.style.left = '';
    card.style.right = '24px';
  }
}

function render() {
  const steps = cur.steps;
  const i = cur.idx;
  const s = steps[i];
  const kicker = t(cur.kind === '3min' ? 'tour3min' : 'tour10min');

  // 先执行本步导航（同步触发既有通道）
  if (s.onEnter) s.onEnter();

  card.innerHTML = `
    <div class="pp-tour-card__kicker">${kicker} · ${t('tourStep', i + 1, steps.length)}</div>
    <h3 class="pp-tour-card__title">${s.title}</h3>
    <div class="pp-tour-card__body">${s.text}</div>
    <div class="pp-tour-card__foot">
      <button class="pp-tour-btn pp-tour-btn--ghost" data-act="skip" type="button">${t('tourSkip')}</button>
      <div class="pp-tour-card__nav">
        ${i > 0 ? `<button class="pp-tour-btn pp-tour-btn--ghost" data-act="prev" type="button">${state.lang === 'en' ? 'Prev' : '上一步'}</button>` : ''}
        <button class="pp-tour-btn pp-tour-btn--primary" data-act="next" type="button">${i < steps.length - 1 ? t('tourNext') : t('tourFinish')}</button>
      </div>
    </div>`;

  card.querySelectorAll('[data-act]').forEach(b => {
    b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'skip') end();
      else if (a === 'prev') { cur.idx--; render(); }
      else if (a === 'next') {
        if (cur.idx < cur.steps.length - 1) { cur.idx++; render(); }
        else end();
      }
    });
  });

  // 双 rAF：确保 onEnter 触发的侧栏/视图渲染已落到 DOM，再定位聚光灯
  requestAnimationFrame(() => requestAnimationFrame(() => placeSpot(s.spot)));
}

function start(kind) {
  const steps = TOURS[kind];
  if (!steps) return;
  if (cur) end(true);            // 已在跑则先静默清理
  cur = { steps, idx: 0, kind };
  state.tour = kind;
  buildDom();

  keyHandler = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); end(); }
    else if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (cur.idx < cur.steps.length - 1) { cur.idx++; render(); } else end();
    } else if (e.key === 'ArrowLeft') {
      if (cur.idx > 0) { cur.idx--; render(); }
    }
  };
  resizeHandler = () => { if (cur) placeSpot(cur.steps[cur.idx].spot); };

  window.addEventListener('keydown', keyHandler);
  window.addEventListener('resize', resizeHandler);
  render();
}

function end(silent) {
  if (!cur && !overlay) return;
  if (keyHandler) window.removeEventListener('keydown', keyHandler);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  overlay?.remove();
  overlay = spot = card = null;
  keyHandler = resizeHandler = null;
  state.tour = null;
  cur = null;
}

export function startTour(kind) {
  start(kind);
}

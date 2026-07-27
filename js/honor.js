// 荣誉殿堂：诺贝尔物理学奖蛇形时间线
// 数据来源 js/data/nobel-physics.js（1901–2025 英文官方原文）
// 中文补充：js/data/nobel-physics-zh.js（中文字段，按年份索引）
import { NOBEL_PHYSICS } from './data/nobel-physics.js';
import { NOBEL_PHYSICS_ZH } from './data/nobel-physics-zh.js';
import { state } from './state.js';

const NS = 'http://www.w3.org/2000/svg';

/* ── 跟随式悬浮面罩（popover）────────────────────────────── */
let popEl = null;
let popBody = null;
let popCur = null;
let hoverTimer = null;

function ensurePop() {
  if (popEl) return popEl;
  popEl = document.createElement('div');
  popEl.className = 'honor-pop';
  popEl.setAttribute('role', 'tooltip');
  popBody = document.createElement('div');
  popBody.className = 'honor-pop__body';
  popEl.appendChild(popBody);
  document.body.appendChild(popEl);
  return popEl;
}

// 按当前语言生成内容
function popContent(d) {
  const zh = NOBEL_PHYSICS_ZH[d.year];
  const en = state.lang === 'en';
  const names = en
    ? d.names
    : (zh && zh.namesZh && zh.namesZh.length ? zh.namesZh : d.names);
  const mot = en
    ? d.motivation
    : (zh && zh.motivationZh ? zh.motivationZh : d.motivation);

  let html = `<div class="honor-pop__year">${d.year}</div>`;
  if (!d.names || d.names.length === 0) {
    const none = en
      ? 'No prize awarded this year'
      : (zh && zh.motivationZh ? zh.motivationZh : '本年未颁奖');
    html += `<div class="honor-pop__none">${none}</div>`;
  } else {
    html += names.map(nm => `<div class="honor-pop__name">${nm}</div>`).join('');
    html += `<div class="honor-pop__count">本屆共 ${names.length} 位获奖者</div>`;
    html += `<div class="honor-pop__mot">${mot}</div>`;
    // 中文模式下附英文官方原文
    if (!en && d.motivation) {
      html += `<div class="honor-pop__orig"><span class="honor-pop__orig-label">English</span>${d.motivation}</div>`;
    }
  }
  return html;
}

function showPop(d, nodeEl) {
  const el = ensurePop();
  popCur = d;
  popBody.innerHTML = popContent(d);
  el.hidden = false;
  positionPop(nodeEl);
  requestAnimationFrame(() => el.classList.add('is-visible'));
}

function hidePop() {
  if (!popEl) return;
  popEl.classList.remove('is-visible');
  popCur = null;
  setTimeout(() => {
    if (!popEl.classList.contains('is-visible')) popEl.hidden = true;
  }, 150);
}

function positionPop(nodeEl) {
  if (!popEl || !nodeEl) return;
  const rect = nodeEl.getBoundingClientRect();
  const W = popEl.offsetWidth || 300;   // CSS max-width 约束
  const H = popEl.offsetHeight || 120;

  // 默认：节点右下方弹出
  let left = rect.right + 12;
  let top = rect.top - 8;

  // 右边界：超出则翻到左侧
  if (left + W > window.innerWidth - 16) {
    left = rect.left - W - 12;
  }
  // 上边界：顶部不够则翻到下方
  if (top < 8) {
    top = rect.bottom + 8;
  }
  // 下边界：底部不够则上移
  if (top + H > window.innerHeight - 16) {
    top = window.innerHeight - H - 16;
  }

  popEl.style.left = Math.max(8, left) + 'px';
  popEl.style.top = Math.max(8, top) + 'px';
}

// 切换语言时刷新当前面罩内容
export function refreshHonorLang() {
  if (popEl && popCur && !popEl.hidden) {
    popBody.innerHTML = popContent(popCur);
  }
}

export function renderHonor() {
  const host = document.getElementById('honorTimeline');
  if (!host) return;
  const data = NOBEL_PHYSICS;
  const n = data.length;

  host.innerHTML = '';

  // 可用宽度：优先元素宽度，否则按视口估算（兼容隐藏父级场景下 clientWidth=0）
  const avail = (host.clientWidth > 240)
    ? host.clientWidth
    : Math.max(320, Math.min(window.innerWidth - 60, 1400));

  const colW = 92;      // 同列水平间距
  const rowH = 120;     // 行间距
  const padX = 46;
  const padY = 46;
  const nodeR = 15;

  let perRow = Math.max(6, Math.min(14, Math.floor((avail - 2 * padX) / colW)));
  const rows = Math.ceil(n / perRow);

  // 蛇形坐标：偶数行正序，奇数行倒序
  const pos = data.map((d, i) => {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    const cc = (r % 2 === 0) ? c : (perRow - 1 - c);
    return { x: padX + cc * colW, y: padY + r * rowH, r, c, idx: i };
  });

  const svgW = padX * 2 + (perRow - 1) * colW;
  const svgH = padY * 2 + (rows - 1) * rowH;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', svgW);
  svg.setAttribute('height', svgH);
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
  svg.setAttribute('class', 'honor-svg');

  // 连线（单向时间线，蛇形折绕）
  for (let i = 0; i < n - 1; i++) {
    const a = pos[i], b = pos[i + 1];
    let d;
    if (a.r === b.r) {
      d = `M${a.x},${a.y} L${b.x},${b.y}`;
    } else {
      const aEndX = (a.r % 2 === 0) ? padX + (perRow - 1) * colW : padX;
      const bStartX = (b.r % 2 === 0) ? padX : padX + (perRow - 1) * colW;
      d = `M${a.x},${a.y} L${aEndX},${a.y} L${aEndX},${b.y} L${bStartX},${b.y} L${b.x},${b.y}`;
    }
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'honor-link');
    svg.appendChild(path);
  }

  // 节点
  data.forEach((d, i) => {
    const p = pos[i];
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'honor-node' + (d.names && d.names.length ? '' : ' honor-node--none'));
    g.setAttribute('data-idx', i);
    g.setAttribute('transform', `translate(${p.x},${p.y})`);
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    const zhName = (NOBEL_PHYSICS_ZH[d.year] && NOBEL_PHYSICS_ZH[d.year].namesZh) || d.names;
    g.setAttribute('aria-label', `${d.year} ${(zhName && zhName.length) ? zhName.join('、') : '未颁奖'}`);

    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('r', nodeR);
    circle.setAttribute('class', 'honor-dot');
    g.appendChild(circle);

    // 圆内居中显示当年获奖人数（仅实际有颁奖的年份）
    if (d.names && d.names.length) {
      const cnt = document.createElementNS(NS, 'text');
      cnt.setAttribute('class', 'honor-count');
      cnt.setAttribute('text-anchor', 'middle');
      cnt.setAttribute('y', 4.5);            // 视觉垂直居中（基线微调）
      cnt.textContent = String(d.names.length);
      g.appendChild(cnt);
    }

    const t = document.createElementNS(NS, 'text');
    t.setAttribute('y', nodeR + 16);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'honor-year');
    t.textContent = d.year;
    g.appendChild(t);

    // 桌面：悬停显示；点击 toggle；移动端点击亦可
    g.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => showPop(d, g), 100);
    });
    g.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => { if (popCur === d) hidePop(); }, 180);
    });
    g.addEventListener('click', e => {
      e.stopPropagation();
      clearTimeout(hoverTimer);
      if (popCur === d && popEl && !popEl.hidden) hidePop();
      else showPop(d, g);
    });
    g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPop(d, g); }
    });
    svg.appendChild(g);
  });

  host.appendChild(svg);

  const meta = document.getElementById('honorMeta');
  if (meta) {
    const awarded = data.filter(d => d.names && d.names.length).length;
    meta.textContent = `1901–${data[n - 1].year} · 共 ${awarded} 届颁奖`;
    // 图例：说明圆点内数字 = 当年获奖人数（仅在未添加时插入，避免重复渲染叠加）
    if (!meta.parentElement.querySelector('.honor-legend')) {
      const legend = document.createElement('span');
      legend.className = 'honor-legend';
      legend.textContent = '· 圆点内的数字 = 当年获奖人数';
      meta.insertAdjacentElement('afterend', legend);
    }
  }
}

// 容器横向滚动到底部以查看最早一届（蛇形末端在最下方）
export function scrollHonorToTop() {
  const host = document.getElementById('honorTimeline');
  if (host) host.scrollTop = 0;
}

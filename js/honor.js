// 荣誉殿堂：诺贝尔物理学奖蛇形时间线
// 数据来源 js/data/nobel-physics.js（1901–2025 英文官方原文）
// 中文补充：js/data/nobel-physics-zh.js（中文字段，按年份索引）
import { NOBEL_PHYSICS } from './data/nobel-physics.js';
import { NOBEL_PHYSICS_ZH } from './data/nobel-physics-zh.js';
import { state } from './state.js';

const NS = 'http://www.w3.org/2000/svg';

/* ── 独立介绍面板层（右侧滑出 / 移动端底部抽屉）────────────── */
let panelEl = null;
let panelBody = null;
let panelCur = null;      // 当前展示的节点数据
let hoverTimer = null;

function ensurePanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement('aside');
  panelEl.className = 'honor-panel';
  panelEl.setAttribute('role', 'dialog');
  panelEl.setAttribute('aria-label', '诺贝尔物理学奖介绍');

  const close = document.createElement('button');
  close.className = 'honor-panel__close';
  close.type = 'button';
  close.setAttribute('aria-label', '关闭');
  close.textContent = '×';
  close.addEventListener('click', hidePanel);
  panelEl.appendChild(close);

  panelBody = document.createElement('div');
  panelBody.className = 'honor-panel__body';
  panelEl.appendChild(panelBody);

  document.body.appendChild(panelEl);
  return panelEl;
}

// 按当前语言生成面板内容（中文模式附英文原文作参考）
function panelContent(d) {
  const zh = NOBEL_PHYSICS_ZH[d.year];
  const en = state.lang === 'en';
  const names = en
    ? d.names
    : (zh && zh.namesZh && zh.namesZh.length ? zh.namesZh : d.names);
  const mot = en
    ? d.motivation
    : (zh && zh.motivationZh ? zh.motivationZh : d.motivation);

  let html = `<div class="honor-panel__year">${d.year}</div>`;
  if (!d.names || d.names.length === 0) {
    const none = en
      ? 'No prize awarded this year'
      : (zh && zh.motivationZh ? zh.motivationZh : '本年未颁奖');
    html += `<div class="honor-panel__none">${none}</div>`;
  } else {
    html += names.map(nm => `<div class="honor-panel__name">${nm}</div>`).join('');
    html += `<div class="honor-panel__mot">${mot}</div>`;
    // 中文模式下附英文官方原文（文献资料保留英文）
    if (!en && d.motivation) {
      html += `<div class="honor-panel__orig"><span class="honor-panel__orig-label">英文原文</span>${d.motivation}</div>`;
    }
  }
  return html;
}

function showPanel(d) {
  const el = ensurePanel();
  panelCur = d;
  panelBody.innerHTML = panelContent(d);
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-open'));
}

function hidePanel() {
  if (!panelEl) return;
  panelEl.classList.remove('is-open');
  panelCur = null;
  setTimeout(() => {
    if (!panelEl.classList.contains('is-open')) panelEl.hidden = true;
  }, 200);
}

// 切换语言时刷新当前面板内容（applyLang 调用）
export function refreshHonorLang() {
  if (panelEl && panelCur && !panelEl.hidden) {
    panelBody.innerHTML = panelContent(panelCur);
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
      // 同行：直接水平
      d = `M${a.x},${a.y} L${b.x},${b.y}`;
    } else {
      // 折返：本行末端 → 垂直下行 → 下一行始端 → 水平到目标
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

    const t = document.createElementNS(NS, 'text');
    t.setAttribute('y', nodeR + 16);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'honor-year');
    t.textContent = d.year;
    g.appendChild(t);

    // 桌面：悬停（轻微延迟防抖）显示；点击切换；移动端点击亦可
    g.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => showPanel(d), 120);
    });
    g.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => { if (panelCur === d) hidePanel(); }, 220);
    });
    g.addEventListener('click', e => {
      e.stopPropagation();
      clearTimeout(hoverTimer);
      if (panelCur === d && panelEl && !panelEl.hidden) hidePanel();
      else showPanel(d);
    });
    g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPanel(d); }
    });
    svg.appendChild(g);
  });

  host.appendChild(svg);

  const meta = document.getElementById('honorMeta');
  if (meta) {
    const awarded = data.filter(d => d.names && d.names.length).length;
    meta.textContent = `1901–${data[n - 1].year} · 共 ${awarded} 届颁奖`;
  }
}

// 容器横向滚动到底部以查看最早一届（蛇形末端在最下方）
export function scrollHonorToTop() {
  const host = document.getElementById('honorTimeline');
  if (host) host.scrollTop = 0;
}

// 荣誉殿堂：诺贝尔物理学奖蛇形时间线
// 数据来源 js/data/nobel-physics.js（1901–2025 完整列表）
import { NOBEL_PHYSICS } from './data/nobel-physics.js';

const NS = 'http://www.w3.org/2000/svg';
let selectedIdx = -1;

function showDetail(d, idx) {
  const el = document.getElementById('honorDetail');
  if (!el) return;
  el.hidden = false;
  if (selectedIdx >= 0) {
    const prev = document.querySelector('.honor-node.is-selected');
    if (prev) prev.classList.remove('is-selected');
  }
  selectedIdx = idx;
  const cur = document.querySelector(`.honor-node[data-idx="${idx}"]`);
  if (cur) cur.classList.add('is-selected');

  if (!d.names || d.names.length === 0) {
    el.innerHTML =
      `<div class="honor-detail__year">${d.year}</div>` +
      `<div class="honor-detail__none">本年未颁奖</div>`;
    return;
  }
  el.innerHTML =
    `<div class="honor-detail__year">${d.year}</div>` +
    d.names.map(nm => `<div class="honor-detail__name">${nm}</div>`).join('') +
    `<div class="honor-detail__mot">${d.motivation}</div>`;
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
    g.setAttribute('aria-label', `${d.year} ${d.names && d.names.length ? d.names.join('、') : '未颁奖'}`);

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

    const onShow = () => showDetail(d, i);
    g.addEventListener('click', onShow);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onShow(); } });
    svg.appendChild(g);
  });

  host.appendChild(svg);

  // 默认展示最新一届
  showDetail(data[n - 1], n - 1);

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

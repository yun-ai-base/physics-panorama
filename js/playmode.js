// 时间线播放模式：按年份平滑推进镜头，节点经过时脉冲高亮。
// 纯增量增强，复用 interaction.setTransform() 与 state，不改动任何既有渲染/交互逻辑。
import { state } from './state.js';
import { setTransform } from './interaction.js';
import { getPOS, getNodes } from './renderer.js';

/* ── 年份归一化：把混合格式的 year 转成可比较的数值 ──
 * 1687        → 1687
 * "1870s"     → 1875（年代中点）
 * "1788-1833" → 1810.5（生卒中点）
 * 其余取首个 4 位年份，无法解析返回 NaN（不进入播放序列）
 */
function parseYear(y) {
  if (typeof y === 'number' && !isNaN(y)) return y;
  if (typeof y !== 'string') return NaN;
  let m;
  if ((m = y.match(/^(\d{3,4})\s*s$/i))) return parseInt(m[1], 10) + 5;
  if ((m = y.match(/^(\d{3,4})\s*[-–—]\s*(\d{3,4})/))) return (parseInt(m[1], 10) + parseInt(m[2], 10)) / 2;
  if ((m = y.match(/\d{3,4}/))) return parseInt(m[0], 10);
  return NaN;
}

const DURATION = 42000;   // 走完全程约 42s（可按需调整）
const SCALE_T = 1.14;     // 播放时镜头放大系数，突出当前年代
const NEAR = 9;           // 年份接近阈值（年）：用于节点脉冲触发

let seq = [];             // [{id, y, pos:{x,y}}] 按年份升序
let minY = 0, maxY = 2000;
let bar, playBtn, track, fill, head, yearLbl, ticksEl;
let playing = false, raf = 0, lastT = 0, progress = 0, lastPulsed = null;

export function initPlayMode() {
  const pos = getPOS();
  const nodes = getNodes();
  seq = [];
  for (const n of nodes) {
    const yr = parseYear(n.year);
    if (!isNaN(yr) && pos[n.id]) seq.push({ id: n.id, y: yr, pos: pos[n.id] });
  }
  if (seq.length < 2) return;          // 数据不足则静默不启用
  seq.sort((a, b) => a.y - b.y);
  minY = seq[0].y; maxY = seq[seq.length - 1].y;
  if (maxY - minY < 1) return;

  buildDom();
  wireViewSwitch();
  if (state.view === 'timeline') showBar();
}

function buildDom() {
  bar = document.createElement('div');
  bar.className = 'tl-playbar';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = `
    <button class="tl-play__btn" type="button" aria-label="播放时间线演变">▶</button>
    <div class="tl-play__main">
      <div class="tl-play__year">${Math.round(minY)}</div>
      <div class="tl-play__track" role="presentation">
        <div class="tl-play__fill"></div>
        <div class="tl-play__ticks"></div>
        <div class="tl-play__head" role="slider" tabindex="0"
             aria-label="时间线播放进度" aria-valuemin="${Math.round(minY)}"
             aria-valuemax="${Math.round(maxY)}" aria-valuenow="${Math.round(minY)}"></div>
      </div>
    </div>`;
  document.body.appendChild(bar);

  playBtn = bar.querySelector('.tl-play__btn');
  track = bar.querySelector('.tl-play__track');
  fill = bar.querySelector('.tl-play__fill');
  head = bar.querySelector('.tl-play__head');
  yearLbl = bar.querySelector('.tl-play__year');
  ticksEl = bar.querySelector('.tl-play__ticks');

  buildTicks();

  playBtn.addEventListener('click', togglePlay);
  head.addEventListener('pointerdown', onHeadDown);
  track.addEventListener('pointerdown', e => {
    if (e.target === head) return;
    seekToClientX(e.clientX);
  });
  head.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const stepY = (maxY - minY) / 100;
      const Y = minY + (maxY - minY) * progress + (e.key === 'ArrowRight' ? stepY : -stepY);
      setProgress(clamp01((Y - minY) / (maxY - minY)));
    }
  });

  // 播放中用户一旦手动平移/缩放即停止，把镜头交还本人
  const svg = document.getElementById('panorama');
  if (svg) {
    svg.addEventListener('pointerdown', () => { if (playing) stop(); });
    svg.addEventListener('wheel', () => { if (playing) stop(); }, { passive: true });
  }
}

function buildTicks() {
  let lastTick = -1e9;
  const step = Math.max(20, Math.round((maxY - minY) / 14));
  let html = '';
  for (const s of seq) {
    if (s.y - lastTick >= step) {
      const pct = ((s.y - minY) / (maxY - minY)) * 100;
      html += `<span class="tl-tick" style="left:${pct.toFixed(2)}%"></span>`;
      if (s.y - lastTick >= step * 1.6) {
        html += `<span class="tl-tick__lbl" style="left:${pct.toFixed(2)}%">${Math.round(s.y)}</span>`;
      }
      lastTick = s.y;
    }
  }
  ticksEl.innerHTML = html;
}

function wireViewSwitch() {
  document.querySelectorAll('.view-tab').forEach(t => {
    t.addEventListener('click', () => {
      if (t.dataset.view === 'timeline') showBar(); else hideBar();
    });
  });
}

function showBar() {
  if (!bar) return;
  bar.classList.add('is-show');
  bar.setAttribute('aria-hidden', 'false');
}
function hideBar() {
  if (!bar) return;
  bar.classList.remove('is-show');
  bar.setAttribute('aria-hidden', 'true');
  if (playing) stop();
}

function togglePlay() { playing ? stop() : start(); }

function start() {
  if (playing) return;
  if (progress >= 1) progress = 0;          // 已到末尾则从头
  playing = true;
  lastT = 0;
  playBtn.textContent = '⏸';
  playBtn.setAttribute('aria-label', '暂停播放');
  raf = requestAnimationFrame(frame);
}
function stop(ended) {
  playing = false;
  cancelAnimationFrame(raf);
  playBtn.textContent = '▶';
  playBtn.setAttribute('aria-label', '播放时间线演变');
  if (ended) pulseClear();
}

function frame(t) {
  if (!playing) return;
  if (!lastT) lastT = t;
  const dt = t - lastT; lastT = t;
  progress += dt / DURATION;
  if (progress >= 1) { progress = 1; applyProgress(); stop(true); return; }
  applyProgress();
  raf = requestAnimationFrame(frame);
}

function setProgress(p) {
  progress = clamp01(p);
  applyProgress();
}

function applyProgress() {
  const Y = minY + (maxY - minY) * progress;
  const p = lerpSeq(Y);
  const svg = document.getElementById('panorama');
  const W = svg ? svg.clientWidth : window.innerWidth;
  const H = svg ? svg.clientHeight : window.innerHeight;
  state.scale = SCALE_T;
  state.tx = W / 2 - p.x * SCALE_T;
  state.ty = H / 2 - p.y * SCALE_T;
  setTransform();

  head.style.left = (progress * 100) + '%';
  fill.style.width = (progress * 100) + '%';
  yearLbl.textContent = Math.round(Y);
  head.setAttribute('aria-valuenow', Math.round(Y));
  pulseNear(Y);
}

// 按当前年份在排序序列中插值出镜头目标坐标（x、y 均线性插值）
function lerpSeq(Y) {
  if (Y <= seq[0].y) return seq[0].pos;
  if (Y >= seq[seq.length - 1].y) return seq[seq.length - 1].pos;
  for (let i = 0; i < seq.length - 1; i++) {
    const a = seq[i], b = seq[i + 1];
    if (Y >= a.y && Y <= b.y) {
      const t = (b.y - a.y) ? (Y - a.y) / (b.y - a.y) : 0;
      return { x: a.pos.x + (b.pos.x - a.pos.x) * t, y: a.pos.y + (b.pos.y - a.pos.y) * t };
    }
  }
  return seq[seq.length - 1].pos;
}

function pulseNear(Y) {
  let near = null, best = NEAR;
  for (const s of seq) {
    const d = Math.abs(s.y - Y);
    if (d < best) { best = d; near = s.id; }
  }
  if (near === lastPulsed) return;
  pulseClear();
  if (near) {
    const g = document.querySelector(`.node[data-id="${near}"]`);
    if (g) g.classList.add('is-pulse');
  }
  lastPulsed = near;
}
function pulseClear() {
  if (lastPulsed) {
    const g = document.querySelector(`.node[data-id="${lastPulsed}"]`);
    if (g) g.classList.remove('is-pulse');
  }
  lastPulsed = null;
}

function onHeadDown(e) {
  if (playing) stop();                     // 拖动即暂停
  e.preventDefault();
  head.setPointerCapture?.(e.pointerId);
  const move = ev => seekToClientX(ev.clientX);
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  seekToClientX(e.clientX);
}
function seekToClientX(cx) {
  const r = track.getBoundingClientRect();
  setProgress(clamp01((cx - r.left) / r.width));
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

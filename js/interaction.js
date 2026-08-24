import { state } from './state.js?v=20260808w';

let svg, vp;
let dragged = false;

export function initInteraction() {
  svg = document.getElementById('panorama');
  vp = document.getElementById('viewport');
  setTransform();

  // 鼠标 / 触摸共用状态
  let panning = false, sx = 0, sy = 0, ox = 0, oy = 0;
  let pinch = null; // { startDist, startScale, startCx, startCy, startTx, startTy }

  // ── 鼠标拖拽 ──
  svg.addEventListener('mousedown', e => {
    if (e.target.closest('.node') || e.target.closest('.preface')) return;
    panning = true; dragged = false; sx = e.clientX; sy = e.clientY; ox = state.tx; oy = state.ty;
    svg.classList.add('is-panning');
  });
  window.addEventListener('mousemove', e => {
    if (!panning) return;
    if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 4) dragged = true;
    state.tx = ox + (e.clientX - sx); state.ty = oy + (e.clientY - sy); setTransform();
  });
  window.addEventListener('mouseup', () => { panning = false; svg.classList.remove('is-panning'); });

  // ── 触摸：单指平移 + 双指捏合缩放 ──
  svg.addEventListener('touchstart', e => {
    if (e.target.closest('.node') || e.target.closest('.preface')) return;

    if (e.touches.length === 1) {
      // 单指：开始平移
      const t = e.touches[0];
      panning = true; dragged = false;
      sx = t.clientX; sy = t.clientY; ox = state.tx; oy = state.ty;
      svg.classList.add('is-panning');
      pinch = null;
    } else if (e.touches.length === 2) {
      // 双指：开始捏合缩放
      panning = false; svg.classList.remove('is-panning');
      const t0 = e.touches[0], t1 = e.touches[1];
      const cx = (t0.clientX + t1.clientX) / 2;
      const cy = (t0.clientY + t1.clientY) / 2;
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      pinch = {
        startDist: dist,
        startScale: state.scale,
        startCx: cx,
        startCy: cy,
        startTx: state.tx,
        startTy: state.ty,
      };
    }
  }, { passive: false });

  svg.addEventListener('touchmove', e => {
    if (panning && e.touches.length === 1) {
      e.preventDefault();
      const t = e.touches[0];
      if (Math.abs(t.clientX - sx) + Math.abs(t.clientY - sy) > 4) dragged = true;
      state.tx = ox + (t.clientX - sx);
      state.ty = oy + (t.clientY - sy);
      setTransform();
    } else if (pinch && e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const cx = (t0.clientX + t1.clientX) / 2;
      const cy = (t0.clientY + t1.clientY) / 2;
      const r = dist / pinch.startDist;
      const ns = Math.min(3, Math.max(0.3, pinch.startScale * r));
      // 以双指中心为锚点缩放，并跟随手指整体平移
      state.tx = cx - (pinch.startCx - pinch.startTx) * r;
      state.ty = cy - (pinch.startCy - pinch.startTy) * r;
      state.scale = ns;
      setTransform();
    }
  }, { passive: false });

  svg.addEventListener('touchend', e => {
    if (panning) {
      panning = false;
      svg.classList.remove('is-panning');
    }
    if (e.touches.length === 0) {
      // 全部手指离开，清理缩放状态
      pinch = null;
    } else if (e.touches.length === 1 && pinch) {
      // 双指缩放后剩下一指，切换为平移模式
      pinch = null;
      const t = e.touches[0];
      panning = true; dragged = false;
      sx = t.clientX; sy = t.clientY; ox = state.tx; oy = state.ty;
      svg.classList.add('is-panning');
    }
  }, { passive: false });

  svg.addEventListener('touchcancel', () => {
    panning = false; svg.classList.remove('is-panning'); pinch = null;
  }, { passive: false });

  // ── 滚轮缩放 ──
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });

  // ── 键盘控制 ──
  window.addEventListener('keydown', e => {
    // 输入框聚焦时仅放行 Esc（关闭侧栏），方向键/-/+ 交还输入框（光标移动、正常输入）
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === 'Escape') { window.dispatchEvent(new CustomEvent('pp:esc')); return; }
    if (typing) return;
    if (e.key === '+' || e.key === '=') { zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.12); }
    if (e.key === '-' || e.key === '_') { zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.12); }
    if (e.key.startsWith('Arrow')) {
      const d = 46;
      if (e.key === 'ArrowLeft') state.tx += d;
      if (e.key === 'ArrowRight') state.tx -= d;
      if (e.key === 'ArrowUp') state.ty += d;
      if (e.key === 'ArrowDown') state.ty -= d;
      setTransform(); e.preventDefault();
    }
  });
}

export function setTransform() {
  if (vp) vp.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.scale})`);
}

function zoomAt(cx, cy, factor) {
  const ns = Math.min(3, Math.max(0.3, state.scale * factor));
  state.tx = cx - (cx - state.tx) * (ns / state.scale);
  state.ty = cy - (cy - state.ty) * (ns / state.scale);
  state.scale = ns;
  setTransform();
}

export function fitView(bounds, w, h, pad = 90) {
  const cw = bounds.maxX - bounds.minX || 1;
  const ch = bounds.maxY - bounds.minY || 1;
  const s = Math.min((w - pad * 2) / cw, (h - pad * 2) / ch, 1.2);
  state.scale = s;
  state.tx = (w - cw * s) / 2 - bounds.minX * s;
  state.ty = (h - ch * s) / 2 - bounds.minY * s;
  setTransform();
}

export function consumeDrag() { const d = dragged; dragged = false; return d; }

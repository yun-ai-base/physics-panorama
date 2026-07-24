import { state } from './state.js';

let svg, vp;
let dragged = false;

export function initInteraction() {
  svg = document.getElementById('panorama');
  vp = document.getElementById('viewport');
  setTransform();
  let panning = false, sx = 0, sy = 0, ox = 0, oy = 0;

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

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') window.dispatchEvent(new CustomEvent('pp:esc'));
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

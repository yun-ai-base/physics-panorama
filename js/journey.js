// 对数尺度之旅 · 共享缩放引擎
// 用于「仰望星空」（宇宙尺度）与「探幽识微」（微观尺度）两个交互可视化。
// 设计：竖向对数轴 —— 尺度小者在底部、尺度大者在顶部（统一映射），
// 世界坐标经 viewport transform(translate+scale) 映射到屏幕；滚轮以光标为中心缩放、
// 拖拽平移、+/- 按钮、全览复位、左侧对数刻度标尺、当前视角尺度读数、通用简介卡片。
// 返回 controller：{ render, reset, focusNode, zoomTo, showCard, hideCard, refreshLang }

import { el, esc } from './utils.js?v=20260808v';
import { state } from './state.js?v=20260808v';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SUP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻' };
function sup(L){ return String(L).split('').map(c => SUP[c] || c).join(''); }
function fmtScale(L){ return L === 0 ? '1 m' : `10${sup(L)} m`; }

export function createJourney(opts){
  const { mount, axis, nodes, theme, onNodeClick, onViewChange } = opts;

  const svg = el('svg', { class: 'journey-svg', xmlns: 'http://www.w3.org/2000/svg' }, mount);
  const bgLayer  = el('g', { class: 'journey-bg' }, svg);
  const vp       = el('g', { class: 'journey-vp' }, svg);
  const axisLayer= el('g', { class: 'journey-axis' }, vp);
  const nodeLayer= el('g', { class: 'journey-nodes' }, vp);

  // 简介卡片
  const card = document.createElement('div'); card.className = 'journey-card'; card.hidden = true;
  mount.appendChild(card);
  // 悬停迷你预览（跟随鼠标，fixed 于 body 级避免被容器裁剪）
  const preview = document.createElement('div');
  preview.className = 'journey-preview'; preview.hidden = true;
  document.body.appendChild(preview);
  // 控制条
  const ctrl = document.createElement('div'); ctrl.className = 'journey-ctrl';
  const mk = (label, title) => { const b = document.createElement('button'); b.type='button'; b.className='journey-btn'; b.textContent=label; if(title) b.title=title; return b; };
  const btnIn = mk('＋','放大'), btnOut = mk('－','缩小'), btnReset = mk('⤢','全览 / 复位');
  const readout = document.createElement('div'); readout.className = 'journey-readout';
  ctrl.append(btnIn, btnOut, btnReset, readout); mount.appendChild(ctrl);

  // 操作提示 + 返回按钮（包裹在同一行容器中）
  const hintBar = document.createElement('div');
  hintBar.className = 'journey-hint-bar';
  const hint = document.createElement('div');
  hint.className = 'journey-hint';
  hint.textContent = theme === 'sky' ? '滚轮缩放 · 拖拽平移 · 点击天体看简介' : '滚轮缩放 · 拖拽平移 · 点击层级看简介';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'journey-back-btn';
  backBtn.textContent = theme === 'sky' ? '← 返回图景' : '← 返回图景';
  backBtn.addEventListener('click', () => {
    mount.dispatchEvent(new CustomEvent('journey:back', { bubbles: true }));
  });

  hintBar.appendChild(hint);
  hintBar.appendChild(backBtn);
  mount.appendChild(hintBar);

  let k = 1, tx = 0, ty = 0, fitK = 1, worldH = 0, worldHalfH = 0, lastH = 0;
  let down = false, moved = false, lastX = 0, lastY = 0, rendered = false, pinchD = 0;

  const W = () => mount.clientWidth || 900;
  const H = () => mount.clientHeight || 600;

  // 小尺度在底(+halfH)，大尺度在顶(-halfH)
  const yOf = (logSize) => { const t = (logSize - axis.minLog) / (axis.maxLog - axis.minLog); return worldHalfH - t * worldH; };
  const logOfY = (wy) => { const t = (worldHalfH - wy) / worldH; return axis.minLog + t * (axis.maxLog - axis.minLog); };

  function drawBg(){
    bgLayer.textContent = '';
    const n = theme === 'sky' ? 150 : 60;
    for (let i = 0; i < n; i++){
      const x = Math.random()*W(), y = Math.random()*H();
      el('circle', { cx:x, cy:y, r: Math.random()*1.3+0.2, fill: theme==='sky'?'#cfe0ff':'#d9c8ff', 'fill-opacity': 0.12 + Math.random()*0.5 }, bgLayer);
    }
    // micro 现已用真实科学背景图（buildMicroBg），不再叠加程序化紫斑，避免脏化真实图
  }
  function drawAxis(){
    axisLayer.textContent = '';
    el('line', { x1:0, y1:-worldHalfH, x2:0, y2:worldHalfH, class:'journey-axis__line' }, axisLayer);
    for (let L = Math.ceil(axis.minLog); L <= Math.floor(axis.maxLog); L++){
      const y = yOf(L);
      el('line', { x1:-9, y1:y, x2:9, y2:y, class:'journey-tick' }, axisLayer);
      el('text', { x:-14, y:y+4, class:'journey-tick__label', 'text-anchor':'end', text: fmtScale(L) }, axisLayer);
    }
  }
  function drawNodes(){
    nodeLayer.textContent = '';
    for (const node of nodes){
      const y = yOf(node.logSize);
      const g = el('g', { class:'journey-node', 'data-id':node.id, transform:`translate(0 ${y})` }, nodeLayer);
      const r = node.r || 14;
      if (node.glow) el('circle', { class:'journey-node__glow', cx:0, cy:0, r:r*2.4, fill:node.color||'#c9a24e', 'fill-opacity':0.12 }, g);
      el('circle', { class:'journey-node__circle', cx:0, cy:0, r, fill:node.color||'#c9a24e', 'fill-opacity':0.20, stroke:node.color||'#c9a24e', 'stroke-width':2 }, g);
      const name = state.lang==='en' ? (node.en||node.zh) : node.zh;
      el('text', { class:'journey-node__label', x:r+10, y:5, text: name }, g);
      if (node.subZh){ const sub = state.lang==='en' ? (node.subEn||node.subZh) : node.subZh; el('text', { class:'journey-node__sub', x:r+10, y:22, text: sub }, g); }
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => {
        if (moved) return;
        preview.hidden = true;   // 防御：任何点击后隐藏预览，防止触摸设备上残留
        onNodeClick(node, api);
      });
      // 悬停迷你预览：显示名称 + 特征尺度，减少「点开才知道是什么」的认知负担。
      // 触摸设备（hover:none）不绑定——避免合成 mouseenter 后无 mouseleave 导致的预览残留。
      if (!(window.matchMedia && window.matchMedia('(hover: none)').matches)) {
        g.addEventListener('mouseenter', e => {
          const nm = state.lang==='en' ? (node.en||node.zh) : node.zh;
          const sub = state.lang==='en' ? (node.subEn||node.subZh) : node.subZh;
          preview.innerHTML = `<div class="journey-preview__name">${esc(nm)}</div>${sub ? `<div class="journey-preview__sub">${esc(sub)}</div>` : ''}`;
          preview.hidden = false;
        });
        g.addEventListener('mousemove', e => {
          preview.style.left = (e.clientX + 14) + 'px';
          preview.style.top  = (e.clientY + 14) + 'px';
        });
        g.addEventListener('mouseleave', () => { preview.hidden = true; });
      }
    }
  }
  function apply(){
    vp.setAttribute('transform', `translate(${tx} ${ty}) scale(${k})`);
    const wy = (H()/2 - ty)/k;
    const centerLog = logOfY(wy);
    updateReadout(centerLog);
    if (typeof onViewChange === 'function') onViewChange(centerLog);
  }
  function updateReadout(L){ readout.textContent = '当前视角尺度 · ' + fmtScale(Math.round(L)); }
  function computeFit(){ worldH = Math.max(H()*0.9, Math.abs(axis.maxLog-axis.minLog)*160 + 260); worldHalfH = worldH/2; fitK = clamp(H()/worldH, 0.3, 4); }
  function reset(){ computeFit(); k = fitK; tx = W()/2; ty = H()/2; apply(); }
  function initView(){ computeFit(); k = 1; tx = W()/2; ty = H()/2 - yOf(axis.minLog); apply(); } // 从最小尺度端（底部）起步
  function zoomAt(sx, sy, factor){ const wx=(sx-tx)/k, wy=(sy-ty)/k; k = clamp(k*factor, fitK, 9); tx = sx - wx*k; ty = sy - wy*k; apply(); }
  function zoomCenter(factor){ zoomAt(W()/2, H()/2, factor); }

  // ── 指针交互 ──
  const onDown=(x,y)=>{ down=true; moved=false; lastX=x; lastY=y; };
  const onMove=(x,y)=>{ if(!down) return; const dx=x-lastX, dy=y-lastY; if(Math.abs(dx)+Math.abs(dy)>4) moved=true; tx+=dx; ty+=dy; lastX=x; lastY=y; apply(); };
  const onUp=()=>{ down=false; setTimeout(()=>{ moved=false; }, 0); };
  const tdist=(t)=>Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY);

  svg.addEventListener('mousedown', e=>onDown(e.clientX,e.clientY));
  window.addEventListener('mousemove', e=>onMove(e.clientX,e.clientY));
  window.addEventListener('mouseup', onUp);
  svg.addEventListener('wheel', e=>{ e.preventDefault(); const r=svg.getBoundingClientRect(); zoomAt(e.clientX-r.left, e.clientY-r.top, e.deltaY<0?1.18:1/1.18); }, { passive:false });

  svg.addEventListener('touchstart', e=>{
    if(e.touches.length===1){ onDown(e.touches[0].clientX,e.touches[0].clientY); }
    else if(e.touches.length===2){ pinchD=tdist(e.touches); }
  }, { passive:false });
  svg.addEventListener('touchmove', e=>{
    e.preventDefault();
    if(e.touches.length===1){ onMove(e.touches[0].clientX,e.touches[0].clientY); }
    else if(e.touches.length===2){ const d=tdist(e.touches); if(pinchD) zoomCenter(d/pinchD); pinchD=d; }
  }, { passive:false });
  svg.addEventListener('touchend', e=>{ if(e.touches.length===0){ onUp(); pinchD=0; } });

  btnIn.addEventListener('click', ()=>zoomCenter(1.3));
  btnOut.addEventListener('click', ()=>zoomCenter(1/1.3));
  btnReset.addEventListener('click', ()=>reset());
  card.addEventListener('click', e=>{ if(e.target.closest('.journey-card__close')) api.hideCard(); });

  window.addEventListener('resize', ()=>{ computeFit(); if(k<fitK) k=fitK; drawAxis(); drawNodes(); apply(); });

  const api = {
    render(){
      computeFit();                          // 必须先计算 worldH/worldHalfH，否则首次 drawNodes 把所有节点算到 y=0 堆叠
      drawBg(); drawAxis(); drawNodes();
      if (!rendered){ initView(); rendered = true; lastH = mount.clientHeight; }
      // 容器尺寸相对上次变化（首次布局完成 / 激活 subtab 由隐藏变可见）：重置到该主题起点视图
      else if (mount.clientHeight !== lastH){ lastH = mount.clientHeight; initView(); }
      else apply();
    },
    reset,
    focusNode(node){ computeFit(); k = clamp(2.4, fitK, 9); tx = W()/2; ty = H()/2 - yOf(node.logSize)*k; apply(); },
    zoomTo(logSize){ computeFit(); k = clamp(2.4, fitK, 9); tx = W()/2; ty = H()/2 - yOf(logSize)*k; apply(); },
    showCard(html){ card.innerHTML = html; card.hidden = false;
      // 卡片内「可跳转理论」chips（.jc-chip--link[data-theory]）：点击跳到时间线对应理论节点（跨视图知识闭环）
      card.querySelectorAll('.jc-chip--link[data-theory]').forEach(btn => {
        btn.addEventListener('click', () => {
          window.dispatchEvent(new CustomEvent('pp:gotoTheory', { detail: btn.dataset.theory }));
        });
      });
    },
    hideCard(){ card.hidden = true; },
    refreshLang(){ drawNodes(); },
  };
  return api;
}

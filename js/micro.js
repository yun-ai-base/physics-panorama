// 虚无-图景 · 探幽识微（微观尺度之旅 + 标准模型粒子家族）
// 竖向对数尺度轴（你在顶、普朗克尺度在底），滚轮缩放 / 拖拽平移，点击层级看简介；
// 点击「夸克」节点展开标准模型粒子家族网格（夸克×3代 / 轻子×3代 / 规范玻色子 + 希格斯）。

import { createJourney } from './journey.js?v=20260808t';
import { esc } from './utils.js?v=20260808t';
import { state } from './state.js?v=20260808t';

const MICRO_NODES = [
  { id:'you', logSize:0, zh:'你（观察者）', en:'You (Observer)', subZh:'1 m', subEn:'1 m',
    color:'#E8C16A', r:12,
    descZh:'宏观世界的你，是一切观测的起点。向下，是层层嵌套的微观宇宙。',
    descEn:'You at the macroscopic scale—the starting point of all observation. Downward lies a nested microscopic universe.' },
  { id:'ant', logSize:-2, zh:'蚂蚁', en:'Ant', subZh:'~10⁻² m', subEn:'~10⁻² m',
    color:'#C9A24E', r:12,
    descZh:'肉眼勉强可辨的微小生命，已踏入亚毫米世界。',
    descEn:'A tiny life barely visible to the eye, already entering the sub-millimetre world.' },
  { id:'cell', logSize:-5, zh:'细胞', en:'Cell', subZh:'~10⁻⁵ m', subEn:'~10⁻⁵ m',
    color:'#5BB37A', r:14,
    descZh:'生命的基本单元，内部是分子的繁忙工厂。',
    descEn:'The basic unit of life—inside, a busy factory of molecules.' },
  { id:'dna', logSize:-8.5, zh:'DNA 双螺旋', en:'DNA', subZh:'~2×10⁻⁹ m', subEn:'~2×10⁻⁹ m',
    color:'#4FB0C6', r:12,
    descZh:'承载遗传信息的双螺旋，长度仅纳米级却编码整个生命蓝图。',
    descEn:'The double helix carrying genetic information—nanometres long yet encoding a whole life blueprint.' },
  { id:'molecule', logSize:-9.5, zh:'水分子', en:'Molecule', subZh:'~3×10⁻¹⁰ m', subEn:'~3×10⁻¹⁰ m',
    color:'#4F9FD0', r:12,
    descZh:'原子通过化学键组成的稳定单元，气味的本质。',
    descEn:'Stable units of bonded atoms—the essence of smell and chemistry.' },
  { id:'atom', logSize:-10.2, zh:'原子', en:'Atom', subZh:'~10⁻¹⁰ m', subEn:'~10⁻¹⁰ m',
    color:'#6FA8DC', glow:true, r:16,
    descZh:'物质的基本砖块。电子云包裹原子核，量子规则在此主导。',
    descEn:'The basic brick of matter. An electron cloud wraps the nucleus; quantum rules dominate.' },
  { id:'nucleus', logSize:-14.2, zh:'原子核', en:'Atomic Nucleus', subZh:'~10⁻¹⁴ m', subEn:'~10⁻¹⁴ m',
    color:'#E0795B', r:14,
    descZh:'原子质量的 99.9% 集中于此，体积极小、密度极高。',
    descEn:'Holds 99.9% of atomic mass—tiny in volume, extraordinarily dense.' },
  { id:'proton', logSize:-15, zh:'质子 / 中子', en:'Proton / Neutron', subZh:'~10⁻¹⁵ m', subEn:'~10⁻¹⁵ m',
    color:'#D98A3C', r:12,
    descZh:'由三个夸克经强相互作用束缚而成，决定元素身份。',
    descEn:'Three quarks bound by the strong force; defines an element’s identity.' },
  { id:'electron', logSize:-15.7, zh:'电子', en:'Electron', subZh:'<10⁻¹⁸ m', subEn:'<10⁻¹⁸ m',
    color:'#9B7BD6', r:10,
    descZh:'轻而基本的轻子，绕核运动，决定化学与导电。',
    descEn:'A light, elementary lepton orbiting the nucleus; governs chemistry and conduction.' },
  { id:'quark', logSize:-18.5, zh:'夸克', en:'Quarks', subZh:'标准模型基石', subEn:'Standard Model', family:true,
    color:'#C77DD6', glow:true, r:14,
    descZh:'物质的终极砖块之一。夸克永不单独出现，被强相互作用禁闭。点击展开标准模型家族。',
    descEn:'One of matter’s ultimate bricks. Quarks never appear alone—confined by the strong force. Tap to open the family.' },
  { id:'gut', logSize:-25, zh:'大统一尺度', en:'GUT Scale', subZh:'~10⁻²⁵ m', subEn:'~10⁻²⁵ m',
    color:'#7E6BD0', r:12,
    descZh:'三种力（强、弱、电磁）可能统一的尺度，质子或将衰变。',
    descEn:'Where three forces (strong, weak, EM) may unify; protons might decay.' },
  { id:'qg', logSize:-33, zh:'量子引力', en:'Quantum Gravity', subZh:'~10⁻³³ m', subEn:'~10⁻³³ m',
    color:'#5E4FB0', r:12,
    descZh:'引力与量子效应同等重要，需要尚未建成的量子引力理论。',
    descEn:'Gravity and quantum effects are equally important—needs the not-yet-built quantum gravity.' },
  { id:'planck', logSize:-34.8, zh:'普朗克尺度', en:'Planck Scale', subZh:'~1.6×10⁻³⁵ m', subEn:'~1.6×10⁻³⁵ m',
    color:'#4A3D8F', glow:true, r:14,
    descZh:'时空经典概念失效的极限。长度、时间在此失去意义。',
    descEn:'The limit where classical spacetime breaks down. Length and time cease to make sense.' },
];

// 标准模型粒子
const QUARKS = [
  { sym:'u', zh:'上夸克', en:'up', type:'夸克 Quark', charge:'+2/3', mass:'~2.2 MeV', spin:'1/2', descZh:'构成质子与中子的轻夸克，电荷 +2/3。', descEn:'Light quark in protons and neutrons; charge +2/3.' },
  { sym:'d', zh:'下夸克', en:'down', type:'夸克 Quark', charge:'−1/3', mass:'~4.7 MeV', spin:'1/2', descZh:'构成质子与中子的轻夸克，电荷 −1/3。', descEn:'Light quark in protons and neutrons; charge −1/3.' },
  { sym:'c', zh:'粲夸克', en:'charm', type:'夸克 Quark', charge:'+2/3', mass:'~1.28 GeV', spin:'1/2', descZh:'第二代夸克，在粒子对撞中短暂现身。', descEn:'Second-generation quark, briefly produced in colliders.' },
  { sym:'s', zh:'奇夸克', en:'strange', type:'夸克 Quark', charge:'−1/3', mass:'~96 MeV', spin:'1/2', descZh:'第二代夸克，奇异粒子衰变的来源。', descEn:'Second-generation quark, source of strange-particle decays.' },
  { sym:'t', zh:'顶夸克', en:'top', type:'夸克 Quark', charge:'+2/3', mass:'~173 GeV', spin:'1/2', descZh:'最重的基本粒子，发现于 1995 年。', descEn:'Heaviest elementary particle, discovered in 1995.' },
  { sym:'b', zh:'底夸克', en:'bottom', type:'夸克 Quark', charge:'−1/3', mass:'~4.18 GeV', spin:'1/2', descZh:'第二代重夸克，常用于验证标准模型。', descEn:'Heavy second-generation quark, used to test the Standard Model.' },
];
const LEPTONS = [
  { sym:'e', zh:'电子', en:'electron', type:'轻子 Lepton', charge:'−1', mass:'0.511 MeV', spin:'1/2', descZh:'最熟悉的轻子，决定化学键与电流。', descEn:'The familiar lepton; governs chemical bonds and current.' },
  { sym:'μ', zh:'μ 子', en:'muon', type:'轻子 Lepton', charge:'−1', mass:'105.7 MeV', spin:'1/2', descZh:'电子的重表亲，穿透力强，用于探测。', descEn:'A heavy cousin of the electron; penetrates matter.' },
  { sym:'τ', zh:'τ 子', en:'tau', type:'轻子 Lepton', charge:'−1', mass:'1.777 GeV', spin:'1/2', descZh:'最重的带电轻子，衰变极快。', descEn:'Heaviest charged lepton; decays almost instantly.' },
  { sym:'νₑ', zh:'电子中微子', en:'νₑ', type:'轻子 Lepton', charge:'0', mass:'<1 eV', spin:'1/2', descZh:'与电子配对的中微子，几乎不与物质作用。', descEn:'Neutrino paired with the electron; barely interacts.' },
  { sym:'νμ', zh:'μ 子中微子', en:'νμ', type:'轻子 Lepton', charge:'0', mass:'<0.17 MeV', spin:'1/2', descZh:'与 μ 子配对的中微子。', descEn:'Neutrino paired with the muon.' },
  { sym:'ντ', zh:'τ 子中微子', en:'ντ', type:'轻子 Lepton', charge:'0', mass:'<18.2 MeV', spin:'1/2', descZh:'与 τ 子配对的中微子。', descEn:'Neutrino paired with the tau.' },
];
const BOSONS = [
  { sym:'γ', zh:'光子', en:'photon', type:'玻色子 Boson', charge:'0', mass:'0', spin:'1', descZh:'电磁相互作用的载体，光的粒子。', descEn:'Carrier of electromagnetism; the particle of light.' },
  { sym:'g', zh:'胶子', en:'gluon', type:'玻色子 Boson', charge:'0', mass:'0', spin:'1', descZh:'强相互作用的载体，把夸克绑在一起。', descEn:'Carrier of the strong force; glues quarks.' },
  { sym:'W', zh:'W 玻色子', en:'W', type:'玻色子 Boson', charge:'±1', mass:'80.4 GeV', spin:'1', descZh:'弱相互作用载体，介导放射性 β 衰变。', descEn:'Carrier of the weak force; mediates beta decay.' },
  { sym:'Z', zh:'Z 玻色子', en:'Z', type:'玻色子 Boson', charge:'0', mass:'91.2 GeV', spin:'1', descZh:'弱相互作用的中性载体。', descEn:'Neutral carrier of the weak force.' },
  { sym:'H', zh:'希格斯玻色子', en:'Higgs', type:'玻色子 Boson', charge:'0', mass:'125 GeV', spin:'0', descZh:'赋予基本粒子质量的场量子，2012 年发现。', descEn:'Quantum of the field giving particles mass; found in 2012.' },
];
const ALL_PARTICLES = [...QUARKS, ...LEPTONS, ...BOSONS];
const PARTICLE_MAP = Object.fromEntries(ALL_PARTICLES.map(p => [p.sym, p]));

// 探幽识微 · 随尺度淡入淡出的真实科学背景图（各阶段中心对应一个层级节点）
// 图片来源：NASA 图片 API（images-api.nasa.gov，公共领域）。
// 原子及以下无真实照片，NASA 图为科学可视化/科普图——署名中如实标注。
const MICRO_BG = [
  { id:'you',     log:0.0,   img:'assets/micro/micro_you.svg' },
  { id:'ant',     log:-2.0,  img:'assets/micro/micro_ant.svg' },
  { id:'cell',    log:-5.0,  img:'assets/micro/micro_cell.jpg' },
  { id:'dna',     log:-8.5,  img:'assets/micro/micro_dna.jpg' },
  { id:'atom',    log:-10.2, img:'assets/micro/micro_atom.svg' },
  { id:'nucleus', log:-14.2, img:'assets/micro/micro_nucleus.svg' },
  { id:'quark',   log:-18.5, img:'assets/micro/micro_quark.svg' },
  { id:'quantum', log:-33.0, img:'assets/micro/micro_quantum.svg' },
  { id:'planck',  log:-34.8, img:'assets/micro/micro_planck.svg' },
];

let bgLayers = [];
let bgEl = null;
let bgCredit = null;

function buildMicroBg(mount){
  bgEl = document.createElement('div');
  bgEl.className = 'sky-bg';
  bgLayers = MICRO_BG.map(stage => {
    const layer = document.createElement('div');
    layer.className = 'sky-bg__layer';
    layer.style.backgroundImage = `url("${stage.img}")`;
    layer.dataset.id = stage.id;
    bgEl.appendChild(layer);
    return layer;
  });
  const scrim = document.createElement('div');
  scrim.className = 'sky-bg__scrim';
  bgEl.appendChild(scrim);
  mount.insertBefore(bgEl, mount.firstChild);   // 压在 svg 之下

  bgCredit = document.createElement('div');
  bgCredit.className = 'sky-credit';
  bgCredit.innerHTML = '背景图：NASA（公共领域）· 细胞 / DNA / 分子等为真实科研与科普图；原子及以下为科学可视化';
  mount.appendChild(bgCredit);                   // 署名条，压在交互层之上
}

// 给定当前视角中心对数尺度 c，返回每层不透明度。
// 模型：相邻阶段在各自间隔中点之间平滑交叉（过渡半宽取该间隔一半，更自然）；窗口外最近阶段全显——任意尺度都恰好有背景，无空白死区。
function bgOps(c){
  const logs = MICRO_BG.map(s => s.log);
  const ops = logs.map(() => 0);
  let nearest = 0;
  for (let i = 0; i < logs.length; i++)
    if (Math.abs(c - logs[i]) < Math.abs(c - logs[nearest])) nearest = i;
  ops[nearest] = 1;
  for (let i = 0; i < logs.length - 1; i++){
    const bm = (logs[i] + logs[i+1]) / 2;
    const t = Math.max(0.4, (logs[i+1] - logs[i]) / 2 * 0.9);   // 该间隔一半（下限防极窄瞬切）
    if (Math.abs(c - bm) < t){
      const f = Math.max(0, Math.min(1, (c - (bm - t)) / (2 * t)));
      ops[i] = 1 - f;
      ops[i+1] = f;
    }
  }
  return ops;
}

function updateMicroBg(c){
  if (!bgLayers.length) return;
  const ops = bgOps(c);
  for (let i = 0; i < bgLayers.length; i++) bgLayers[i].style.opacity = ops[i].toFixed(3);
}

function chips(arr){ return (arr||[]).map(x => `<span class="jc-chip">${esc(x)}</span>`).join(''); }

function cardHTML(node, idx, total){
  const title = node.zh, en = node.en || '', scale = node.subZh || '', desc = node.descZh || '', enDesc = node.descEn || '';
  return `
    <div class="journey-card__inner">
      <button class="journey-card__close" aria-label="关闭">×</button>
      <div class="journey-card__title">${esc(title)} <span class="journey-card__en">${esc(en)}</span></div>
      <div class="journey-card__scale">特征尺度 · ${esc(scale)}${total ? ` <span class="jc-layer">层级 ${idx} / ${total}</span>` : ''}</div>
      <p class="journey-card__desc">${esc(desc)}</p>
      <p class="journey-card__desc journey-card__desc--en">${esc(enDesc)}</p>
    </div>`;
}

function particleCell(p){
  const name = state.lang === 'en' ? p.en : p.zh;
  return `<button class="pcell" data-sym="${esc(p.sym)}" type="button">
      <span class="pcell__sym">${esc(p.sym)}</span>
      <span class="pcell__name">${esc(name)}</span>
    </button>`;
}
function buildOverlayHTML(){
  const isEn = state.lang === 'en';
  const col = (title, arr) => `<div class="pcol"><div class="pcol__h">${title}</div><div class="pcol__grid">${arr.map(particleCell).join('')}</div></div>`;
  const qH = isEn ? 'Quarks' : '夸克';
  const lH = isEn ? 'Leptons' : '轻子';
  const bH = isEn ? 'Bosons' : '玻色子';
  const headT = isEn ? 'The Standard Model · Elementary Particles' : '标准模型 · 基本粒子';
  const back = isEn ? '← Back to the journey' : '← 返回尺度之旅';
  const hint = isEn ? 'Tap any particle to see its mass, charge and spin.' : '点击任意粒子，查看其质量、电荷与自旋。';
  return `
    <div class="particle-overlay__head">
      <div class="particle-overlay__title">${headT}</div>
      <button class="particle-back" type="button">${back}</button>
    </div>
    <div class="particle-overlay__body">
      ${col(qH, QUARKS)}${col(lH, LEPTONS)}${col(bH, BOSONS)}
    </div>
    <div class="particle-detail" id="pdetail">${hint}</div>`;
}
function renderParticleDetail(p){
  const isEn = state.lang === 'en';
  const name = isEn ? `${p.en}（${p.sym}）` : `${p.zh}（${p.sym}）`;
  const detail = document.getElementById('pdetail');
  if (!detail) return;
  detail.innerHTML = `
    <div class="pd__title">${esc(name)}</div>
    <div class="pd__type">${esc(p.type)}</div>
    <div class="pd__rows">
      <div><span>电荷 Charge</span><b>${esc(p.charge)}</b></div>
      <div><span>质量 Mass</span><b>${esc(p.mass)}</b></div>
      <div><span>自旋 Spin</span><b>${esc(p.spin)}</b></div>
    </div>
    <p class="pd__desc">${esc(isEn ? p.descEn : p.descZh)}</p>`;
}

let controller = null;
let overlay = null;
let lastNode = null;

function onNodeClick(node, api){
  lastNode = node;
  if (node.family){
    api.hideCard();
    if (overlay) {
      overlay.hidden = false;
      // 禁用底层 SVG 指针事件，防止抢夺浮层点击
      const svg = mount.querySelector('.journey-svg');
      if (svg) svg.style.pointerEvents = 'none';
    }
    return;
  }
  api.focusNode(node);
  api.showCard(cardHTML(node, MICRO_NODES.indexOf(node) + 1, MICRO_NODES.length));
}

export function initMicro(mount){
  if (controller) return;
  buildMicroBg(mount);
  controller = createJourney({
    mount,
    axis: { minLog: -35, maxLog: 0.5 },
    nodes: MICRO_NODES,
    theme: 'micro',
    onNodeClick,
    onViewChange: updateMicroBg,
  });
  overlay = document.createElement('div');
  overlay.className = 'particle-overlay';
  overlay.hidden = true;
  overlay.innerHTML = buildOverlayHTML();
  mount.appendChild(overlay);

  // 关闭粒子浮层并恢复底层 SVG 交互
  function closeOverlay(){
    overlay.hidden = true;
    const svg = mount.querySelector('.journey-svg');
    if (svg) svg.style.pointerEvents = '';
  }

  // 直接绑定返回按钮（确保不被 SVG 或其他全局监听拦截）
  const backBtn = overlay.querySelector('.particle-back');
  if (backBtn) {
    backBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      closeOverlay();
    });
  }
  // 委托模式：处理粒子点击（备用）
  overlay.addEventListener('click', e => {
    const back = e.target.closest('.particle-back');
    if (back){ closeOverlay(); return; }
    const cell = e.target.closest('.pcell');
    if (cell){ const p = PARTICLE_MAP[cell.dataset.sym]; if (p) renderParticleDetail(p); }
  });
}

export function renderMicro(){
  if (controller){ controller.render(); requestAnimationFrame(() => controller.render()); }
}

export function refreshMicroLang(){
  if (!controller) return;
  controller.refreshLang();
  if (lastNode && !lastNode.family) controller.showCard(cardHTML(lastNode, MICRO_NODES.indexOf(lastNode) + 1, MICRO_NODES.length));
  if (overlay && !overlay.hidden){
    overlay.innerHTML = buildOverlayHTML();
    // 重建后重新绑定返回按钮（innerHTML 会销毁旧按钮及其监听器）
    const backBtn = overlay.querySelector('.particle-back');
    if (backBtn) {
      backBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        closeOverlay();
      });
    }
  }
}

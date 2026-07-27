// 虚无-图景 · 仰望星空（宇宙尺度之旅）
// 竖向对数尺度轴（你在底、可观测宇宙在顶），滚轮缩放 / 拖拽平移，点击天体看简介。

import { createJourney } from './journey.js';
import { esc } from './utils.js';

const SKY_NODES = [
  { id:'you', logSize:0, zh:'你（观察者）', en:'You (Observer)', subZh:'尺度基准 · 1 m', subEn:'Scale origin · 1 m',
    color:'#E8C16A', r:12,
    descZh:'所有尺度测量的原点。你正站在此处，向上仰望无垠星空，向下探入微观深处。',
    descEn:'The origin of all measurement. Standing here, you look up to the boundless cosmos and down into the infinitesimal.',
    theories:['日常经典物理'] },
  { id:'city', logSize:3, zh:'城市', en:'City', subZh:'~10³ m', subEn:'~10³ m',
    color:'#C9A24E', r:12,
    descZh:'人类尺度的杰作，宏观经典物理在此完美适用——连续、确定、可预测。',
    descEn:'A product of human scale, where classical physics applies perfectly—continuous, deterministic, predictable.',
    theories:['经典力学','热力学'] },
  { id:'earth', logSize:6.8, zh:'地球', en:'Earth', subZh:'半径 ~6.4×10⁶ m', subEn:'radius ~6.4×10⁶ m',
    color:'#4F8FCF', glow:true, r:18,
    descZh:'我们唯一的家园，一颗在引力与电磁力共同塑造下的蓝色行星。',
    descEn:'Our only home—a blue planet shaped by gravity and electromagnetism.',
    theories:['万有引力','地球科学'] },
  { id:'moon', logSize:8.6, zh:'地月系统', en:'Earth–Moon System', subZh:'~3.8×10⁸ m', subEn:'~3.8×10⁸ m',
    color:'#9DB8D6', r:14,
    descZh:'月球以引力束缚绕地运行，潮汐与地月距离定义了近地空间尺度。',
    descEn:'The Moon orbits Earth through gravity; tides and distance define near-Earth space.',
    theories:['天体力学'] },
  { id:'sun', logSize:11.2, zh:'太阳（日地距离）', en:'Sun (1 AU)', subZh:'~1.5×10¹¹ m', subEn:'~1.5×10¹¹ m',
    color:'#F2B441', glow:true, r:22,
    descZh:'太阳系的中心恒星，1 天文单位（日地距离）是行星尺度的标尺。光需约 8 分 20 秒抵达地球。',
    descEn:'The central star; 1 AU (Earth–Sun distance) is the ruler of planetary scale. Light takes ~8 min 20 s to reach us.',
    theories:['恒星物理','核聚变'] },
  { id:'solarsys', logSize:16, zh:'太阳系（奥尔特云）', en:'Solar System', subZh:'~10¹⁶ m', subEn:'~10¹⁶ m',
    color:'#D89A3C', r:16,
    descZh:'八大行星、矮行星与柯伊伯带、奥尔特云共同构成的引力王国，半径约 1 光年。',
    descEn:'Eight planets, dwarf planets, the Kuiper belt and Oort cloud—a gravitational realm ~1 light-year across.',
    theories:['天体力学','行星科学'] },
  { id:'proxima', logSize:16.8, zh:'比邻星', en:'Proxima Centauri', subZh:'~4×10¹⁶ m', subEn:'~4×10¹⁶ m',
    color:'#FFD27F', r:12,
    descZh:'离太阳最近的恒星，约 4.24 光年之遥，提醒我们恒星际空间的广袤。',
    descEn:'The nearest star to the Sun, ~4.24 light-years away—a reminder of interstellar vastness.',
    theories:['恒星天文'] },
  { id:'galaxy', logSize:21, zh:'银河系', en:'Milky Way', subZh:'~10²¹ m（约 10 万光年）', subEn:'~10²¹ m (~100,000 ly)',
    color:'#B98AD6', glow:true, r:24,
    descZh:'数千亿颗恒星组成的棒旋星系，太阳位于一条旋臂上，绕银心周期约 2.3 亿年。',
    descEn:'A barred spiral of hundreds of billions of stars; the Sun rides one arm, orbiting the center every ~230 Myr.',
    theories:['星系动力学','银河系结构'] },
  { id:'group', logSize:23, zh:'本星系群', en:'Local Group', subZh:'~10²³ m', subEn:'~10²³ m',
    color:'#8E7BD6', r:16,
    descZh:'银河系与仙女座等约 50 个星系组成的引力聚落，跨度约 1000 万光年。',
    descEn:'A gravitationally bound cluster of ~50 galaxies including Andromeda, ~10 million light-years across.',
    theories:['宇宙大尺度结构'] },
  { id:'virgo', logSize:24.0, zh:'室女座超星系团', en:'Virgo Supercluster', subZh:'~10²⁴ m（约 1 亿光年）', subEn:'~10²⁴ m (~100 Mly)',
    color:'#7E6BD0', r:17,
    descZh:'又称本超星系团，我们的本星系群只是它边缘的一个小成员。数千个星系在引力下聚成这片横跨约 1 亿光年的薄饼状结构。',
    descEn:'Also the Local Supercluster—our Local Group is merely a small member on its edge. Thousands of galaxies bound into a pancake ~100 million light-years across.',
    theories:['宇宙大尺度结构'] },
  { id:'laniakea', logSize:24.7, zh:'拉尼亚凯亚超星系团', en:'Laniakea Supercluster', subZh:'~5×10²⁴ m（约 5 亿光年）', subEn:'~5×10²⁴ m (~500 Mly)',
    color:'#6A5BC0', glow:true, r:19,
    descZh:'2014 年才被命名定义的巨结构，包含室女座超星系团在内的约 10 万个星系，由"巨引源"的引力编织成连绵的宇宙之网。',
    descEn:'Named only in 2014, it embraces ~100,000 galaxies including the Virgo Supercluster, woven by the Great Attractor’s gravity into a continuous cosmic web.',
    theories:['宇宙大尺度结构','宇宙学'],
    phenomena:['巨引源','宇宙纤维状结构'] },
  { id:'universe', logSize:26.9, zh:'可观测宇宙', en:'Observable Universe', subZh:'~8.8×10²⁶ m（约 930 亿光年）', subEn:'~8.8×10²⁶ m (~93 Bly)',
    color:'#6FA8DC', glow:true, r:28,
    descZh:'以我们为中心、光自大爆炸以来能抵达的最大球域。包含约 2 万亿个星系，暗能量正加速其膨胀。',
    descEn:'The largest sphere from which light could reach us since the Big Bang—~2 trillion galaxies, expanding faster under dark energy.',
    theories:['宇宙学','广义相对论','ΛCDM 模型'],
    phenomena:['宇宙膨胀','暗物质','暗能量','宇宙微波背景'] },
];

function chips(arr){
  return (arr||[]).map(x => `<span class="jc-chip">${esc(x)}</span>`).join('');
}

// 仰望星空 · 随尺度淡入淡出的真实科学背景图（各阶段中心对应一个天体节点）
// 图片来源：NASA 公共领域（银河 / 黑色弹珠·城市灯火 / 蓝色弹珠 / 太阳系）· ESA Planck CMB（CC BY-SA 3.0 IGO）
const SKY_BG = [
  { id:'observer', log:0,    img:'assets/sky/sky_observer.jpg' },     // 你仰望的银河（NASA-JPL）
  { id:'city',     log:3,    img:'assets/sky/sky_city.jpg' },          // 城市灯火·地球之夜（NASA Black Marble）
  { id:'earth',    log:6.8,  img:'assets/sky/sky_earth.jpg' },         // 蓝色弹珠（NASA Blue Marble）
  { id:'solar',    log:16,   img:'assets/sky/sky_solarsystem.jpg' },   // 太阳系（NASA）
  { id:'cmb',      log:26.9, img:'assets/sky/sky_cmb.jpg' },           // 普朗克 CMB 全天图（ESA）
];

let bgLayers = [];
let bgEl = null;
let bgCredit = null;

function buildSkyBg(mount){
  bgEl = document.createElement('div');
  bgEl.className = 'sky-bg';
  bgLayers = SKY_BG.map(stage => {
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
  bgCredit.innerHTML = '背景图：NASA（蓝色弹珠 / 黑色弹珠·城市灯火 / 银河 / 太阳系）· ESA Planck（CMB 全天图，CC BY-SA 3.0 IGO）';
  mount.appendChild(bgCredit);                   // 署名条，压在交互层之上、提示之下
}

// 给定当前视角中心对数尺度 c，返回每层不透明度。
// 模型：相邻图在各自中点之间平滑交叉；窗口外最近图全显 —— 任意尺度都恰好有背景，无空白死区。
function bgOpacities(c){
  const logs = SKY_BG.map(s => s.log);
  const mids = [];
  for (let i = 0; i < logs.length - 1; i++) mids.push((logs[i] + logs[i+1]) / 2);
  const t = 1.5;                                 // 过渡半宽（对数单位，须 ≤ 最小间隔的一半=1.5，否则节点中心无法满显）
  const ops = logs.map(() => 0);
  let nearest = 0;
  for (let i = 0; i < logs.length; i++)
    if (Math.abs(c - logs[i]) < Math.abs(c - logs[nearest])) nearest = i;
  ops[nearest] = 1;
  for (let i = 0; i < mids.length; i++){
    const bm = mids[i];
    if (Math.abs(c - bm) < t){
      const f = Math.max(0, Math.min(1, (c - (bm - t)) / (2 * t)));  // 0→1：左图淡出、右图淡入（钳制避免负值）
      ops[i] = 1 - f;
      ops[i+1] = f;
    }
  }
  return ops;
}

function updateSkyBg(c){
  if (!bgLayers.length) return;
  const ops = bgOpacities(c);
  for (let i = 0; i < bgLayers.length; i++) bgLayers[i].style.opacity = ops[i].toFixed(3);
}

function cardHTML(node){
  const title = node.zh;
  const en = node.en || '';
  const scale = node.subZh || '';
  const desc = node.descZh || '';
  const enDesc = node.descEn || '';
  return `
    <div class="journey-card__inner">
      <button class="journey-card__close" aria-label="关闭">×</button>
      <div class="journey-card__title">${esc(title)} <span class="journey-card__en">${esc(en)}</span></div>
      <div class="journey-card__scale">特征尺度 · ${esc(scale)}</div>
      <p class="journey-card__desc">${esc(desc)}</p>
      <p class="journey-card__desc journey-card__desc--en">${esc(enDesc)}</p>
      ${node.theories ? `<div class="journey-card__sec">相关理论</div><div class="jc-chips">${chips(node.theories)}</div>` : ''}
      ${node.phenomena ? `<div class="journey-card__sec">典型现象</div><div class="jc-chips">${chips(node.phenomena)}</div>` : ''}
    </div>`;
}

let controller = null;
let lastNode = null;

function onNodeClick(node, api){
  lastNode = node;
  api.focusNode(node);
  api.showCard(cardHTML(node));
}

export function initSky(mount){
  if (controller) return;
  buildSkyBg(mount);
  controller = createJourney({
    mount,
    axis: { minLog: 0, maxLog: 27 },
    nodes: SKY_NODES,
    theme: 'sky',
    onNodeClick,
    onViewChange: updateSkyBg,
  });
}

export function renderSky(){
  if (controller){ controller.render(); requestAnimationFrame(() => controller.render()); }
}

export function refreshSkyLang(){
  if (!controller) return;
  controller.refreshLang();
  if (lastNode && !lastNode.family) controller.showCard(cardHTML(lastNode));
}

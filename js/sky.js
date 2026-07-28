// 虚无-图景 · 仰望星空（宇宙尺度之旅）
// 竖向对数尺度轴（你在底、可观测宇宙在顶），滚轮缩放 / 拖拽平移，点击天体看简介。
// 支持「类型筛选 + 尺度轴」：分类标签栏高亮某类天体并弹出清单，轴上节点随之淡化/高亮。

import { createJourney } from './journey.js';
import { esc } from './utils.js';

// —— 天体节点（含尺度结构层级 + 各类天体）。category 驱动类型筛选 ——
const SKY_NODES = [
  // ===== 尺度结构（原 12 个层级节点）=====
  { id:'you', logSize:0, zh:'你（观察者）', en:'You (Observer)', subZh:'尺度基准 · 1 m', subEn:'Scale origin · 1 m',
    category:'scale', color:'#E8C16A', r:12,
    descZh:'所有尺度测量的原点。你正站在此处，向上仰望无垠星空，向下探入微观深处。',
    descEn:'The origin of all measurement. Standing here, you look up to the boundless cosmos and down into the infinitesimal.',
    theories:['日常经典物理'] },
  { id:'city', logSize:3, zh:'城市', en:'City', subZh:'~10³ m', subEn:'~10³ m',
    category:'scale', color:'#C9A24E', r:12,
    descZh:'人类尺度的杰作，宏观经典物理在此完美适用——连续、确定、可预测。',
    descEn:'A product of human scale, where classical physics applies perfectly—continuous, deterministic, predictable.',
    theories:['经典力学','热力学'] },
  { id:'earth', logSize:6.8, zh:'地球', en:'Earth', subZh:'半径 ~6.4×10⁶ m', subEn:'radius ~6.4×10⁶ m',
    category:'scale', color:'#4F8FCF', glow:true, r:18,
    descZh:'我们唯一的家园，一颗在引力与电磁力共同塑造下的蓝色行星。',
    descEn:'Our only home—a blue planet shaped by gravity and electromagnetism.',
    theories:['万有引力','地球科学'] },
  { id:'moon', logSize:8.6, zh:'地月系统', en:'Earth–Moon System', subZh:'~3.8×10⁸ m', subEn:'~3.8×10⁸ m',
    category:'scale', color:'#9DB8D6', r:14,
    descZh:'月球以引力束缚绕地运行，潮汐与地月距离定义了近地空间尺度。',
    descEn:'The Moon orbits Earth through gravity; tides and distance define near-Earth space.',
    theories:['天体力学'] },
  { id:'sun', logSize:11.2, zh:'太阳（日地距离）', en:'Sun (1 AU)', subZh:'~1.5×10¹¹ m', subEn:'~1.5×10¹¹ m',
    category:'scale', color:'#F2B441', glow:true, r:22,
    descZh:'太阳系的中心恒星，1 天文单位（日地距离）是行星尺度的标尺。光需约 8 分 20 秒抵达地球。',
    descEn:'The central star; 1 AU (Earth–Sun distance) is the ruler of planetary scale. Light takes ~8 min 20 s to reach us.',
    theories:['恒星物理','核聚变'] },
  { id:'solarsys', logSize:16, zh:'太阳系（奥尔特云）', en:'Solar System', subZh:'~10¹⁶ m', subEn:'~10¹⁶ m',
    category:'scale', color:'#D89A3C', r:16,
    descZh:'八大行星、矮行星与柯伊伯带、奥尔特云共同构成的引力王国，半径约 1 光年。',
    descEn:'Eight planets, dwarf planets, the Kuiper belt and Oort cloud—a gravitational realm ~1 light-year across.',
    theories:['天体力学','行星科学'] },
  { id:'proxima', logSize:16.8, zh:'比邻星', en:'Proxima Centauri', subZh:'~4×10¹⁶ m', subEn:'~4×10¹⁶ m',
    category:'scale', color:'#FFD27F', r:12,
    descZh:'离太阳最近的恒星，约 4.24 光年之遥，提醒我们恒星际空间的广袤。',
    descEn:'The nearest star to the Sun, ~4.24 light-years away—a reminder of interstellar vastness.',
    theories:['恒星天文'] },
  { id:'galaxy', logSize:21, zh:'银河系', en:'Milky Way', subZh:'~10²¹ m（约 10 万光年）', subEn:'~10²¹ m (~100,000 ly)',
    category:'scale', color:'#B98AD6', glow:true, r:24,
    descZh:'数千亿颗恒星组成的棒旋星系，太阳位于一条旋臂上，绕银心周期约 2.3 亿年。',
    descEn:'A barred spiral of hundreds of billions of stars; the Sun rides one arm, orbiting the center every ~230 Myr.',
    theories:['星系动力学','银河系结构'] },
  { id:'group', logSize:23, zh:'本星系群', en:'Local Group', subZh:'~10²³ m', subEn:'~10²³ m',
    category:'scale', color:'#8E7BD6', r:16,
    descZh:'银河系与仙女座等约 50 个星系组成的引力聚落，跨度约 1000 万光年。',
    descEn:'A gravitationally bound cluster of ~50 galaxies including Andromeda, ~10 million light-years across.',
    theories:['宇宙大尺度结构'] },
  { id:'virgo', logSize:24.0, zh:'室女座超星系团', en:'Virgo Supercluster', subZh:'~10²⁴ m（约 1 亿光年）', subEn:'~10²⁴ m (~100 Mly)',
    category:'scale', color:'#7E6BD0', r:17,
    descZh:'又称本超星系团，我们的本星系群只是它边缘的一个小成员。数千个星系在引力下聚成这片横跨约 1 亿光年的薄饼状结构。',
    descEn:'Also the Local Supercluster—our Local Group is merely a small member on its edge. Thousands of galaxies bound into a pancake ~100 million light-years across.',
    theories:['宇宙大尺度结构'] },
  { id:'laniakea', logSize:24.7, zh:'拉尼亚凯亚超星系团', en:'Laniakea Supercluster', subZh:'~5×10²⁴ m（约 5 亿光年）', subEn:'~5×10²⁴ m (~500 Mly)',
    category:'scale', color:'#6A5BC0', glow:true, r:19,
    descZh:'2014 年才被命名定义的巨结构，包含室女座超星系团在内的约 10 万个星系，由"巨引源"的引力编织成连绵的宇宙之网。',
    descEn:'Named only in 2014, it embraces ~100,000 galaxies including the Virgo Supercluster, woven by the Great Attractor’s gravity into a continuous cosmic web.',
    theories:['宇宙大尺度结构','宇宙学'],
    phenomena:['巨引源','宇宙纤维状结构'] },
  { id:'universe', logSize:26.9, zh:'可观测宇宙', en:'Observable Universe', subZh:'~8.8×10²⁶ m（约 930 亿光年）', subEn:'~8.8×10²⁶ m (~93 Bly)',
    category:'scale', color:'#6FA8DC', glow:true, r:28,
    descZh:'以我们为中心、光自大爆炸以来能抵达的最大球域。包含约 2 万亿个星系，暗能量正加速其膨胀。',
    descEn:'The largest sphere from which light could reach us since the Big Bang—~2 trillion galaxies, expanding faster under dark energy.',
    theories:['宇宙学','广义相对论','ΛCDM 模型'],
    phenomena:['宇宙膨胀','暗物质','暗能量','宇宙微波背景'] },

  // ===== 恒星演化 =====
  { id:'whiteDwarf', logSize:7.2, zh:'白矮星', en:'White Dwarf', subZh:'~地球尺度', subEn:'~Earth-sized',
    category:'stellar', color:'#CFE0FF', r:11, image:'assets/sky/obj_whitedwarf.jpg',
    imgCredit:'NASA, ESA, STScI（哈勃·天狼星 B 系统）',
    descZh:'中小质量恒星（如太阳）演化到末期的残骸：核心坍缩后靠电子简并压支撑，体积与地球相仿却拥有太阳量级的质量。',
    descEn:'The remnant of a low-to-intermediate mass star’s evolution, supported by electron degeneracy pressure.',
    formZh:'恒星耗尽核燃料、外层抛射成行星状星云后，残留核心坍缩至地球大小，电子简并压抵抗引力。',
    paramZh:'质量 ≈0.5–1.4 M☉（钱德拉塞卡极限）；半径 ≈地球（~7000 km）；表面温度可达 10⁵ K；密度 ≈10⁶ g/cm³。',
    obsZh:'天狼星 B 是最易观测的白矮星；Ia 型超新星作为"标准烛光"印证了钱德拉塞卡极限。',
    theories:['恒星演化','简并压'], phenomena:['行星状星云'] },
  { id:'redGiant', logSize:10.8, zh:'红巨星 / 红超巨星', en:'Red Giant', subZh:'~0.5–10 AU', subEn:'~0.5–10 AU',
    category:'stellar', color:'#E8763C', r:15, image:'assets/sky/obj_redgiant.jpg',
    imgCredit:'NASA, ESA, E. Wheatley (STScI)（哈勃·参宿四）',
    descZh:'恒星耗尽核心氢后膨胀、冷却、变红的晚年阶段；参宿四等红超巨星可膨胀到木星轨道之外。',
    descEn:'A late evolutionary phase where a star expands, cools and reddens after exhausting core hydrogen.',
    formZh:'核心氢耗尽→壳层氢聚变外推→外层急剧膨胀、表面温度下降而总光度大增。',
    paramZh:'半径可达 0.5–10 AU；表面温度 3000–4000 K；光度 10²–10⁴ L☉。',
    obsZh:'哈勃拍到参宿四表面与 2019 年大质量抛射；其 ~400 天脉动周期被监测两百年以上。',
    theories:['恒星演化'], phenomena:['恒星脉动','质量抛射'] },

  // ===== 致密天体 =====
  { id:'neutronStar', logSize:4.0, zh:'中子星', en:'Neutron Star', subZh:'~10 km', subEn:'~10 km',
    category:'compact', color:'#9FE0FF', r:10, image:'assets/sky/obj_neutronstar.jpg',
    imgCredit:'NASA, ESA, STScI（哈勃·双中子星并合示意图）',
    descZh:'大质量恒星超新星爆发后核心坍缩成的极致密天体，几乎全由中子构成，一茶匙物质重达数亿吨。',
    descEn:'An ultra-dense remnant of a core-collapse supernova, made almost entirely of neutrons.',
    formZh:'超新星核心坍缩超过白矮星极限，电子被压入质子形成中子+中微子，中子简并压支撑。',
    paramZh:'质量 1.4–2.3 M☉；半径 ≈10–12 km；密度 ≈10¹⁴ g/cm³；磁场可达 10⁸–10¹⁵ G（磁星）。',
    obsZh:'1967 年发现脉冲星（旋转中子星）；2017 GW170817 双中子星并合被 LIGO/Virgo 与电磁波联合探测。',
    theories:['中子星物理','简并压','引力波'], phenomena:['脉冲星','磁星'] },
  { id:'stellarBH', logSize:4.6, zh:'恒星级黑洞', en:'Stellar-mass Black Hole', subZh:'数–数十 M☉', subEn:'few–tens M☉',
    category:'compact', color:'#7FD0FF', r:11, image:'assets/sky/obj_stellarbh.jpg',
    imgCredit:'ESA, NASA, F. Mirabel（恒星级黑洞艺术印象）',
    descZh:'大质量恒星（>20–25 M☉）燃料耗尽、核心坍缩越过中子星极限后形成的黑洞，质量通常数至数十太阳质量。',
    descEn:'A black hole formed when a massive star’s core collapses past the neutron-star limit.',
    formZh:'超新星或直接坍缩使核心质量超过托尔曼–奥本海默–沃尔科夫极限，无简并压可抗引力，视界形成。',
    paramZh:'质量 5–100 M☉；事件视界半径（史瓦西半径）≈3 km×(M/M☉)；可带自旋。',
    obsZh:'恒星级黑洞与伴星组成 X 射线双星（如 Cygnus X-1）；LIGO 探测到双黑洞并合引力波。',
    theories:['广义相对论','黑洞物理','引力波'], phenomena:['X 射线双星','事件视界'] },
  { id:'smbh', logSize:13.0, zh:'超大质量黑洞', en:'Supermassive Black Hole', subZh:'10⁶–10¹⁰ M☉', subEn:'10⁶–10¹⁰ M☉',
    category:'compact', color:'#5FB8FF', r:14, image:'assets/sky/obj_smbh.jpg',
    imgCredit:'Event Horizon Telescope Collaboration（M87* 首张黑洞照片）',
    descZh:'栖居星系中心的巨型黑洞，质量达百万至数百亿太阳质量，通过吸积与喷流深刻塑造星系演化。',
    descEn:'Giant black holes at galactic centers, shaping galaxy evolution via accretion and jets.',
    formZh:'起源未完全确定，可能由种子黑洞经长期吸积与并合增长；与星系核球质量紧密相关。',
    paramZh:'质量 10⁶–10¹⁰ M☉；M87* 约 6.5×10⁹ M☉，事件视界阴影直径约 40 微角秒。',
    obsZh:'2019 年事件视界望远镜（EHT）发布 M87* 首张黑洞阴影照片；银心人马座 A* 亦被成像。',
    theories:['广义相对论','黑洞物理','星系演化'], phenomena:['吸积盘','相对论喷流'] },

  // ===== 爆发与高能 =====
  { id:'supernova', logSize:11.6, zh:'超新星遗迹', en:'Supernova Remnant', subZh:'~数–数十 ly', subEn:'~few–tens ly',
    category:'explosive', color:'#FF6A3D', r:13, image:'assets/sky/obj_supernova.jpg',
    imgCredit:'NASA, ESA, J. Hester (ASU)（哈勃·蟹状星云）',
    descZh:'大质量恒星生命终点的剧烈爆炸，瞬间亮度堪比整个星系，向星际空间抛洒重元素。',
    descEn:'The violent explosion ending a massive star’s life, briefly outshining its whole galaxy.',
    formZh:'核心坍缩型（II 型，>8 M☉）或白矮星吸积越过钱德拉塞卡极限的热核爆炸（Ia 型）。',
    paramZh:'峰值光度可达 10⁹–10¹⁰ L☉；抛射速度 ~10⁴ km/s；遗迹（如蟹状星云）持续膨胀。',
    obsZh:'1054 年中国天文官记录超新星（催生蟹状星云）；SN 1987A 是近代最近邻超新星；Ia 作宇宙距离标准烛光。',
    theories:['恒星演化','核物理'], phenomena:['激波','重元素核合成'] },
  { id:'grb', logSize:11.9, zh:'伽马射线暴', en:'Gamma-ray Burst', subZh:'数秒–数分钟', subEn:'seconds–minutes',
    category:'explosive', color:'#FF9A3D', r:12, image:'assets/sky/obj_grb.jpg',
    imgCredit:'NASA, ESA, CSA, STScI, L. Hustak（韦布·GRB 250314A 艺术概念）',
    descZh:'宇宙中最猛烈的高能爆发，数秒至数分钟的伽马射线闪光，源于大质量恒星坍缩或致密天体并合。',
    descEn:'The most violent high-energy flashes in the cosmos, lasting seconds to minutes.',
    formZh:'长暴（>2 s）对应坍缩型超新星；短暴（<2 s）对应双中子星/黑洞并合，常伴随千新星。',
    paramZh:'各向同性等效能量可达 10⁵¹–10⁵⁴ erg；喷流接近光速；红移 z 可达 9 以上（极早期宇宙）。',
    obsZh:'1991 年 Compton/BATSE 统计分类；2017 GRB 170817A 与 GW170817 并合对应，确认短暴起源。',
    theories:['高能天体物理','引力波'], phenomena:['相对论喷流','千新星'] },

  // ===== 宇宙学与起源 =====
  { id:'bigBang', logSize:0, zh:'大爆炸', en:'Big Bang', subZh:'宇宙开端 ~138 亿年前', subEn:'~13.8 Gyr ago',
    category:'cosmology', color:'#FFE9B0', r:14, noAxis:true, image:'assets/sky/sky_cmb.jpg',
    imgCredit:'ESA Planck（宇宙微波背景全天图，CC BY-SA 3.0 IGO）',
    descZh:'宇宙的开端——约 138 亿年前，时空与物质从极高温高密度状态膨胀而来，并非空间中某点的"爆炸"。',
    descEn:'The origin of the universe ~13.8 Gyr ago, an expansion of spacetime and matter from an extremely hot, dense state.',
    formZh:'暴涨之后宇宙从炽热稠密态膨胀冷却，原初核合成产生轻元素，38 万年后光子退耦形成宇宙微波背景。',
    paramZh:'宇宙年龄 ≈138 亿年；CMB 温度 2.725 K；哈勃常数 ~70 km/s/Mpc。',
    obsZh:'1965 年彭齐亚斯与威尔逊发现 CMB；轻元素丰度与暴涨理论观测一致（WMAP/Planck）。',
    theories:['宇宙学','暴涨理论','ΛCDM 模型'], phenomena:['宇宙微波背景','轻元素核合成'] },

  // ===== 理论假想天体 =====
  { id:'wormhole', logSize:13.4, zh:'虫洞', en:'Wormhole', subZh:'理论时空隧道', subEn:'theoretical tunnel',
    category:'hypothetical', color:'#C0A0FF', r:12, image:'assets/sky/obj_wormhole.svg',
    imgCredit:'程序化科学可视化',
    descZh:'广义相对论允许的一种假想时空隧道，理论上可连接宇宙中遥远两点甚至不同时代，又称爱因斯坦–罗森桥。',
    descEn:'A hypothetical spacetime tunnel permitted by general relativity, also called an Einstein–Rosen bridge.',
    formZh:'由史瓦西解或爱因斯坦–罗森桥导出；可穿越虫洞需"奇异物质"（负能量密度）撑开喉部。',
    paramZh:'纯理论；喉部需违反平均零能量条件的奇异物质，目前无任何观测证据。',
    obsZh:'尚无观测；属理论解，研究集中于量子引力与时空拓扑。',
    theories:['广义相对论','量子引力'], phenomena:['爱因斯坦–罗森桥','奇异物质'] },
  { id:'whiteHole', logSize:14.0, zh:'白洞', en:'White Hole', subZh:'理论 · 黑洞镜像', subEn:'theoretical · black-hole mirror',
    category:'hypothetical', color:'#D4B8FF', r:12, image:'assets/sky/obj_whitehole.svg',
    imgCredit:'程序化科学可视化',
    descZh:'与黑洞时间反演对称的假想天体，只向外喷吐物质与光、不允许任何东西进入，是黑洞的镜像。',
    descEn:'A hypothetical time-reversed counterpart of a black hole—ejecting matter and light, allowing nothing in.',
    formZh:'由广义相对论方程的时间反演解给出；与白洞相连即构成虫洞的两端。',
    paramZh:'纯理论；事件视界为单向边界（只出不进），宇宙学上未发现实例。',
    obsZh:'尚无观测；有假说将某些伽马射线暴解释为白洞，但缺乏证据。',
    theories:['广义相对论','量子引力'], phenomena:['单向视界'] },
];

// 分类元数据（驱动标签栏与清单配色）
const CATEGORIES = [
  { id:'scale',       zh:'尺度结构',     en:'Scale Structure',          color:'#6FA8DC' },
  { id:'stellar',     zh:'恒星演化',     en:'Stellar Evolution',        color:'#E8763C' },
  { id:'compact',     zh:'致密天体',     en:'Compact Objects',          color:'#9FE0FF' },
  { id:'explosive',   zh:'爆发与高能',   en:'Explosive & High-Energy',  color:'#FF6A3D' },
  { id:'cosmology',   zh:'宇宙学与起源', en:'Cosmology & Origin',       color:'#FFE9B0' },
  { id:'hypothetical',zh:'理论假想天体', en:'Hypothetical',             color:'#C0A0FF' },
];

function chips(arr){
  return (arr||[]).map(x => `<span class="jc-chip">${esc(x)}</span>`).join('');
}

// 仰望星空 · 随尺度淡入淡出的背景图（各阶段中心对应一个天体节点）
// 真实科学图：NASA 公共领域（银河 / 黑色弹珠·城市灯火 / 蓝色弹珠 / 太阳系）· ESA Planck CMB（CC BY-SA 3.0 IGO）
// 程序化科学可视化（无实拍照，与微观侧同原则）：本星系群 / 室女座超星系团 / 拉尼亚凯亚超星系团
const SKY_BG = [
  { id:'observer',  log:0,    img:'assets/sky/sky_observer.jpg' },     // 你仰望的银河（NASA-JPL）
  { id:'city',      log:3,    img:'assets/sky/sky_city.jpg' },          // 城市灯火·地球之夜（NASA Black Marble）
  { id:'earth',     log:6.8,  img:'assets/sky/sky_earth.jpg' },         // 蓝色弹珠（NASA Blue Marble）
  { id:'solar',     log:16,   img:'assets/sky/sky_solarsystem.jpg' },   // 太阳系（NASA）
  { id:'galaxy',    log:21,   img:'assets/sky/sky_galaxy.png' },        // 银河系·NGC 6744（ESA/Hubble 银河系"双胞胎"正面旋涡真照）
  { id:'group',     log:23,   img:'assets/sky/sky_group.jpg' },         // 本星系群（ESA/Hubble M81/M82 星系群真实照）
  { id:'virgo',     log:24,   img:'assets/sky/sky_virgo.svg' },         // 室女座超星系团·扁平薄饼（程序化 SVG）
  { id:'laniakea',  log:24.7, img:'assets/sky/sky_laniakea.svg' },      // 拉尼亚凯亚超星系团·宇宙纤维网（程序化 SVG）
  { id:'cmb',       log:26.9, img:'assets/sky/sky_cmb.jpg' },           // 普朗克 CMB 全天图（ESA）
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
  bgCredit.innerHTML = '背景图：NASA（蓝色弹珠 / 黑色弹珠·城市灯火 / 银河 / 太阳系 / 银河系结构图）· ESA Planck（CMB 全天图，CC BY-SA 3.0 IGO）· 本星系群 / 室女座 / 拉尼亚凯亚为程序化科学可视化';
  mount.appendChild(bgCredit);                   // 署名条，压在交互层之上、提示之下
}

// 给定当前视角中心对数尺度 c，返回每层不透明度。
// 模型：相邻图在各自中点之间平滑交叉；窗口外最近图全显 —— 任意尺度都恰好有背景，无空白死区。
// 过渡半宽逐区间计算：t_i = min(1.5, 间隔_i/2 × 0.9)，保证 t_i ≤ 间隔_i/2，
// 各区间交叉窗口互不重叠，每个节点中心都能满显（避免负值/不满显的旧坑）。
function bgOpacities(c){
  const logs = SKY_BG.map(s => s.log);
  const mids = [];
  const half = [];
  for (let i = 0; i < logs.length - 1; i++){
    mids.push((logs[i] + logs[i+1]) / 2);
    half.push(Math.min(1.5, (logs[i+1] - logs[i]) / 2 * 0.9));
  }
  const ops = logs.map(() => 0);
  let nearest = 0;
  for (let i = 0; i < logs.length; i++)
    if (Math.abs(c - logs[i]) < Math.abs(c - logs[nearest])) nearest = i;
  ops[nearest] = 1;
  for (let i = 0; i < mids.length; i++){
    const bm = mids[i], t = half[i];
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
  const img = node.image ? `
    <div class="journey-card__imgwrap">
      <img class="journey-card__img" src="${esc(node.image)}" alt="${esc(node.zh)}" loading="lazy" />
      ${node.imgCredit ? `<div class="journey-card__credit">${esc(node.imgCredit)}</div>` : ''}
    </div>` : '';
  const sec = (h, t) => t ? `<div class="journey-card__sec">${esc(h)}</div><p class="journey-card__desc">${esc(t)}</p>` : '';
  return `
    <div class="journey-card__inner">
      <button class="journey-card__close" aria-label="关闭">×</button>
      ${img}
      <div class="journey-card__title">${esc(title)} <span class="journey-card__en">${esc(en)}</span></div>
      <div class="journey-card__scale">特征尺度 · ${esc(scale)}</div>
      <p class="journey-card__desc">${esc(desc)}</p>
      <p class="journey-card__desc journey-card__desc--en">${esc(enDesc)}</p>
      ${sec('形成机制', node.formZh)}
      ${sec('典型参数', node.paramZh)}
      ${sec('关键观测证据', node.obsZh)}
      ${node.theories ? `<div class="journey-card__sec">相关理论</div><div class="jc-chips">${chips(node.theories)}</div>` : ''}
      ${node.phenomena ? `<div class="journey-card__sec">典型现象</div><div class="jc-chips">${chips(node.phenomena)}</div>` : ''}
    </div>`;
}

let controller = null;
let lastNode = null;

// 类型筛选相关模块状态
let skyMount = null;
let activeCat = null;
let catBarEl = null;
let catListEl = null;

function onNodeClick(node, api){
  lastNode = node;
  if (!node.noAxis) api.focusNode(node);   // 无空间尺度者（大爆炸）只弹卡、不平移尺度轴
  api.showCard(cardHTML(node));
}

// 每次 render / refreshLang 之后：给轴上节点补 data-category，移除无轴节点（大爆炸）
function applyNodeCategories(){
  if (!skyMount) return;
  skyMount.querySelectorAll('.journey-node').forEach(g => {
    const n = SKY_NODES.find(x => x.id === g.dataset.id);
    if (!n) return;
    g.dataset.category = n.category || '';
    if (n.noAxis) g.remove();            // 大爆炸等无空间尺度者不画在轴上
  });
}

// 按当前激活分类高亮/淡化轴上节点
function applyCategoryFilter(){
  if (!skyMount) return;
  skyMount.querySelectorAll('.journey-node').forEach(g => {
    const cat = g.dataset.category;
    if (!activeCat){ g.classList.remove('is-dimmed','is-highlight'); return; }
    if (cat === activeCat){ g.classList.add('is-highlight'); g.classList.remove('is-dimmed'); }
    else { g.classList.add('is-dimmed'); g.classList.remove('is-highlight'); }
  });
}

// 构建顶部分类标签栏（动态创建）
function buildSkyTabs(mount){
  const bar = document.createElement('div');
  bar.className = 'sky-tabs';
  const mk = (label, cat) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sky-tab';
    b.textContent = label; b.dataset.cat = cat == null ? '' : cat;
    b.addEventListener('click', () => setCategoryFilter(cat));
    return b;
  };
  bar.appendChild(mk('全部', null));
  CATEGORIES.forEach(c => bar.appendChild(mk(c.zh, c.id)));
  mount.appendChild(bar);
  catBarEl = bar;
}

// 切换语言时刷新标签栏激活态（文字固定中文，无需换文案）
function refreshSkyTabs(){ updateTabActive(); }

function updateTabActive(){
  if (!catBarEl) return;
  catBarEl.querySelectorAll('.sky-tab').forEach(b =>
    b.classList.toggle('is-active', b.dataset.cat === (activeCat || '')));
}

function setCategoryFilter(cat){
  if (activeCat === cat){ clearCategoryFilter(); return; }
  activeCat = cat;
  updateTabActive();
  applyCategoryFilter();
  buildCatList(cat);
}

function clearCategoryFilter(){
  activeCat = null;
  updateTabActive();
  applyCategoryFilter();
  closeCatList();
}

// 构建某类天体清单（右侧浮层）
function buildCatList(cat){
  if (!catListEl){
    catListEl = document.createElement('div');
    catListEl.className = 'sky-catlist';
    skyMount.appendChild(catListEl);
  }
  const c = CATEGORIES.find(x => x.id === cat);
  const items = SKY_NODES.filter(n => n.category === cat);
  catListEl.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'sky-catlist__head';
  head.innerHTML = `<span class="sky-catlist__title">${esc(c ? c.zh : cat)}</span>` +
                   `<button class="sky-catlist__close" aria-label="关闭">×</button>`;
  catListEl.appendChild(head);
  head.querySelector('.sky-catlist__close').addEventListener('click', clearCategoryFilter);
  if (!items.length){
    const e = document.createElement('div'); e.className = 'sky-catlist__empty';
    e.textContent = '（暂未收录该类的天体）'; catListEl.appendChild(e); return;
  }
  items.forEach(n => {
    const it = document.createElement('div');
    it.className = 'sky-catlist__item';
    it.innerHTML = `<span class="sky-catlist__swatch" style="background:${n.color || '#c9a24e'}"></span>` +
                   `<span><span class="sky-catlist__name">${esc(n.zh)}</span><br>` +
                   `<span class="sky-catlist__sub">${esc(n.en || '')}</span></span>`;
    it.addEventListener('click', () => onNodeClick(n, controller));  // 复用既有入口
    catListEl.appendChild(it);
  });
}

function closeCatList(){ if (catListEl){ catListEl.remove(); catListEl = null; } }

export function initSky(mount){
  if (controller) return;
  skyMount = mount;
  buildSkyBg(mount);
  buildSkyTabs(mount);
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
  if (!controller) return;
  controller.render();
  requestAnimationFrame(() => {
    controller.render();
    applyNodeCategories();
    applyCategoryFilter();
  });
  applyNodeCategories();
  applyCategoryFilter();
}

export function refreshSkyLang(){
  if (!controller) return;
  controller.refreshLang();
  // refreshLang 会重建节点 g（丢失 data-category），须立即重写
  applyNodeCategories();
  applyCategoryFilter();
  refreshSkyTabs();
  if (activeCat) buildCatList(activeCat);
  if (lastNode && !lastNode.family) controller.showCard(cardHTML(lastNode));
}

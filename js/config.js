// 站点配置：纪元、视图、关系类型、维度标签、布局排名
export const ERAS = {
  'classical':       { id:'classical',       name:'经典物理',   range:'1600–1899',  raw:'#C29A4E' },
  'relativity':      { id:'relativity',      name:'相对论革命', range:'1900–1915',  raw:'#41518F' },
  'quantum':         { id:'quantum',         name:'量子革命',   range:'1900–1930',  raw:'#7A5BA6' },
  'standard-model':  { id:'standard-model',  name:'标准模型',   range:'1940s–1970s',raw:'#357A5E' },
  'frontier':        { id:'frontier',        name:'前沿探索',   range:'1980s–至今', raw:'#6B4E8C' },
};
export const ERA_ORDER = ['classical','relativity','quantum','standard-model','frontier'];

export const EDGE_CLASS = {
  inherit:   'edge--inherit',
  branch:    'edge--branch',
  revolution: 'edge--revolution',
  unify:     'edge--unify',
  conflict:  'edge--conflict',
};

// 范式革命边（from|to 表示 to 推翻/超越 from 的旧范式）
export const REVOLUTION_SET = new Set([
  'newton-mechanics|special-relativity',
  'newton-mechanics|quantum-mechanics',
  'maxwell-em|special-relativity',
]);
// 统一关系边（这些节点的所有入边为「统一」发光环线）
export const UNIFY_NODES = new Set(['electroweak','standard-model']);

// 12 维度标签（顺序即侧边栏标签顺序）；formula 取自节点级，figures 合并 biography
export const DIMENSIONS = [
  { key:'history',     label:'📖 脉络' },
  { key:'figures',     label:'👤 人物' },
  { key:'branches',    label:'🔬 分支' },
  { key:'works',       label:'📚 作品' },
  { key:'impact',      label:'🌐 溢出' },
  { key:'paradigm',    label:'⛓ 范式' },
  { key:'tools',       label:'🔧 工具' },
  { key:'experiments', label:'🧪 实验' },
  { key:'debate',      label:'⚔ 交锋' },
  { key:'limits',      label:'⚠ 局限' },
  { key:'future',      label:'🔮 猜想' },
  { key:'formula',     label:'📐 公式' },
];

// 浅色视图布局用的排名
export const ERA_RANK = { classical:0, relativity:1, quantum:2, 'standard-model':3, frontier:4 };
export const SCALE_RANK = { mesoscopic:0, cosmic:1, microscopic:2, unified:3, feedback:4 };
export const SCALE_ORDER = ['mesoscopic','cosmic','microscopic','unified','feedback'];
export const SCALE_LABEL = {
  mesoscopic:'宏观', cosmic:'宇观', microscopic:'微观', unified:'统一', feedback:'反哺',
};
export const SCALE_COLORS = {
  mesoscopic:  { raw:'#A07840', name:'宏观' },   // 经典棕
  cosmic:      { raw:'#41518F', name:'宇观' },   // 宇宙蓝
  microscopic: { raw:'#6B489E', name:'微观' },   // 量子紫
  unified:     { raw:'#28684E', name:'统一' },   // 统一绿
  feedback:    { raw:'#6B4E8C', name:'反哺' },   // 前沿紫
};
/* 尺度维度概念解析 + 延伸：一行小字（label 下）+ 点击展开面板（concept / extend 两段） */
export const SCALE_DESC = {
  mesoscopic: {
    tag: '日常可感尺度 · 经典物理',
    concept: '宏观尺度指我们日常直接感知的世界：从尘埃到行星、从钟摆到星系尺度的运动。这一层由牛顿力学、热力学与麦克斯韦电磁学主导，物理量连续、确定、可同时精确测量，是“决定论宇宙”的舞台。',
    extend: '宏观理论看似完备，却在两条边界上漏底：高速（接近光速）暴露出相对论的修正，微小（原子尺度）暴露出量子的离散。19 世纪末的“两朵乌云”（以太漂移、黑体辐射）正是从宏观裂缝里长出了 20 世纪物理革命。',
  },
  cosmic: {
    tag: '宇宙 / 星系尺度 · 引力主导',
    concept: '宇观尺度指向星系、宇宙学层级（百万光年以上）。这里引力成为绝对主角，时空本身可被质量弯曲。狭义与广义相对论重构了时间、空间与因果，ΛCDM 模型与大统一框架把宇宙膨胀、暗物质、暗能量纳入描述。',
    extend: '宇观与宏观的桥梁是“引力”：同一套广义相对论既解释苹果落地也解释引力波。但引力在极小尺度（普朗克尺度）发散，迫使它必须与微观的量子理论握手——这正是“统一”一档的来由。',
  },
  microscopic: {
    tag: '原子 / 亚原子尺度 · 量子主导',
    concept: '微观尺度是原子及以下：电子、光子、夸克。这里物理量离散、概率化，粒子同时是波。从普朗克量子假说、玻尔模型到量子力学与标准模型，微观层统一了三种基本力，并预言了希格斯机制。',
    extend: '微观理论是当代最精确的物理框架，却与宇观的引力互不兼容。更妙的是，微观的叠加与纠缠正被“反哺”回技术：量子信息与原算正是从微观原理长出的新引擎。',
  },
  unified: {
    tag: '理论最前沿 · 试图统一四种力',
    concept: '“统一”不是某个尺度，而是尺度维度的尽头目标：把引力与量子力、乃至四种基本相互作用纳入同一套数学框架。弦论 / M 理论、圈量子引力、量子引力实验检验、大统一理论（GUT），都在这条未竟之路上。',
    extend: '统一理论目前多为数学构想而非实验确证，但它定义了物理学的“终极问题”：在普朗克尺度（10⁻³⁵ 米）上，空间本身是否离散？时间是否涌现？这是连接宇观与微观的钥匙。',
  },
  feedback: {
    tag: '从微观原理回哺技术 · 交叉前沿',
    concept: '“反哺”代表物理的回流：基础微观理论转化为新能力。量子信息科学与量子计算把叠加、纠缠、测量从“诠释难题”变成可操控资源，催生量子算法、量子通信与量子纠错。',
    extend: '反哺也反向推动基础：量子计算机可模拟强关联系统，帮助验证凝聚态与量子场论；量子精密测量逼近标准模型参数的极限。微观→技术→再反哺微观，构成尺度维度里的闭环。',
  },
};

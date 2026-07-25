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
  { key:'terms',       label:'🧩 术语' },
];

// 浅色视图布局用的排名
export const ERA_RANK = { classical:0, relativity:1, quantum:2, 'standard-model':3, frontier:4 };
export const SCALE_RANK = { microscopic:0, mesoscopic:1, cosmic:2, unified:3, feedback:4 };
export const SCALE_ORDER = ['microscopic','mesoscopic','cosmic','unified','feedback'];
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
/* 尺度维度概念解析 + 延伸（结构化）
 * concept: { def 定义, scale 特征尺度, theories[] 代表理论, phenomena[] 典型现象 }
 * extend[]: 尺度间渗透，每项 { rel 关系标签, text 说明 }；rel 与尺度关联图箭头对应 */
export const SCALE_DESC = {
  microscopic: {
    tag: '原子 / 亚原子尺度 · 量子主导',
    concept: {
      def: '原子及以下的微观世界（电子、光子、夸克等），物理量离散且概率化，粒子同时具备波动与粒子双重属性。这是当代最精确、也最反直觉的物理层级，统一了强、弱、电磁三种基本相互作用。',
      scale: '10⁻¹⁰ m（原子半径）– 10⁻¹⁵ m（原子核）；典型能量 1 eV – 10² GeV',
      theories: ['量子力学', '量子场论', '标准模型（电弱 + 量子色动力学）'],
      phenomena: ['光电效应', '原子分立光谱', '量子纠缠', '超导与超流', '放射性衰变'],
    },
    extend: [
      { rel: '微观 → 宏观 · 涌现', text: '统计力学从海量微观粒子的运动定律导出宏观热力学量（温度、熵、压强）；量子退相干与对应原理解释微观叠加如何在宏观尺度“塌缩”为确定轨迹；固体能带论从原子能级出发，统一解释了导体、绝缘体与半导体的本质差异。' },
      { rel: '微观 → 宇观 · 统一', text: '微观的强、弱、电磁三力已由标准模型统一，却与宇观的引力互斥。大统一理论（GUT）、弦论与圈量子引力试图在普朗克尺度把引力纳入同一框架，这正是连接微观与宇观的钥匙。' },
      { rel: '微观 → 反哺 · 技术回流', text: '叠加、纠缠、测量从“诠释难题”变成可操控资源：量子计算、量子通信、量子精密测量正是从微观原理长出的新引擎；反哺又反向推动微观研究（如量子模拟强关联多体系统）。' },
    ],
  },
  mesoscopic: {
    tag: '日常可感尺度 · 经典物理适用域',
    concept: {
      def: '人类可直接或间接观测的日常世界，从尘埃到行星、从钟摆到工程结构。这一层由经典物理主导，物理量连续、确定、可同时精确测量，是“决定论宇宙”的舞台。',
      scale: '10⁻³ m – 10⁶ m（毫米到千公里）；速度 ≪ 光速 c；温度 ~ 10⁻² K – 10³ K',
      theories: ['牛顿力学', '热力学与统计物理', '麦克斯韦电磁学'],
      phenomena: ['抛体运动', '热传导', '电磁感应', '声波与机械波', '光的折射与干涉'],
    },
    extend: [
      { rel: '宏观 ← 微观 · 涌现', text: '宏观规律并非独立公理，而是微观统计行为的集体显现：温度是分子平均动能、压强是碰撞动量流、电磁场是电荷运动的宏观平均。19 世纪末“两朵乌云”（以太漂移、黑体辐射）正是从宏观裂缝里催生了相对论与量子革命。' },
      { rel: '宏观 ↔ 宇观 · 引力桥梁', text: '牛顿引力是宏观与宇观的共有语言；广义相对论在宏观（GPS 时间校准、水星近日点进动）与宇观（宇宙膨胀、引力波）同时生效，使引力成为连接两个尺度的桥梁。' },
      { rel: '宏观 → 反哺 · 工程母体', text: '宏观工程为量子技术提供载体与接口：低温恒温器、微波谐振腔、超导电路，正是微观量子态得以被制备、读取与放大的物理平台。' },
    ],
  },
  cosmic: {
    tag: '宇宙 / 星系尺度 · 引力主导',
    concept: {
      def: '星系与宇宙学层级（百万光年以上），引力成为绝对主角，时空本身可被质量弯曲。这里上演着宇宙的诞生、膨胀与终极命运，也是检验引力理论的终极实验室。',
      scale: '> 10²⁰ m（星系际）；典型 > 10²² m（百万光年）；时间尺度 10⁹ – 10¹⁰ 年',
      theories: ['狭义相对论', '广义相对论', 'ΛCDM 宇宙学'],
      phenomena: ['引力透镜', '宇宙膨胀', '引力波', '黑洞事件视界', '暗物质与暗能量'],
    },
    extend: [
      { rel: '宇观 ↔ 宏观 · 引力桥梁', text: '同一套广义相对论既描述苹果落地也解释星系旋转；牛顿引力在弱场极限下自然回归为宏观日常引力，使宇观与宏观共享同一座“引力之桥”。' },
      { rel: '宇观 ← 微观 · 统一', text: '宇宙极早期（普朗克时刻）所有尺度合一，引力与量子效应同等重要。理解宇宙起源与奇点必须依赖尚未完成的量子引力理论——这是宇观向微观发出的求援。' },
      { rel: '宇观 → 反哺 · 观测驱动', text: '宇宙学观测（CMB、超新星、引力波）不断为微观理论设定边界条件（如中微子质量、暗能量状态方程），反向约束统一理论的参数空间。' },
    ],
  },
  unified: {
    tag: '理论最前沿 · 统一四种基本相互作用',
    concept: {
      def: '“统一”不是某个空间尺度，而是尺度维度的尽头目标：把引力与量子力、乃至强、弱、电磁四种基本相互作用，纳入同一套自洽的数学框架。',
      scale: '普朗克尺度 10⁻³⁵ m；普朗克能量 ~ 10¹⁹ GeV；普朗克温度 ~ 10³² K',
      theories: ['弦论 / M 理论', '圈量子引力', '大统一理论（GUT）'],
      phenomena: ['对称性自发破缺', '霍金辐射（量子引力效应）', '暴胀（假说）', '额外维度（假说）'],
    },
    extend: [
      { rel: '统一 ← 微观', text: '标准模型已在微观尺度统一三种力，但缺引力。GUT 进一步尝试把强、弱、电磁合并，并预言质子衰变与磁单极——这些都需在微观极高能标验证。' },
      { rel: '统一 → 宇观', text: '宇宙极早期正是统一理论的主战场：暴胀、原初引力波、宇宙起源都依赖量子引力。统一理论一旦建成，将同时解释最小与最大的奥秘。' },
      { rel: '统一 → 反哺', text: '为验证统一理论发展出的数学工具（纤维丛、拓扑场论、AdS/CFT 对偶）已反哺凝聚态、统计物理与量子信息，体现“高维理论反哺低维应用”。' },
    ],
  },
  feedback: {
    tag: '从微观原理回哺技术 · 交叉前沿',
    concept: {
      def: '“反哺”代表物理的回流：基础微观理论转化为可操控的新能力，形成“微观 → 技术 → 再反哺微观”的闭环。它是尺度维度里最“接地气”的一环。',
      scale: '跨越尺度：以微观量子态为资源，输出宏观可工程化的技术',
      theories: ['量子信息科学', '量子计算', '量子通信', '量子精密测量'],
      phenomena: ['量子算法（Shor / Grover）', '量子纠错码', '量子密钥分发', '量子模拟强关联系统'],
    },
    extend: [
      { rel: '反哺 ← 微观', text: '叠加、纠缠、测量本是微观的“怪异”性质，如今被编码为量子比特与量子门，成为计算与通信的新资源。' },
      { rel: '反哺 → 宏观', text: '量子计算机可模拟宏观难以处理的强关联多体系统，帮助验证凝聚态与量子场论；量子精密测量（原子钟、冷原子干涉仪）逼近标准模型参数的极限，赋能宏观导航与探测。' },
      { rel: '反哺 → 宇观', text: '光钟与脉冲星计时等精密测量为检验广义相对论、搜寻原初引力波提供手段，把微观的计时精度延伸到宇宙尺度。' },
    ],
  },
};

/* 尺度维度跨尺度渗透关系 —— 用于 SVG 关系图与顶部导航条联动
 * id: 内部标识；from/to: 源/目标尺度；label: 箭头标签；rel: 与 SCALE_DESC.extend[].rel 及 HTML data-rel 对应 */
export const SCALE_RELATIONS = [
  { id: 'emergence',   from: 'microscopic', to: 'mesoscopic',  label: '涌现',     rel: '微观 → 宏观 · 涌现',           color: '#6B489E' },
  { id: 'gravity',     from: 'mesoscopic',  to: 'cosmic',      label: '引力桥梁', rel: '宏观 ↔ 宇观 · 引力桥梁',       color: '#A07840' },
  { id: 'unification', from: 'cosmic',      to: 'unified',     label: '大统一',   rel: '统一 → 宇观',                  color: '#41518F' },
  { id: 'feedback',    from: 'unified',     to: 'feedback',    label: '技术回流', rel: '统一 → 反哺',                  color: '#28684E' },
  { id: 'loop',        from: 'feedback',    to: 'microscopic', label: '闭环',     rel: '反哺 ← 微观',                  color: '#7A5BA6' },
];

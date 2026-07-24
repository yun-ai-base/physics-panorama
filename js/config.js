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
  mesoscopic:'中观', cosmic:'宇观', microscopic:'微观', unified:'统一', feedback:'反哺',
};
export const SCALE_COLORS = {
  mesoscopic:  { raw:'#A07840', name:'中观' },   // 经典棕
  cosmic:      { raw:'#41518F', name:'宇观' },   // 宇宙蓝
  microscopic: { raw:'#6B489E', name:'微观' },   // 量子紫
  unified:     { raw:'#28684E', name:'统一' },   // 统一绿
  feedback:    { raw:'#6B4E8C', name:'反哺' },   // 前沿紫
};

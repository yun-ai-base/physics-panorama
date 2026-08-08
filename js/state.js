// 全局统一状态：所有交互仅修改 state，再由 render 刷新
export const state = {
  scale: 1,
  tx: 0,
  ty: 0,
  lang: 'zh',               // 界面语言：'zh' 中文 / 'en' 英文（仅 UI 文案，正文综述/术语保持中文）
  selected: null,          // 选中节点 id
  highlight: new Set(),    // 路径高亮节点集合
  expandAll: false,        // 是否展开全链路
  filterEra: null,         // 纪元筛选（null = 全部）
  activeEra: null,         // 当前激活/选中的纪元（顶部导航或时间线标签点击，UI 高亮 + 综述）
  activeScale: null,       // 当前激活/选中的尺度维度（尺度视图标签点击，UI 高亮 + 概念解析面板）
  onlyCore: false,           // 仅显示主干（2026-08-08 起默认不勾选：首屏展示全部节点）
  pathIds: null,           // 阅读路径（READER_PATHS id）筛选集合；非 null 时仅显示该集合节点并高亮
  view: 'timeline',        // 当前视图
  glossaryEra: 'classical', // 术语表当前选中的纪元（classical/relativity/quantum/standard-model/frontier）
  tour: null,              // 漫游模式
  sidebarOpen: false,
  sidebarTab: null,        // 当前打开的侧边栏标签
  termFocus: null,         // 当前高亮定位的术语名
};

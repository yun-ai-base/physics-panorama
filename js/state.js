// 全局统一状态：所有交互仅修改 state，再由 render 刷新
export const state = {
  scale: 1,
  tx: 0,
  ty: 0,
  selected: null,          // 选中节点 id
  highlight: new Set(),    // 路径高亮节点集合
  expandAll: false,        // 是否展开全链路
  filterEra: null,         // 纪元筛选（null = 全部）
  activeEra: null,         // 当前激活/选中的纪元（顶部导航或时间线标签点击，UI 高亮 + 综述）
  activeScale: null,       // 当前激活/选中的尺度维度（尺度视图标签点击，UI 高亮 + 概念解析面板）
  onlyCore: true,          // 仅显示主干
  view: 'timeline',        // 当前视图
  tour: null,              // 漫游模式
  sidebarOpen: false,
  sidebarTab: null,        // 当前打开的侧边栏标签
  termFocus: null,         // 当前高亮定位的术语名
};

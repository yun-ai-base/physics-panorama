# Physics Panorama · 物理学全景图

将物理学 300+ 年的演化路径可视化为一张**可交互、可探索的全景图谱**。

## 视觉与设计

- **风格**：浅色清雅 · 暗金点缀 · 贵而不俗（暖象牙底 + 衬线标题 + 大量留白 + 暗金点睛）
- **技术**：纯静态零构建（HTML5 + CSS3 + 原生 ES Modules + SVG），公式用 KaTeX（CDN 引入，加载失败时自动回退为 LaTeX 文本）
- **部署**：GitHub Pages（详见下方）

## 本地预览

站点通过 `fetch` 加载 `nodes.json` / `physics-data.json`，**必须用本地服务器打开**（`file://` 会被浏览器 CORS 拦截）：

```bash
cd physics-panorama
python -m http.server 8000
# 浏览器打开 http://localhost:8000/
```

> 若本机有全局代理/安全软件拦截 localhost，请在 Chrome 中确认已勾选「绕过代理设置 for localhost」，或改用 `127.0.0.1` 而非 `localhost`。

## 目录结构

```
physics-panorama/
├── index.html              # 主页面（浅色主题 + SVG 容器 + 侧边栏）
├── .nojekyll               # 禁止 GitHub Pages 的 Jekyll 处理（保留 _ 开头文件）
├── css/  main.css timeline.css sidebar.css responsive.css
├── js/   config.js state.js utils.js views.js
│         renderer.js interaction.js sidebar.js app.js tour.js
│         data/portraitMap.js
├── assets/portraits/       # 物理学家肖像（缺图者用淡金首字占位）
├── nodes.json              # 统一数据源（31 节点，深度节点已内联 12 维）
├── physics-data.json       # 关系冲突边 + 五纪元序言
├── dev/                    # 源/中间/审阅文件（不进站点渲染）
└── 设计方案.md  物理学十三大学说深度阐述.md  物理学演化路径.md
```

## 部署到 GitHub Pages

> **已上线：** https://yun-ai-base.github.io/physics-panorama/

1. 将本目录作为仓库根推送到 GitHub（`main` 分支）。
2. 仓库 **Settings → Pages → Build and deployment → Source = Deploy from a branch → Branch = main / root**。
3. 站点根已含 `.nojekyll`，无需 Jekyll 构建；所有路径使用相对路径，可直接在子路径下工作。
4. 分享：任意筛选/选中状态都会写入 URL（如 `?node=quantum-mechanics&era=quantum`），复制即可定位同一视图。

## 数据来源

- `nodes.json`：31 个学说/事件节点，含 `prevIds`（边单向生成）、`scale` 尺度标签、`depth`（13 个深度理论内联 12 维内容）、`maturity` 成熟度。
- `physics-data.json`：`conflicts`（理论冲突边，已通过审阅清洗，零引用断裂）、`summaries`（五纪元序言卡）。
- 深度内容源自《物理学十三大学说深度阐述》。

## 已知待办（Phase 2）

- 引导式漫游（3 分钟/10 分钟）、人物索引视图、搜索实时联想高亮、多视图动画过渡、英文切换、收藏笔记。

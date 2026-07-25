import { state } from './state.js';
import { esc, chain } from './utils.js';
import { ERAS, DIMENSIONS, SCALE_LABEL, SCALE_COLORS, SCALE_DESC } from './config.js';
import { avatarImg, bindAvatars } from './data/portraitMap.js';

let NODES = [], SUMMARIES = {};
const byId = new Map();
const MATURITY_LABEL = { foundation:'🏛 地基型', established:'🔬 成熟型', speculative:'🔮 探索型' };

export function initSidebar(nodes, summaries) {
  NODES = nodes; SUMMARIES = summaries || {};
  byId.clear(); nodes.forEach(n => byId.set(n.id, n));
}

/* ─��� 人物行 ─────────────────────────────────────────── */
function figuresHTML(n) {
  if (!n.figures || !n.figures.length) return '';
  return `<div class="sb-figures">${n.figures.map(f =>
    `<div class="sb-fig">${avatarImg(f)}<span class="sb-fig__name">${esc(f)}</span></div>`
  ).join('')}</div>`;
}

/* ── 智能内容解析器 ─────────────────────────────────── */

/** 把内联 **bold** → <strong>，*italic* → <em> */
function inlineBoldToTag(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
             .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/**
 * 检测文本是否为"时间线索引格式"。
 * 严格条件：必须包含 ≥3 组「2个以上中文/字母 + （年份数据」模式。
 * 普通传记/论述即使含年份也不会通过（因为年份前没有足够的前缀文字）。
 */
function looksLikeTimeline(block) {
  const marks = (block.match(/[\u4e00-\u9fff\u0041-\u007a]{2,}（\d{3,4}[-—–]?\d{0,4}年?/g) || []);
  return marks.length >= 3;
}

/**
 * 安全的时间线拆分——只在 looksLikeTimeline() 返回 true 后调用。
 * 用 matchAll 找出每个「前缀文字+（年份」的位置，在其前后切割。
 */
function splitTimelineItemsSafe(block) {
  const items = [];
  const re = /[\u4e00-\u9fff\u0041-\u007a]{2,}（(\d{3,4}[-—–]?\d{0,4}年?)/g;
  let lastEnd = 0;
  let match;
  while ((match = re.exec(block)) !== null) {
    const prefix = block.slice(lastEnd, match.index).trim();
    if (prefix.length > 10) items.push({ year: '', text: prefix });
    items.push({ year: match[1], text: match[0] });
    lastEnd = match.index + match[0].length;
  }
  const tail = block.slice(lastEnd).trim();
  if (tail.length > 5) {
    if (items.length > 0) items[items.length - 1].text += ' ' + tail;
    else items.push({ year: '', text: tail });
  }
  if (items.length < 2) return [{ year: '', text: block }];
  return items.filter(it => it.text.trim().length > 10);
}

/**
 * 核心解析器：将原始长文转为结构化 HTML。
 *
 * 解析规则（按优先级）：
 *   1. #### / ### / ##  markdown 标题 → .sb-section 分区卡片
 *   2. **加粗标题** 开头（:/: ：）→ .sb-section 分区卡片
 *   3. looksLikeTimeline() 通过 → .sb-tl 时间线索引
 *   4. - 开头的列表（≥2项）→ .sb-ref-list 参考文献列表
 *   5. 其他 → .sb-para 普通段落
 */
function parseContent(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return '<p class="sb-empty">暂无内容</p>';

  const blocks = raw.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const html = [];

  for (const block of blocks) {
    // 规则1：markdown # 标题 → 分区卡标题
    const mdHeading = block.match(/^\s*(#{1,4})\s+(.+?)\s*$/);
    if (mdHeading) {
      const level = mdHeading[1].length;
      const title = mdHeading[2].replace(/^\*\*(.+?)\*\*$/, '$1'); // 去掉可能的包裹 **
      html.push(`<div class="sb-section sb-section--ref"><div class="sb-section__title sb-section__title--h${level}">${esc(title)}</div><div class="sb-section__body"></div></div>`);
      continue;
    }

    // 规则2：**标题** 开头 → 分区卡
    const headingMatch = block.match(/^\s*\*\*(.+?)\*\*(?:[\s：:])/);
    if (headingMatch) {
      const title = headingMatch[1];
      let body = block.slice(headingMatch[0].length).trim();
      body = inlineBoldToTag(body);
      html.push(`<div class="sb-section"><div class="sb-section__title">${esc(title)}</div><div class="sb-section__body">${body}</div></div>`);
      continue;
    }

    // 规则3：严格时间线检测
    if (looksLikeTimeline(block)) {
      const items = splitTimelineItemsSafe(block);
      if (items.length >= 2) {
        html.push(`<div class="sb-tl">${items.map(it =>
          `<div class="sb-tl__item">${it.year ? `<span class="sb-tl__year">${esc(it.year)}</span>` : ''}<div class="sb-tl__text">${inlineBoldToTag(it.text)}</div></div>`
        ).join('')}</div>`);
        continue;
      }
    }

    // 规则4：- 开头的列表（≥2项）→ 参考文献列表
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const listItems = lines.filter(l => /^[-*·]\s/.test(l));
    if (listItems.length >= 2 && listItems.length === lines.length) {
      html.push(`<div class="sb-ref-list">${listItems.map(li => {
        const text = li.replace(/^[-*·]\s+/, '');
        // 检测 **分类名：** 前缀作为子标题
        const catMatch = text.match(/^\*\*(.+?)\*\*[：:]\s*$/);
        if (catMatch) return `<div class="sb-ref-list__cat">${esc(catMatch[1])}</div>`;
        return `<div class="sb-ref-list__item">${inlineBoldToTag(text)}</div>`;
      }).join('')}</div>`);
      continue;
    }

    // 规则5：普通段落
    html.push(`<div class="sb-para">${inlineBoldToTag(block)}</div>`);
  }

  return html.join('') || '<p class="sb-empty">暂无内容</p>';
}

/* ── 维度渲染 ─────────────────────────────────────────── */
function renderDim(node, key) {
  // 公式走独立逻辑
  if (key === 'formula') {
    const fs = node.formula || [];
    if (!fs.length) return '<p class="sb-empty">该节点未提供公式</p>';
    return fs.map(f => {
      let tex = '';
      try { tex = window.katex ? katex.renderToString(f.latex || '', { throwOnError: false, displayMode: false }) : esc(f.latex || ''); }
      catch (e) { tex = esc(f.latex || ''); }
      const nameTag = f.name ? `<div class="sb-fm__name">${esc(f.name)}</div>` : '';
      return `<div class="sb-fm">${nameTag}<div class="sb-fm__tex">${tex}</div><div class="sb-fm__plain">${esc(f.plain || '')}</div></div>`;
    }).join('');
  }

  // deep 节点：从 deepContent 取
  if (node.depth === 'deep' && node.deepContent) {
    if (key === 'figures') {
      const a = node.deepContent.figures_detail || '';
      const b = node.deepContent.biography || '';
      const val = (a ? a : '') + (b ? '\n\n' + b : '');
      if (!val.trim()) return '<p class="sb-empty">暂无人物详情</p>';
      return parseContent(val);
    }
    return parseContent(node.deepContent?.[key] || '');
  }

  // light 节点：从基础字段映射
  const map = {
    history: node.summary || '',
    paradigm: node.aha || '',
    limitation: node.limitation || '',
    figures: '',
  };
  if (key in map) {
    if (key === 'figures') {
      if (!node.figures?.length) return '<p class="sb-empty">暂无详情</p>';
      return `<p class="sb-empty">代表人物见上方卡片。${node.summary ? parseContent(node.summary) : ''}</p>`;
    }
    return parseContent(map[key]);
  }

  return '<p class="sb-empty">该节点暂无此维度内容</p>';
}

/* ── 迷你全景缩略图（保留 DOM 但隐藏） ────────────────── */
function miniMapHTML(node) {
  const pts = NODES.map(n => ({ id: n.id, x: n.layout?.timeline?.x ?? 0, y: n.layout?.timeline?.y ?? 0 }));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 300, H = 118, pad = 8;
  const sx = W / (maxX - minX || 1), sy = H / (maxY - minY || 1);
  const dots = pts.map(p => `<circle class="${p.id === node.id ? 'dot--cur' : 'dot--other'}" cx="${pad + (p.x - minX) * sx}" cy="${pad + (p.y - minY) * sy}" r="2.4"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${dots}</svg>`;
}

/* ── 路径上下文 ───────────────────────────────────────── */
function pathCtxHTML(node) {
  const c = chain(NODES, node.id);
  const nm = id => byId.get(id)?.name || id;
  const up = c.parents.length ? c.parents.map(nm).join('、') : '（理论起点）';
  const down = c.children.length ? c.children.map(nm).join('、') : '（脉络延续）';
  return `<div class="sb-path"><span class="sb-path__label">继承自</span> <span class="sb-path__val">${esc(up)}</span><span class="sb-path__sep"></span><span class="sb-path__label">影响至</span> <span class="sb-path__val">${esc(down)}</span></div>`;
}

/* ── 打开节点侧边栏 ───────────────────────────────────── */
export function openNode(id) {
  const node = byId.get(id); if (!node) return;
  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebarBody');
  const era = ERAS[node.era];
  const isDeep = node.depth === 'deep' && node.deepContent;
  const scaleLabel = SCALE_LABEL[node.scale] || node.scale;
  const maturityLabel = MATURITY_LABEL[node.maturity] || '';

  // 智能标签过滤
  const hasFormula = node.formula && node.formula.length;
  const hasLimitation = !!node.limitation?.trim();
  const hasSummary = !!node.summary?.trim();
  const hasAha = !!node.aha?.trim();
  const hasFigures = !!(node.figures && node.figures.length);

  let dims;
  if (isDeep) {
    dims = DIMENSIONS;
  } else {
    dims = DIMENSIONS.filter(d => {
      if (d.key === 'formula') return hasFormula;
      if (d.key === 'limitation') return hasLimitation;
      return node.deepContent?.[d.key] && String(node.deepContent[d.key]).trim();
    });
    if (dims.length < 2) {
      const extra = [];
      if (hasSummary && !dims.find(d => d.key === 'history')) extra.push({ key: 'history', label: '📖 脉络' });
      if (hasAha && !dims.find(d => d.key === 'paradigm')) extra.push({ key: 'paradigm', label: '⛓ 范式' });
      if (hasFigures && !dims.find(d => d.key === 'figures')) extra.push({ key: 'figures', label: '👤 人物' });
      dims = [...dims, ...extra];
    }
  }

  const defaultTab = dims[0]?.key || 'history';

  body.innerHTML = `
    <div class="sb-head">
      <div class="sb-head__era"><span class="sb-swatch" style="background:${era.raw}"></span>${era.name} · ${era.range}</div>
      <div class="sb-head__title">${esc(node.name)}<small>${esc(node.nameEn || '')}</small></div>
      <div class="sb-head__quote">${esc(node.aha || '')}</div>
      <div class="sb-head__meta">
        <span class="sb-chip">${scaleLabel}</span>
        <span class="sb-chip sb-chip--gold">${maturityLabel}</span>
        <span class="sb-chip">${esc(String(node.year))}</span>
      </div>
      ${figuresHTML(node)}
    </div>
    <div class="sb-tabs">${dims.map(d => `<button class="sb-tab" data-key="${d.key}">${d.label}</button>`).join('')}</div>
    <div class="sb-panel" id="tabBody"></div>
    ${pathCtxHTML(node)}
  `;

  bindAvatars(body);
  const tabs = body.querySelectorAll('.sb-tab');
  const tabBody = body.querySelector('#tabBody');
  const show = key => {
    tabBody.innerHTML = renderDim(node, key);
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.key === key));
  };
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.key)));
  show(defaultTab);
  sb.classList.add('is-open'); sb.setAttribute('aria-hidden', 'false');
  state.sidebarOpen = true;
}

/* ── 打开纪元综述 ─────────────────────────────────────── */
export function openEra(era) {
  const sum = SUMMARIES[era]; const e = ERAS[era];
  const sb = document.getElementById('sidebar'); const body = document.getElementById('sidebarBody');
  const txt = typeof sum === 'string' ? sum : (sum?.quote || sum?.text || '');
  const count = NODES.filter(n => n.era === era).length;
  const events = NODES.filter(n => n.era === era && n.type === 'event').length;
  body.innerHTML = `
    <div class="sb-head">
      <div class="sb-head__era"><span class="sb-swatch" style="background:${e.raw}"></span>${e.name} · ${e.range}</div>
      <div class="sb-head__title">${esc(e.name)}<small>纪元综述</small></div>
    </div>
    <div class="sb-panel">
      <div class="sb-para" style="font-size:14.5px;line-height:1.9;">${esc(txt || '')}</div>
      <div class="sb-stats">本纪元收录 <b>${count}</b> 个学说 / 事件${events ? `，含 <b>${events}</b> 个里程碑` : ''}。点击时间线节点深入探索。</div>
    </div>`;
  sb.classList.add('is-open'); sb.setAttribute('aria-hidden', 'false');
  state.sidebarOpen = true;
}

/* ── 打开尺度维度概念解析 ─────────────────────────────── */
export function openScale(scale) {
  const d = SCALE_DESC[scale]; if (!d) return;
  const cfg = SCALE_COLORS[scale];
  const sb = document.getElementById('sidebar'); const body = document.getElementById('sidebarBody');
  const count = NODES.filter(n => n.scale === scale).length;
  const names = NODES.filter(n => n.scale === scale).map(n => n.name).join('、');
  body.innerHTML = `
    <div class="sb-head">
      <div class="sb-head__era"><span class="sb-swatch" style="background:${cfg.raw}"></span>${SCALE_LABEL[scale]} · 尺度维度</div>
      <div class="sb-head__title">${esc(SCALE_LABEL[scale])}<small>概念解析与延伸</small></div>
      <div class="sb-head__quote">${esc(d.tag || '')}</div>
    </div>
    <div class="sb-panel">
      <div class="sb-sec-label">概念解析</div>
      <div class="sb-para" style="font-size:14.5px;line-height:1.9;">${esc(d.concept || '')}</div>
      <div class="sb-sec-label">延伸</div>
      <div class="sb-para" style="font-size:14.5px;line-height:1.9;">${esc(d.extend || '')}</div>
      <div class="sb-stats">本尺度收录 <b>${count}</b> 个学说 / 事件：${esc(names)}</div>
    </div>`;
  sb.classList.add('is-open'); sb.setAttribute('aria-hidden', 'false');
  state.sidebarOpen = true;
}

/* ── 关闭侧边栏 ───────────────────────────────────────── */
export function closeSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.remove('is-open'); sb.setAttribute('aria-hidden', 'true');
  state.sidebarOpen = false;
}

/* ── 人物索引 ──────────────────────────────────────────── */
export function openPerson(name, nodeIds) {
  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebarBody');
  const ids = nodeIds || [];
  const rel = ids.map(id => `<button class="sb-rel" data-id="${esc(id)}">${esc(byId.get(id)?.name || id)}</button>`).join('');
  body.innerHTML = `
    <div class="sb-head">
      <div class="sb-head__era">人物索引</div>
      <div class="sb-head__title"><span class="sb-person">${avatarImg(name)}<span class="sb-person__name">${esc(name)}</span></span></div>
      <div class="sb-head__quote">关联 ${ids.length} 个学说 / 事件</div>
    </div>
    <div class="sb-rels">${rel}</div>`;
  bindAvatars(body);
  body.querySelectorAll('.sb-rel').forEach(b => b.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('pp:gotoNode', { detail: b.dataset.id }));
  }));
  sb.classList.add('is-open'); sb.setAttribute('aria-hidden', 'false');
  state.sidebarOpen = true;
}

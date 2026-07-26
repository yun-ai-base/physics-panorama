import { state } from './state.js';
import { esc, chain, getFavorites, isFavorite, toggleFavorite, getNote, setNote } from './utils.js';
import { ERAS, DIMENSIONS, SCALE_LABEL, SCALE_LABEL_EN, SCALE_COLORS, SCALE_DESC, UI_LABELS } from './config.js';
import { avatarImg, bindAvatars } from './data/portraitMap.js';
import { getPOS } from './renderer.js';

let NODES = [], SUMMARIES = {};
const byId = new Map();
const termIndex = new Map(); // 术语名 -> { nodeId, termName }
const MATURITY_LABEL = { foundation:'🏛 地基型', established:'🔬 成熟型', speculative:'🔮 探索型' };

function t(key, ...args) {
  const v = UI_LABELS[state.lang]?.[key] ?? UI_LABELS.zh[key];
  return typeof v === 'function' ? v(...args) : v ?? key;
}

export function initSidebar(nodes, summaries) {
  NODES = nodes; SUMMARIES = summaries || {};
  byId.clear(); nodes.forEach(n => byId.set(n.id, n));
  termIndex.clear();
  nodes.forEach(n => (n.terms || []).forEach(t => {
    if (t.name && !termIndex.has(t.name)) termIndex.set(t.name, { nodeId: n.id, termName: t.name });
  }));
}

/* ─��� 人物行 ─────────────────────────────────────────── */
function figureNodeIds(name) {
  const ids = [];
  for (const n of NODES) {
    const fs = n.figures || [];
    if (fs.some(f => (typeof f === 'string' ? f : f?.name) === name)) ids.push(n.id);
  }
  return ids;
}

function figuresHTML(n) {
  if (!n.figures || !n.figures.length) return '';
  return `<div class="sb-figures">${n.figures.map(f =>
    `<button class="sb-fig sb-fig--link" type="button" data-name="${esc(f)}">${avatarImg(f)}<span class="sb-fig__name">${esc(f)}</span></button>`
  ).join('')}</div>`;
}

/* ── 术语自动链接 ───────────────────────────────────── */

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * 把正文中的术语名自动变成跳转到术语释义锚点的链接。
 * 只在文本节点中替换，不会破坏已有 <a> 标签或 LaTeX/Math 结构。
 */
function linkTerms(html) {
  if (!html || typeof html !== 'string') return html;
  const names = [...termIndex.keys()].sort((a, b) => b.length - a.length);
  if (!names.length) return html;
  const re = new RegExp('(' + names.map(escapeRegExp).join('|') + ')', 'g');

  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const textNodes = [];
  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT, null, false);
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  for (const node of textNodes) {
    const parent = node.parentElement;
    const text = node.textContent;
    re.lastIndex = 0;
    if (!re.test(text)) continue;
    re.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      const info = termIndex.get(m[1]);
      if (parent && (parent.closest('a') || parent.closest(`.sb-term[data-term="${info.termName}"]`))) {
        // 跳过已有链接或术语自身卡片内的同名文本
        continue;
      }
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const a = document.createElement('a');
      a.className = 'sb-term-link';
      a.dataset.node = info.nodeId;
      a.dataset.term = info.termName;
      a.href = `?node=${encodeURIComponent(info.nodeId)}&tab=terms&term=${encodeURIComponent(info.termName)}`;
      a.textContent = m[1];
      frag.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    if (frag.childNodes.length) node.parentNode.replaceChild(frag, node);
  }
  return tmp.innerHTML;
}

/* ── 智能内容解析器 ─────────────────────────────────── */

/**
 * 把内联 Markdown 强调转为 HTML 标签：
 *   **粗体** → <strong>…</strong>
 *   *斜体*   → <em>…</em>
 * 单星号 * 必须位于"词边界"：opener 前不能是字母/数字、closer 后不能是字母/数字，
 * 且内容首字符不可为空格/星号、内容中不可含星号——以此避开物理正文里的乘法星号
 * （如 a*b、F=k*x）、指数双星（如 10**3）与列表标记，避免误判破坏文本结构。
 * 双写 ** 优先于单 * 处理，故 **粗体** 不会被拆成 <em>。
 */
function inlineBoldToTag(text) {
  return text
    // Markdown 图片语法：![alt](src) → <img class="sb-img" src="..." alt="...">
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img class="sb-img" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`)
    // 加粗
    .replace(/\*\*([^\s*][^*]*?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/(?<![\w])\*([^\s*][^*]*?)\*(?![\w])/g, '<em>$1</em>');
}

/**
 * 检测文本是否为"时间线索引格式"。
 * 严格条件（必须全部满足）：
 *   1. ≥3 组「2个以上中文/字母 + （年份数据」模式
 *   2. 这些模式必须出现在**行首**（前面是 ^ 或 \n）→ 排除传记内联生卒年
 *   3. 年份后不紧跟 ） → 排除 （1853-1928） 这种生卒年格式
 */
function looksLikeTimeline(block) {
  const re = /[\u4e00-\u9fff\u0041-\u007a]{2,}（(\d{3,4}[-—–]?\d{0,4}年?)/g;
  let match;
  let lineHeadCount = 0;
  while ((match = re.exec(block)) !== null) {
    // 检查匹配位置前是否为行首
    const prefix = block.slice(Math.max(0, match.index - 2), match.index);
    if (/^|\n\s*$/.test(prefix)) {
      // 检查年份后是否紧跟 ）（生卒年特征）
      const after = block[match.index + match[0].length] || '';
      if (after !== ')') lineHeadCount++;
    }
  }
  return lineHeadCount >= 3;
}

/**
 * 安全的时间线拆分——只在 looksLikeTimeline() 返回 true 后调用。
 * 用 matchAll 找出每个「前缀文字+（年份」的位置，在其前后切割。
 *
 * 关键防护：切割后做**项长度校验**——
 * 真正的时间线/参考文献每条较短（<80字符）；
 * 传记段落被误切后各项会很长（>80字符），此时回退为普通段落。
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

  // ★ 项长度校验：任何非年份项的文本超过 80 字符 → 不是时间线，回退
  const longItem = items.find(it => !it.year && it.text.length > 80);
  if (longItem) return [{ year: '', text: block }];

  // 年份项后面的文本也检查（不含年份标签本身的纯文本部分）
  for (const it of items) {
    if (it.year && it.text.replace(/[\u4e00-\u9fff\u0041-\u007a]{2,}（\d{3,4}[-—–]?\d{0,4}年?/, '').trim().length > 80) {
      return [{ year: '', text: block }];
    }
  }

  return items.filter(it => it.text.trim().length > 10);
}

/**
 * 纯散文智能分段（综合版）——对没有 **标题** / #标题 / 时间线 / 列表 的长文本，
 * 依次尝试三种策略，任一能拆出 ≥3 段（或兜底 ≥2 段）即用：
 *   A. 论述标记分段：首先/其次/第三是/然而/因此/值得一提的是…（标记可出现在句中，后跟 是|：|,|。|、）
 *   B. 编年史分段：按 （19|20）XX年， 推进的叙述史
 *   C. 句子累积兜底：按句号切句，每累积 ~140 字断一块
 * 避免任何长文本渲染成「单一文字墙」。
 */
function splitProseByMarkers(block) {
  if (block.length < 350) return null;

  const byMarkers = splitByMarkers(block);
  if (byMarkers && byMarkers.length >= 3) return byMarkers;

  const byChronicle = splitByChronicle(block);
  if (byChronicle && byChronicle.length >= 3) return byChronicle;

  const bySentences = splitBySentences(block);
  if (bySentences && bySentences.length >= 2) return bySentences;

  return null;
}

/** 策略A：中文论述标记分段（标记可出现在任意位置，后跟 是|：|,|。|、） */
function splitByMarkers(block) {
  const markers = [
    '第一点', '第二点', '第三点', '第四点', '第五点',
    '首先', '其次', '再次', '然后', '最后', '另外', '此外', '同时', '而且', '加之',
    '另一方面', '相比之下', '不过', '然而', '但是', '反之',
    '总之', '综上', '由此可见', '简言之', '总而言之', '换言之',
    '因此', '所以', '故而', '因而', '由此', '这样一来',
    '值得一提的是', '值得注意的是', '需要指出的是', '具体来说',
    '第一', '第二', '第三', '第四', '第五', '第六',
    '其一', '其二', '其三', '其四', '其五'
  ];
  const re = new RegExp('(' + markers.join('|') + ')([：:,，。是、])', 'g');
  const hits = [];
  let m;
  while ((m = re.exec(block)) !== null) {
    hits.push({ index: m.index, len: m[0].length, marker: m[1].trim() });
  }
  if (hits.length < 3) return null;

  const parts = [];
  // 首个标记前的引导语
  const head = block.slice(0, hits[0].index).trim();
  if (head.length > 15) parts.push({ text: head, title: '' });
  // 每个标记到下一个标记（或文末）之间的内容作为一段，避免段落重叠冗余
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index + hits[i].len;
    const end = (i + 1 < hits.length) ? hits[i + 1].index : block.length;
    const body = block.slice(start, end).trim().replace(/^[，,；;\s]+/, '');
    if (body.length > 15) parts.push({ text: body, title: hits[i].marker });
  }
  if (parts.length < 3) return null;
  return parts.filter(p => p.text.trim().length > 15);
}

/** 策略B：编年史分段（按 XXXX年， 推进） */
function splitByChronicle(block) {
  const re = /(\d{4}年[，,])/g;
  const pos = [];
  let m;
  while ((m = re.exec(block)) !== null) pos.push({ index: m.index, year: m[1].slice(0, 5) });
  if (pos.length < 4) return null;
  const parts = [];
  const head = block.slice(0, pos[0].index).trim();
  if (head.length > 10) parts.push({ text: head, title: '' });
  for (let i = 0; i < pos.length; i++) {
    const start = pos[i].index;
    const end = (i + 1 < pos.length) ? pos[i + 1].index : block.length;
    const text = block.slice(start, end).trim();
    if (text.length > 15) parts.push({ text, title: pos[i].year });
  }
  if (parts.length < 3) return null;
  return parts;
}

/** 策略C：句子累积兜底（每 ~140 字断一块，打破长墙） */
function splitBySentences(block) {
  const sents = block.split(/(?<=。|！|？|\n)/).map(s => s.trim()).filter(s => s.length > 4);
  if (sents.length < 3) return null;
  const parts = [];
  let cur = '';
  let cnt = 0;
  for (const s of sents) {
    cur += (cur ? '' : '') + s;
    cnt += s.length;
    if (cnt >= 140) { parts.push({ text: cur, title: '' }); cur = ''; cnt = 0; }
  }
  if (cur.trim()) parts.push({ text: cur, title: '' });
  if (parts.length < 2) return null;
  return parts;
}

/**
 * 规则2.5：隐式分类自动提取。
 * 检测"在XX领域/方面/学科/界/学中，"等隐式分类标记，
 * 将纯散文自动提升为 .sb-section 分区卡（与 **标题** 格式视觉一致）。
 *
 * 匹配模式：在（2~12字中文领域名）（领域|方面|学科|界|学中|中|里|内）（[，,：:]）
 * 要求 ≥2 个分类才激活（避免误判）。
 */
function splitImplicitCategories(block) {
  // 领域后缀词列表
  const suffixes = ['领域', '方面', '学科', '界', '学中', '中', '里', '内'];
  const puncts = '[，,：:;；]';
  // 先去掉加粗标记，避免 "在**粒子物理学**中" 无法匹配
  const plain = block.replace(/\*\*(.+?)\*\*/g, '$1');
  const re = new RegExp(
    '在([\\u4e00-\\u9fff]{2,12})(' + suffixes.join('|') + ')(' + puncts + ')',
    'g'
  );

  const matches = [];
  let m;
  // 非分类前缀黑名单：以这些词开头的匹配通常是"在某XX中"而非领域分类
  const blacklist = /^(最|某|更|这|那|该|其|此|任|各|每|一|前|后|左|右|上|下|内|外|大|小|新|旧|真|假)/;
  while ((m = re.exec(plain)) !== null) {
    const title = m[1] + m[2];
    if (!blacklist.test(m[1])) {
      matches.push({
        full: m[0],       // 完整匹配如 "在数学领域，"
        title: title,      // 分类名如 "数学领域"
        index: m.index     // 在 plain 中的位置
      });
    }
  }

  // 至少需要 2 个隐式分类才启用此规则
  if (matches.length < 2) return null;

  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].full.length;
    const end = (i + 1 < matches.length) ? matches[i + 1].index : plain.length;
    let body = plain.slice(start, end).trim();
    // 去掉可能的句首连接词
    body = body.replace(/^[，,；;\s]+/, '');
    if (body.length > 8) {
      sections.push({ title: matches[i].title, body });
    }
  }

  // 处理开头引导语（第一个分类之前的文字）
  if (sections.length > 0 && matches[0].index > 10) {
    const preamble = plain.slice(0, matches[0].index).trim();
    if (preamble.length > 6) {
      sections.unshift({ title: '概述', body: preamble });
    }
  }

  return sections.length >= 2 ? sections : null;
}

/**
 * 规则2.6：块内多 **标题** 拆分。
 * 检测一个大段内包含多个以 **标题** 引导的子段落，例如：
 *   第一项关键实验是**兰姆移位**（1947年）：...
 *   **粒子物理学**中：...
 *   **理查德·费曼**（1918-1988）：...
 * 如果 ≥2 个标题，拆为多个 sb-section 分区卡，与量子力学等节点的手工 **标题** 卡片视觉一致。
 */
// 判断 **X** 是否为"标题级"加粗（而非强调性整句）。
// 真正的章节标题通常较短、且不含句末/句读标点。
function isHeadingLike(title) {
  if (!title) return false;
  if (title.length > 16) return false;          // 过长 → 视为强调句
  if (/[。！？；]/.test(title)) return false;     // 含句末标点 → 强调句
  return true;
}

function splitBlockByHeadings(block) {
  // 匹配：行首/句首 + 可选简短引导语/列举前缀 + **标题**
  const re = /(?:^|\n|[，。；：:,])\s*(?:第[一二三四五六七八九十]项(?:关键实验是|是|核心成就是|重要发现是|关键步骤是)?|此外，?|同时，?|另外，?|首先，?|其次，?|最后，?)?\s*[^，。；：:\n]{0,10}?\*\*([^*]+?)\*\*/g;
  const matches = [];
  let m;
  while ((m = re.exec(block)) !== null) {
    const title = m[1].trim();
    matches.push({ index: m.index, title, fullLen: m[0].length, heading: isHeadingLike(title) });
  }
  // 没有任何"标题级"加粗 → 整段交给 prose 规则渲染（强调句保持行内加粗，不当作标题）
  if (!matches.some(x => x.heading)) return null;

  const sections = [];
  // 仅以"标题级"加粗作为切分点；强调句留在正文内行内加粗
  const heads = matches.filter(x => x.heading);
  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].index + heads[i].fullLen;
    const end = (i + 1 < heads.length) ? heads[i + 1].index : block.length;
    let body = block.slice(start, end).trim();
    body = body.replace(/^[：:\s]+/, '');
    if (body.length > 8) {
      sections.push({ title: heads[i].title, body });
    }
  }
  // 第一个标题前有引导语时，作为"概述"卡
  if (heads[0].index > 10) {
    const preamble = block.slice(0, heads[0].index).trim();
    if (preamble.length > 6) {
      sections.unshift({ title: '概述', body: preamble });
    }
  }
  return sections.length >= 1 ? sections : null;
}

/**
 * 核心解析器：将原始长文转为结构化 HTML。
 *
 * 解析规则（按优先级）：
 *   1. #### / ### / ##  markdown 标题 → .sb-section 分区卡片
 *   2. **加粗标题** 开头（:/: ：）→ .sb-section 分区卡片
 *   3. looksLikeTimeline() 通过 → .sb-tl 时间线索引
 *   4. - 开头的列表（≥2项）→ .sb-ref-list 参考文献列表
 *   5. 长纯散文 → splitProseByMarkers() 智能分段为子卡片
 *   6. 其他 → .sb-para 普通段落
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

    // 规则2：**标题** 开头（可带简短引导语/列举前缀）→ 分区卡
    const headingMatch = block.match(/^\s*(?:第[一二三四五六七八九十]项(?:关键实验是|是|核心成就是|重要发现是|关键步骤是)?|此外，?|同时，?|另外，?|首先，?|其次，?|最后，?)?\s*[^，。；：:\n]{0,10}?\*\*(.+?)\*\*(?:[\s：:])/);
    if (headingMatch) {
      const title = headingMatch[1];
      let body = block.slice(headingMatch[0].length).trim();
      body = inlineBoldToTag(body);
      html.push(`<div class="sb-section"><div class="sb-section__title">${esc(title)}</div><div class="sb-section__body">${body}</div></div>`);
      continue;
    }

    // 规则2.5：隐式分类自动提取（"在XX领域/方面/学科/界/学中，"模式）
    // 将纯散文中的隐式分类提升为 .sb-section 分区卡，与 **标题** 格式视觉一致
    const implicitSections = splitImplicitCategories(block);
    if (implicitSections) {
      html.push(`<div class="sb-section sb-section--implicit">${implicitSections.map(sec =>
        `<div class="sb-section" style="margin:8px 0;"><div class="sb-section__title">${esc(sec.title)}</div><div class="sb-section__body">${inlineBoldToTag(sec.body)}</div></div>`
      ).join('')}</div>`);
      continue;
    }

    // 规则2.6：块内多 **标题** 拆分（如 QED 实验/影响/人物等段落）
    const headingSections = splitBlockByHeadings(block);
    if (headingSections) {
      html.push(`<div class="sb-section sb-section--implicit">${headingSections.map(sec =>
        `<div class="sb-section" style="margin:8px 0;"><div class="sb-section__title">${esc(sec.title)}</div><div class="sb-section__body">${inlineBoldToTag(sec.body)}</div></div>`
      ).join('')}</div>`);
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

    // 规则5：长纯散文智能分段
    const proseParts = splitProseByMarkers(block);
    if (proseParts) {
      html.push(`<div class="sb-prose">${proseParts.map(p =>
        p.title
          ? `<div class="sb-prose__sec"><div class="sb-prose__title">${esc(p.title)}</div><div class="sb-prose__body">${inlineBoldToTag(p.text)}</div></div>`
          : `<div class="sb-prose__body">${inlineBoldToTag(p.text)}</div>`
      ).join('')}</div>`);
      continue;
    }

    // 规则6：普通段落
    html.push(`<div class="sb-para">${inlineBoldToTag(block)}</div>`);
  }

  return linkTerms(html.join('')) || '<p class="sb-empty">暂无内容</p>';
}

/* ── 术语卡片 ─────────────────────────────────────────── */
function termsHTML(terms) {
  if (!terms || !terms.length) return '<p class="sb-empty">该节点未提供术语释义</p>';
  return terms.map((t, idx) => {
    const icon = esc(t.icon || '🧩');
    const name = esc(t.name || `术语 ${idx + 1}`);
    const def = esc(t.definition || '');
    const details = parseContent(t.details || '');
    const img = t.image ? `<img class="sb-term__img" src="${esc(t.image)}" alt="${name}" loading="lazy">` : '';
    const targetId = t.target || '';
    let linkCls = '', jump = '';
    if (targetId) {
      const tName = byId.get(targetId)?.name || targetId;
      linkCls = ' sb-term--link';
      jump = `<span class="sb-term__jump">↗ 跳转至 ${esc(tName)}</span>`;
    }
    return `
      <div class="sb-term${linkCls}" data-term="${name}"${targetId ? ` data-target="${esc(targetId)}"` : ''}>
        <div class="sb-term__head">
          <span class="sb-term__icon">${icon}</span>
          <span class="sb-term__name">${name}</span>
          ${jump}
        </div>
        ${img}
        <div class="sb-term__def">${def}</div>
        <div class="sb-term__body">${details}</div>
      </div>
    `;
  }).join('');
}

/* ── 维度渲染 ─────────────────────────────────────────── */
function renderDim(node, key) {
  // 术语释义走独立逻辑
  if (key === 'terms') {
    return termsHTML(node.terms || []);
  }

  // 公式走独立逻辑
  if (key === 'formula') {
    const fs = node.formula || [];
    if (!fs.length) return '<p class="sb-empty">该节点未提供公式</p>';
    return fs.map((f, idx) => {
      let tex = '';
      try { tex = window.katex ? katex.renderToString(f.latex || '', { throwOnError: false, displayMode: false }) : esc(f.latex || ''); }
      catch (e) { tex = esc(f.latex || ''); }
      const nameTag = f.name ? `<div class="sb-fm__name">${esc(f.name)}</div>` : '';
      const appText = (f.applications || '').trim();
      const appBtn = appText
        ? `<button class="sb-fm__app-btn" type="button" data-fm="${node.id}-${idx}" title="应用拓展" aria-expanded="false"><span class="sb-fm__app-icon">✦</span><span class="sb-fm__app-label">应用拓展</span></button>`
        : '';
      const appPanel = appText
        ? `<div class="sb-fm__app-panel" id="fm-app-${node.id}-${idx}" hidden><div class="sb-fm__app-title">实用场景与背后逻辑</div><div class="sb-fm__app-body">${parseContent(appText)}</div></div>`
        : '';
      return `<div class="sb-fm" data-fm-wrap="${node.id}-${idx}">${nameTag}<div class="sb-fm__row"><div class="sb-fm__tex">${tex}</div>${appBtn}</div><div class="sb-fm__plain">${esc(f.plain || '')}</div>${appPanel}</div>`;
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
    summary: node.summary || '',
    history: node.summary || '',
    paradigm: node.aha || '',
    limits: node.limitation || '',
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

/* ── 路径上下文（可点击跳转） ───────────────────── */
function pathCtxHTML(node) {
  const c = chain(NODES, node.id);
  const nm = id => {
    const n = byId.get(id);
    if (!n) return id;
    return state.lang === 'en' ? (n.nameEn || n.name) : n.name;
  };
  const upIds = c.parents || [];
  const downIds = c.children || [];
  const upHtml = upIds.length
    ? upIds.map(id => `<button class="sb-path__link" data-id="${esc(id)}">${esc(nm(id))}</button>`).join('')
    : `<span class="sb-path__val">${t('theoryStart')}</span>`;
  const downHtml = downIds.length
    ? downIds.map(id => `<button class="sb-path__link" data-id="${esc(id)}">${esc(nm(id))}</button>`).join('')
    : `<span class="sb-path__val">${t('lineageContinues')}</span>`;
  return `<div class="sb-path"><span class="sb-path__label">${t('pathFrom')}</span> ${upHtml}<span class="sb-path__sep"></span><span class="sb-path__label">${t('pathTo')}</span> ${downHtml}</div>`;
}

/* ── 打开节点侧边栏 ───────────────────────────────────── */
function exploreMoreHTML(node) {
  const links = node.links || [];
  const items = links.length
    ? links.map(l => `<a class="sb-explore__item" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>`).join('')
    : `<span class="sb-explore__empty">${t('exploreEmpty')}</span>`;
  return `<div class="sb-explore">
    <div class="sb-explore__title">${t('exploreMore')}</div>
    <div class="sb-explore__list">${items}</div>
  </div>`;
}

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
  const hasTerms = !!(node.terms && node.terms.length);

  let dims;
  if (isDeep) {
    dims = DIMENSIONS;
  } else {
    dims = DIMENSIONS.filter(d => {
      if (d.key === 'formula') return hasFormula;
      if (d.key === 'limits') return hasLimitation;
      if (d.key === 'terms') return hasTerms;
      if (d.key === 'summary') return !!node.summary?.trim();
      return node.deepContent?.[d.key] && String(node.deepContent[d.key]).trim();
    });
    if (dims.length < 2) {
      const extra = [];
      if (hasSummary && !dims.find(d => d.key === 'history')) extra.push({ key: 'history', label: '📖 脉络' });
      if (hasAha && !dims.find(d => d.key === 'paradigm')) extra.push({ key: 'paradigm', label: '⛓ 范式' });
      if (hasFigures && !dims.find(d => d.key === 'figures')) extra.push({ key: 'figures', label: '👤 人物' });
      if (hasTerms && !dims.find(d => d.key === 'terms')) extra.push({ key: 'terms', label: '🧩 术语' });
      if (hasLimitation && !dims.find(d => d.key === 'limits')) extra.push({ key: 'limits', label: '⚠ 局限' });
      dims = [...dims, ...extra];
    }
  }

  // 智能默认标签（设计 2.6）：深度理论节点默认停「脉络」，实验/事件节点默认停「实验」
  let defaultTab;
  if (node.type === 'event' && dims.find(d => d.key === 'experiments')) defaultTab = 'experiments';
  else if (dims.find(d => d.key === 'history')) defaultTab = 'history';
  else defaultTab = dims[0]?.key || 'history';
  const back = history.state?.ppBack;
  const backBtn = back
    ? `<button class="sb-back" type="button" data-action="back"><span>←</span> ${t('back')}</button>`
    : '';

  const favOn = isFavorite(node.id);
  const titleName = state.lang === 'en' ? (node.nameEn || node.name) : node.name;
  const titleSmall = state.lang === 'en' ? node.name : (node.nameEn || '');
  body.innerHTML = `
    <div class="sb-head">
      <div class="sb-head__era"><span class="sb-swatch" style="background:${era.raw}"></span>${state.lang === 'en' ? era.nameEn : era.name} · ${era.range}</div>
      <div class="sb-head__title">${esc(titleName)}<small>${esc(titleSmall)}</small></div>
      <button class="sb-fav ${favOn ? 'is-on' : ''}" id="sbFavBtn" type="button" data-id="${node.id}">${favOn ? t('addedFavorite') : t('addFavorite')}</button>
      <div class="sb-head__quote">${esc(node.aha || '')}</div>
      <div class="sb-head__meta">
        <span class="sb-chip">${scaleLabel}</span>
        <span class="sb-chip sb-chip--gold">${maturityLabel}</span>
        <span class="sb-chip">${esc(String(node.year))}</span>
      </div>
      ${figuresHTML(node)}
    </div>
    <div class="sb-note">
      <label class="sb-note__label">${t('myNoteLabel')}</label>
      <textarea class="sb-note__area" id="sbNote" data-id="${node.id}" placeholder="${t('notePlaceholder')}">${esc(getNote(node.id))}</textarea>
    </div>
    ${backBtn}
    <div class="sb-tabs">${dims.map(d => `<button class="sb-tab" data-key="${d.key}">${state.lang === 'en' ? d.labelEn : d.label}</button>`).join('')}</div>
    <div class="sb-mobile-tip">${t('mobileTip')}</div>
    <div class="sb-panel" id="tabBody"></div>
    ${pathCtxHTML(node)}
    ${exploreMoreHTML(node)}
  `;

  bindAvatars(body);
  // 绑定人物头像/名字点击 → 打开人物索引视点
  body.querySelectorAll('.sb-fig--link').forEach(btn => {
    btn.addEventListener('click', () => openPerson(btn.dataset.name, figureNodeIds(btn.dataset.name)));
  });
  // 绑定返回按钮
  body.querySelector('[data-action="back"]')?.addEventListener('click', () => history.back());
  // 绑定「收藏 / 取消收藏」星标
  const favBtn = body.querySelector('#sbFavBtn');
  if (favBtn) favBtn.addEventListener('click', () => {
    const id = favBtn.dataset.id;
    const on = toggleFavorite(id);
    favBtn.classList.toggle('is-on', on);
    favBtn.textContent = on ? t('addedFavorite') : t('addFavorite');
    window.dispatchEvent(new CustomEvent('pp:favChange'));
  });
  // 绑定「我的笔记」输入框（实时写入 localStorage）
  const noteArea = body.querySelector('#sbNote');
  if (noteArea) noteArea.addEventListener('input', () => setNote(noteArea.dataset.id, noteArea.value));
  // 绑定"继承自/影响至"跳转链接
  body.querySelectorAll('.sb-path__link').forEach(b => b.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('pp:gotoNode', { detail: b.dataset.id }));
  }));
  const tabs = body.querySelectorAll('.sb-tab');
  const tabBody = body.querySelector('#tabBody');
  const show = key => {
    state.sidebarTab = key;
    state.termFocus = null;
    tabBody.innerHTML = renderDim(node, key);
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.key === key));
    window.dispatchEvent(new CustomEvent('pp:updateURL'));
    // 公式块溢出检测：长出可视区时给外层加 is-scrollable，显示左右渐变提示
    requestAnimationFrame(() => {
      tabBody.querySelectorAll('.sb-fm__tex').forEach(tex => {
        const wrap = tex.closest('.sb-fm');
        if (!wrap) return;
        wrap.classList.toggle('is-scrollable', tex.scrollWidth > tex.clientWidth + 1);
      });
    });
    // 绑定公式“应用拓展”展开/收起
    tabBody.querySelectorAll('.sb-fm__app-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = tabBody.querySelector(`#fm-app-${btn.dataset.fm}`);
        const wrap = tabBody.querySelector(`[data-fm-wrap="${btn.dataset.fm}"]`);
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        if (panel) panel.hidden = expanded;
        if (wrap) wrap.classList.toggle('is-app-open', !expanded);
      });
    });
    // 绑定术语卡片“点击跳转至对应节点”视觉锚点
    tabBody.querySelectorAll('.sb-term--link').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.target;
        if (id) window.dispatchEvent(new CustomEvent('pp:gotoNode', { detail: id }));
      });
    });
    // 绑定正文内术语链接：跳转到术语释义锚点
    tabBody.querySelectorAll('.sb-term-link').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('pp:gotoTerm', {
          detail: { nodeId: a.dataset.node, termName: a.dataset.term }
        }));
      });
    });
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
      <div class="sb-head__era"><span class="sb-swatch" style="background:${e.raw}"></span>${state.lang === 'en' ? e.nameEn : e.name} · ${e.range}</div>
      <div class="sb-head__title">${esc(state.lang === 'en' ? e.nameEn : e.name)}<small>${t('eraOverview')}</small></div>
    </div>
    <div class="sb-panel">
      <div class="sb-para" style="font-size:14.5px;line-height:1.9;">${esc(txt || '')}</div>
      <div class="sb-stats">${t('eraStats', count, events)}</div>
    </div>`;
  sb.classList.add('is-open'); sb.setAttribute('aria-hidden', 'false');
  state.sidebarOpen = true;
}

/* ── 打开尺度维度概念解析 ─────────────────────────────── */
export function openScale(scale, focusRel) {
  const d = SCALE_DESC[scale]; if (!d) return;
  const cfg = SCALE_COLORS[scale];
  const c = d.concept || {};
  const sb = document.getElementById('sidebar'); const body = document.getElementById('sidebarBody');
  const count = NODES.filter(n => n.scale === scale).length;
  const names = NODES.filter(n => n.scale === scale).map(n => state.lang === 'en' ? (n.nameEn || n.name) : n.name).join(', ');

  const chips = arr => (arr || []).map(t => `<span class="sb-tag" style="--tag:${cfg.raw}">${esc(t)}</span>`).join('');
  const defRow = c.def ? `<div class="sb-dl"><dt>定义</dt><dd>${esc(c.def)}</dd></div>` : '';
  const scaleRow = c.scale ? `<div class="sb-dl"><dt>特征尺度</dt><dd>${esc(c.scale)}</dd></div>` : '';
  const theoryRow = (c.theories && c.theories.length)
    ? `<div class="sb-dl"><dt>代表理论</dt><dd><div class="sb-tags">${chips(c.theories)}</div></dd></div>` : '';
  const phenoRow = (c.phenomena && c.phenomena.length)
    ? `<div class="sb-dl"><dt>典型现象</dt><dd><div class="sb-tags">${chips(c.phenomena)}</div></dd></div>` : '';

  const relItems = (d.extend || []).map((e, i) => {
    const isFocus = focusRel && e.rel === focusRel;
    return `<div class="sb-rel-item${isFocus ? ' is-focus' : ''}" data-rel="${esc(e.rel)}">
      <div class="sb-rel-item__rel">${esc(e.rel)}</div>
      <div class="sb-rel-item__text">${esc(e.text)}</div>
    </div>`;
  }).join('');

  body.innerHTML = `
    <div class="sb-head">
      <div class="sb-head__era"><span class="sb-swatch" style="background:${cfg.raw}"></span>${SCALE_LABEL[scale]} · 尺度维度</div>
      <div class="sb-head__title">${esc(SCALE_LABEL[scale])}<small>概念解析与延伸</small></div>
      <div class="sb-head__quote">${esc(d.tag || '')}</div>
    </div>
    <div class="sb-panel">
      <div class="sb-sec-label">概念解析</div>
      ${defRow}${scaleRow}${theoryRow}${phenoRow}
      <div class="sb-sec-label">尺度间渗透</div>
      <div class="sb-rel-list">${relItems}</div>
      <div class="sb-stats">本尺度收录 <b>${count}</b> 个学说 / 事件：${esc(names)}</div>
    </div>`;

  // 若从「尺度关联图」箭头定位而来，滚动并高亮对应渗透说明
  if (focusRel) {
    const target = body.querySelector('.sb-rel-item.is-focus');
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  sb.classList.add('is-open'); sb.setAttribute('aria-hidden', 'false');
  state.sidebarOpen = true;
}

/* ── 关闭侧边栏 ───────────────────────────────────────── */
export function closeSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.remove('is-open'); sb.setAttribute('aria-hidden', 'true');
  state.sidebarOpen = false;
}

/* 将 **粗体** / *斜体* 标记去掉，用于短摘要 */
function stripInlineBold(s) {
  return String(s || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

/* 从节点 deepContent/summary/aha 中提取与该人物相关的段落 */
function personSnippet(node, name) {
  const dc = node.deepContent || {};
  const text = dc.figures_detail || dc.biography || node.summary || node.aha || '';
  if (!text) return '';
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const target = paragraphs.find(p => p.startsWith(`**${name}**`) || p.startsWith(name) || p.includes(name));
  const snippet = target || paragraphs[0] || text;
  const oneLine = snippet.replace(/\s+/g, ' ').trim();
  return oneLine.length > 220 ? oneLine.slice(0, 220) + '…' : oneLine;
}

/* ── 人物索引 ──────────────────────────────────────────── */
export function openPerson(name, nodeIds) {
  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebarBody');
  const ids = (nodeIds || []).filter(id => byId.has(id));
  const nodes = ids.map(id => byId.get(id));

  const eras = [...new Set(nodes.map(n => n.era))].map(e => ERAS[e]?.name).filter(Boolean);
  const eraLabel = eras.length ? ` · ${eras.join(' / ')}` : '';

  // 聚合人物简介：取最长一段（优先 figures_detail/biography，其次 summary）
  const bios = nodes.map(n => personSnippet(n, name)).filter(Boolean);
  const mainBio = bios.reduce((best, cur) => cur.length > best.length ? cur : best, '');

  const bioHtml = mainBio
    ? `<div class="sb-bio"><div class="sb-bio__title">人物简介</div><div class="sb-bio__body">${parseContent(mainBio)}</div></div>`
    : '';

  const cards = nodes.map(n => {
    const era = ERAS[n.era];
    const snippet = personSnippet(n, name);
    const cleanSnippet = esc(stripInlineBold(snippet)).replace(/\n/g, ' ');
    return `
      <button class="sb-node-card" data-id="${esc(n.id)}">
        <div class="sb-node-card__head">
          <span class="sb-node-card__name">${esc(n.name)}</span>
          <span class="sb-node-card__meta">
            <span class="sb-chip" style="background:${era.raw}18;color:${era.raw};border-color:${era.raw}40">${esc(era.name)}</span>
            <span class="sb-chip">${esc(String(n.year))}</span>
          </span>
        </div>
        ${cleanSnippet ? `<div class="sb-node-card__snippet">${cleanSnippet}</div>` : ''}
      </button>`;
  }).join('');

  body.innerHTML = `
    <div class="sb-head sb-head--person">
      <div class="sb-head__era">人物索引</div>
      <div class="sb-person-head">
        <span class="sb-person-head__avatar">${avatarImg(name)}</span>
        <div class="sb-person-head__text">
          <div class="sb-person-head__name">${esc(name)}</div>
          <div class="sb-person-head__meta">关联 ${ids.length} 个学说 / 事件${eraLabel}</div>
        </div>
      </div>
    </div>
    ${bioHtml}
    <div class="sb-sec-label">关联学说 / 事件</div>
    <div class="sb-node-list">${cards}</div>`;

  bindAvatars(body);
  body.querySelectorAll('.sb-node-card').forEach(b => b.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('pp:gotoNode', { detail: b.dataset.id }));
  }));
  sb.classList.add('is-open'); sb.setAttribute('aria-hidden', 'false');
  state.sidebarOpen = true;
}

/* ── 侧边栏公共控制接口 ───────────────────────────────── */

export function openSidebarTab(tabKey) {
  const btn = document.querySelector(`.sb-tab[data-key="${tabKey.replace(/"/g, '\\"')}"]`);
  if (btn) btn.click();
}

// ── 侧栏迷你全景缩略图 + 选中红点（F 项；依赖 renderer.getPOS） ──
export function updateMiniMap() {
  const box = document.getElementById('minimap');
  if (!box) return;
  const pos = getPOS();
  const ids = Object.keys(pos);
  if (!ids.length) { box.hidden = true; return; }
  box.hidden = false;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const id of ids) {
    const p = pos[id]; if (!p) continue;
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const W = 248, H = 132, pad = 10;
  const sx = (W - 2 * pad) / (maxX - minX || 1);
  const sy = (H - 2 * pad) / (maxY - minY || 1);
  const s = Math.min(sx, sy);
  const ox = pad + ((W - 2 * pad) - (maxX - minX) * s) / 2;
  const oy = pad + ((H - 2 * pad) - (maxY - minY) * s) / 2;
  const tx = p => ({ x: ox + (p.x - minX) * s, y: oy + (p.y - minY) * s });
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="mm-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">`;
  for (const id of ids) {
    const p = pos[id]; if (!p) continue;
    const t = tx(p);
    const n = byId.get(id);
    const c = n ? (ERAS[n.era] ? ERAS[n.era].raw : '#9A8C76') : '#9A8C76';
    svg += `<circle class="mm-dot" data-id="${esc(id)}" cx="${t.x.toFixed(1)}" cy="${t.y.toFixed(1)}" r="2.4" fill="${c}"><title>${esc(n ? (n.nameEn || n.name) : id)}</title></circle>`;
  }
  if (state.selected && pos[state.selected]) {
    const t = tx(pos[state.selected]);
    svg += `<circle class="mm-red" cx="${t.x.toFixed(1)}" cy="${t.y.toFixed(1)}" r="4" fill="#E23B3B" stroke="#FFFFFF" stroke-width="1"><title>当前选中</title></circle>`;
  }
  svg += '</svg>';
  box.innerHTML = svg;
  box.querySelectorAll('.mm-dot').forEach(d => d.addEventListener('click', () => {
    const id = d.getAttribute('data-id');
    if (id) window.dispatchEvent(new CustomEvent('pp:gotoNode', { detail: id }));
  }));
}

export function focusTerm(termName) {
  const name = String(termName || '').trim();
  if (!name) return;
  openSidebarTab('terms');
  state.termFocus = name;
  window.dispatchEvent(new CustomEvent('pp:updateURL'));
  requestAnimationFrame(() => {
    const cards = document.querySelectorAll('.sb-term');
    const target = [...cards].find(c => c.querySelector('.sb-term__name')?.textContent.trim() === name);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('is-flash');
    setTimeout(() => target.classList.remove('is-flash'), 1400);
  });
}

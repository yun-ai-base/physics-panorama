import { esc } from '../utils.js';

// 人物名称 → 肖像文件名（多为简称/全称/带称号差异）；其余缺图者走占位
export const PORTRAIT_ALIASES = {
  '威廉·汤姆森（开尔文勋爵）': '威廉·汤姆森',
  '阿尔伯特·爱因斯坦（预言）': '阿尔伯特·爱因斯坦',
  '安德烈-玛丽·安培': '安德烈·玛丽·安培',
  '约瑟夫-路易·拉格朗日': '约瑟夫·拉格朗日',
};

export function portraitName(name) { return PORTRAIT_ALIASES[name] || name; }

// 人物中文名 → 英文名映射（用于英文模式显示）
// 映射优先级：精确匹配 → 别名归一后匹配 → 回退原名（无翻译时显示中文）
export const PERSON_NAME_EN = {
  // === 经典物理 ===
  '艾萨克·牛顿': 'Isaac Newton',
  '戈特弗里德·莱布尼茨': 'Gottfried Wilhelm Leibniz',
  '莱昂哈德·欧拉': 'Leonhard Euler',
  '约瑟夫-路易·拉格朗日': 'Joseph-Louis Lagrange',
  '约瑟夫·拉格朗日': 'Joseph-Louis Lagrange',
  '皮埃尔-西蒙·拉普拉斯': 'Pierre-Simon Laplace',
  '萨迪·卡诺': 'Sadi Carnot',
  '鲁道夫·克劳修斯': 'Rudolf Clausius',
  '威廉·汤姆森（开尔文勋爵）': 'William Thomson, Lord Kelvin',
  '威廉·汤姆森': 'William Thomson (Lord Kelvin)',
  '约西亚·吉布斯': 'Josiah Willard Gibbs',
  '路德维希·玻尔兹曼': 'Ludwig Boltzmann',
  '瓦尔特·能斯特': 'Walther Nernst',
  '詹姆斯·克拉克·麦克斯韦': 'James Clerk Maxwell',
  '迈克尔·法拉第': 'Michael Faraday',
  '亨德里克·洛伦兹': 'Hendrik Lorentz',
  '古斯塔夫·基尔霍夫': 'Gustav Kirchhoff',
  '约翰·瑞利': 'Lord Rayleigh (John William Strutt)',
  '威廉·维恩': 'Wilhelm Wien',
  '阿尔伯特·迈克尔逊': 'Albert Michelson',
  '爱德华·莫雷': 'Edward Morley',
  '亨利·庞加莱': 'Henri Poincaré',
  '玛丽·居里': 'Marie Curie',
  '欧内斯特·卢瑟福': 'Ernest Rutherford',
  '罗伯特·密立根': 'Robert Millikan',
  '菲利普·莱纳德': 'Philipp Lenard',
  '安德烈-玛丽·安培': 'André-Marie Ampère',
  '安德烈·玛丽·安培': 'André-Marie Ampère',
  '托马斯·杨': 'Thomas Young',
  '奥古斯丁·菲涅尔': 'Augustin-Jean Fresnel',
  '克里斯蒂安·惠更斯': 'Christiaan Huygens',
  '亨利·贝克勒尔': 'Henri Becquerel',
  '路易·德布罗意': 'Louis de Broglie',
  '约翰·巴丁': 'John Bardeen',
  '利昂·库珀': 'Leon Cooper',
  '罗伯特·施里弗': 'John Robert Schrieffer',
  '阿诺·彭齐亚斯': 'Arno Penzias',
  '罗伯特·威尔逊': 'Robert Woodrow Wilson',
  '乔治·斯穆特': 'George Smoot',
  '约翰·斯图尔特·贝尔': 'John Stewart Bell',
  '阿兰·阿斯佩': 'Alain Aspect',
  '小柴昌俊': 'Masatoshi Koshiba',
  '弗雷德里克·莱因斯': 'Frederick Reines',

  // === 相对论革命 ===
  '阿尔伯特·爱因斯坦': 'Albert Einstein',
  '阿尔伯特·爱因斯坦（预言）': 'Albert Einstein (predicted)',
  '大卫·希尔伯特': 'David Hilbert',
  '赫尔曼·闵可夫斯基': 'Hermann Minkowski',
  '卡尔·史瓦西': 'Karl Schwarzschild',
  '亚瑟·爱丁顿': 'Arthur Eddington',
  '埃德温·哈勃': 'Edwin Hubble',
  '乔治·勒梅特': 'Georges Lemaître',

  // === 量子革命 ===
  '马克斯·普朗克': 'Max Planck',
  '尼尔斯·玻尔': 'Niels Bohr',
  '维尔纳·海森堡': 'Werner Heisenberg',
  '埃尔温·薛定谔': 'Erwin Schrödinger',
  '沃尔夫冈·泡利': 'Wolfgang Pauli',
  '马克斯·玻恩': 'Max Born',
  '路易·德布罗意': 'Louis de Broglie',
  '保罗·狄拉克': 'Paul Dirac',
  '恩里科·费米': 'Enrico Fermi',
  '理查德·费曼': 'Richard Feynman',
  '朝永振一郎': 'Sin-Itiro Tomonaga',
  '朱利安·施温格': 'Julian Schwinger',
  '戴维·波利策': 'David Politzer',

  // === 标准模型 ===
  '杨振宁': 'Chen-Ning Yang',
  '罗伯特·米尔斯': 'Robert Mills',
  '谢尔登·格拉肖': 'Sheldon Glashow',
  '阿卜杜斯·萨拉姆': 'Abdus Salam',
  '史蒂文·温伯格': 'Steven Weinberg',
  '彼得·希格斯': 'Peter Higgs',
  '弗朗索瓦·恩格勒': 'François Englert',
  '罗伯特·布绕特': 'Robert Brout',
  '默里·盖尔曼': 'Murray Gell-Mann',
  '乔治·茨威格': 'George Zweig',
  '弗兰克·维尔切克': 'Frank Wilczek',
  '大卫·格罗斯': 'David Gross',
  '乔杰什·帕蒂': 'Jogesh Pati',
  '威廉·哈密顿': 'William Rowan Hamilton',

  // === 前沿探索 ===
  '约翰·施瓦茨': 'John Schwarz',
  '迈克尔·格林': 'Michael Green',
  '加布里埃莱·韦内齐亚诺': 'Gabriele Veneziano',
  '爱德华·威滕': 'Edward Witten',
  '李·斯莫林': 'Lee Smolin',
  '卡洛·罗韦利': 'Carlo Rovelli',
  '弗里曼·戴森': 'Freeman Dyson',
  '弗里茨·兹威基': 'Fritz Zwicky',
  '维拉·鲁宾': 'Vera Rubin',
  '索尔·珀尔马特': 'Saul Perlmutter',
  '布莱恩·施密特': 'Brian Schmidt',
  '亚当·里斯': 'Adam Riess',
  '雷纳·韦斯': 'Rainer Weiss',
  '巴里·巴里什': 'Barry Barish',
  '基普·索恩': 'Kip Thorne',
  '彼得·肖尔': 'Peter Shor',
  '洛夫·格罗弗': 'Lov Grover',
  '大卫·多伊奇': 'David Deutsch',
  '约翰·普雷斯基尔': 'John Preskill',
  '霍华德·乔吉': 'Howard Georgi',
  '阿贝·阿希提卡': 'Abhay Ashtekar',
  'CERN/LHC团队': 'CERN / LHC Team',
};

// 获取人物英文名（先别名归一再查映射）
export function personNameEn(raw) {
  const key = portraitName(raw);
  return PERSON_NAME_EN[key] || PERSON_NAME_EN[raw] || raw;
}

// 返回 <img> 占位（onerror 链式回退到 png，再回退到首字占位）
// loading=lazy + decoding=async：76+ 头像仅在进入可视区时加载，降低首屏带宽与主线程压力
export function avatarImg(name) {
  const alias = portraitName(name);
  const ch = (name.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim()[0] || '?');
  return `<img class="avatar" alt="${esc(name)}" data-alias="${esc(alias)}" data-ch="${esc(ch)}" loading="lazy" decoding="async" src="assets/portraits/${encodeURIComponent(alias)}.jpg">`;
}

export function bindAvatars(root) {
  root.querySelectorAll('img.avatar[data-alias]').forEach(img => {
    img.addEventListener('error', function onErr() {
      const a = img.dataset.alias;
      if (img.src.endsWith('.jpg')) { img.src = `assets/portraits/${encodeURIComponent(a)}.png`; return; }
      const span = document.createElement('span');
      span.className = 'avatar avatar--fallback';
      span.textContent = img.dataset.ch || '?';
      img.replaceWith(span);
    });
  });
}

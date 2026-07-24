import { esc } from '../utils.js';

// 人物名称 → 肖像文件名（多为简称/全称/带称号差异）；其余缺图者走占位
export const PORTRAIT_ALIASES = {
  '威廉·汤姆森（开尔文勋爵）': '威廉·汤姆森',
  '阿尔伯特·爱因斯坦（预言）': '阿尔伯特·爱因斯坦',
  '安德烈-玛丽·安培': '安德烈·玛丽·安培',
  '约瑟夫-路易·拉格朗日': '约瑟夫·拉格朗日',
};

export function portraitName(name) { return PORTRAIT_ALIASES[name] || name; }

// 返回 <img> 占位（onerror 链式回退到 png，再回退到首字占位）
export function avatarImg(name) {
  const alias = portraitName(name);
  const ch = (name.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim()[0] || '?');
  return `<img class="avatar" alt="${esc(name)}" data-alias="${esc(alias)}" data-ch="${esc(ch)}" src="assets/portraits/${encodeURIComponent(alias)}.jpg">`;
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

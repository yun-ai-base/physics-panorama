// 虚无-图景 · 意境页 淡墨水印诗文轮换
// 居中的「一花一世界…刹那含永劫」保持不动（由 index.html 的 .void-view__card 负责）。
// 左右各 4 首淡墨水印【全部常驻显示】，每 5s 让当前那首（左右同步）加亮 HOT_MS 后再淡回淡墨，
// 其余三首始终保持淡墨可见、不隐藏。仅在「意境」子页可见时运行。

const STEP_MS = 5000; // 每 5s 轮换一次高亮
const HOT_MS = 2000;  // 高亮加黑持续时间

function initPoemRotation() {
  const poemView = document.getElementById('voidPoem');
  const voidView = document.getElementById('voidView');
  const leftWrap = document.getElementById('poemWmLeft');
  const rightWrap = document.getElementById('poemWmRight');
  if (!poemView || !voidView || !leftWrap || !rightWrap) return;

  const leftLines = Array.from(leftWrap.querySelectorAll('.void-view__wm-line'));
  const rightLines = Array.from(rightWrap.querySelectorAll('.void-view__wm-line'));
  const n = Math.min(leftLines.length, rightLines.length);
  if (n === 0) return;

  // 全部常驻可见（淡墨），仅用 is-hot 表示当前高亮，不再隐藏任何一首
  [...leftLines, ...rightLines].forEach(l => { l.hidden = false; l.classList.remove('is-hot'); });

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 用 hidden 属性判断可见性（不依赖布局/offsetParent，headless 与真实浏览器一致）
  const isActive = () => !poemView.hidden && !voidView.hidden;

  let idx = 0;
  let stepStart = 0;
  let wasActive = false;
  let hotTimer = 0;

  function clearHot() {
    if (hotTimer) { clearTimeout(hotTimer); hotTimer = 0; }
    leftLines.forEach(l => l.classList.remove('is-hot'));
    rightLines.forEach(l => l.classList.remove('is-hot'));
  }

  // 当前 idx 的左右两首加亮；HOT_MS 后淡回正常淡墨（其余始终保持淡墨可见）
  function highlight() {
    clearHot();
    const L = leftLines[idx];
    const R = rightLines[idx];
    if (L) L.classList.add('is-hot');
    if (R) R.classList.add('is-hot');
    hotTimer = window.setTimeout(() => {
      if (L) L.classList.remove('is-hot');
      if (R) R.classList.remove('is-hot');
      hotTimer = 0;
    }, HOT_MS);
  }

  function tick(now) {
    const active = isActive();
    if (active) {
      if (!wasActive) {
        highlight();            // 进入意境页：先亮当前首
        stepStart = now;
      } else if (now - stepStart >= STEP_MS) {
        idx = (idx + 1) % n;
        highlight();            // 轮换到下一组，亮 2s 后淡回
        stepStart = now;
      }
    } else if (wasActive) {
      clearHot();               // 离开意境页：仅去掉高亮，淡墨诗文保持（父层已隐藏）
    }
    wasActive = active;
    requestAnimationFrame(tick);
  }

  if (reduceMotion) {
    // 尊重「减少动态效果」偏好：全部淡墨常驻显示，不做加亮轮换
    return;
  }
  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPoemRotation);
} else {
  initPoemRotation();
}

// 虚无-图景 · 意境页 淡墨水印诗文轮换
// 居中的「一花一世界…刹那含永劫」保持不动（由 index.html 的 .void-view__card 负责）。
// 左右各 4 首淡墨水印，每边一次只显示 1 首，左右同步轮换，停留 5s，
// 每首出现先 1s 高亮加黑再淡回淡墨水印。仅在「意境」子页可见时运行。

const STEP_MS = 5000; // 每首停留时间
const HOT_MS = 1000;  // 高亮加黑持续时间

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

  // 初始全部隐藏
  [...leftLines, ...rightLines].forEach(l => { l.hidden = true; l.classList.remove('is-hot'); });

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

  function showStep(hot) {
    clearHot();
    leftLines.forEach(l => { l.hidden = true; });
    rightLines.forEach(l => { l.hidden = true; });
    const L = leftLines[idx];
    const R = rightLines[idx];
    if (L) L.hidden = false;
    if (R) R.hidden = false;
    if (hot) {
      if (L) L.classList.add('is-hot');
      if (R) R.classList.add('is-hot');
      // 1s 后淡回正常淡墨水印（CSS transition 负责平滑过渡）
      hotTimer = window.setTimeout(() => {
        if (L) L.classList.remove('is-hot');
        if (R) R.classList.remove('is-hot');
        hotTimer = 0;
      }, HOT_MS);
    }
  }

  function tick(now) {
    const active = isActive();
    if (active) {
      if (!wasActive) {
        // 刚进入意境页：显示当前首并高亮
        showStep(true);
        stepStart = now;
      } else if (now - stepStart >= STEP_MS) {
        idx = (idx + 1) % n;
        showStep(true);
        stepStart = now;
      }
    } else if (wasActive) {
      // 离开意境页：暂停并隐藏，避免后台空转显示
      clearHot();
      leftLines.forEach(l => { l.hidden = true; });
      rightLines.forEach(l => { l.hidden = true; });
    }
    wasActive = active;
    requestAnimationFrame(tick);
  }

  if (reduceMotion) {
    // 尊重「减少动态效果」偏好：静态显示首组，不自动轮换
    showStep(false);
    return;
  }
  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPoemRotation);
} else {
  initPoemRotation();
}

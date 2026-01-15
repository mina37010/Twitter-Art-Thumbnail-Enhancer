// =========================
// 定数・セレクタ
// =========================
const PHOTO_SELECTOR = '[data-testid="tweetPhoto"]';
const ROW_SELECTOR =
  'div.css-175oi2r.r-zl2h9q.r-1iusvr4.r-16y2uox.r-18u37iz,' +
  'div.css-175oi2r.r-1iusvr4.r-16y2uox.r-18u37iz';
const BG_SELECTOR = '.r-1niwhzg';
const MEDIA_CONTAINER_CLASS = 'div.r-1kqtdi0';

// =========================
// DOM 取得ユーティリティ
// =========================
function findRatioBoxFromPhoto(photo) {
  let el = photo.parentElement;
  while (el) {
    const box = el.querySelector(':scope > div[style*="padding-bottom"]');
    if (box) return box;
    el = el.parentElement;
  }
  return null;
}

function getMediaContainer(article) {
  const first = article.querySelector(PHOTO_SELECTOR);
  return first?.closest(MEDIA_CONTAINER_CLASS) ?? null;
}

function getPhotos(article) {
  const container = getMediaContainer(article);
  return container ? [...container.querySelectorAll(PHOTO_SELECTOR)] : [];
}

function getRows(article) {
  return [...article.querySelectorAll(ROW_SELECTOR)];
}

// =========================
// 計算系
// =========================
function calcImageRatio(photo) {
  const img = photo.querySelector('img');
  return img && img.naturalWidth
    ? img.naturalHeight / img.naturalWidth
    : 0;
}

function calcNeededHeight(photo) {
  const img = photo.querySelector('img');
  if (!img || !img.naturalWidth) return 0;

  const cell = photo.closest('div.r-16y2uox') ?? photo;
  const width = cell.getBoundingClientRect().width;
  return width ? width * (img.naturalHeight / img.naturalWidth) : 0;
}

// =========================
// レイアウト調整
// =========================
function adjustRatioBox(article, photos) {
  let totalRatio = 0;
  let ready = true;

  photos.forEach(photo => {
    const img = photo.querySelector('img');
    if (!img || !img.complete || !img.naturalWidth) {
      ready = false;
      img?.addEventListener('load', () => adjustRatioBox(article, photos), { once: true });
      return;
    }
    totalRatio += img.naturalHeight / img.naturalWidth;
  });

  if (!ready || !totalRatio) return;

  const ratioBox = findRatioBoxFromPhoto(photos[0]);
  if (!ratioBox) return;

  const gapPx = Number(article.dataset.xGap || 0);
  const totalGapPx = gapPx * (photos.length - 1);
  const width = ratioBox.getBoundingClientRect().width;
  if (!width) return;

  const paddingPercent = totalRatio * 100 + (totalGapPx / width) * 100;
  ratioBox.style.paddingBottom = `${paddingPercent}%`;
}

function adjustRowsHeight(article, photos) {
  const rows = getRows(article);
  if (rows.length !== 2) return;

  const needs = [
    calcNeededHeight(photos[0]) + calcNeededHeight(photos[1]),
    calcNeededHeight(photos[2]) + calcNeededHeight(photos[3]),
  ];

  rows.forEach((row, i) => {
    row.style.flexGrow = String(needs[i]);
    row.style.flexBasis = '0';
    row.style.minHeight = '0';
  });
}

function adjustBackgroundSize(article, photos) {
  photos.forEach(photo => {
    const img = photo.querySelector('img');
    const bg = photo.querySelector(BG_SELECTOR);
    if (!img || !bg || !img.naturalWidth) return;

    const { width: fw, height: fh } = bg.getBoundingClientRect();
    if (!fw || !fh) return;

    const scale = Math.max(fw / img.naturalWidth, fh / img.naturalHeight);
    const renderedW = img.naturalWidth * scale;

    if (renderedW < fw) {
      bg.style.backgroundSize = `${fw}px auto`;
      bg.style.backgroundRepeat = 'no-repeat';
      bg.style.backgroundPosition = 'center';
    } else {
      bg.style.backgroundSize =
      bg.style.backgroundRepeat =
      bg.style.backgroundPosition = '';
    }
  });
}

function resetBackgroundSize(article) {
  getPhotos(article).forEach(photo => {
    const bg = photo.querySelector(BG_SELECTOR);
    if (!bg) return;
    bg.style.backgroundSize =
    bg.style.backgroundRepeat =
    bg.style.backgroundPosition = '';
  });
}

// =========================
// 縦表示 ON / OFF
// =========================
function enableVertical(article) {
  if (article.dataset.xVertical === 'on') return;

  const photos = getPhotos(article);
  if (photos.length !== 4) return;

  getRows(article).forEach(row => {
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
  });

  article._xRatioBox = findRatioBoxFromPhoto(photos[0]) ?? null;

  adjustRatioBox(article, photos);
  adjustRowsHeight(article, photos);
  article.dataset.xVertical = 'on';
  enableDragAndDrop(article);

  requestAnimationFrame(() => adjustBackgroundSize(article, photos));
}

function disableVertical(article) {
  getRows(article).forEach(row => {
    row.style.display =
    row.style.flexDirection =
    row.style.flexGrow =
    row.style.flexBasis =
    row.style.minHeight = '';
  });

  if (article._xRatioBox) {
    article._xRatioBox.style.paddingBottom = '56.25%';
  }

  article.dataset.xVertical = 'off';
  disableDragAndDrop(article);
  resetBackgroundSize(article);
}

function toggleVertical(article) {
  article.dataset.xVertical === 'on'
    ? disableVertical(article)
    : enableVertical(article);
}

// =========================
// gap 切替
// =========================
function toggleGap(article) {
  const map = { '0': '12', '12': '44', '44': '0' };
  article.dataset.xGap = map[article.dataset.xGap || '0'];

  if (article.dataset.xVertical === 'on') {
    adjustRatioBox(article, getPhotos(article));
  }
}

// =========================
// ボタン挿入
// =========================
function insertToggleButton(article) {
  if (article.querySelector('.x-vertical-toggle')) return;

  const bookmarkBtn = article.querySelector(
    '[data-testid="bookmark"], [data-testid="removeBookmark"]'
  );
  if (!bookmarkBtn) return;

  const makeBtn = (cls, text, handler) => {
    const btn = document.createElement('button');
    btn.className = `${cls} r-yyyyoo`;
    btn.textContent = text;
    btn.style.cssText = 'border:1px solid; margin-left:6px; cursor:pointer;';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handler(article);
    });
    return btn;
  };

  bookmarkBtn.parentElement.append(
    makeBtn('x-vertical-toggle', '縦', toggleVertical),
    makeBtn('x-gap-toggle', '間', toggleGap)
  );

  article.dataset.xGap ??= '0';
}

// =========================
// 画像入れ替え機能
// =========================
let draggedItem = null;
function enableDragAndDrop(article) {
  if (article.dataset.xDrag === 'on') return;

  const items = article.querySelectorAll('a[href*="/photo/"]');

  items.forEach(item => {
    const block = item.closest('a[href*="/photo/"]')?.parentElement;

    if (!block) return;

    block.draggable = true;
    block.style.cursor = 'grab';

    block.addEventListener('dragstart', () => {
      draggedItem = block;
      block.style.opacity = '0.5';
    });

    block.addEventListener('dragend', () => {
      draggedItem = null;
      block.style.opacity = '';
    });

    block.addEventListener('dragover', e => {
      e.preventDefault();
    });

    block.addEventListener('drop', e => {
      e.preventDefault();
      if (!draggedItem || draggedItem === block) return;

      swapNodes(draggedItem, block);
    });
  });

  article.dataset.xDrag = 'on';
}

function swapNodes(a, b) {
  const aNext = a.nextSibling === b ? a : a.nextSibling;
  const aParent = a.parentNode;

  b.parentNode.insertBefore(a, b);
  aParent.insertBefore(b, aNext);
}

function disableDragAndDrop(article) {
  const items = article.querySelectorAll('[draggable="true"]');
  items.forEach(item => {
    item.draggable = false;
    item.style.cursor = '';
  });
  article.dataset.xDrag = 'off';
}

// =========================
// メイン
// =========================
function processTweet(article) {
  if (getPhotos(article).length === 4) {
    insertToggleButton(article);
  }
}

function scan() {
  document.querySelectorAll('article').forEach(processTweet);
}

const observer = new MutationObserver(scan);
scan();
observer.observe(document.body, { childList: true, subtree: true });

(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const catalog = byId('catalog-list');
  const search = byId('volume-search');
  const status = byId('catalog-status');
  const empty = byId('catalog-empty');
  const reset = byId('catalog-reset');
  const rangeButtons = [...document.querySelectorAll('[data-range]')];
  const cards = catalog ? [...catalog.querySelectorAll('[data-volume]')] : [];
  const metadata = new Map();
  let metadataState = 'loading';
  let range = 'all';

  const isOriginal = (id) => typeof id === 'string' && id.startsWith('raw/');
  const volumeNumber = (id) => Number(isOriginal(id) ? id.slice(4) : id);
  const validId = (id) => id === 'full' || /^(?:raw\/)?\d{3}$/.test(id) && volumeNumber(id) >= 1 && volumeNumber(id) <= 220;
  const sourceFor = (id) => isOriginal(id) ? metadata.get(id)?.source : id === 'full' ? 'txt/新续资治通鉴.txt' : `txt/volumes/${id}.txt`;
  const staticPageFor = (id) => `read/${id}.html`;
  const documentName = (id) => id === 'full' ? '新编版 · 全书重编本' : `${isOriginal(id) ? '原版' : '新编版'} · 卷 ${isOriginal(id) ? id.slice(4) : id}`;
  const otherEdition = (id) => isOriginal(id) ? id.slice(4) : `raw/${id === 'full' ? '001' : id}`;

  function filterCatalog() {
    const query = search ? search.value.trim().toLocaleLowerCase() : '';
    const numericQuery = query.match(/^(?:卷\s*)?(\d{1,3})$/);
    const bounds = range === 'all' ? null : range.split('-').map(Number);
    let count = 0;
    for (const card of cards) {
      const id = card.dataset.volume;
      const item = metadata.get(id);
      const inRange = !bounds || Number(id) >= bounds[0] && Number(id) <= bounds[1];
      const terms = item ? `${id} ${Number(id)} ${item.title} ${item.period} ${item.heading}`.toLocaleLowerCase() : `${id} ${Number(id)}`;
      const matches = !query || (numericQuery ? Number(id) === Number(numericQuery[1]) : terms.includes(query));
      card.hidden = !inRange || !matches;
      if (!card.hidden) count += 1;
    }
    for (const button of rangeButtons) button.setAttribute('aria-pressed', String(button.dataset.range === range));
    if (empty) empty.hidden = count !== 0;
    if (reset) reset.hidden = !query && range === 'all';
    if (status) {
      const availability = metadataState === 'loading' ? ' · 年代加载中' : metadataState === 'failed' ? ' · 年代暂不可用，可按卷号查找' : '';
      status.textContent = `${count} / ${cards.length} 卷${availability}`;
    }
  }

  if (search) search.addEventListener('input', filterCatalog);
  for (const button of rangeButtons) button.addEventListener('click', () => {
    range = button.dataset.range;
    filterCatalog();
  });
  if (reset) reset.addEventListener('click', () => {
    if (search) search.value = '';
    range = 'all';
    filterCatalog();
    if (search) search.focus();
  });
  filterCatalog();

  const reader = byId('reader');
  const content = byId('reader-content');
  const title = byId('reader-title');
  const subtitle = byId('reader-subtitle');
  const loading = byId('reader-loading');
  const errorBox = byId('reader-error');
  const errorMessage = byId('reader-error-message');
  const source = byId('reader-source');
  const permalink = byId('reader-permalink');
  const editionSwitch = byId('reader-edition-switch');
  const outline = byId('reader-outline');
  const progress = byId('reader-progress');
  const percent = byId('reader-percent');
  const find = byId('reader-find');
  const findPrevious = byId('find-prev');
  const findNext = byId('find-next');
  const findStatus = byId('find-status');
  const previous = byId('previous-volume');
  const next = byId('next-volume');
  const decrease = byId('font-decrease');
  const increase = byId('font-increase');
  const themeToggle = byId('theme-toggle');
  const continueLink = byId('continue-reading');
  const storageNote = byId('storage-note');
  const storageKey = 'xzztj-reader-v1';
  let saved = { id: null, fraction: 0, fontSize: 20, theme: 'paper', positions: {} };
  let storageAvailable = true;
  let currentId = null;
  let loadedId = null;
  let controller = null;
  let generation = 0;
  let blocks = [];
  let headings = [];
  let matches = [];
  let matchIndex = -1;
  let findTimer = null;
  let saveTimer = null;
  let scrollFrame = null;
  let restoring = false;
  let returnFocus = null;
  let returnHash = '';
  let controlsTimer = null;
  let contentPointer = null;
  const chrome = reader ? [...reader.querySelectorAll('.reader-chrome')] : [];
  const canRead = reader && content && typeof reader.showModal === 'function';

  function storageFailed() {
    storageAvailable = false;
    if (storageNote) {
      storageNote.hidden = false;
      storageNote.textContent = '浏览器未允许保存阅读记录；本次仍可正常阅读，关闭页面后进度与设置可能丢失。';
    }
  }

  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (value && typeof value === 'object') {
      if (validId(value.id)) saved.id = value.id;
      if (Number.isFinite(value.fraction)) saved.fraction = Math.max(0, Math.min(1, value.fraction));
      if (Number.isFinite(value.fontSize)) saved.fontSize = Math.max(16, Math.min(28, Math.round(value.fontSize)));
      if (value.theme === 'dark') saved.theme = 'dark';
      if (value.positions && typeof value.positions === 'object') {
        for (const [id, position] of Object.entries(value.positions)) {
          if (validId(id) && Number.isFinite(position)) saved.positions[id] = Math.max(0, Math.min(1, position));
        }
      }
    }
  } catch (error) {
    storageFailed();
  }

  function updateContinue() {
    if (!continueLink) return;
    continueLink.hidden = !saved.id;
    if (!saved.id) return;
    continueLink.dataset.read = saved.id;
    continueLink.href = staticPageFor(saved.id);
    const item = metadata.get(saved.id);
    continueLink.textContent = `继续阅读 · ${documentName(saved.id)}${item ? ` · ${item.title}` : ''}（${Math.round(saved.fraction * 100)}%）`;
  }

  function persist() {
    updateContinue();
    if (!storageAvailable) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch (error) {
      storageFailed();
    }
  }

  function fraction() {
    const maximum = content.scrollHeight - content.clientHeight;
    return maximum > 0 ? Math.max(0, Math.min(1, content.scrollTop / maximum)) : 0;
  }

  function savePosition() {
    clearTimeout(saveTimer);
    if (!loadedId || restoring) return;
    saved.id = loadedId;
    saved.fraction = fraction();
    saved.positions[loadedId] = saved.fraction;
    persist();
  }

  function updateProgress() {
    const value = loadedId ? Math.round(fraction() * 100) : 0;
    if (progress) progress.value = value;
    if (percent) percent.textContent = `${value}%`;
  }

  function restorePosition(value, token) {
    restoring = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (token !== generation || !loadedId) return;
      content.scrollTop = value * Math.max(0, content.scrollHeight - content.clientHeight);
      restoring = false;
      updateProgress();
      savePosition();
    }));
  }

  function applyPreferences() {
    if (!reader) return;
    reader.style.setProperty('--reader-font-size', `${saved.fontSize}px`);
    reader.dataset.theme = saved.theme;
    if (decrease) decrease.disabled = saved.fontSize <= 16;
    if (increase) increase.disabled = saved.fontSize >= 28;
    if (themeToggle) {
      themeToggle.textContent = saved.theme === 'dark' ? '切换纸色' : '切换夜读';
      themeToggle.setAttribute('aria-pressed', String(saved.theme === 'dark'));
    }
  }

  function changeFont(delta) {
    const position = loadedId ? fraction() : 0;
    saved.fontSize = Math.max(16, Math.min(28, saved.fontSize + delta));
    applyPreferences();
    persist();
    if (loadedId) restorePosition(position, generation);
  }

  updateContinue();
  applyPreferences();

  async function loadCatalog(original = false) {
    try {
      const response = await fetch(original ? 'assets/catalog-raw.json' : 'assets/catalog.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('目录格式错误');
      for (const item of data) {
        if (item && /^\d{3}$/.test(item.id) && validId(item.id) && typeof item.title === 'string' && typeof item.period === 'string' && typeof item.heading === 'string') {
          if (!original || typeof item.source === 'string' && /^txt\/raw\/\d{3}_[^/]+\.txt$/.test(item.source)) metadata.set(original ? `raw/${item.id}` : item.id, item);
        }
      }
      if (original) {
        updateContinue();
        if (currentId) updateReaderLabels();
        return;
      }
      metadataState = cards.length > 0 && cards.every((card) => metadata.has(card.dataset.volume)) ? 'ready' : 'failed';
      for (const card of cards) {
        const item = metadata.get(card.dataset.volume);
        if (!item) continue;
        const cardTitle = card.querySelector('.volume-title');
        const cardPeriod = card.querySelector('.volume-period');
        if (cardTitle) cardTitle.textContent = item.title;
        if (cardPeriod) cardPeriod.textContent = item.period;
        card.title = item.heading;
      }
    } catch (error) {
      if (original) return;
      metadataState = 'failed';
    }
    filterCatalog();
    updateContinue();
    if (currentId) updateReaderLabels();
  }
  loadCatalog();
  const rawCatalogReady = loadCatalog(true);

  if (!canRead) return;

  function controlsFocused() {
    return chrome.some((panel) => panel.contains(document.activeElement));
  }

  function hideControls() {
    clearTimeout(controlsTimer);
    if (!reader.open || !loadedId || controlsFocused()) return;
    reader.classList.add('controls-hidden');
    for (const panel of chrome) panel.inert = true;
  }

  function showControls() {
    clearTimeout(controlsTimer);
    if (!reader.open) return;
    reader.classList.remove('controls-hidden');
    for (const panel of chrome) panel.inert = false;
    controlsTimer = setTimeout(hideControls, 3000);
  }

  function updateReaderLabels() {
    const item = metadata.get(currentId);
    if (title) title.textContent = documentName(currentId);
    if (subtitle) subtitle.textContent = currentId === 'full'
      ? '110 卷新编本 · 全书连续阅读，与原版 220 卷的卷号不一一对应'
      : `${isOriginal(currentId) ? '毕沅原版' : '季善凯新编版'} · ${item ? `${item.title} · ${item.period}` : '220 卷'}`;
    if (source) {
      const url = sourceFor(currentId);
      source.hidden = !url;
      if (url) source.href = url;
    }
    if (permalink) permalink.href = staticPageFor(currentId);
    if (editionSwitch) {
      editionSwitch.hidden = currentId === 'full';
      editionSwitch.dataset.read = otherEdition(currentId);
      editionSwitch.href = staticPageFor(otherEdition(currentId));
      const label = isOriginal(currentId) ? '切换到新编版（同卷界）' : '切换到原版（同卷界）';
      editionSwitch.setAttribute('aria-label', label);
      editionSwitch.title = label;
    }
    if (previous) previous.disabled = currentId === 'full' || volumeNumber(currentId) <= 1;
    if (next) next.disabled = currentId === 'full' || volumeNumber(currentId) >= 220;
  }

  function resetFind() {
    clearTimeout(findTimer);
    matches = [];
    matchIndex = -1;
    if (find) find.value = '';
    updateFindStatus();
  }

  function updateFindStatus() {
    if (findPrevious) findPrevious.disabled = matches.length === 0;
    if (findNext) findNext.disabled = matches.length === 0;
    if (findStatus) findStatus.textContent = matches.length
      ? `第 ${matchIndex + 1} / ${matches.length} 处`
      : find && find.value.trim() ? '当前文档未找到匹配文字' : '在当前文档中查找';
  }

  function selectMatch(index, scroll = true) {
    if (!matches.length) return;
    if (matchIndex >= 0) {
      matches[matchIndex].classList.remove('search-current');
      matches[matchIndex].removeAttribute('aria-current');
    }
    matchIndex = (index + matches.length) % matches.length;
    const match = matches[matchIndex];
    match.classList.add('search-current');
    match.setAttribute('aria-current', 'true');
    if (scroll) match.scrollIntoView({ block: 'center', behavior: 'auto' });
    updateFindStatus();
  }

  function findInDocument() {
    clearTimeout(findTimer);
    findTimer = null;
    const query = find ? find.value.trim() : '';
    matches = [];
    matchIndex = -1;
    for (const block of blocks) {
      const first = query ? block.text.indexOf(query) : -1;
      if (first < 0) {
        if (block.marked) block.node.textContent = block.text;
        block.marked = false;
        continue;
      }
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      let at = first;
      while (at !== -1) {
        fragment.append(document.createTextNode(block.text.slice(cursor, at)));
        const mark = document.createElement('mark');
        mark.textContent = block.text.slice(at, at + query.length);
        fragment.append(mark);
        matches.push(mark);
        cursor = at + query.length;
        at = block.text.indexOf(query, cursor);
      }
      fragment.append(document.createTextNode(block.text.slice(cursor)));
      block.node.replaceChildren(fragment);
      block.marked = true;
    }
    if (matches.length) selectMatch(0);
    else updateFindStatus();
  }

  function renderText(text) {
    const fragment = document.createDocumentFragment();
    const options = document.createDocumentFragment();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '跳转到篇章 / 年代';
    options.append(placeholder);
    blocks = [];
    headings = [];
    for (const raw of text.replace(/^\uFEFF/, '').split(isOriginal(currentId) ? /\r?\n/ : /\r?\n\s*\r?\n/)) {
      const paragraph = raw.trim();
      if (!paragraph) continue;
      const isHeading = !paragraph.includes('\n') && (/^[○◎]/.test(paragraph) || /^新续资治通鉴(?:\s|$)/.test(paragraph) || /^(?:序|凡例|目录)$/.test(paragraph) || /^(?:宋|辽|金|元)纪.{0,40}$/.test(paragraph) || isOriginal(currentId) && /^(?:续资治通鉴|●卷|【)/.test(paragraph));
      const node = document.createElement(isHeading ? 'h3' : 'p');
      node.className = isHeading ? 'reader-heading' : 'reader-paragraph';
      node.textContent = paragraph;
      if (isHeading) {
        node.id = `reader-section-${headings.length}`;
        const option = document.createElement('option');
        option.value = String(headings.length);
        option.textContent = paragraph;
        options.append(option);
        headings.push(node);
      }
      blocks.push({ node, text: paragraph, marked: false });
      fragment.append(node);
    }
    content.replaceChildren(fragment);
    if (outline) {
      outline.replaceChildren(options);
      outline.disabled = headings.length === 0;
    }
  }

  async function loadDocument(id) {
    savePosition();
    if (controller) controller.abort();
    controller = new AbortController();
    const token = ++generation;
    const resume = saved.positions[id] ?? (saved.id === id ? saved.fraction : 0);
    currentId = id;
    loadedId = null;
    restoring = false;
    showControls();
    blocks = [];
    headings = [];
    resetFind();
    content.replaceChildren();
    content.hidden = true;
    content.setAttribute('aria-busy', 'true');
    if (outline) {
      outline.replaceChildren();
      outline.disabled = true;
    }
    if (loading) {
      loading.hidden = false;
      loading.textContent = id === 'full' ? '正在加载全书文本，请稍候…' : `正在加载卷 ${id}…`;
    }
    if (errorBox) errorBox.hidden = true;
    if (find) find.disabled = true;
    updateProgress();
    updateReaderLabels();
    try {
      if (isOriginal(id)) {
        await rawCatalogReady;
        if (!metadata.has(id)) await loadCatalog(true);
      }
      if (token !== generation) return;
      updateReaderLabels();
      const url = sourceFor(id);
      if (!url) throw new Error('原版目录暂不可用，请刷新页面重试，或打开独立阅读页');
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (token !== generation) return;
      if (!text.trim()) throw new Error('文本为空');
      renderText(text);
      loadedId = id;
      content.hidden = false;
      content.setAttribute('aria-busy', 'false');
      if (loading) loading.hidden = true;
      if (find) find.disabled = false;
      restorePosition(resume, token);
      if (document.activeElement === reader || document.activeElement === byId('reader-close')) content.focus({ preventScroll: true });
      hideControls();
    } catch (error) {
      if (token !== generation || error.name === 'AbortError') return;
      content.setAttribute('aria-busy', 'false');
      if (loading) loading.hidden = true;
      if (errorBox) errorBox.hidden = false;
      if (errorMessage) errorMessage.textContent = `暂时无法加载${documentName(id)}（${error.message}）。请重试，或打开原始文本；本地预览请使用 HTTP 服务。`;
    }
  }

  function routeId() {
    const match = location.hash.match(/^#read\/(full|(?:raw\/)?\d{3})$/);
    return match && validId(match[1]) ? match[1] : null;
  }

  function closeReader() {
    savePosition();
    ++generation;
    if (controller) controller.abort();
    clearTimeout(findTimer);
    clearTimeout(controlsTimer);
    currentId = null;
    loadedId = null;
    restoring = false;
    document.body.classList.remove('reading');
    if (reader.open) reader.close();
    if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  function syncRoute() {
    const id = routeId();
    if (!id) {
      if (reader.open || currentId) closeReader();
      return;
    }
    if (!reader.open) {
      returnFocus = document.activeElement;
      reader.showModal();
      document.body.classList.add('reading');
    }
    if (currentId !== id) loadDocument(id);
  }

  function navigate(id) {
    if (!validId(id)) return;
    if (!routeId()) returnHash = location.hash;
    const hash = `#read/${id}`;
    if (location.hash !== hash) {
      if (reader.open && routeId()) {
        history.replaceState(history.state, '', hash);
      } else {
        history.pushState({ ...history.state, __xzztjReader: true }, '', hash);
      }
    }
    syncRoute();
  }

  function requestClose() {
    const ownedEntry = history.state && history.state.__xzztjReader;
    closeReader();
    if (ownedEntry) history.back();
    else history.replaceState(history.state, '', `${location.pathname}${location.search}${returnHash}`);
  }

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[data-read]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.hasAttribute('download') || anchor.target && anchor.target !== '_self') return;
    const id = anchor.dataset.read;
    if (!validId(id)) return;
    event.preventDefault();
    navigate(id);
    returnFocus = anchor;
  });
  reader.addEventListener('cancel', (event) => {
    event.preventDefault();
    requestClose();
  });
  reader.addEventListener('close', () => {
    if (!reader.open && currentId) requestClose();
  });
  const close = byId('reader-close');
  if (close) close.addEventListener('click', requestClose);
  const retry = byId('reader-retry');
  if (retry) retry.addEventListener('click', () => { if (currentId) loadDocument(currentId); });
  if (previous) previous.addEventListener('click', () => {
    if (currentId !== 'full' && volumeNumber(currentId) > 1) navigate(`${isOriginal(currentId) ? 'raw/' : ''}${String(volumeNumber(currentId) - 1).padStart(3, '0')}`);
  });
  if (next) next.addEventListener('click', () => {
    if (currentId !== 'full' && volumeNumber(currentId) < 220) navigate(`${isOriginal(currentId) ? 'raw/' : ''}${String(volumeNumber(currentId) + 1).padStart(3, '0')}`);
  });
  if (outline) outline.addEventListener('change', () => {
    if (outline.value !== '' && headings[Number(outline.value)]) headings[Number(outline.value)].scrollIntoView({ block: 'start', behavior: 'auto' });
  });
  if (decrease) decrease.addEventListener('click', () => changeFont(-1));
  if (increase) increase.addEventListener('click', () => changeFont(1));
  if (themeToggle) themeToggle.addEventListener('click', () => {
    saved.theme = saved.theme === 'paper' ? 'dark' : 'paper';
    applyPreferences();
    persist();
  });
  const top = byId('reader-top');
  if (top) top.addEventListener('click', () => {
    content.scrollTo({ top: 0, behavior: 'auto' });
    content.focus({ preventScroll: true });
  });
  if (find) {
    find.addEventListener('input', () => {
      clearTimeout(findTimer);
      findTimer = setTimeout(findInDocument, 180);
    });
    find.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      if (findTimer) {
        findInDocument();
        findTimer = null;
      } else selectMatch(matchIndex + (event.shiftKey ? -1 : 1));
    });
  }
  if (findPrevious) findPrevious.addEventListener('click', () => selectMatch(matchIndex - 1));
  if (findNext) findNext.addEventListener('click', () => selectMatch(matchIndex + 1));
  content.addEventListener('pointerdown', (event) => {
    contentPointer = { x: event.clientX, y: event.clientY, moved: false };
  }, { passive: true });
  content.addEventListener('pointermove', (event) => {
    if (contentPointer && Math.hypot(event.clientX - contentPointer.x, event.clientY - contentPointer.y) > 10) contentPointer.moved = true;
  }, { passive: true });
  content.addEventListener('pointercancel', () => {
    if (contentPointer) contentPointer.moved = true;
  }, { passive: true });
  content.addEventListener('click', (event) => {
    const moved = contentPointer && contentPointer.moved;
    contentPointer = null;
    if (moved || event.button !== 0) return;
    const bounds = content.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    if (x < 1 / 3 || x > 2 / 3 || y < 1 / 3 || y > 2 / 3) return;
    content.focus({ preventScroll: true });
    showControls();
  });
  reader.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') showControls();
  });
  for (const panel of chrome) {
    panel.addEventListener('pointerdown', showControls);
    panel.addEventListener('focusin', showControls);
    panel.addEventListener('focusout', showControls);
    panel.addEventListener('input', showControls);
  }
  content.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      updateProgress();
    });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(savePosition, 200);
  }, { passive: true });
  window.addEventListener('pagehide', savePosition);
  document.addEventListener('visibilitychange', () => { if (document.hidden) savePosition(); });
  window.addEventListener('hashchange', syncRoute);
  window.addEventListener('popstate', syncRoute);
  syncRoute();
})();

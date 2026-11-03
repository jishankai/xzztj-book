(() => {
  'use strict';

  const productionBase = new URL('https://jishankai.github.io/xzztj-book/');

  function productionURL(url) {
    url.protocol = productionBase.protocol;
    url.host = productionBase.host;
    url.username = '';
    url.password = '';
    if (!url.pathname.startsWith(productionBase.pathname)) {
      url.pathname = productionBase.pathname + url.pathname.replace(/^\/+/, '');
    }
    url.hash = '';
    return url;
  }

  function canonicalURL() {
    const canonical = document.querySelector('link[rel="canonical"]');
    return productionURL(new URL(canonical ? canonical.getAttribute('href') : productionBase.href, productionBase));
  }

  function shareDetails(block) {
    const canonical = canonicalURL();
    if (block.dataset.share !== 'reader') {
      return { title: document.title, url: canonical.href };
    }
    const permalink = document.getElementById('reader-permalink');
    const title = document.getElementById('reader-title');
    const subtitle = document.getElementById('reader-subtitle');
    const label = ['新续资治通鉴', title && title.textContent.trim(), subtitle && subtitle.textContent.trim()]
      .filter(Boolean).join(' · ');
    return {
      title: label,
      url: productionURL(new URL(permalink.getAttribute('href'), canonical)).href,
    };
  }

  for (const block of document.querySelectorAll('.share-tools[data-share]')) {
    const nativeButton = block.querySelector('[data-share-native]');
    const copyButton = block.querySelector('[data-share-copy]');
    const status = block.querySelector('.share-status');
    const input = block.querySelector('.share-url');

    function reset() {
      status.textContent = '';
      input.hidden = true;
      input.value = '';
    }

    if (block.dataset.share === 'reader') {
      const permalink = document.getElementById('reader-permalink');
      new MutationObserver(reset).observe(permalink, { attributes: true, attributeFilter: ['href'] });
    }

    function offerURL(url, message) {
      input.value = url;
      input.hidden = false;
      status.textContent = message;
      input.focus();
      input.select();
    }

    copyButton.hidden = false;
    copyButton.addEventListener('click', async () => {
      reset();
      const { url } = shareDetails(block);
      try {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
          offerURL(url, '此浏览器无法自动复制，请选择下方链接并手动复制。');
          return;
        }
        await navigator.clipboard.writeText(url);
        status.textContent = '链接已复制。';
      } catch {
        offerURL(url, '未能自动复制，请选择下方链接并手动复制。');
      }
    });

    nativeButton.hidden = false;
    nativeButton.addEventListener('click', async () => {
      reset();
      const details = shareDetails(block);
      if (typeof navigator.share !== 'function') {
        offerURL(details.url, '复制此链接即可分享。');
        return;
      }
      try {
        await navigator.share(details);
        status.textContent = '已交给系统分享。';
      } catch (error) {
        if (error && error.name === 'AbortError') {
          status.textContent = '已取消分享。';
          return;
        }
        offerURL(details.url, '未能打开系统分享，请选择下方链接并手动复制。');
      }
    });
  }
})();

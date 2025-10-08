if (!customElements.get('shade-selector')) {
  customElements.define(
    'shade-selector',
    class ShadeSelector extends HTMLElement {
      constructor() {
        super();
        this.sections = (this.dataset.sections || '').split(',').map(s => s.trim()).filter(Boolean);

        this.controller = null;
        this.onclick = this.onClick.bind(this);

        this.summaryButton = this.querySelector('.available-shades__buttons summary');
        this.summaryTarget  = this.querySelector('#available-shades');
        this.initSummaryClick();
      }

      onClick(e) {
        const li = e.target.closest('.available-shades__elements');
        if (!li || !this.contains(li)) return;

        const url = li.dataset.productUrl;
        if (!url) return;

        // No-op if clicking the selected one
        if (li.classList.contains('selected')) return;

        this.swapShade(url);
      }

      async swapShade(productUrl) {
        this.startLoading();

        // Cancel any in-flight request
        try { this.controller?.abort(); } catch (_) {}
        this.controller = new AbortController();

        const params = new URLSearchParams();
        params.set('sections', this.sections.join(','));

        const fetchUrl = `${productUrl}${productUrl.includes('?') ? '&' : '?'}${params.toString()}`;

        try {
          const res = await fetch(fetchUrl, { signal: this.controller.signal, credentials: 'same-origin' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const payload = await res.json();

          // Swap each section payload into the DOM
          this.sections.forEach((key) => {
            const target = document.querySelector(`[data-section="${key}"]`);
            const html = payload[key];
            if (!target || !html) return;

            target.innerHTML = html;

            // Update URL + title without reload
            const pageTitle = this.getPageTitleFromPayload(html) || document.title;
            this.updateHistory(productUrl, pageTitle);
          });

        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('[ShadeSelector] swap error:', err);
          }
        } finally {
          // Refresh Yotpo widgets if needed
          if (window.yotpoWidgetsContainer?.initWidgets) {
            window.yotpoWidgetsContainer.initWidgets();
          }

          this.stopLoading();

          // 🔔 Tell the tooltip logic that sections were replaced
          document.dispatchEvent(new Event('shades:updated'));
        }
      }

      startLoading() {
        document.body.classList.add('loader-open');
        if (!document.querySelector('.fullscreen-loader')) {
          const loader = document.createElement('div');
          loader.className = 'fullscreen-loader';
          document.body.appendChild(loader);
        }
      }

      stopLoading() {
        document.body.classList.remove('loader-open');
        const loader = document.querySelector('.fullscreen-loader');
        if (loader) loader.remove();
      }

      getPageTitleFromPayload(payload) {
        if (!payload || typeof payload !== 'string') return null;
        const doc = new DOMParser().parseFromString(payload, 'text/html');
        const sectionElement = doc.querySelector('[data-page-title]');
        if (sectionElement?.dataset?.pageTitle) {
          return sectionElement.dataset.pageTitle.trim();
        }
        return null;
      }

      updateHistory(url, pageTitle) {
        history.pushState({ shadeSwap: true }, pageTitle, url);
        if (pageTitle) document.title = pageTitle;
      }

      initSummaryClick() {
        if (this.summaryButton && this.summaryTarget) {
          this.summaryButton.addEventListener('click', (e) => {
            e.preventDefault();
            const isExpanded = this.summaryButton.getAttribute('aria-expanded') === 'true';
            this.summaryButton.setAttribute('aria-expanded', String(!isExpanded));
            this.summaryTarget.classList.toggle('hidden');
          });
        }
      }
    }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  // Prevent double-binding if this script is executed again
  if (window.__shadeTooltipInit) return;
  window.__shadeTooltipInit = true;

  const SELECTOR = '.available-shades__elements';
  const OFFSET_Y = 16;     // distance BELOW cursor (centered horizontally)
  const LERP     = 0.25;   // easing for buttery follow

  // Ensure single tooltip in <body>, dedupe any duplicates from swapped HTML
  function ensureTooltip() {
    const all = Array.from(document.querySelectorAll('#shade-tooltip'));
    let el = all[0];
    if (!el) {
      el = document.createElement('div');
      el.id = 'shade-tooltip';
      document.body.appendChild(el);
    } else if (el.parentNode !== document.body) {
      document.body.appendChild(el);
    }
    // remove dupes
    for (let i = 1; i < all.length; i++) all[i].remove();

    // a touch of hardening (your main CSS still styles it)
    el.style.pointerEvents = 'none';
    el.style.position = 'absolute';
    el.style.left = '0px';
    el.style.top  = '0px';
    el.style.zIndex = '2147483647';
    return el;
  }

  const tooltip = ensureTooltip();

  // Lerp state
  let targetX = 0, targetY = 0;
  let curX = 0, curY = 0;
  let current = null;

  function clampBelowCentered(pageX, pageY) {
    const w  = tooltip.offsetWidth || 0;
    const h  = tooltip.offsetHeight || 0;
    const sx = window.scrollX || 0;
    const sy = window.scrollY || 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Center horizontally under the cursor; place below
    let x = pageX - (w / 2);
    let y = pageY + OFFSET_Y;

    // Left/right clamps
    if (x < sx) x = sx;
    if (x + w > sx + vw) x = sx + vw - w;

    // If bottom would overflow, flip above cursor
    if (y + h > sy + vh) y = pageY - h - OFFSET_Y;
    if (y < sy) y = sy;

    return [x, y];
  }

  function setTarget(pageX, pageY) {
    const [x, y] = clampBelowCentered(pageX, pageY);
    targetX = x; targetY = y;
  }

  function tick() {
    curX += (targetX - curX) * LERP;
    curY += (targetY - curY) * LERP;
    tooltip.style.setProperty('--x', curX + 'px');
    tooltip.style.setProperty('--y', curY + 'px');
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // -------- Delegated listeners (survive AJAX DOM swaps) --------
  document.addEventListener('mouseover', (e) => {
    const li = e.target.closest(SELECTOR);
    if (!li) return;
    current = li;
    ensureTooltip(); // keep the right node in <body> and dedupe
    const shade = li.getAttribute('data-shade')
      || li.getAttribute('aria-label')
      || (li.textContent || '').trim();
    tooltip.textContent = shade || '';
    tooltip.classList.add('is-visible');

    // seed initial position
    setTarget(e.pageX, e.pageY);
    curX = targetX; curY = targetY; // snap on first frame
    tooltip.style.setProperty('--x', curX + 'px');
    tooltip.style.setProperty('--y', curY + 'px');
  }, { passive: true });

  document.addEventListener('mousemove', (e) => {
    if (!current) return;
    setTarget(e.pageX, e.pageY);
  }, { passive: true });

  document.addEventListener('mouseout', (e) => {
    if (!current) return;
    const to = e.relatedTarget;
    // if still within the same shade element, ignore
    if (to && (to === current || (to.closest && to.closest(SELECTOR) === current))) return;
    current = null;
    tooltip.classList.remove('is-visible');
  }, { passive: true });

  // Re-ensure tooltip after your component swaps sections
  document.addEventListener('shades:updated', ensureTooltip);

  // Safety net: observe DOM for full replacements and keep tooltip unique
  const mo = new MutationObserver(() => ensureTooltip());
  mo.observe(document.documentElement, { childList: true, subtree: true });
});
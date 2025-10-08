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
        this.summaryTarget = this.querySelector('#available-shades');
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
        try { this.controller?.abort(); } catch (_) { }
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

            // Replace innerHTML (cheap); or do a smarter morph if needed
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
        }
      }

      startLoading() {
        // Add body lock
        document.body.classList.add('loader-open');

        // Create loader if it doesn't exist
        if (!document.querySelector('.fullscreen-loader')) {
          const loader = document.createElement('div');
          loader.className = 'fullscreen-loader';
          document.body.appendChild(loader);
        }
      }

      stopLoading() {
        // Remove body lock
        document.body.classList.remove('loader-open');

        // Remove loader element
        const loader = document.querySelector('.fullscreen-loader');
        if (loader) loader.remove();
      }

      getPageTitleFromPayload(payload) {
        if (!payload || typeof payload !== 'string') return null;

        // Parse the returned HTML string
        const doc = new DOMParser().parseFromString(payload, 'text/html');

        // Find the element with the data-page-title attribute
        const sectionElement = doc.querySelector('[data-page-title]');
        if (sectionElement && sectionElement.dataset.pageTitle) {
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
            e.preventDefault(); // Prevent native toggle if <details> is not used
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
  const tooltip = document.getElementById('shade-tooltip');
  const shadeItems = document.querySelectorAll('.available-shades__elements');

  shadeItems.forEach(item => {
    item.addEventListener('mouseenter', e => {
      const shade = item.dataset.shade;
      if (!shade) return;
      tooltip.textContent = shade;
      tooltip.hidden = false;
      tooltip.classList.add('show');
    });
    item.addEventListener('mousemove', e => {
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY}px`;
    });
    item.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
      tooltip.hidden = true;
    });
  });
});



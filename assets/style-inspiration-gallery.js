class StyleInspirationGallery extends HTMLElement {
  connectedCallback() {
    const dataEl = this.querySelector('script[type="application/json"]');
    if (!dataEl) return;

    this.data = JSON.parse(dataEl.textContent);
    this.sectionId = this.dataset.sectionId;
    this.activeFilter = 'all';
    this.activeItemId = null;
    this.allGroups = [];
    this.renderedGroupCount = 0;
    this.INITIAL_GROUPS = 2;
    this.observer = null;

    this.gridEl = this.querySelector(`#Slider-${this.sectionId}`);
    this.sliderEl = this.querySelector('slider-component-custom');
    this.panelEl = this.querySelector(`#SigPanel-${this.sectionId}`);
    this.loadingEl = this.querySelector('.sig-loading');
    this.emptyEl = this.querySelector('.sig-empty');

    this.bindFilters();
    this.renderGroups(true);
  }

  /* ── Filtered asset list ── */
  get filteredAssets() {
    if (this.activeFilter === 'all') return this.data.assets;
    return this.data.assets.filter((a) =>
      a.filters.some((f) => f.toLowerCase() === this.activeFilter)
    );
  }

  /* ── Group building: look-ahead algorithm ── */
  buildGroups(assets) {
    const remaining = [...assets];
    const groups = [];
    let nextType = 'A';

    const extractFirst = (layout) => {
      const idx = remaining.findIndex((a) => a.layout === layout);
      if (idx === -1) return null;
      return remaining.splice(idx, 1)[0];
    };

    while (remaining.some((a) => a.layout === 'portrait')) {
      const p1 = extractFirst('portrait');
      if (!p1) break;

      const p2 = extractFirst('portrait');
      if (!p2) {
        groups.push({ type: 'single', items: [p1] });
        break;
      }

      if (nextType === 'A') {
        const landscape = extractFirst('landscape');
        if (landscape) {
          groups.push({ type: 'A', items: [p1, p2, landscape] });
        } else {
          const p3 = extractFirst('portrait');
          const p4 = extractFirst('portrait');
          const items = [p1, p2];
          if (p3) items.push(p3);
          if (p4) items.push(p4);
          groups.push({ type: 'A2', items });
        }
      } else {
        const tall = extractFirst('tall');
        if (tall) {
          groups.push({ type: 'B', items: [p1, p2, tall] });
        } else {
          const landscape = extractFirst('landscape');
          if (landscape) {
            groups.push({ type: 'A', items: [p1, p2, landscape] });
          } else {
            const p3 = extractFirst('portrait');
            const p4 = extractFirst('portrait');
            const items = [p1, p2];
            if (p3) items.push(p3);
            if (p4) items.push(p4);
            groups.push({ type: 'A2', items });
          }
        }
      }

      nextType = nextType === 'A' ? 'B' : 'A';
    }

    return groups;
  }

  /* ── Full render (initial load or filter change) ── */
  renderGroups(initial = false) {
    this.showLoading(initial);

    const render = () => {
      this.gridEl.innerHTML = '';
      this.renderedGroupCount = 0;

      const assets = this.filteredAssets;
      this.allGroups = this.buildGroups(assets);

      if (this.allGroups.length === 0) {
        this.hideLoading();
        this.emptyEl.removeAttribute('hidden');
        this.panelEl.setAttribute('hidden', '');
        this.sliderEl.resetSlider();
        return;
      }

      this.emptyEl.setAttribute('hidden', '');

      const batch = this.allGroups.slice(0, this.INITIAL_GROUPS);
      batch.forEach((group, i) => this.renderGroup(group, i));
      this.renderedGroupCount = batch.length;

      const firstItem = this.allGroups[0]?.items[0];
      if (firstItem) {
        this.activeItemId = firstItem.id;
        this.updatePanel(firstItem);
        const firstEl = this.gridEl.querySelector('.sig-item');
        if (firstEl) firstEl.classList.add('sig-item--active');
      }

      this.hideLoading();
      this.sliderEl.resetSlider();
      this._fixSliderFirstItem();
      this.setupLazyLoad();
    };

    /* Small rAF gap so the skeleton is visible during filter transitions */
    requestAnimationFrame(render);
  }

  /* ── Render a single group ── */
  renderGroup(group, index) {
    const typeClass = { A: 'a', A2: 'a2', B: 'b', single: 'single' }[group.type] || 'a2';
    const li = document.createElement('li');
    li.id = `Slide-${this.sectionId}-${index + 1}`;
    li.className = `sig-group sig-group--${typeClass} slider__slide custom__slide`;
    li.setAttribute('role', 'group');
    li.setAttribute('aria-label', `Group ${index + 1}`);

    group.items.forEach((item) => li.appendChild(this.renderItem(item)));
    this.gridEl.appendChild(li);
  }

  /* ── Render a single item ── */
  renderItem(item) {
    const div = document.createElement('div');
    div.className = `sig-item sig-item--${item.layout}`;
    div.dataset.itemId = item.id;
    div.setAttribute('tabindex', '0');
    div.setAttribute('role', 'button');
    div.setAttribute('aria-label', item.alt);
    if (item.id === this.activeItemId) div.classList.add('sig-item--active');

    div.innerHTML = item.type === 'video'
      ? this.videoHTML(item)
      : this.imageHTML(item);

    div.addEventListener('click', () => this.onItemClick(item, div));
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.onItemClick(item, div);
      }
    });

    return div;
  }

  imageHTML(item) {
    const src = item.src || '';
    if (!src) {
      return `<span class="visually-hidden">${item.alt}</span>`;
    }
    return `<img
      src="${this.escAttr(src)}"
      alt="${this.escAttr(item.alt)}"
      loading="lazy"
      class="sig-item__img"
      width="400"
      height="600"
    >`;
  }

  videoHTML(item) {
    const poster = item.poster || '';
    const src = item.src || '';
    const posterId = `Deferred-Poster-sig-${item.id}`;
    const posterImg = poster
      ? `<img src="${this.escAttr(poster)}" alt="${this.escAttr(item.alt)}" loading="lazy" class="sig-item__img" width="400" height="600">`
      : '';

    return `<deferred-media-popup
      class="deferred-media global-media-settings"
      data-media-id="sig-${this.escAttr(item.id)}"
    >
      <button
        type="button"
        id="${posterId}"
        class="deferred-media__poster media"
        aria-label="Play video: ${this.escAttr(item.alt)}"
      >
        <span class="deferred-media__poster-button motion-reduce">
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-play" fill="none" viewBox="0 0 10 14">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1.48177 0.814643C0.81532 0.448245 0 0.930414 0 1.69094V12.2081C0 12.991 0.858787 13.4702 1.52503 13.0592L10.5398 7.49813C11.1918 7.09588 11.1679 6.13985 10.4965 5.77075L1.48177 0.814643Z" fill="currentColor"/>
          </svg>
        </span>
        ${posterImg}
      </button>
      <template>
        <video autoplay playsinline controls class="sig-video" style="width:100%;max-height:80vh;">
          <source src="${this.escAttr(src)}" type="video/mp4">
        </video>
      </template>
    </deferred-media-popup>`;
  }

  /* ── Item click ── */
  onItemClick(item, wrapper) {
    this.querySelectorAll('.sig-item--active').forEach((el) =>
      el.classList.remove('sig-item--active')
    );
    wrapper.classList.add('sig-item--active');
    this.activeItemId = item.id;
    this.updatePanel(item);

    if (window.innerWidth <= 430) {
      this.panelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ── Update bottom panel ── */
  updatePanel(item) {
    const p = item.product;
    const r = item.review;

    // CTA href
    this.panelEl.querySelector('.sig-panel__cta').href = p?.url || '#';

    // Lifestyle image (left) — the selected gallery item's own image
    const lifestyleEl = this.panelEl.querySelector('.sig-panel__lifestyle-image');
    lifestyleEl.innerHTML = item.src
      ? `<img src="${this.escAttr(item.src)}" alt="${this.escAttr(item.alt)}" loading="lazy" class="sig-panel__img" width="400" height="533">`
      : '';

    // Product image (right)
    const productImgEl = this.panelEl.querySelector('.sig-panel__product-image');
    productImgEl.innerHTML = p?.image
      ? `<img src="${this.escAttr(p.image)}" alt="${this.escAttr(p.title || '')}" loading="lazy" class="sig-panel__img" width="400" height="533">`
      : '';

    // Footer thumbnail
    const thumbEl = this.panelEl.querySelector('.sig-panel__footer-thumb');
    thumbEl.innerHTML = p?.image
      ? `<img src="${this.escAttr(p.image)}" alt="" loading="lazy" class="sig-panel__img" width="80" height="80">`
      : '';

    // Heading, editorial text, product info
    this.panelEl.querySelector('.sig-panel__heading').textContent = item.editorial_heading || '';
    this.panelEl.querySelector('.sig-panel__editorial-text').textContent = item.editorial || '';
    this.panelEl.querySelector('.sig-panel__product-title').textContent = p?.title || '';
    this.panelEl.querySelector('.sig-panel__product-shade').textContent = p?.shade ? `in shade ${p.shade}` : '';

    // Stars
    const rating = r?.rating ?? 5;
    const starsEl = this.panelEl.querySelector('.sig-panel__stars');
    starsEl.textContent = '★'.repeat(Math.min(rating, 5)) + '☆'.repeat(Math.max(0, 5 - rating));
    starsEl.setAttribute('aria-label', `${rating} out of 5 stars`);

    // Review
    this.panelEl.querySelector('.sig-panel__review-text').textContent = r?.text || '';
    this.panelEl.querySelector('.sig-panel__review-author').textContent = r?.author || '';

    // Indicator: position of this item among currently filtered assets
    const assets = this.filteredAssets;
    const idx = assets.findIndex((a) => a.id === item.id);
    this.panelEl.querySelector('.sig-panel__indicator-current').textContent = idx + 1;
    this.panelEl.querySelector('.sig-panel__indicator-total').textContent = assets.length;

    this.panelEl.removeAttribute('hidden');
  }

  /* ── Skeleton visibility ── */
  showLoading(showSkeleton = true) {
    if (showSkeleton && this.loadingEl) this.loadingEl.removeAttribute('hidden');
    this.gridEl.style.visibility = 'hidden';
  }
  hideLoading() {
    if (this.loadingEl) this.loadingEl.setAttribute('hidden', '');
    this.gridEl.style.visibility = '';
  }

  /* ── Filter tabs ── */
  bindFilters() {
    this.querySelectorAll('.sig-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.querySelectorAll('.sig-filter-btn').forEach((b) =>
          b.setAttribute('aria-selected', 'false')
        );
        btn.setAttribute('aria-selected', 'true');
        this.activeFilter = btn.dataset.filter;
        this.renderGroups(false);
      });
    });
  }

  /* ── Lazy load remaining groups via IntersectionObserver ── */
  setupLazyLoad() {
    if (this.observer) this.observer.disconnect();
    if (this.renderedGroupCount >= this.allGroups.length) return;

    const sentinel = this.gridEl.lastElementChild;
    if (!sentinel) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          this.observer.disconnect();
          this.loadMoreGroups();
        }
      },
      { rootMargin: '300px' }
    );

    this.observer.observe(sentinel);
  }

  loadMoreGroups() {
    const BATCH = 2;
    const next = this.allGroups.slice(
      this.renderedGroupCount,
      this.renderedGroupCount + BATCH
    );
    next.forEach((group, i) =>
      this.renderGroup(group, this.renderedGroupCount + i)
    );
    this.renderedGroupCount += next.length;
    this.sliderEl.resetPages();
    this.setupLazyLoad();
  }

  /* ── Patch SliderComponentCustom's sliderFirstItemNode after dynamic render ── */
  _fixSliderFirstItem() {
    if (this.sliderEl) {
      this.sliderEl.sliderFirstItemNode = this.sliderEl.slider?.querySelector('.custom__slide') || null;
    }
  }

  /* ── Utility: escape HTML attribute values ── */
  escAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

customElements.define('style-inspiration-gallery', StyleInspirationGallery);

class StyleInspirationGallery extends HTMLElement {
  connectedCallback() {
    const dataEl = this.querySelector('script[type="application/json"]');
    if (!dataEl) return;

    this.data = JSON.parse(dataEl.textContent);
    this.sectionId = this.dataset.sectionId;
    this.activeFilter = 'all';

    this.gridEl = this.querySelector(`#Slider-${this.sectionId}`);
    this.sliderEl = this.querySelector('slider-component-custom');
    this.panelEl = this.querySelector(`#SigPanel-${this.sectionId}`);
    this.loadingEl = this.querySelector('.sig-loading');
    this.emptyEl = this.querySelector('.sig-empty');
    this.filterButtons = Array.from(this.querySelectorAll('.sig-filter-btn'));
    this.scrollbarEl = this.querySelector('.sig-scrollbar');
    this.scrollbarTrackEl = this.querySelector('.sig-scrollbar__track');
    this.scrollbarThumbEl = this.querySelector('.sig-scrollbar__thumb');
    this.layoutEl = this.querySelector('.sig-layout');
    this.panelPlaceholderEl = this.querySelector(`#SigPanelPlaceholder-${this.sectionId}`);
    this.reviewToggleEl = this.querySelector('.sig-panel__review-toggle');
    this.filtersById = new Map(
      (this.data.filters || []).map((filter) => [this.normalizeFilter(filter.id || filter.label), filter])
    );
    this.shuffledAssetsByFilter = new Map();
    this.scrollbarDrag = null;
    this.reviewWordLimit = 24;

    this.bindFilters();
    this.bindSliderEvents();
    this.bindScrollbar();
    this.bindReviewToggle();
    this.renderSlides(true);
  }

  get filteredAssets() {
    if (!this.shuffledAssetsByFilter.has(this.activeFilter)) {
      const assets = this.activeFilter === 'all'
        ? [...(this.data.assets || [])]
        : (this.data.assets || []).filter((asset) =>
          (asset.filters || []).some((filter) => this.normalizeFilter(filter) === this.activeFilter)
        );

      this.shuffledAssetsByFilter.set(this.activeFilter, this.shuffleAssets(assets));
    }

    return this.shuffledAssetsByFilter.get(this.activeFilter) || [];
  }

  get activeFilterData() {
    return this.filtersById.get(this.activeFilter) || this.filtersById.get('all') || null;
  }

  buildColumns(assets) {
    const columns = [];
    const columnMap = [
      [0, 3],
      [1, 4],
      [2],
    ];

    for (let index = 0; index < assets.length; index += 5) {
      const chunk = assets.slice(index, index + 5);

      columnMap.forEach((columnIndexes) => {
        const items = columnIndexes.map((itemIndex) => chunk[itemIndex]).filter(Boolean);
        if (!items.length) return;

        columns.push({
          items,
          isTall: columnIndexes.length === 1,
        });
      });
    }

    return columns;
  }

  renderSlides(initial = false) {
    this.showLoading(initial);
    this.resetSliderPosition(false);

    requestAnimationFrame(() => {
      this.gridEl.innerHTML = '';

      const assets = this.filteredAssets;
      const columns = this.buildColumns(assets);

      if (!columns.length) {
        this.hideLoading();
        this.emptyEl.removeAttribute('hidden');
        this.panelEl.setAttribute('hidden', '');
        this.updateIndicator(0, 0);
        this.sliderEl.resetSlider();
        return;
      }

      this.emptyEl.setAttribute('hidden', '');
      columns.forEach((column, index) => this.renderColumn(column, index));

      this.hideLoading();
      this.updatePanel();
      this.resetSliderPosition(false);
      this.sliderEl.resetSlider();
      this.syncSliderState(columns.length);
      this.updateScrollbar();
      this.updateIndicatorFromSlider();
    });
  }

  syncSliderState(columnCount) {
    if (!this.sliderEl) return;

    if (columnCount < 2) {
      this.sliderEl.totalPages = columnCount;
      this.sliderEl.currentPage = columnCount ? 1 : 0;
      return;
    }

    const sliderItemsToShow = this.sliderEl.sliderItemsToShow || [];
    const slidesPerPage = Math.max(1, this.sliderEl.slidesPerPage || 1);
    this.sliderEl.totalPages = Math.max(1, sliderItemsToShow.length - slidesPerPage + 1);
    this.sliderEl.currentPage = Math.min(this.sliderEl.currentPage || 1, this.sliderEl.totalPages);
  }

  renderColumn(column, index) {
    const slide = document.createElement('li');
    slide.id = `Slide-${this.sectionId}-${index + 1}`;
    slide.className = `sig-column slider__slide custom__slide ${column.isTall ? 'sig-column--tall' : 'sig-column--stack'}`;
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-label', `Column ${index + 1}`);

    column.items.forEach((item) => slide.appendChild(this.renderItem(item, column.isTall)));
    this.gridEl.appendChild(slide);
  }

  renderItem(item, isTall = false) {
    const tile = document.createElement('div');
    tile.className = `sig-item ${isTall ? 'sig-item--tall' : 'sig-item--portrait'}`;
    tile.dataset.itemId = item.id;

    tile.innerHTML = item.type === 'video'
      ? this.videoHTML(item, isTall)
      : this.imageHTML(item, isTall);

    const filterTrigger = tile.querySelector('.sig-item__filter-trigger');
    if (filterTrigger) {
      filterTrigger.addEventListener('click', () => this.onItemClick(item));
    }

    return tile;
  }

  imageHTML(item, isTall = false) {
    const src = item.src || '';
    if (!src) {
      return `<span class="visually-hidden">${this.escAttr(item.alt)}</span>`;
    }

    return `<img
      src="${this.escAttr(src)}"
      alt="${this.escAttr(item.alt)}"
      loading="lazy"
      class="sig-item__img"
      width="186"
      height="${isTall ? 498 : 245}"
    >
    <button
      type="button"
      class="sig-item__filter-trigger"
      aria-label="Show ${this.escAttr(item.alt)} details"
    ></button>`;
  }

  videoHTML(item, isTall = false) {
    const poster = item.poster || '';
    const src = item.src || '';
    const posterId = `Deferred-Poster-sig-${item.id}`;
    const posterImg = poster
      ? `<img src="${this.escAttr(poster)}" alt="${this.escAttr(item.alt)}" loading="lazy" class="sig-item__img" width="186" height="${isTall ? 498 : 245}">`
      : '';
    const popupPosterAttr = poster ? ` poster="${this.escAttr(poster)}"` : '';
    const popupPosterFallback = poster
      ? `<img src="${this.escAttr(poster)}" alt="${this.escAttr(item.alt)}">`
      : '';

    return `<deferred-media-popup
      class="deferred-media global-media-settings sig-deferred-media"
      data-media-id="sig-${this.escAttr(item.id)}"
    >
      ${posterImg}
      <button
        type="button"
        class="sig-item__filter-trigger sig-item__filter-trigger--video"
        aria-label="Show ${this.escAttr(item.alt)} details"
      ></button>
      <button
        type="button"
        id="${posterId}"
        class="deferred-media__poster sig-item__play-trigger"
        aria-label="Play video: ${this.escAttr(item.alt)}"
      >
        <span class="deferred-media__poster-button motion-reduce">
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-play" fill="none" viewBox="0 0 10 14">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1.48177 0.814643C0.81532 0.448245 0 0.930414 0 1.69094V12.2081C0 12.991 0.858787 13.4702 1.52503 13.0592L10.5398 7.49813C11.1918 7.09588 11.1679 6.13985 10.4965 5.77075L1.48177 0.814643Z" fill="currentColor"/>
          </svg>
        </span>
      </button>
      <template>
        <video playsinline="playsinline" autoplay="autoplay" controls="controls" preload="metadata" class="sig-video" style="width:100%;max-height:80vh;"${popupPosterAttr}>
          <source src="${this.escAttr(src)}" type="video/mp4">
          ${popupPosterFallback}
        </video>
      </template>
    </deferred-media-popup>`;
  }

  onItemClick(item) {
    const targetFilter = this.getTargetFilter(item);
    if (!targetFilter || targetFilter === this.activeFilter) return;

    this.setActiveFilter(targetFilter);

    if (window.innerWidth <= 430) {
      this.panelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  getTargetFilter(item) {
    const itemFilters = (item.filters || []).map((filter) => this.normalizeFilter(filter));

    if (this.activeFilter !== 'all' && itemFilters.includes(this.activeFilter)) {
      return this.activeFilter;
    }

    return itemFilters[0] || 'all';
  }

  setActiveFilter(filterId) {
    if (filterId === this.activeFilter) return;

    this.activeFilter = filterId;
    this.updateFilterButtons();
    this.renderSlides(false);
  }

  resetSliderPosition(smooth = false) {
    if (!this.gridEl) return;

    this.gridEl.scrollTo({
      left: 0,
      behavior: smooth ? 'smooth' : 'auto',
    });

    if (this.sliderEl) {
      this.sliderEl.currentPage = this.gridEl.children.length ? 1 : 0;
    }
  }

  updatePanel() {
    const filterData = this.activeFilterData;
    const hasPanel = this.activeFilter !== 'all' && Boolean(filterData?.panel);

    this.layoutEl?.classList.toggle('sig-layout--panel-hidden', !hasPanel);
    if (!hasPanel) {
      this.panelPlaceholderEl?.removeAttribute('hidden');
      this.panelPlaceholderEl?.setAttribute('aria-hidden', 'false');
      this.panelEl.setAttribute('hidden', '');
      this.panelEl.setAttribute('aria-hidden', 'true');
      return;
    }

    this.panelPlaceholderEl?.setAttribute('hidden', '');
    this.panelPlaceholderEl?.setAttribute('aria-hidden', 'true');
    this.panelEl.setAttribute('aria-hidden', 'false');

    const panel = filterData?.panel || {};
    const product = panel.product || {};
    const review = panel.review || {};

    this.panelEl.querySelector('.sig-panel__cta').href = product.url || '#';

    const lifestyleEl = this.panelEl.querySelector('.sig-panel__lifestyle-image');
    lifestyleEl.innerHTML = panel.image
      ? `<img src="${this.escAttr(panel.image)}" alt="${this.escAttr(panel.image_alt || filterData?.label || '')}" loading="lazy" class="sig-panel__img" width="400" height="533">`
      : '';

    const productImgEl = this.panelEl.querySelector('.sig-panel__product-image');
    productImgEl.innerHTML = product.image
      ? `<img src="${this.escAttr(product.image)}" alt="${this.escAttr(product.title || '')}" loading="lazy" class="sig-panel__img" width="400" height="533">`
      : '';

    const thumbEl = this.panelEl.querySelector('.sig-panel__footer-thumb');
    thumbEl.innerHTML = product.image
      ? `<img src="${this.escAttr(product.image)}" alt="" loading="lazy" class="sig-panel__img" width="80" height="80">`
      : '';

    this.panelEl.querySelector('.sig-panel__heading').textContent = panel.editorial_heading || '';
    this.panelEl.querySelector('.sig-panel__editorial-text').textContent = panel.editorial || '';
    this.panelEl.querySelector('.sig-panel__product-title').textContent = product.title || '';

    const rating = review.rating ?? 5;
    const starsEl = this.panelEl.querySelector('.sig-panel__stars');
    starsEl.textContent = '★'.repeat(Math.min(rating, 5)) + '☆'.repeat(Math.max(0, 5 - rating));
    starsEl.setAttribute('aria-label', `${rating} out of 5 stars`);

    this.reviewToggleEl?.setAttribute('data-expanded', 'false');
    this.panelEl.querySelector('.sig-panel__review-text').textContent = this.getReviewPreview(review.text || '');
    this.panelEl.querySelector('.sig-panel__review-author').textContent = review.author || '';
    this.updateReviewToggle(review.text || '');
    this.panelEl.removeAttribute('hidden');
  }

  showLoading(showSkeleton = true) {
    if (showSkeleton && this.loadingEl) this.loadingEl.removeAttribute('hidden');
    this.gridEl.style.visibility = 'hidden';
  }

  hideLoading() {
    if (this.loadingEl) this.loadingEl.setAttribute('hidden', '');
    this.gridEl.style.visibility = '';
  }

  bindFilters() {
    this.filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.setActiveFilter(button.dataset.filter || 'all');
      });
    });

    this.updateFilterButtons();
  }

  bindReviewToggle() {
    if (!this.reviewToggleEl) return;

    this.reviewToggleEl.addEventListener('click', () => {
      const filterData = this.activeFilterData;
      const fullText = filterData?.panel?.review?.text || '';
      const isExpanded = this.reviewToggleEl.getAttribute('data-expanded') === 'true';

      this.reviewToggleEl.setAttribute('data-expanded', isExpanded ? 'false' : 'true');
      this.panelEl.querySelector('.sig-panel__review-text').textContent = isExpanded
        ? this.getReviewPreview(fullText)
        : fullText;
      this.reviewToggleEl.textContent = isExpanded ? 'Read more' : 'Read less';
    });
  }

  bindSliderEvents() {
    if (!this.sliderEl) return;

    this.sliderEl.addEventListener('slideChanged', () => {
      this.updateIndicatorFromSlider();
      this.updateScrollbar();
    });

    this.gridEl?.addEventListener('scroll', () => this.updateScrollbar(), { passive: true });
    window.addEventListener('resize', () => this.updateScrollbar());
  }

  bindScrollbar() {
    if (!this.scrollbarTrackEl || !this.scrollbarThumbEl || !this.gridEl) return;

    this.scrollbarThumbEl.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const trackRect = this.scrollbarTrackEl.getBoundingClientRect();
      const thumbRect = this.scrollbarThumbEl.getBoundingClientRect();

      this.scrollbarDrag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startLeft: thumbRect.left - trackRect.left,
      };

      this.scrollbarThumbEl.setPointerCapture(event.pointerId);
    });

    this.scrollbarThumbEl.addEventListener('pointermove', (event) => {
      if (!this.scrollbarDrag || event.pointerId !== this.scrollbarDrag.pointerId) return;
      this.onScrollbarDrag(event.clientX);
    });

    const clearDrag = (event) => {
      if (!this.scrollbarDrag || event.pointerId !== this.scrollbarDrag.pointerId) return;
      this.scrollbarThumbEl.releasePointerCapture(event.pointerId);
      this.scrollbarDrag = null;
    };

    this.scrollbarThumbEl.addEventListener('pointerup', clearDrag);
    this.scrollbarThumbEl.addEventListener('pointercancel', clearDrag);

    this.scrollbarTrackEl.addEventListener('click', (event) => {
      if (event.target === this.scrollbarThumbEl) return;

      const rect = this.scrollbarTrackEl.getBoundingClientRect();
      const thumbWidth = this.scrollbarThumbEl.offsetWidth;
      const targetLeft = event.clientX - rect.left - thumbWidth / 2;
      this.scrollToScrollbarPosition(targetLeft, true);
    });
  }

  onScrollbarDrag(clientX) {
    const trackWidth = this.scrollbarTrackEl.clientWidth;
    const thumbWidth = this.scrollbarThumbEl.offsetWidth;
    const maxLeft = Math.max(0, trackWidth - thumbWidth);
    const delta = clientX - this.scrollbarDrag.startX;
    const targetLeft = Math.min(Math.max(0, this.scrollbarDrag.startLeft + delta), maxLeft);
    this.scrollToScrollbarPosition(targetLeft, false);
  }

  scrollToScrollbarPosition(targetLeft, smooth = false) {
    const maxScroll = this.gridEl.scrollWidth - this.gridEl.clientWidth;
    const maxLeft = Math.max(0, this.scrollbarTrackEl.clientWidth - this.scrollbarThumbEl.offsetWidth);
    const ratio = maxLeft > 0 ? targetLeft / maxLeft : 0;

    this.gridEl.scrollTo({
      left: ratio * Math.max(0, maxScroll),
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  updateScrollbar() {
    if (!this.scrollbarEl || !this.scrollbarTrackEl || !this.scrollbarThumbEl || !this.gridEl) return;

    const scrollWidth = this.gridEl.scrollWidth;
    const clientWidth = this.gridEl.clientWidth;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    const canScroll = maxScroll > 0;

    this.scrollbarEl.toggleAttribute('hidden', !canScroll);
    if (!canScroll) return;

    const trackWidth = this.scrollbarTrackEl.clientWidth;
    const visibleRatio = clientWidth / scrollWidth;
    const thumbWidth = Math.max(48, Math.round(trackWidth * visibleRatio));
    const maxLeft = Math.max(0, trackWidth - thumbWidth);
    const left = maxScroll > 0 ? (this.gridEl.scrollLeft / maxScroll) * maxLeft : 0;

    this.scrollbarThumbEl.style.width = `${thumbWidth}px`;
    this.scrollbarThumbEl.style.transform = `translateX(${left}px)`;
  }

  updateReviewToggle(fullText) {
    if (!this.reviewToggleEl) return;

    const words = this.getWords(fullText);
    const shouldToggle = words.length > this.reviewWordLimit;
    this.reviewToggleEl.hidden = !shouldToggle;
    this.reviewToggleEl.textContent = 'Read more';
  }

  getReviewPreview(text) {
    const words = this.getWords(text);
    if (words.length <= this.reviewWordLimit) return text;
    return `${words.slice(0, this.reviewWordLimit).join(' ')}...`;
  }

  getWords(text) {
    return String(text).trim().split(/\s+/).filter(Boolean);
  }

  shuffleAssets(assets) {
    const shuffled = [...assets];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
  }

  updateFilterButtons() {
    this.filterButtons.forEach((button) => {
      const isActive = (button.dataset.filter || 'all') === this.activeFilter;
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  updateIndicatorFromSlider() {
    const totalPages = this.sliderEl?.totalPages || (this.gridEl.children.length ? 1 : 0);
    const currentPage = totalPages > 0 ? Math.min(this.sliderEl?.currentPage || 1, totalPages) : 0;
    this.updateIndicator(currentPage, totalPages);
  }

  updateIndicator(current, total) {
    this.panelEl.querySelector('.sig-panel__indicator-current').textContent = current || 0;
    this.panelEl.querySelector('.sig-panel__indicator-total').textContent = total || 0;
  }

  normalizeFilter(value = '') {
    return String(value).trim().toLowerCase();
  }

  escAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

customElements.define('style-inspiration-gallery', StyleInspirationGallery);

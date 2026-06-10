if (!customElements.get('banner-carousel-slider')) {
  customElements.define('banner-carousel-slider', class extends SliderComponent {

    initSlider() {
      this.sliderVisual = this.dataset.visual || 'dots';
      this.controlWrapper = this.querySelector('.slider-visual-wrapper');
      this.currentPage = 1;
      super.initSlider();
    }

    // True when the CSS 2-row grid is active — checks computed style, not viewport width
    get isTwoRow() {
      return !!this.slider && getComputedStyle(this.slider).display === 'grid';
    }

    initPages() {
      this.sliderItemsToShow = Array.from(this.sliderItems).filter((el) => el.clientWidth > 0);
      if (this.sliderItemsToShow.length < 2) return;

      if (this.isTwoRow) {
        // grid-auto-flow: column puts items 0 & 1 in column 1, items 2 & 3 in column 2, etc.
        // Use items 0 and 2 (same row, adjacent columns) for the column offset.
        const colOffset = this.sliderItemsToShow.length >= 3
          ? this.sliderItemsToShow[2].offsetLeft - this.sliderItemsToShow[0].offsetLeft
          : 0;
        this.sliderItemOffset = colOffset || this.sliderItemsToShow[0].offsetWidth;
        // Adding gap before flooring compensates for the missing trailing gap on the last column,
        // ensuring Math.floor returns N (not N-1) when exactly N columns fit.
        const gap = this.sliderItemOffset - this.sliderItemsToShow[0].offsetWidth;
        this.slidesPerPage = Math.max(1, Math.floor((this.slider.clientWidth + gap) / this.sliderItemOffset));
        // Calculate totalPages from column count, not scrollWidth — the .slider--desktop::after
        // pseudo-element becomes a phantom grid column that inflates scrollWidth by one extra track,
        // causing Math.round(scrollWidth / pageStep) to return one page too many.
        const totalColumns = Math.ceil(this.sliderItemsToShow.length / 2); // grid always has 2 rows
        this.totalPages = Math.max(1, Math.ceil(totalColumns / this.slidesPerPage));
      } else {
        // Single-row (mobile / tablet)
        this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
        if (this.sliderItemOffset) {
          // Adding gap before flooring compensates for the missing trailing gap on the last card,
          // ensuring Math.floor returns N (not N-1) when exactly N cards fit.
          const gap = this.sliderItemOffset - this.sliderItemsToShow[0].offsetWidth;
          this.slidesPerPage = Math.max(1, Math.floor((this.slider.clientWidth + gap) / this.sliderItemOffset));
        } else {
          this.slidesPerPage = 1;
        }
        this.totalPages = Math.max(1, Math.ceil(this.sliderItemsToShow.length / this.slidesPerPage));
      }

      // Render dots/numbers before update() so the active class can be applied immediately
      this.renderVisual();
      this.update();
    }

    onButtonClick(event) {
      event.preventDefault();
      const dir = event.currentTarget.name === 'next' ? 1 : -1;
      // Calculate target from currentPage, not from scrollLeft.
      // On a short final page, scrollLeft is clamped to scrollWidth - clientWidth which is less than
      // (totalPages - 1) * pageStep, so scrollLeft - pageStep would undershoot and snap back to page 1.
      const targetPage = Math.min(this.totalPages, Math.max(1, this.currentPage + dir));
      this.setSlidePosition((targetPage - 1) * this.slidesPerPage * this.sliderItemOffset);
    }

    update() {
      if (!this.slider || !this.nextButton || !this.sliderItemOffset) return;

      const { scrollLeft, scrollWidth, clientWidth } = this.slider;
      const pageStep = this.sliderItemOffset * this.slidesPerPage;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;

      // When at end of scroll, force last page — handles short final pages where scrollLeft is
      // clamped and Math.round would give totalPages - 1 instead of totalPages
      this.currentPage = atEnd
        ? this.totalPages
        : Math.min(this.totalPages, Math.max(1, Math.round(scrollLeft / pageStep) + 1));

      if (this.currentPageElement && this.pageTotalElement) {
        this.currentPageElement.textContent = this.currentPage;
        this.pageTotalElement.textContent = this.totalPages;
      }

      // Use cached links — avoids a querySelectorAll on every scroll event
      if (this._controlLinks) {
        this._controlLinks.forEach((link, i) => {
          link.classList.toggle('slider-counter__link--active', i === this.currentPage - 1);
        });
      }

      this.prevButton.toggleAttribute('disabled', scrollLeft <= 0);
      this.nextButton.toggleAttribute('disabled', atEnd);
    }

    renderVisual() {
      if (!this.controlWrapper || this.sliderVisual === 'counter') return;

      const total = this.totalPages || 1;

      // Skip rebuild if the page count hasn't changed — ResizeObserver can fire frequently
      if (this._renderedTotal === total) return;
      this._renderedTotal = total;

      this.controlWrapper.innerHTML = '';
      this._controlLinks = [];

      for (let i = 0; i < total; i++) {
        const btn = document.createElement('button');
        btn.classList.add('slider-counter__link', `slider-counter__link--${this.sliderVisual}`, 'link');
        btn.setAttribute('aria-label', `Page ${i + 1} of ${total}`);
        btn.setAttribute('aria-controls', this.slider.id);

        if (this.sliderVisual === 'dots') {
          btn.innerHTML = '<span class="dot"></span>';
        } else {
          btn.textContent = i + 1;
        }

        btn.addEventListener('click', () => {
          this.setSlidePosition(i * this.slidesPerPage * this.sliderItemOffset);
        });

        this.controlWrapper.append(btn);
        this._controlLinks.push(btn);
      }
    }
  });
}

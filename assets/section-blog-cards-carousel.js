// Extends SliderComponentCustom (defined in global.js) to support a 2-row
// column-flow grid on mobile. On mobile, cards 1+2 occupy column 1 and cards
// 3+4 occupy column 2 (grid-auto-flow: column). The base class calculates
// sliderItemOffset as items[1].offsetLeft - items[0].offsetLeft, which is 0
// in this layout (same column). We override initPages() to derive the offset
// from items[2] instead, and override onButtonClick() to scroll by one column.

customElements.whenDefined('slider-component-custom').then(() => {
  const SliderParent = customElements.get('slider-component-custom');

  class BlogCardsSlider extends SliderParent {
    get isMobileLayout() {
      return window.innerWidth < 750;
    }

    initPages() {
      super.initPages();

      if (!this.isMobileLayout) return;

      const items = this.sliderItemsToShow;
      if (!items || items.length < 3) return;

      // In 2-row column-flow: items[0] and items[1] share the same offsetLeft.
      // items[2] is the first item of the second column — use it for the offset.
      this.sliderItemOffset = items[2].offsetLeft - items[0].offsetLeft;
      if (this.sliderItemOffset <= 0) return;

      const totalColumns = Math.ceil(items.length / 2);
      const columnsInView = Math.max(1, Math.floor(this.slider.clientWidth / this.sliderItemOffset));
      this.totalPages = Math.max(1, totalColumns - columnsInView + 1);

      this.update();
    }

    onButtonClick(event) {
      event.preventDefault();
      const direction = event.currentTarget.name === 'next' ? 1 : -1;
      const targetPage = Math.max(1, Math.min(this.totalPages, this.currentPage + direction));
      this.setSlidePosition((targetPage - 1) * this.sliderItemOffset);
    }

    update() {
      super.update();
      // SliderComponentCustom.update() unconditionally re-enables both buttons (looping design).
      // Use currentPage/totalPages to re-apply disabled state — avoids relying on scrollWidth,
      // which includes the ::after trailing spacer and would give a wrong upper bound.
      if (this.currentPage <= 1) {
        this.prevButton?.setAttribute('disabled', 'disabled');
      }
      if (this.currentPage >= this.totalPages) {
        this.nextButton?.setAttribute('disabled', 'disabled');
      }
    }
  }

  customElements.define('blog-cards-slider', BlogCardsSlider);
});

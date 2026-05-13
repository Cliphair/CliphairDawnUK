customElements.whenDefined('slider-component-custom').then(() => {
    const SliderParent = customElements.get('slider-component-custom');

    class SplitBannerShadeSlider extends SliderParent {
        get isTwoRowDesktopLayout() {
            return window.innerWidth >= 990;
        }

        initPages() {
            super.initPages();

            if (!this.isTwoRowDesktopLayout) return;

            const items = this.sliderItemsToShow;
            if (!items || items.length < 3) return;

            const columnRepresentatives = [];
            items.forEach((element) => {
                if (!columnRepresentatives.some((columnElement) => columnElement.offsetLeft === element.offsetLeft)) {
                    columnRepresentatives.push(element);
                }
            });

            if (columnRepresentatives.length < 2) return;

            this.sliderItemOffset = columnRepresentatives[1].offsetLeft - columnRepresentatives[0].offsetLeft;
            if (this.sliderItemOffset <= 0) return;

            const visibleColumns = Math.max(
                1,
                columnRepresentatives.filter(
                    (element) => element.offsetLeft + element.clientWidth <= this.slider.clientWidth + 1
                ).length
            );
            this.totalPages = Math.max(1, columnRepresentatives.length - visibleColumns + 1);

            this.update();
        }

        onButtonClick(event) {
            if (!this.isTwoRowDesktopLayout) {
                super.onButtonClick(event);
                return;
            }

            event.preventDefault();
            const direction = event.currentTarget.name === 'next' ? 1 : -1;
            const targetPage = Math.max(1, Math.min(this.totalPages, this.currentPage + direction));
            this.setSlidePosition((targetPage - 1) * this.sliderItemOffset);
        }

        update() {
            super.update();

            if (!this.isTwoRowDesktopLayout) return;

            if (this.currentPage <= 1) {
                this.prevButton?.setAttribute('disabled', 'disabled');
            }

            if (this.currentPage >= this.totalPages) {
                this.nextButton?.setAttribute('disabled', 'disabled');
            }
        }
    }

    customElements.define('split-banner-shade-slider', SplitBannerShadeSlider);
});
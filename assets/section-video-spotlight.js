class VideoSpotlightSlider extends HTMLElement {
    constructor() {
        super();
        this._activeIndex = 0;
        this._slides = [];
        this._infoPanels = [];
        this._lastDirection = 1;
        this._modalObservers = [];
        this._wideMedia = window.matchMedia('(min-width: 750px)');
        this._handleViewportChange = this._handleViewportChange.bind(this);
        this._handleSectionLoad = this._handleSectionLoad.bind(this);
        this._handleBlockSelect = this._handleBlockSelect.bind(this);
    }

    connectedCallback() {
        this._sectionId = this.dataset.sectionId;
        this._track = this.querySelector('.vs-track');
        this._prevBtn = this.querySelector('[name="previous"]');
        this._nextBtn = this.querySelector('[name="next"]');
        this._slides = Array.from(this.querySelectorAll('.vs-slide'));
        this._infoPanels = Array.from(this.querySelectorAll('.vs-info-panel'));

        if (!this._track || !this._slides.length) return;

        this.dataset.slideCount = String(this._slides.length);
        this._updateLayoutMode();
        this._bindEvents();
        this._goToSlide(0, false, 1);
        this._setupModalAutoPlay();
    }

    disconnectedCallback() {
        this._prevBtn?.removeEventListener('click', this._handlePrevClick);
        this._nextBtn?.removeEventListener('click', this._handleNextClick);

        this._slides.forEach((slide) => {
            if (slide._clickHandler) {
                slide.removeEventListener('click', slide._clickHandler);
                slide._clickHandler = null;
            }
        });

        if (typeof this._wideMedia.removeEventListener === 'function') {
            this._wideMedia.removeEventListener('change', this._handleViewportChange);
        } else {
            this._wideMedia.removeListener(this._handleViewportChange);
        }

        document.removeEventListener('shopify:section:load', this._handleSectionLoad);
        document.removeEventListener('shopify:block:select', this._handleBlockSelect);

        this._modalObservers.forEach((observer) => observer.disconnect());
        this._modalObservers = [];
    }

    _bindEvents() {
        this._handlePrevClick = () => this._navigate(-1);
        this._handleNextClick = () => this._navigate(1);

        this._prevBtn?.addEventListener('click', this._handlePrevClick);
        this._nextBtn?.addEventListener('click', this._handleNextClick);

        this._slides.forEach((slide) => {
            slide._clickHandler = () => {
                const index = parseInt(slide.dataset.index, 10);
                if (!Number.isNaN(index) && index !== this._activeIndex) {
                    this._goToSlide(index, true, this._getNavigationDirection(index));
                }
            };
            slide.addEventListener('click', slide._clickHandler);
        });

        if (typeof this._wideMedia.addEventListener === 'function') {
            this._wideMedia.addEventListener('change', this._handleViewportChange);
        } else {
            this._wideMedia.addListener(this._handleViewportChange);
        }

        document.addEventListener('shopify:section:load', this._handleSectionLoad);
        document.addEventListener('shopify:block:select', this._handleBlockSelect);
    }

    _handleViewportChange() {
        this._updateLayoutMode();
        this._applySlideState(false);
    }

    _handleSectionLoad(event) {
        if (event.detail.sectionId === this._sectionId) {
            this._updateLayoutMode();
            this._goToSlide(0, false, 1);
        }
    }

    _handleBlockSelect(event) {
        const block = event.target.closest('.vs-slide');
        if (!block || !this.contains(block)) return;

        const index = this._slides.indexOf(block);
        if (index > -1) {
            this._goToSlide(index, true, this._getNavigationDirection(index));
        }
    }

    _updateLayoutMode() {
        this.dataset.layout = this._wideMedia.matches ? 'wide' : 'mobile';
    }

    _navigate(direction) {
        if (this._slides.length < 2) return;
        const nextIndex = (this._activeIndex + direction + this._slides.length) % this._slides.length;
        this._goToSlide(nextIndex, true, direction);
    }

    _goToSlide(index, animate = true, direction = 1) {
        const outgoingSlide = this._slides[this._activeIndex];
        if (outgoingSlide) {
            const outgoingVideo = outgoingSlide.querySelector('video');
            if (outgoingVideo) {
                outgoingVideo.pause();
                if (outgoingSlide._endedHandler) {
                    outgoingVideo.removeEventListener('ended', outgoingSlide._endedHandler);
                    outgoingSlide._endedHandler = null;
                }
            }
        }

        this._activeIndex = index;
        this._lastDirection = direction || this._lastDirection;

        this._applySlideState(animate);
        this._activateVideo(index);
    }

    _applySlideState(animate = true) {
        if (!animate) {
            this.classList.add('is-static');
            requestAnimationFrame(() => this.classList.remove('is-static'));
        }

        this._slides.forEach((slide, index) => {
            const isActive = index === this._activeIndex;
            const slot = this._getSlotForIndex(index);

            slide.dataset.slot = slot;
            slide.classList.toggle('is-active', isActive);
            slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });

        this._infoPanels.forEach((panel, index) => {
            const isActive = index === this._activeIndex;
            panel.classList.toggle('is-active', isActive);
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });
    }

    _getSlotForIndex(index) {
        const count = this._slides.length;
        const isWide = this._wideMedia.matches;

        if (count === 1) return 'center';
        if (count === 2) return this._getTwoSlideSlot(index);

        const delta = this._getSignedDelta(index);
        if (delta === 0) return 'center';
        if (delta === -1) return 'left-1';
        if (delta === 1) return 'right-1';

        if (isWide) {
            if (delta === -2) return 'left-2';
            if (delta === 2) return 'right-2';
        }

        return 'hidden';
    }

    _getTwoSlideSlot(index) {
        if (index === this._activeIndex) return 'center';
        return this._activeIndex % 2 === 0 ? 'right-1' : 'left-1';
    }

    _getSignedDelta(index) {
        const count = this._slides.length;
        const forward = (index - this._activeIndex + count) % count;
        const backward = (this._activeIndex - index + count) % count;

        if (forward === 0) return 0;
        if (forward < backward) return forward;
        if (backward < forward) return -backward;

        return this._lastDirection > 0 ? -backward : forward;
    }

    _getNavigationDirection(targetIndex) {
        const count = this._slides.length;
        const forward = (targetIndex - this._activeIndex + count) % count;
        const backward = (this._activeIndex - targetIndex + count) % count;

        if (forward === backward) {
            return this._lastDirection > 0 ? 1 : -1;
        }

        return forward < backward ? 1 : -1;
    }

    _activateVideo(index) {
        const slide = this._slides[index];
        if (!slide) return;

        const deferredMedia = slide.querySelector('deferred-media');
        if (!deferredMedia) return;

        if (!deferredMedia.hasAttribute('loaded')) {
            deferredMedia.loadContent(false);
        } else {
            const video = slide.querySelector('video');
            if (video) {
                video.currentTime = 0;
                video.play().catch(() => { });
            }
        }

        const video = slide.querySelector('video');
        if (video) {
            slide._endedHandler = () => this._navigate(1);
            video.addEventListener('ended', slide._endedHandler);
        }
    }

    _setupModalAutoPlay() {
        requestAnimationFrame(() => {
            this._slides.forEach((_, index) => {
                const modal = document.getElementById(`VideoModal-${this._sectionId}-${index + 1}`);
                if (!modal) return;

                const observer = new MutationObserver(() => {
                    const video = modal.querySelector('video');

                    if (modal.hasAttribute('open')) {
                        setTimeout(() => {
                            if (video) {
                                video.currentTime = 0;
                                video.play().catch(() => { });
                            }
                        }, 0);
                    } else if (video) {
                        video.pause();
                        video.currentTime = 0;
                    }
                });

                observer.observe(modal, { attributes: true, attributeFilter: ['open'] });
                this._modalObservers.push(observer);
            });
        });
    }
}

customElements.define('video-spotlight-slider', VideoSpotlightSlider);

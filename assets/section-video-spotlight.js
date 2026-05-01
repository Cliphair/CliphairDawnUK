/**
 * VideoSpotlightSlider — Custom Web Component
 *
 * Responsibilities:
 *  - Centre the active slide (spotlight scale handled by CSS `.is-active`)
 *  - Load each slide's video via Dawn's DeferredMedia only when that slide
 *    becomes active (performance: no video data loaded for off-screen slides)
 *  - Pause the outgoing slide's video on navigation
 *  - Auto-advance to the next slide when the active video ends
 *  - Sync the info panel with the active slide (no dots — arrows only)
 *  - Re-play the modal video after Dawn's pauseAllMedia() runs on modal open
 *  - Support Theme Editor section:load / block:select events
 */

class VideoSpotlightSlider extends HTMLElement {
    constructor() {
        super();
        this._activeIndex = 0;
        this._slides = [];
        this._infoPanels = [];
        this._resizeObserver = null;
    }

    connectedCallback() {
        this._sectionId = this.dataset.sectionId;

        // Core DOM refs
        this._track = this.querySelector('.vs-track');
        this._prevBtn = this.querySelector('[name="previous"]');
        this._nextBtn = this.querySelector('[name="next"]');
        this._slides = Array.from(this.querySelectorAll('.vs-slide'));
        this._infoPanels = Array.from(this.querySelectorAll('.vs-info-panel'));

        if (!this._track || !this._slides.length) return;

        this._setTrackPadding();
        this._goToSlide(0, false);
        this._setupModalAutoPlay();

        // Navigation buttons
        this._prevBtn?.addEventListener('click', () => this._navigate(-1));
        this._nextBtn?.addEventListener('click', () => this._navigate(1));

        // Clicking a non-active slide navigates to it
        this._slides.forEach((slide) => {
            slide.addEventListener('click', () => {
                const idx = parseInt(slide.dataset.index, 10);
                if (idx !== this._activeIndex) this._goToSlide(idx);
            });
        });

        // Recalculate track padding on resize
        this._resizeObserver = new ResizeObserver(() => {
            this._setTrackPadding();
            this._goToSlide(this._activeIndex, false);
        });
        this._resizeObserver.observe(this._track);

        // Theme Editor support
        document.addEventListener('shopify:section:load', (e) => {
            if (e.detail.sectionId === this._sectionId) {
                this._goToSlide(0, false);
            }
        });

        document.addEventListener('shopify:block:select', (e) => {
            const block = e.target;
            if (!block || !block.closest(`#VideoSpotlight-${this._sectionId}`)) return;
            const idx = this._slides.findIndex((s) => s === block || s.contains(block));
            if (idx > -1) this._goToSlide(idx);
        });
    }

    disconnectedCallback() {
        this._resizeObserver?.disconnect();
    }


    // ── Track padding so first & last slides can be centred ─────

    _setTrackPadding() {
        if (!this._track || !this._slides.length) return;
        const trackWidth = this._track.parentElement.offsetWidth;
        const slideWidth = this._slides[0].offsetWidth;
        const pad = Math.max(0, (trackWidth - slideWidth) / 2);
        this._track.style.setProperty('--vs-track-pad', `${pad}px`);
        // Also set the CSS custom property used in the stylesheet
        this._track.style.paddingInline = `${pad}px`;
    }

    // ── Core navigation ─────────────────────────────────────────

    _navigate(direction) {
        const newIndex = (this._activeIndex + direction + this._slides.length) % this._slides.length;
        this._goToSlide(newIndex);
    }

    _goToSlide(index, animate = true) {
        // Pause and detach ended-listener from the outgoing slide
        const outgoing = this._slides[this._activeIndex];
        if (outgoing) {
            const outVideo = outgoing.querySelector('video');
            if (outVideo) {
                outVideo.pause();
                if (outgoing._endedHandler) {
                    outVideo.removeEventListener('ended', outgoing._endedHandler);
                    outgoing._endedHandler = null;
                }
            }
        }

        this._activeIndex = index;

        // Update slides
        this._slides.forEach((slide, i) => {
            const active = i === index;
            slide.classList.toggle('is-active', active);
            slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        });

        // Update info panels
        this._infoPanels.forEach((panel, i) => {
            const active = i === index;
            panel.classList.toggle('is-active', active);
            panel.setAttribute('aria-hidden', active ? 'false' : 'true');
        });

        // Scroll track to centre the active slide
        this._centerSlide(index, animate);

        // Load and play video for the incoming slide
        this._activateVideo(index);
    }

    // ── Centre the active slide in the viewport ─────────────────

    _centerSlide(index, animate = true) {
        const slide = this._slides[index];
        if (!slide || !this._track) return;

        const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
        const trackVisible = this._track.parentElement.offsetWidth;
        const scrollLeft = slideCenter - trackVisible / 2;

        this._track.scrollTo({
            left: scrollLeft,
            behavior: animate ? 'smooth' : 'instant',
        });
    }

    // ── Video lifecycle ──────────────────────────────────────────

    _activateVideo(index) {
        const slide = this._slides[index];
        if (!slide) return;

        const deferredMedia = slide.querySelector('deferred-media');
        if (!deferredMedia) return;

        if (!deferredMedia.hasAttribute('loaded')) {
            // First visit: loadContent() calls pauseAllMedia(), clones the
            // <template> into the DOM, and plays the video (autoplay attr).
            deferredMedia.loadContent(false);
        } else {
            // Revisiting slide: video already in DOM, restart it.
            const video = slide.querySelector('video');
            if (video) {
                video.currentTime = 0;
                video.play().catch(() => { });
            }
        }

        // Attach ended-listener to auto-advance once the preview video finishes.
        const video = slide.querySelector('video');
        if (video) {
            slide._endedHandler = () => this._navigate(1);
            video.addEventListener('ended', slide._endedHandler);
        }
    }

    // ── Modal video auto-play ────────────────────────────────────

    _setupModalAutoPlay() {
        // ModalDialog.show() order: loadContent() → set [open] → pauseAllMedia()
        // pauseAllMedia() immediately pauses the video that loadContent() just
        // started. We observe the [open] attribute and re-play after a tick so
        // the play() call runs after pauseAllMedia has completed.
        //
        // Modal elements are moved to <body> by ModalDialog.connectedCallback(),
        // so requestAnimationFrame ensures they've been relocated before querying.
        requestAnimationFrame(() => {
            this._slides.forEach((_, i) => {
                const modal = document.getElementById(`VideoModal-${this._sectionId}-${i + 1}`);
                if (!modal) return;

                new MutationObserver(() => {
                    const video = modal.querySelector('video');
                    if (modal.hasAttribute('open')) {
                        // Re-play after pauseAllMedia() has run
                        setTimeout(() => {
                            if (video) {
                                video.currentTime = 0;
                                video.play().catch(() => { });
                            }
                        }, 0);
                    } else {
                        // Modal closed: reset so next open starts from beginning
                        if (video) {
                            video.pause();
                            video.currentTime = 0;
                        }
                    }
                }).observe(modal, { attributes: true, attributeFilter: ['open'] });
            });
        });
    }
}

customElements.define('video-spotlight-slider', VideoSpotlightSlider);

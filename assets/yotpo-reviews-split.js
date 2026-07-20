if (!customElements.get('yotpo-reviews-split')) {
    customElements.define(
        'yotpo-reviews-split',
        class YotpoReviewsSplit extends HTMLElement {
            constructor() {
                super();
                this.source = this.dataset.source || 'api';
                this.sectionId = this.dataset.sectionId;
                this.shapeMask = this.dataset.shapeMask === 'true';
                this.appKey = 'aMREVTSJZfbqjVqxLsKxYMHAmpb94LftONho8TDm'; // Safe public key
                this.TRUNCATE_WORDS = 10;
            }

            connectedCallback() {
                this.init();
                if (Shopify.designMode) {
                    this._sectionLoadHandler = (e) => {
                        if (e.detail.sectionId === this.sectionId) this.init();
                    };
                    document.addEventListener('shopify:section:load', this._sectionLoadHandler);
                }
            }

            async init() {
                if (this.source === 'api') {
                    const reviews = await this.fetchReviews();
                    this.hideSpinner();
                    if (reviews.length) {
                        this.renderCards(reviews);
                    } else {
                        this.showEmpty();
                    }
                } else {
                    // Manual mode: blocks already rendered by Liquid, just apply read-more
                    this.initReadMore();
                    requestAnimationFrame(() => {
                        this.initDots();
                        this.startAutoRotate();
                    });
                }
            }

            // ----------------------------------------
            // API fetch + filter
            // ----------------------------------------

            async fetchReviews() {
                const url = `https://api.yotpo.com/v1/widget/${this.appKey}/reviews.json?per_page=150`;
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    const reviews = data?.response?.reviews || [];

                    const fiveStars = reviews
                        .filter((r) => r.score === 5 && r.content?.trim().split(/\s+/).filter(Boolean).length >= 10)
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                    const withImage = fiveStars.filter((r) => r.images_data?.length > 0);
                    const withoutImage = fiveStars.filter((r) => !r.images_data?.length);
                    const picked = [...withImage, ...withoutImage].slice(0, 5);

                    return picked.map((r) => ({
                        image: r.images_data?.[0]?.original_url || null,
                        name: r.user.display_name || 'Anonymous',
                        score: r.score,
                        text: r.content,
                    }));
                } catch (err) {
                    console.error('[YotpoReviewsSplit] Failed to fetch reviews:', err);
                    return [];
                }
            }

            // ----------------------------------------
            // Render API cards into the slider
            // ----------------------------------------

            renderCards(reviews) {
                const list = this.querySelector(`#Slider-${this.sectionId}`);
                if (!list) return;

                list.innerHTML = '';

                reviews.forEach((review, i) => {
                    const li = document.createElement('li');
                    li.id = `Slide-${this.sectionId}-${i + 1}`;
                    li.className = 'reviews-split__item grid__item slider__slide';
                    li.style.setProperty('--animation-order', i + 1);
                    li.innerHTML = this.buildCardHTML(review);
                    list.appendChild(li);
                });

                // Update the slider counter total
                const total = this.querySelector('.slider-counter--total');
                if (total) total.textContent = reviews.length;

                // Apply read-more truncation to the freshly rendered cards
                this.initReadMore();

                // Wait for layout before reinitialising the slider, dots and auto-rotate
                requestAnimationFrame(() => {
                    const slider = this.querySelector('slider-component');
                    if (slider?.resetSlider) slider.resetSlider();
                    this.initDots();
                    this.startAutoRotate();
                });
            }

            buildCardHTML(review) {
                const avatarShapeClass = this.shapeMask ? ' reviews-split__avatar--shape' : '';
                const avatarShapeStyle = this.shapeMask ? ` style="clip-path: url(#shape-clip-${this.sectionId})"` : '';
                const avatarHTML = review.image
                    ? `<div class="reviews-split__avatar${avatarShapeClass}"${avatarShapeStyle}>
            <img
              src="${this.escapeAttr(review.image)}"
              alt="${this.escapeAttr(review.name)} review photo"
              loading="lazy"
              width="80"
              height="80"
              class="reviews-split__avatar-img"
            >
          </div>`
                    : `<div class="reviews-split__avatar reviews-split__avatar--initials" aria-hidden="true">
            <span class="reviews-split__avatar-initials">${this.getInitials(review.name)}</span>
          </div>`;

                const starsHTML = Array.from({ length: review.score }, () => `
          <span class="reviews__reviews-review" aria-hidden="true">
            <svg viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M12.9033 6.15182L19.2986 6.94655C19.4581 6.96127 19.5741 7.06429 19.6321 7.22618C19.6756 7.37335 19.6321 7.53524 19.5306 7.63827L14.8175 12.0976L16.0502 18.5143C16.0792 18.6762 16.0212 18.8234 15.8907 18.9117C15.7601 19 15.6006 19.0147 15.4701 18.9411L9.82886 15.7769L4.18762 18.9411C4.05711 19.0147 3.89759 19.0147 3.76707 18.9117C3.63655 18.8234 3.57855 18.6615 3.60755 18.5143L4.84021 12.0976L0.127095 7.63827C0.0110801 7.53524 -0.0324255 7.37335 0.025582 7.22618C0.0690877 7.07901 0.199605 6.97599 0.359125 6.94655L6.75446 6.15182L9.46631 0.235476C9.53882 0.0883036 9.66934 0 9.82886 0C9.98838 0 10.1189 0.0883036 10.1914 0.235476L12.9178 6.16654L12.9033 6.15182Z" fill="currentColor"/>
</svg>

          </span>`).join('');

                return `
          <div class="reviews-split__card">
            ${avatarHTML}
            <div class="reviews-split__card-content">
              <div class="reviews-split__card-header">
                <div class="reviews-split__meta">
                  <span class="reviews-split__name">${this.escapeHtml(review.name)}</span>
                  <div
                    class="reviews-split__stars reviews-review-container"
                    aria-label="${review.score} out of 5 stars"
                  >
                    ${starsHTML}
                  </div>
                </div>
              </div>
              <div
                class="reviews-split__body"
                data-full-text="${this.escapeAttr(review.text)}"
              >
                <p class="reviews-split__text"></p>
                <button class="reviews-split__read-more link" type="button" hidden>Read more</button>
                <button class="reviews-split__read-less link" type="button" hidden>Read less</button>
              </div>
            </div>
          </div>`;
            }

            getInitials(name) {
                const parts = (name || '').trim().split(/\s+/).filter(Boolean);
                if (parts.length === 0) return '?';
                const first = parts[0][0] || '';
                const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
                return (first + last).toUpperCase();
            }

            // ----------------------------------------
            // Read-more: truncate at TRUNCATE_WORDS words
            // ----------------------------------------

            initReadMore() {
                this.querySelectorAll('.reviews-split__body').forEach((body) => {
                    const textEl = body.querySelector('.reviews-split__text');

                    // Clone-replace buttons to drop any listeners from a previous init() call
                    let readMoreBtn = body.querySelector('.reviews-split__read-more');
                    let readLessBtn = body.querySelector('.reviews-split__read-less');
                    if (readMoreBtn) { const f = readMoreBtn.cloneNode(true); readMoreBtn.replaceWith(f); readMoreBtn = f; }
                    if (readLessBtn) { const f = readLessBtn.cloneNode(true); readLessBtn.replaceWith(f); readLessBtn = f; }

                    // Prefer data-full-text (set in both Liquid and JS-built cards)
                    const fullText = body.dataset.fullText || textEl?.textContent?.trim() || '';
                    if (!textEl || !fullText) return;

                    const words = fullText.trim().split(/\s+/);

                    if (words.length > this.TRUNCATE_WORDS) {
                        const truncated = words.slice(0, this.TRUNCATE_WORDS).join(' ') + '\u2026';
                        textEl.textContent = truncated;

                        if (readMoreBtn) {
                            readMoreBtn.hidden = false;
                            readMoreBtn.setAttribute('aria-expanded', 'false');
                            readMoreBtn.addEventListener('click', () => {
                                textEl.textContent = fullText;
                                readMoreBtn.hidden = true;
                                if (readLessBtn) {
                                    readLessBtn.hidden = false;
                                    readLessBtn.setAttribute('aria-expanded', 'true');
                                }
                                this.pauseAutoRotate?.();
                            });
                        }
                        if (readLessBtn) {
                            readLessBtn.hidden = true;
                            readLessBtn.setAttribute('aria-expanded', 'false');
                            readLessBtn.addEventListener('click', () => {
                                textEl.textContent = truncated;
                                readLessBtn.hidden = true;
                                readLessBtn.setAttribute('aria-expanded', 'false');
                                if (readMoreBtn) {
                                    readMoreBtn.hidden = false;
                                    readMoreBtn.setAttribute('aria-expanded', 'false');
                                }
                                clearTimeout(this._autoRotateResume);
                                this._autoRotateResume = setTimeout(
                                    () => this.resumeAutoRotate?.(),
                                    this._rotateInterval ?? 7000
                                );
                            });
                        }
                    } else {
                        // Text fits — just ensure it's populated (important for API-rendered cards)
                        textEl.textContent = fullText;
                    }
                });
            }

            // ----------------------------------------
            // Dot navigation
            // ----------------------------------------

            initDots() {
                const sliderEl = this.querySelector('slider-component');
                const list = this.querySelector(`#Slider-${this.sectionId}`);
                const dotsContainer = this.querySelector('.reviews-split__dots');
                if (!list || !dotsContainer || !sliderEl) return;

                const slides = Array.from(list.querySelectorAll('.slider__slide'));
                if (slides.length < 2) {
                    dotsContainer.hidden = true;
                    return;
                }

                dotsContainer.hidden = false;
                dotsContainer.innerHTML = '';

                slides.forEach((_, i) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'slider-counter__link slider-counter__link--dots link' + (i === 0 ? ' slider-counter__link--active' : '');
                    btn.setAttribute('aria-label', `Go to review ${i + 1} of ${slides.length}`);
                    btn.innerHTML = '<span class="dot"></span>';
                    btn.addEventListener('click', () => {
                        if (slides.length < 2) return;
                        const itemOffset = slides[1].offsetLeft - slides[0].offsetLeft;
                        list.scrollTo({ left: i * itemOffset, behavior: 'smooth' });
                    });
                    dotsContainer.appendChild(btn);
                });

                // Sync active dot via SliderComponent's slideChanged event (fires on every scroll update)
                sliderEl.addEventListener('slideChanged', (e) => {
                    const activeIndex = e.detail.currentPage - 1;
                    Array.from(dotsContainer.querySelectorAll('.slider-counter__link--dots')).forEach((dot, j) => {
                        dot.classList.toggle('slider-counter__link--active', j === activeIndex);
                    });
                });
            }

            // ----------------------------------------
            // Auto-rotate
            // ----------------------------------------

            startAutoRotate(interval = 7000) {
                // Respect reduced-motion preference
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

                const list = this.querySelector(`#Slider-${this.sectionId}`);
                if (!list) return;

                this._rotateInterval = interval;

                const advance = () => {
                    const slides = Array.from(list.querySelectorAll('.slider__slide'));
                    if (slides.length < 2) return;
                    const itemOffset = slides[1].offsetLeft - slides[0].offsetLeft;
                    if (!itemOffset) return;
                    const maxScroll = list.scrollWidth - list.clientWidth;
                    const next = list.scrollLeft >= maxScroll - 2 ? 0 : list.scrollLeft + itemOffset;
                    list.scrollTo({ left: next, behavior: 'smooth' });
                };

                // Expose on instance so initReadMore can call them
                this.pauseAutoRotate = () => {
                    clearInterval(this._autoRotate);
                    clearTimeout(this._autoRotateResume);
                };

                this.resumeAutoRotate = () => {
                    clearInterval(this._autoRotate);
                    this._autoRotate = setInterval(advance, this._rotateInterval);
                };

                // Desktop: pause on hover or focus
                this.addEventListener('mouseenter', this.pauseAutoRotate);
                this.addEventListener('focusin', this.pauseAutoRotate);
                this.addEventListener('mouseleave', this.resumeAutoRotate);
                this.addEventListener('focusout', this.resumeAutoRotate);

                // Mobile: pause on touch; resume after a full interval delay
                // so the customer has time to finish reading before it advances
                list.addEventListener('touchstart', () => {
                    this.pauseAutoRotate();
                }, { passive: true });

                list.addEventListener('touchend', () => {
                    clearTimeout(this._autoRotateResume);
                    this._autoRotateResume = setTimeout(
                        () => this.resumeAutoRotate(),
                        this._rotateInterval
                    );
                }, { passive: true });

                // Start
                this.resumeAutoRotate();
            }

            disconnectedCallback() {
                clearInterval(this._autoRotate);
                clearTimeout(this._autoRotateResume);
                if (this._sectionLoadHandler) {
                    document.removeEventListener('shopify:section:load', this._sectionLoadHandler);
                }
            }

            // ----------------------------------------
            // Helpers
            // ----------------------------------------

            hideSpinner() {
                const loading = this.querySelector('.reviews-split__loading');
                if (loading) loading.classList.add('hidden');
            }

            showEmpty() {
                const wrapper = this.querySelector('.reviews-split__carousel-wrapper');
                if (!wrapper) return;
                const p = document.createElement('p');
                p.className = 'reviews-split__empty';
                p.textContent = 'No reviews available at the moment.';
                wrapper.appendChild(p);
            }

            /** Escape text for use inside HTML element text content */
            escapeHtml(str) {
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            }

            /** Escape text for use inside an HTML attribute value (double-quoted) */
            escapeAttr(str) {
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            }
        }
    );
}

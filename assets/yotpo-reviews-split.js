if (!customElements.get('yotpo-reviews-split')) {
    customElements.define(
        'yotpo-reviews-split',
        class YotpoReviewsSplit extends HTMLElement {
            constructor() {
                super();
                this.source = this.dataset.source || 'api';
                this.sectionId = this.dataset.sectionId;
                this.appKey = 'aMREVTSJZfbqjVqxLsKxYMHAmpb94LftONho8TDm'; // Safe public key
                this.TRUNCATE_WORDS = 15;
            }

            connectedCallback() {
                this.init();
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
                const url = `https://api.yotpo.com/v1/widget/${this.appKey}/reviews.json?per_page=100`;
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    const reviews = data?.response?.reviews || [];

                    return reviews
                        .filter((r) => r.score >= 4 && r.content?.trim().split(/\s+/).filter(Boolean).length >= 10)
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .slice(0, 5)
                        .map((r) => ({
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
                const avatarHTML = review.image
                    ? `<div class="reviews-split__avatar">
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
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 47.94 47.94" xml:space="preserve">
              <path d="M26.285,2.486l5.407,10.956c0.376,0.762,1.103,1.29,1.944,1.412
                l12.091,1.757c2.118,0.308,2.963,2.91,1.431,4.403l-8.749,8.528
                c-0.608,0.593-0.886,1.448-0.742,2.285l2.065,12.042
                c0.362,2.109-1.852,3.717-3.746,2.722l-10.814-5.685
                c-0.752-0.395-1.651-0.395-2.403,0l-10.814,5.685
                c-1.894,0.996-4.108-0.613-3.746-2.722l2.065-12.042
                c0.144-0.837-0.134-1.692-0.742-2.285l-8.749-8.528
                c-1.532-1.494-0.687-4.096,1.431-4.403l12.091-1.757
                c0.841-0.122,1.568-0.65,1.944-1.412l5.407-10.956
                C22.602,0.567,25.338,0.567,26.285,2.486z"/>
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
                    const readMoreBtn = body.querySelector('.reviews-split__read-more');
                    const readLessBtn = body.querySelector('.reviews-split__read-less');

                    // Prefer data-full-text (set in both Liquid and JS-built cards)
                    const fullText = body.dataset.fullText || textEl?.textContent?.trim() || '';
                    if (!textEl || !fullText) return;

                    const words = fullText.trim().split(/\s+/);

                    if (words.length > this.TRUNCATE_WORDS) {
                        const truncated = words.slice(0, this.TRUNCATE_WORDS).join(' ') + '\u2026';
                        textEl.textContent = truncated;

                        if (readMoreBtn) {
                            readMoreBtn.hidden = false;
                            readMoreBtn.addEventListener('click', () => {
                                textEl.textContent = fullText;
                                readMoreBtn.hidden = true;
                                if (readLessBtn) readLessBtn.hidden = false;
                                // Customer is reading — stop auto-advancing
                                this.pauseAutoRotate?.();
                            });
                        }
                        if (readLessBtn) {
                            readLessBtn.hidden = true;
                            readLessBtn.addEventListener('click', () => {
                                textEl.textContent = truncated;
                                readLessBtn.hidden = true;
                                if (readMoreBtn) readMoreBtn.hidden = false;
                                // Customer collapsed — resume after a full interval
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
                    btn.className = 'reviews-split__dot' + (i === 0 ? ' reviews-split__dot--active' : '');
                    btn.setAttribute('aria-label', `Go to review ${i + 1} of ${slides.length}`);
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
                    Array.from(dotsContainer.querySelectorAll('.reviews-split__dot')).forEach((dot, j) => {
                        dot.classList.toggle('reviews-split__dot--active', j === activeIndex);
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

if (!customElements.get('yotpo-dynamic-reviews')) {
  customElements.define(
    'yotpo-dynamic-reviews',
    class YotpoDynamicReviews extends HTMLElement {
      constructor() {
        super();
        this.productId = this.dataset.productId || null;
        this.appKey = 'aMREVTSJZfbqjVqxLsKxYMHAmpb94LftONho8TDm'; // Safe public key
        this.baseElement = this.querySelector('.base-list-element')?.innerHTML || '';
      }

      connectedCallback() {
        this.init();
      }

      async init() {
        const reviews = await this.getTopReviewsWithImage();
        const slider = this.querySelector('slider-component');
        
        if (reviews.length > 0) {
          this.renderReviewCards(reviews);
          if(!slider) return

          slider.resetSlider();
        } else {
          this.showEmptyState();
        }
      }

      async getTopReviewsWithImage() {
        const reviews = await this.fetchReviews();
        if (!reviews.length) return [];

        const sorted = reviews
          .filter(r => r.score >= 4)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const withImages = sorted.filter(r => r.images_data?.length);
        const withoutImages = sorted.filter(r => !r.images_data?.length);

        const selected = [
          ...withImages.slice(0, 10),
          ...withoutImages.slice(0, 10 - withImages.length),
        ];

        return selected.map(r => ({
          image: r.images_data?.[0]?.original_url || null,
          name: r.user.display_name || 'Anonymous',
          verified: r.verified_buyer,
          content: r.content,
          score: r.score,
          date: r.created_at,
        }));
      }

      async fetchReviews() {
        const url = this.productId
          ? `https://api.yotpo.com/v1/widget/${this.appKey}/products/${this.productId}/reviews.json?per_page=50`
          : `https://api.yotpo.com/v1/widget/${this.appKey}/reviews.json?per_page=50`;

        try {
          const response = await fetch(url);
          const data = await response.json();
          return data?.response?.reviews || [];
        } catch (err) {
          console.error('Failed to fetch reviews:', err);
          return [];
        }
      }

      renderReviewCards(reviews) {
        const container = this.querySelector('.reviews-list');
        if (!container || !this.baseElement) return;

        container.innerHTML = '';
        const sectionId = this.dataset.sectionId;

        reviews.forEach((review, index) => {
          const loopIndex = index + 1;
          const card = this.buildCard(review, loopIndex, sectionId);
          const modal = this.createModal(review, loopIndex);
          container.appendChild(card);
          container.appendChild(modal);
        });
      }

      buildCard(review, index, sectionId) {
        const temp = document.createElement('div');
        temp.innerHTML = this.baseElement.trim();
        const card = temp.firstElementChild;

        card.style.setProperty('--animation-order', index);
        card.innerHTML = this.replaceLoopIndex(card.innerHTML, index);

        // Image
        const imgContainer = card.querySelector('.review-section_image');
        if (review.image) {
          imgContainer.innerHTML = '';
          imgContainer.appendChild(this.createImage(review.image, review.name));
        }

        // Name & content
        card.querySelector('.review-title').innerText = review.name;
        const contentEl = card.querySelector('.review-section_text-top .reviews__content');
        contentEl.innerHTML = `<p>${this.truncate(review.content)}</p>`;

        // Stars
        this.setStarRatings(card.querySelectorAll('.reviews__reviews-review'), review.score);

        // Modal opener
        const modalOpener = card.querySelector("modal-opener");
        if (modalOpener) {
          modalOpener.dataset.modal = modalOpener.dataset.modal.replace("FORLOOP.INDEX", index);
          const button = modalOpener.querySelector("button.review-button");
          button.id = button.id.replace("FORLOOP.INDEX", index);
        }

        return card;
      }

      createModal(review, index) {
        const sectionId = this.dataset.sectionId;

        const modal = document.createElement('modal-dialog');
        modal.id = `ReviewCardPopupModal-${sectionId}-${index}`;
        modal.classList.add('product-popup-modal');
        modal.setAttribute('aria-label', `Review from ${review.name}`);

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'product-popup-modal__content';
        contentWrapper.setAttribute('role', 'dialog');
        contentWrapper.setAttribute('aria-modal', 'true');
        contentWrapper.setAttribute('tabindex', '-1');

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.id = `ModalClose-${sectionId}-${index}`;
        closeBtn.className = 'product-popup-modal__toggle';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-close" fill="none" viewBox="0 0 18 17">
            <path d="M.865 15.978a.5.5 0 00.707.707l7.433-7.431 7.579 7.282a.501.501 0 00.846-.37.5.5 0 00-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 10-.707-.708L8.991 7.853 1.413.573a.5.5 0 10-.693.72l7.563 7.268-7.418 7.417z" fill="currentColor"></path>
          </svg>
        `;

        // Content Info
        const info = document.createElement('div');
        info.className = 'product-popup-modal__content-info';

        const headingContainer = document.createElement('div');
        headingContainer.className = 'heading-container';
        headingContainer.innerHTML = `<p class="h2 center">${review.name}</p>`;

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        if (review.image) {
          imageContainer.appendChild(this.createImage(review.image, review.name));
        }

        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-container';
        contentContainer.innerHTML = `<blockquote><p>${review.content}</p></blockquote>`;

        const additionalInfo = document.createElement('div');
        additionalInfo.className = 'additional-information';

        const starContainer = document.createElement('div');
        starContainer.className = 'reviews-review-container';
        starContainer.appendChild(this.generateStars(review.score));
        additionalInfo.appendChild(starContainer);

        info.append(headingContainer, imageContainer, contentContainer, additionalInfo);
        contentWrapper.append(closeBtn, info);
        modal.appendChild(contentWrapper);

        return modal;
      }

      showEmptyState() {
        const container = this.querySelector('.reviews-container');
        if (container) {
          container.innerHTML = '<p>No reviews available at the moment.</p>';
        }
      }

      createImage(src, name) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = `${name} review photo`;
        img.loading = 'lazy';
        return img;
      }

      setStarRatings(stars, score) {
        stars.forEach((star, i) => {
          star.classList.toggle('yellow', i < score);
          star.classList.toggle('grey', i >= score);
        });
      }

      generateStars(score) {
        const fragment = document.createDocumentFragment();

        for (let i = 1; i <= 5; i++) {
          const span = document.createElement('span');
          span.className = `reviews__reviews-review ${i <= score ? 'yellow' : 'grey'}`;
          span.innerHTML = `
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 47.94 47.94" xml:space="preserve">
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
          `;
          fragment.appendChild(span);
        }

        return fragment;
      }

      replaceLoopIndex(str, index) {
        return str.replaceAll('FORLOOP.INDEX', index);
      }

      truncate(str, maxWords = 12) {
        const words = str.trim().split(' ');
        return words.slice(0, maxWords).join(' ') + (words.length > maxWords ? '...' : '');
      }
    }
  );
}

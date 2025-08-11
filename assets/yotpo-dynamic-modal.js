if (!customElements.get('yotpo-dynamic-reviews')) {
  customElements.define(
    'yotpo-dynamic-reviews',
    class YotpoDynamicReviews extends HTMLElement {
      constructor() {
        super();
        this.productId = this.dataset.productId || null;
        this.appKey = 'aMREVTSJZfbqjVqxLsKxYMHAmpb94LftONho8TDm'; // Safe public key
        this.baseElement = this.querySelector('#base-review-template')?.content || '';
      }

      connectedCallback() {
        this.init();
      }

      async init() {
        const reviews = await this.getTopReviewsWithImage();
        const slider = this.querySelector('slider-component');

        this.hideSpinner();

        if (reviews.length > 0) {
          this.renderReviewCards(reviews);
          if (!slider) return

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
          ...withoutImages.slice(0, Math.max(0, 10 - withImages.length)),
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
          ? `https://api.yotpo.com/v1/widget/${this.appKey}/products/${this.productId}/reviews.json?per_page=250`
          : `https://api.yotpo.com/v1/widget/${this.appKey}/reviews.json?per_page=250`;

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
        const clone = this.baseElement.cloneNode(true);
        const card = clone.querySelector('li');

        card.style.setProperty('--animation-order', index);
        card.innerHTML = this.replaceLoopIndex(card.innerHTML, index);

        // Image
        const imgContainer = card.querySelector('.review-section_image');
        if (review.image) {
          imgContainer.innerHTML = '';
          imgContainer.appendChild(this.createImage(review.image, review.name));
        } else {
          imgContainer.classList.add('hidden');
          card.classList.add("no-image");
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
          const button = modalOpener.querySelector("button.modal-opener__button");
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
        headingContainer.innerHTML = `<p class="center h1">${this.camelize(review.name)}</p>`;

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        // const imageWrapper = document.createElement('div');
        if (review.image) {
          imageContainer.appendChild(this.createImage(review.image, review.name));
          // imageContainer.appendChild(imageWrapper);
        } else {
          imageContainer.classList.add('hidden')
          modal.classList.add("no-image")
        }

        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-container';
        contentContainer.innerHTML = `<p>${review.content}</p>`;

        const additionalInfo = document.createElement('div');
        additionalInfo.className = 'additional-information';

        const yotpoBranding = document.createElement('div');
        yotpoBranding.className = 'yotpo-branding';
        yotpoBranding.innerHTML = `
          <p>
            Powered by 
            <svg width='58' height='16' viewBox='0 0 58 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path fill-rule='evenodd' clip-rule='evenodd' d='M3.26899 2.26024L5.39873 8.19371L7.62984 2.26024H10.7975L5.381 16H2.24828L3.85034 11.7427L0 2.26024H3.26899ZM36.7241 2.05019C39.5842 2.05019 41.6695 4.29282 41.6695 7.36276C41.6695 10.4327 39.5842 12.6753 36.7241 12.6753C35.6687 12.6753 34.7798 12.393 34.1015 11.8487L34.0576 11.8128L34.0201 11.7812L34.0201 15.9967H30.9679L30.968 2.26024H33.6668L33.6668 3.28745L33.682 3.26977C34.3471 2.50311 35.3532 2.07883 36.5957 2.05159L36.6613 2.05052L36.7241 2.05019ZM16.3566 2.05019C19.506 2.05019 21.7385 4.24902 21.7385 7.36276C21.7385 10.4628 19.4986 12.6753 16.3566 12.6753C13.1969 12.6753 10.9538 10.4659 10.9538 7.36276C10.9538 4.24592 13.1895 2.05019 16.3566 2.05019ZM26.823 0L26.823 2.26024H29.3346V4.9245L26.823 4.92442L26.823 8.60205C26.823 9.42471 27.2187 9.87723 27.9388 9.90471L27.9739 9.9057L28.0095 9.90604C28.4979 9.90604 28.8678 9.77639 29.1987 9.45498L29.2296 9.42429L29.3119 9.3389H29.3346V12.2777L29.241 12.323C28.7388 12.5657 28.429 12.6753 27.573 12.6753C25.1528 12.6753 23.8239 11.3439 23.7723 8.85824L23.7712 8.78256L23.7708 8.70708L23.7707 4.92442L22.6662 4.9245V2.26024H23.8539L23.8539 0H26.823ZM48.3392 2.05019C51.4887 2.05019 53.7212 4.24902 53.7212 7.36276C53.7212 10.4628 51.4813 12.6753 48.3392 12.6753C45.1796 12.6753 42.9365 10.4659 42.9365 7.36276C42.9365 4.24592 45.1722 2.05019 48.3392 2.05019ZM56.209 9.29517C57.1327 9.29517 57.8815 10.0518 57.8815 10.9852C57.8815 11.9187 57.1327 12.6753 56.209 12.6753C55.2853 12.6753 54.5365 11.9187 54.5365 10.9852C54.5365 10.0518 55.2853 9.29517 56.209 9.29517ZM36.2668 4.81948C34.8918 4.81948 33.9579 5.84799 33.9579 7.36276C33.9579 8.87753 34.8918 9.90604 36.2668 9.90604C37.6598 9.90604 38.5965 8.8806 38.5965 7.36276C38.5965 5.84492 37.6598 4.81948 36.2668 4.81948ZM16.3566 4.81948C14.9767 4.81948 14.0269 5.8532 14.0269 7.36276C14.0269 8.87232 14.9767 9.90604 16.3566 9.90604C17.7184 9.90604 18.6655 8.86922 18.6655 7.36276C18.6655 5.85629 17.7184 4.81948 16.3566 4.81948ZM48.3392 4.81948C46.9594 4.81948 46.0095 5.8532 46.0095 7.36276C46.0095 8.87232 46.9594 9.90604 48.3392 9.90604C49.7011 9.90604 50.6482 8.86922 50.6482 7.36276C50.6482 5.85629 49.7011 4.81948 48.3392 4.81948Z' fill='#0042E4'></path>
            </svg>
          </p>
        `;


        const starContainer = document.createElement('div');
        starContainer.className = 'reviews-review-container';
        starContainer.appendChild(this.generateStars(review.score));

        additionalInfo.appendChild(starContainer);
        additionalInfo.appendChild(yotpoBranding);

        info.append(headingContainer, imageContainer, contentContainer, additionalInfo);
        contentWrapper.append(closeBtn, info);
        modal.appendChild(contentWrapper);

        console.log("modal created:", modal);
        return modal;
      }

      showEmptyState() {
        const container = this.querySelector('.reviews-list');
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

      truncate(str, maxWords = 8) {
        const words = str.trim().split(' ');
        return words.slice(0, maxWords).join(' ') + (words.length > maxWords ? '...' : '');
      }

      hideSpinner() {
        const loading = this.querySelector('#reviews-loading');
        if (loading) loading.classList.add('hidden');
      }

      camelize(str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
          if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
          return index === 0 ? match.toLowerCase() : match.toUpperCase();
        });
      }
    }
  );
}

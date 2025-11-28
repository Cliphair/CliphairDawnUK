if (!customElements.get('quiz-answer')) {
  customElements.define(
    'quiz-answer',
    class QuizAnswer extends HTMLElement {
      constructor() {
        super();
        this.quizId = this.dataset.quizId;
        this.backButtonElement = this.querySelector('.information-wrapper > button[name="back"]');
        this.resetQuizElement = this.querySelector('.information-wrapper > button[name="reset"]');
        // this.quizAnswers = JSON.parse(this.querySelector('script[type="application/json"]').textContent);

        if (this.backButtonElement) {
          this.backButtonElement.addEventListener('click', this.backButton.bind(this));
        }

        if (this.resetQuizElement) {
          this.resetQuizElement.addEventListener('click', this.resetQuizButton.bind(this));
        }
      }

      clearUserAnswers() {
        sessionStorage.setItem(`${this.quizId}-answers`, JSON.stringify({}));
        sessionStorage.setItem(`${this.quizId}-history`, JSON.stringify([]));
      }

      /**
       * Build a Shopify-style srcset string using the ?width= param.
       */
      buildShopifySrcset(baseUrl, widths = [320, 480, 768, 1024, 1440]) {
        const hasQuery = baseUrl.includes('?');
        return widths
          .map((w) => `${baseUrl}${hasQuery ? '&' : '?'}width=${w} ${w}w`)
          .join(', ');
      }

      /**
       * Update an <img> element with responsive src/srcset/sizes.
       */
      updateResponsiveImage(imageEl, baseUrl) {
        if (!imageEl || !baseUrl) return;

        const hasQuery = baseUrl.includes('?');
        const defaultWidth = 768;

        const src = `${baseUrl}${hasQuery ? '&' : '?'}width=${defaultWidth}`;
        const srcset = this.buildShopifySrcset(baseUrl);

        imageEl.src = src;
        imageEl.srcset = srcset;
        imageEl.sizes = '(min-width: 990px) 768px, 100vw';

        // Optional: ensure lazy loading if not already set
        if (!imageEl.loading) {
          imageEl.loading = 'lazy';
        }
      }

      updateFinalElement(answer) {
        const image = this.querySelector('.answer-wrapper .answer-image');
        const header = this.querySelector('.answer-wrapper .answer-title a');
        const content = this.querySelector('.answer-wrapper .answer-content');
        const button = this.querySelector('.answer-wrapper .button-wrapper .button');
        const accordion = this.querySelector('.answer-wrapper .answer-accordion');

        console.log(answer);

        if (answer) {
          if (image) {
            const imageUrl = answer['image-url'];
            if (imageUrl) {
              this.updateResponsiveImage(image, imageUrl);
              image.parentElement.classList.remove('visually-hidden');
            } else {
              image.parentElement.classList.add('visually-hidden');
            }
          }

          if (header) {
            header.href = answer['collection-url'] || '#';
            header.innerText = answer.title || 'Result';
            header.disabled = false;
          }

          if (content) {
            content.innerHTML = answer.message || '';
          }

          if (button) {
            button.href = answer['collection-url'] || '#';
            button.disabled = false;
          }

          if (accordion) {
            let extraCollections = answer['extra-collections'] || [];
            if (extraCollections.length > 0) {
              accordion.innerHTML = '';
              extraCollections.forEach((collection) => {
                accordion.innerHTML += `<p class='bold'><a href="${collection['collection-url']}">${collection.title}</a></p>`;
              });
              // If you still want to inject extra content from answer.accordion:
              if (answer.accordion) {
                accordion.innerHTML += answer.accordion;
              }
              accordion.closest('.collapsible-content__grid').classList.remove('visually-hidden');
            } else {
              accordion.closest('.collapsible-content__grid').classList.add('visually-hidden');
            }
          }
        } else {
          if (header) {
            header.innerText = 'Sorry';
            header.disabled = true;
          }
          if (content) {
            content.innerHTML = `<p>No match found for your answers.</p>`;
          }
          if (button) button.disabled = true;
          if (accordion) accordion.closest('.collapsible-content__grid').classList.add('visually-hidden');
        }
      }

      backButton(event) {
        const parent = event.currentTarget.closest('quiz-answer');
        const prevId = this.popHistory();

        if (prevId) {
          const prevQuestionElement = document.querySelector(
            `quiz-question[data-quiz-id="${this.quizId}"][data-question-id="${prevId}"]`
          );
          if (prevQuestionElement) {
            this.hideContainer(parent.closest('.quiz'));
            this.showContainer(prevQuestionElement.closest('.quiz'));
          }
        }
      }

      hideContainer(container) {
        container.classList.remove('visible');
        container.classList.add('hidden');
      }

      showContainer(container) {
        container.classList.remove('hidden');
        container.classList.add('visible');
      }

      resetQuizButton() {
        this.clearUserAnswers();
        location.reload();
      }

      popHistory() {
        let history = JSON.parse(sessionStorage.getItem(`${this.quizId}-history`)) || [];
        const prev = history.pop();
        sessionStorage.setItem(`${this.quizId}-history`, JSON.stringify(history));
        return prev;
      }
    }
  );
}

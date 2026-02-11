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

      connectedCallback() {
        // Delegated click tracking on the answer page
        this.addEventListener('click', (e) => {
          const a = e.target.closest('a');
          if (!a) return;

          const href = a.getAttribute('href') || '';
          if (!href || href.startsWith('#')) return;

          const resultType = this.dataset.resultType || 'unknown';
          const resultId = this.dataset.resultId || 'unknown';

          // Prefer explicit markup override if you add it:
          // <a data-quiz-click-type="colour_match_banner" ...>
          const explicitType = a.getAttribute('data-quiz-click-type');
          let clickType = explicitType || 'unknown';

          // Auto-classify based on current structure (best effort)
          if (!explicitType) {
            if (a.closest('.answer-wrapper .answer-title')) clickType = 'result_title';
            else if (a.closest('.answer-wrapper .button-wrapper')) clickType = 'result_cta';
            else if (a.closest('.answer-wrapper .answer-accordion')) clickType = 'extra_result';
            else if (a.closest('.colour-match-banner')) clickType = 'colour_match_banner';
            else if (a.closest('.product-carousel, .carousel')) clickType = 'carousel_product';
          }

          const extraResultId =
            clickType === 'extra_result' ? quizSlugify(a.textContent || '') : undefined;

          const productId =
            clickType === 'carousel_product'
              ? (a.getAttribute('data-product-handle') || a.getAttribute('data-product-id') || undefined)
              : undefined;

          const posEl = a.closest('[data-position]');
          const productPosition =
            clickType === 'carousel_product' && posEl
              ? parseInt(posEl.getAttribute('data-position'), 10)
              : undefined;

          quizDataLayerPush({
            event: 'quiz_result_click',
            quiz_id: this.quizId,
            result_type: resultType,
            result_id: resultId,
            click_type: clickType,
            destination_url: href,
            ...(extraResultId ? { extra_result_id: extraResultId } : {}),
            ...(productId ? { product_id: productId } : {}),
            ...(Number.isFinite(productPosition) ? { product_position: productPosition } : {})
          });
        });
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

        // Store result context for click tracking
        this.dataset.resultType = answer ? 'match' : 'no_match';
        this.dataset.resultId = answer ? quizGetResultId(answer) : 'no_match';

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
            button.innerText = 'Explore';
            button.disabled = false;
          }

          if (accordion) {
            let extraCollections = answer['extra-collections'] || [];
            if (extraCollections.length > 0) {
              accordion.innerHTML = '';
              extraCollections.forEach((collection) => {
                accordion.innerHTML += `<p><a class='bold' href="${collection['collection-url']}">${collection.title}</a></p> ${collection.message}`;
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
            header.innerText = 'We\'d love to help you choose';
            header.disabled = true;
          }
          if (content) {
            content.innerHTML = `<p>Based on what you\'ve told us so far, we\'d like to take a closer look and make a personalised recommendation. Message our Customer Support team and we\'ll help you find the best option.</p>`;
          }
          if (button) {
            button.href = '/pages/contact-us';
            button.innerText = 'Contact Customer Support';
            button.disabled = false;
          }
          if (image) {
            image.parentElement.classList.add('visually-hidden');
          }
          if (accordion) accordion.closest('.collapsible-content__grid').classList.add('visually-hidden');
        }

        // TRACKING: quiz_complete (fire each time answer renders)
        // If you only want it once per session, keep the fired guard.
        const completeKey = `${this.quizId}-completed`;
        sessionStorage.setItem(completeKey, '1');

        if (sessionStorage.getItem(`${this.quizId}-completeFired`) !== '1') {
          sessionStorage.setItem(`${this.quizId}-completeFired`, '1');

          quizDataLayerPush({
            event: 'quiz_complete',
            quiz_id: this.quizId,
            result_type: this.dataset.resultType,
            result_id: this.dataset.resultId,
            answers_path: quizBuildAnswersPath(this.quizId),
            steps_completed: quizGetStepsCompleted(this.quizId),
            time_spent_ms: quizGetTimeSpentMs(this.quizId)
          });
        }
      }

      backButton(event) {
        const parent = event.currentTarget.closest('quiz-answer');
        const prevId = this.popHistory();

        this.removeSpecificAnswer(prevId);

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
        quizDataLayerPush({
          event: 'quiz_restart',
          quiz_id: this.quizId,
          result_type: this.dataset.resultType || 'unknown',
          result_id: this.dataset.resultId || 'unknown',
          answers_path: quizBuildAnswersPath(this.quizId),
          steps_completed: quizGetStepsCompleted(this.quizId),
          time_spent_ms: quizGetTimeSpentMs(this.quizId)
        });
        this.clearUserAnswers();
        location.reload();
      }

      popHistory() {
        let history = JSON.parse(sessionStorage.getItem(`${this.quizId}-history`)) || [];
        const prev = history.pop();
        sessionStorage.setItem(`${this.quizId}-history`, JSON.stringify(history));
        return prev;
      }

      getUserAnswers() {
        return (
          JSON.parse(sessionStorage.getItem(`${this.quizId}-answers`)) || {}
        );
      }

      removeSpecificAnswer(questionId) {
        let answers = this.getUserAnswers();
        delete answers[questionId];

        let answersStorage =
          JSON.parse(sessionStorage.getItem(`${this.quizId}-answers`)) || {};
        answersStorage = answers;
        sessionStorage.setItem(
          `${this.quizId}-answers`,
          JSON.stringify(answers)
        );
      }
    }
  );
}

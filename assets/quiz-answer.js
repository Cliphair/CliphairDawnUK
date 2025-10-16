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

      // backButton(event) {
      //   const parent = event.currentTarget.closest('quiz-answer');

      //   const lastQuestion = document.querySelectorAll(`.section-quiz-question [data-quiz-id="${this.quizId}"]`).length;
      //   console.log(lastQuestion)
      //   const previousQuestionElement = document
      //     .querySelector(`quiz-question[data-quiz-id="${parent.quizId}"][data-question-number="${lastQuestion}"]`);
      //   console.log(previousQuestionElement)
      //   if (previousQuestionElement) {
      //     this.hideContainer(parent.closest('.quiz'))
      //     this.showContainer(previousQuestionElement.closest('.quiz'))
      //   }
      // }

      updateFinalElement(answer) {
        const image = this.querySelector('.answer-wrapper .answer-image');
        const header = this.querySelector('.answer-wrapper .answer-title a');
        const content = this.querySelector('.answer-wrapper .answer-content');
        const button = this.querySelector('.answer-wrapper .button-wrapper .button');
        const accordion = this.querySelector('.answer-wrapper .answer-accordion');

        if (answer) {
          if (image) {
            image.src = answer['image-url'];
            image.parentElement.classList.remove('visually-hidden');
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
            if (answer.accordion) {
              accordion.innerHTML = answer.accordion;
              accordion.closest('.collapsible-content__grid').classList.remove('visually-hidden');
            } else {
              accordion.closest('.collapsible-content__grid').classList.add('visually-hidden');
            }
          }
        } else {
          header.innerText = 'Sorry';
          header.disabled = true;
          content.innerHTML = `<p>No match found for your answers.</p>`;
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
  )
}
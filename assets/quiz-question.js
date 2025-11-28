/* ======================================================
   QUIZ QUESTION CUSTOM ELEMENT
   ====================================================== */

let brainPromise = null; // shared fetch promise

if (!customElements.get('quiz-question')) {
  customElements.define(
    'quiz-question',
    class QuizQuestion extends HTMLElement {
      constructor() {
        super();
        this.quizId = this.dataset.quizId;
        this.questions = document.querySelectorAll(
          `.section-quiz-question [data-quiz-id="${this.quizId}"]`
        );
        this.backButtonElement = this.querySelector(
          '.information-wrapper > button[name="back"]'
        );
        this.quizURL = this.dataset.quizUrl;
        this.counterCurrentWrapper = this.querySelector('.current-question');
        this.counterTotalWrapper = this.querySelector('.total-questions');
        this.brain = null;
      }

      connectedCallback() {
        this.initBrain();
        this.bindEvents();
        this.initState();
      }

      bindEvents() {
        const answerButtons = this.querySelectorAll('.quiz-question__item');
        answerButtons.forEach((button) => {
          button.addEventListener('click', this.clickAnswer.bind(this));
        });
        if (this.backButtonElement) {
          this.backButtonElement.addEventListener(
            'click',
            this.backButton.bind(this)
          );
        }
      }

      initState() {
        const questionsArray = Array.from(this.questions);
        questionsArray.forEach((q, i) => {
          if (!q.dataset.questionId) q.dataset.questionId = `Q${i + 1}`;
        });

        const questionNumber = questionsArray.indexOf(this) + 1;
        this.previousQuestionNumber =
          questionNumber > 1 ? questionNumber - 1 : null;
        this.nextQuestionNumber =
          questionNumber < questionsArray.length ? questionNumber + 1 : 'final';

        if (this.backButtonElement) {
          const history =
            JSON.parse(sessionStorage.getItem(`${this.quizId}-history`)) || [];
          this.backButtonElement.disabled = history.length === 0;
        }

        const counterElement = this.querySelector('.information-wrapper p');
        const history =
          JSON.parse(sessionStorage.getItem(`${this.quizId}-history`)) || [];
        if (this.counterTotalWrapper)
          this.counterTotalWrapper.innerText = history.length + 1;
        if (this.counterCurrentWrapper)
          this.counterCurrentWrapper.innerText = history.length + 1;
        if (counterElement) counterElement.classList.remove('visually-hidden');

        this.dataset.questionNumber = questionNumber;

        if (questionNumber === 1) {
          this.closest('.section-quiz-question')?.classList.remove('hidden');
        }
      }

      clickAnswer(event) {
        event.preventDefault();
        event.stopPropagation();

        const clickedAnswerElement = event.currentTarget;
        const answer = clickedAnswerElement.dataset.answerId;
        const mainParentElement = clickedAnswerElement.closest('quiz-question');
        const questionId = mainParentElement.dataset.questionId;

        this.updateAnswers(questionId, answer);
        this.nextQuestion();
      }

      updateAnswers(questionId, answer) {
        let answers =
          JSON.parse(sessionStorage.getItem(`${this.quizId}-answers`)) || {};
        answers[questionId] = answer;
        sessionStorage.setItem(
          `${this.quizId}-answers`,
          JSON.stringify(answers)
        );
      }

      getUserAnswers() {
        return (
          JSON.parse(sessionStorage.getItem(`${this.quizId}-answers`)) || {}
        );
      }

      matches(answers, cond) {
        if (!cond || typeof cond !== 'object') return true;
        return Object.entries(cond).every(([qid, val]) => {
          return String(answers[qid] || '') === String(val);
        });
      }

      findRule(answers) {
        let best = null;
        let bestWeight = -1;
        for (const rule of this.brain || []) {
          if (!this.matches(answers, rule.when)) continue;
          const weight =
            Object.keys(rule.when || {}).length + (rule.answer ? 1000 : 0);
          if (weight > bestWeight) {
            best = rule;
            bestWeight = weight;
          }
        }
        return best;
      }

      async nextQuestion() {
        if (!this.brain) this.brain = await this.loadBrain();

        const answers = this.getUserAnswers();
        const rule = this.findRule(answers);
        console.log('Next question rule:', rule);

        if (!rule) {
          this.redirectToFinalPage();
          return;
        }

        this.pushHistory(this.dataset.questionId);

        if (rule.next) {
          const nextQuestionElement = document.querySelector(
            `quiz-question[data-quiz-id="${this.quizId}"][data-question-id="${rule.next}"]`
          );
          if (nextQuestionElement) {
            this.hideContainer(this.closest('.quiz'));
            this.showContainer(nextQuestionElement.closest('.quiz'));
          }
        } else if (rule.answer) {
          const answerElement = document.querySelector(
            `quiz-answer[data-quiz-id="${this.quizId}"]`
          );
          answerElement?.updateFinalElement(rule.answer);
          this.hideContainer(this.closest('.quiz'));
          this.showContainer(answerElement.closest('.quiz'));
        }
      }

      backButton(event) {
        const parent = event.currentTarget.closest('quiz-question');
        const prevId = this.popHistory();

        if (prevId) {
          const prevQuestionElement = document.querySelector(
            `quiz-question[data-quiz-id="${parent.quizId}"][data-question-id="${prevId}"]`
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

      redirectToFinalPage() {
        if (this.quizURL) window.location.pathname = this.quizURL;
      }

      pushHistory(currentId) {
        let history =
          JSON.parse(sessionStorage.getItem(`${this.quizId}-history`)) || [];
        history.push(currentId);
        sessionStorage.setItem(`${this.quizId}-history`, JSON.stringify(history));

        const backButton = document.querySelector(
          `quiz-question[data-quiz-id="${this.quizId}"].visible .information-wrapper > button[name="back"]`
        );
        if (backButton) backButton.disabled = history.length === 0;
      }

      popHistory() {
        let history =
          JSON.parse(sessionStorage.getItem(`${this.quizId}-history`)) || [];
        const prev = history.pop();
        sessionStorage.setItem(`${this.quizId}-history`, JSON.stringify(history));
        return prev;
      }

      async loadBrain() {
        if (window.quizBrain) return window.quizBrain;

        if (!brainPromise) {
          if (!window.quizBrainUrl) {
            brainPromise = Promise.resolve([]);
          } else {
            const url = `${window.quizBrainUrl}?v=${Date.now()}`;
            brainPromise = fetch(url)
              .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.text();
              })
              .then((text) => {
                try {
                  const json = JSON.parse(text);
                  return Array.isArray(json) ? json : json.brain || [];
                } catch {
                  return [];
                }
              })
              .catch(() => []);
          }
        }

        return brainPromise;
      }

      async initBrain() {
        this.brain = await this.loadBrain();
      }

      resetBrainCache() {
        window.quizBrain = null;
        brainPromise = null;
      }
    }
  );
}

if (!customElements.get('quiz-question')) {
  customElements.define(
    'quiz-question',
    class QuizQuestion extends HTMLElement {
      constructor() {
        super();
        this.quizId = this.dataset.quizId;
        this.questions = document.querySelectorAll(`.section-quiz-question [data-quiz-id="${this.quizId}"]`);
        this.backButtonElement = this.querySelector('.information-wrapper > button[name="back"]');
        this.quizURL = this.dataset.quizUrl;
        this.counterCurrentWrapper = this.querySelector('.current-question');
        this.counterTotalWrapper = this.querySelector('.total-questions');

        const answerButtons = this.querySelectorAll(".quiz-question__item");
        answerButtons.forEach((button) => {
          button.addEventListener('click', this.clickAnswer.bind(this))
        })

        if (this.backButtonElement) {
          this.backButtonElement.addEventListener('click', this.backButton.bind(this));
        }

        this.init()
      }

      init() {
        // generates an array of questions and get element question number
        const questionsArray = Array.from(this.questions);
        const questionNumber = (questionsArray.indexOf(this) + 1);

        // find previous and next question numbers
        this.previousQuestionNumber = questionNumber > 1 ? questionNumber - 1 : null;
        this.nextQuestionNumber = questionNumber < questionsArray.length ? questionNumber + 1 : 'final';

        // disable back button if it's on the first question
        if (!this.previousQuestionNumber && this.backButtonElement) {
          this.backButtonElement.disabled = 'true';
        }

        // update counters and elements with correct question numbers
        if (this.counterTotalWrapper) this.counterTotalWrapper.innerText = questionsArray.length;
        if (this.counterCurrentWrapper) this.counterCurrentWrapper.innerText = questionNumber;
        this.dataset.questionNumber = questionNumber;
        this.querySelector('.information-wrapper p').classList.remove('visually-hidden');

        // check if this is the final page and if some question was answered before
        let lastRespondedQuestion = this.checkLastResponded();
        console.log(lastRespondedQuestion);
        if (this.checkIfIsOnQuizPage() && (lastRespondedQuestion > 0)) {
          // if both questions yes, goes to the next question
          let currentQuestion = questionsArray[lastRespondedQuestion - 1];
          console.log(currentQuestion);
          currentQuestion.nextQuestion();
        } else if (questionNumber == 1) {
          // if not on quiz page or none question answered
          this.closest('.section-quiz-question').classList.remove('hidden');
        }
      }

      clickAnswer(event) {
        const clickedAnswerElement = event.currentTarget;
        const answer = clickedAnswerElement.dataset.answerId;
        const mainParentElement = clickedAnswerElement.closest('quiz-question')
        const question =
          `${this.quizId}-question${mainParentElement.dataset.questionNumber}`;

        this.updateAnsewers(question, answer);
        this.nextQuestion();
      }

      updateAnsewers(question, answer) {
        const answers = JSON.parse(sessionStorage.getItem(`${this.quizId}-answers`));
        if (!answers) return;

        answers[question] = answer;
        sessionStorage.setItem(`${this.quizId}-answers`, JSON.stringify(answers));
      }

      getAnswers() {
        const answers = JSON.parse(sessionStorage.getItem(`${this.quizId}-answers`));
        return answers
      }

      nextQuestion() {
        if (!this.nextQuestionNumber) return;

        if (!this.checkIfIsOnQuizPage()) {
          this.redirectToFinalPage();
          return
        }

        let nextQuestionElement = null;
        if (this.nextQuestionNumber == 'final') {
          nextQuestionElement = document
            .querySelector(`quiz-answer[data-quiz-id="${this.quizId}"]`);
          console.log(nextQuestionElement)
          // nextQuestionElement.updateFinalElement();
        } else {
          nextQuestionElement = document
            .querySelector(`quiz-question[data-quiz-id="${this.quizId}"][data-question-number="${this.nextQuestionNumber}"]`);
        }

        if (nextQuestionElement) {
          this.hideContainer(this.closest('.quiz'))
          this.showContainer(nextQuestionElement.closest('.quiz'))
        }
      }

      backButton(event) {
        const parent = event.currentTarget.closest('quiz-question');

        const previousQuestionElement = document
          .querySelector(`quiz-question[data-quiz-id="${parent.quizId}"][data-question-number="${parent.previousQuestionNumber}"`);

        if (previousQuestionElement) {
          this.hideContainer(parent.closest('.quiz'))
          this.showContainer(previousQuestionElement.closest('.quiz'))
        }
      }

      updateFinalElement() {
        console.log('update final element')
      }

      hideContainer(container) {
        container.classList.remove('visible');
        container.classList.add('hidden');
      }

      showContainer(container) {
        container.classList.remove('hidden');
        container.classList.add('visible');
      }

      checkIfIsOnQuizPage() {
        return this.quizURL === window.location.pathname;
      }

      redirectToFinalPage() {
        window.location.pathname = this.quizURL;
      }

      checkLastResponded() {
        const textToBeRemoved = this.quizId + "-question";
        const answers = this.getAnswers();
        if (!answers) return;

        let lastQuestionResponded = 0;
        Object.entries(answers).forEach(([key, value]) => {
          let questionNumber = parseInt(key.replace(textToBeRemoved, ""));
          if (lastQuestionResponded < questionNumber) {
            lastQuestionResponded = questionNumber;
          }
        });

        return lastQuestionResponded;
      }
    }
  )
}
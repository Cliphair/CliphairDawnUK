/* ======================================================
   QUIZ TRACKING HELPERS (GA4 via GTM / dataLayer)
   ====================================================== */
function quizSlugify(str = '') {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function quizDataLayerPush(payload) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

function quizGetAnswers(quizId) {
  return JSON.parse(sessionStorage.getItem(`${quizId}-answers`)) || {};
}

/**
 * Build a stable path from answers ONLY:
 * Q1:c|Q2:a|Q3:b
 */
function quizBuildAnswersPath(quizId) {
  const answers = quizGetAnswers(quizId);
  return Object.entries(answers)
    .sort(([a], [b]) => {
      const na = parseInt(String(a).replace(/\D+/g, ''), 10) || 0;
      const nb = parseInt(String(b).replace(/\D+/g, ''), 10) || 0;
      return na - nb;
    })
    .map(([qid, val]) => `${qid}:${val}`)
    .join('|');
}

function quizGetStepsCompleted(quizId) {
  return Object.keys(quizGetAnswers(quizId)).length;
}

function quizGetTimeSpentMs(quizId) {
  const startTs = parseInt(sessionStorage.getItem(`${quizId}-startTs`) || '0', 10);
  return startTs ? Math.max(0, Date.now() - startTs) : 0;
}

/**
 * Prefer collection handle from /collections/<handle>
 * Fallback to slugified URL or title.
 */
function quizGetResultId(answer) {
  const url = answer?.['collection-url'] || '';
  const m = url.match(/\/collections\/([^/?#]+)/);
  if (m?.[1]) return m[1];
  if (url) return quizSlugify(url);
  return quizSlugify(answer?.title || 'unknown');
}

/**
 * Abandon guard: only fire if quiz started AND not completed.
 */
function quizShouldAbandon(quizId) {
  const started = !!sessionStorage.getItem(`${quizId}-startTs`);
  const completed = sessionStorage.getItem(`${quizId}-completed`) === '1';
  const fired = sessionStorage.getItem(`${quizId}-abandonFired`) === '1';
  return started && !completed && !fired;
}

/**
 * Try to derive last question from most recent click storage.
 */
function quizGetLastQuestionId(quizId) {
  return sessionStorage.getItem(`${quizId}-lastQuestionId`) || '';
}

// Append-only question trail (allows repeats)
function quizAppendQuestionTrail(quizId, questionId, max = 50) {
  const key = `${quizId}-trailQuestions`;
  const trail = JSON.parse(sessionStorage.getItem(key)) || [];

  trail.push(String(questionId || ''));

  // Cap length so it can't grow forever
  if (trail.length > max) trail.splice(0, trail.length - max);

  sessionStorage.setItem(key, JSON.stringify(trail));
}

function quizGetQuestionTrailString(quizId, maxItems = 50) {
  const key = `${quizId}-trailQuestions`;
  const trail = (JSON.parse(sessionStorage.getItem(key)) || []).slice(-maxItems);
  return trail.filter(Boolean).join('>');
}

function quizWasReload() {
  // Modern browsers
  const nav = performance.getEntriesByType?.('navigation')?.[0];
  if (nav?.type) return nav.type === 'reload';

  // Fallback (older)
  // 1 = reload in the old API
  return performance?.navigation?.type === 1;
}

function quizClearSession(quizId) {
  const keys = [
    'answers',
    'history',
    'startTs',
    'completed',
    'completeTs',
    'completeSig',
    'completeFired',
    'abandonFired',
    'lastQuestionId',
    'lastAnswerId',
    'trailQuestions',
    'abandonHandlersRegistered'
  ];

  keys.forEach((k) => sessionStorage.removeItem(`${quizId}-${k}`));
}

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

        // Bind once for global abandon handlers
        this._boundAbandonHandler = this._handlePotentialAbandon.bind(this);
      }

      connectedCallback() {
        if (quizWasReload()) {
          quizClearSession(this.quizId);
        }

        this.initBrain();
        this.bindEvents();
        this.initState();
        this.initAbandonTracking();
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

        const counterElement = this.querySelector('.information-wrapper p');
        if (this.counterTotalWrapper)
          this.counterTotalWrapper.innerText = questionsArray.length;
        if (this.counterCurrentWrapper)
          this.counterCurrentWrapper.innerText = questionNumber;
        if (counterElement) counterElement.classList.remove('visually-hidden');

        this.dataset.questionNumber = questionNumber;

        if (questionNumber === 1) {
          this.closest('.section-quiz-question')?.classList.remove('hidden');
        }
      }

      /* ------------------------------
         TRACKING: abandon (global)
         ------------------------------ */
      initAbandonTracking() {
        // Avoid registering multiple handlers (each question element connects)
        const key = `${this.quizId}-abandonHandlersRegistered`;
        if (sessionStorage.getItem(key) === '1') return;
        sessionStorage.setItem(key, '1');

        // Fires reliably on navigation away / tab close on mobile more than beforeunload.
        window.addEventListener('pagehide', this._boundAbandonHandler);
      }

      _handlePotentialAbandon() {
        if (!quizShouldAbandon(this.quizId)) return;

        sessionStorage.setItem(`${this.quizId}-abandonFired`, '1');

        quizDataLayerPush({
          event: 'quiz_abandon',
          quiz_id: this.quizId,
          last_question_id: quizGetLastQuestionId(this.quizId),
          answers_path: quizBuildAnswersPath(this.quizId),
          steps_completed: quizGetStepsCompleted(this.quizId),
          time_spent_ms: quizGetTimeSpentMs(this.quizId),
          trail_questions: quizGetQuestionTrailString(this.quizId)
        });
      }

      clickAnswer(event) {
        event.preventDefault();
        event.stopPropagation();

        const clickedAnswerElement = event.currentTarget;
        const answer = clickedAnswerElement.dataset.answerId;
        const mainParentElement = clickedAnswerElement.closest('quiz-question');
        const questionId = mainParentElement.dataset.questionId;

        quizAppendQuestionTrail(this.quizId, questionId);

        // Track last known position for abandon event
        sessionStorage.setItem(`${this.quizId}-lastQuestionId`, questionId);
        sessionStorage.setItem(`${this.quizId}-lastAnswerId`, answer);

        // TRACKING: quiz_start (only once)
        const startKey = `${this.quizId}-startTs`;
        if (!sessionStorage.getItem(startKey)) {
          sessionStorage.setItem(startKey, String(Date.now()));

          quizDataLayerPush({
            event: 'quiz_start',
            quiz_id: this.quizId,
            entry_question_id: questionId || 'Q1'
          });
        }

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

        // Always push history once the user has answered this question
        this.pushHistory(this.dataset.questionId);

        const answerElement = document.querySelector(
          `quiz-answer[data-quiz-id="${this.quizId}"]`
        );

        const showSorry = () => {
          // If quiz-answer exists, show it with the "Sorry" state.
          // updateFinalElement(null) triggers your fallback UI.
          answerElement?.updateFinalElement(null);
          this.hideContainer(this.closest('.quiz'));
          this.showContainer(answerElement?.closest('.quiz'));
        };

        // 1) No rule found => show Sorry answer state
        if (!rule) {
          showSorry();
          return;
        }

        // 2) Rule says "next question"
        if (rule.next) {
          const nextQuestionElement = document.querySelector(
            `quiz-question[data-quiz-id="${this.quizId}"][data-question-id="${rule.next}"]`
          );

          if (nextQuestionElement) {
            this.hideContainer(this.closest('.quiz'));
            this.showContainer(nextQuestionElement.closest('.quiz'));
            return;
          }

          // next was specified but not found in DOM => Sorry state
          showSorry();
          return;
        }

        // 3) Rule gives an answer
        if (rule.answer) {
          answerElement?.updateFinalElement(rule.answer);
          this.hideContainer(this.closest('.quiz'));
          this.showContainer(answerElement?.closest('.quiz'));
          return;
        }

        // 4) Rule exists but has neither next nor answer => Sorry state
        showSorry();
      }

      backButton(event) {
        const parent = event.currentTarget.closest('quiz-question');
        const prevId = this.popHistory();

        // TRACKING: quiz_back
        // "from" is current visible question, "to" is prevId (if any)
        const fromId = parent?.dataset?.questionId || '';
        const toId = prevId || '';

        quizDataLayerPush({
          event: 'quiz_back',
          quiz_id: this.quizId,
          from_question_id: fromId,
          to_question_id: toId,
          answers_path: quizBuildAnswersPath(this.quizId),
          steps_completed: quizGetStepsCompleted(this.quizId),
          time_spent_ms: quizGetTimeSpentMs(this.quizId)
        });

        this.removeSpecificAnswer(prevId);

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

      removeSpecificAnswer(questionId) {
        let answers = this.getUserAnswers();
        delete answers[questionId];

        sessionStorage.setItem(
          `${this.quizId}-answers`,
          JSON.stringify(answers)
        );
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

/**
 * hair-goal-cards.js
 *
 * View More / View Less behaviour for the Hair Goal Cards Grid section.
 * Cards animate in (slide up) on View More and animate out (slide down + fade)
 * on View Less before being hidden.
 */

if (!customElements.get('hair-goal-grid')) {
  customElements.define(
    'hair-goal-grid',
    class HairGoalGrid extends HTMLElement {
      connectedCallback() {
        const moreContainer = this.querySelector('.hair-goal-cards-grid__more');
        const lessContainer = this.querySelector('.hair-goal-cards-grid__less');
        const btnMore = moreContainer && moreContainer.querySelector('[data-show-more]');
        const btnLess = lessContainer && lessContainer.querySelector('[data-show-less]');
        const initialVisible = parseInt(this.dataset.initialVisible, 10) || 999;

        if (btnMore) {
          btnMore.addEventListener('click', () => {
            const hidden = [...this.querySelectorAll('.hair-goal-card--hidden')];

            hidden.forEach((card, i) => {
              card.classList.remove('hair-goal-card--hidden');
              card.style.setProperty('--animation-order', i);
              card.classList.add('hair-goal-card--reveal');
              card.addEventListener(
                'animationend',
                () => {
                  card.classList.remove('hair-goal-card--reveal');
                  card.style.removeProperty('--animation-order');
                },
                { once: true }
              );
            });

            moreContainer.hidden = true;
            if (lessContainer) lessContainer.hidden = false;
          });
        }

        if (btnLess) {
          btnLess.addEventListener('click', () => {
            const cards = [...this.querySelectorAll('.hair-goal-card--grid')];
            const toHide = cards.filter((_, i) => i >= initialVisible);

            if (toHide.length === 0) {
              lessContainer.hidden = true;
              if (moreContainer) moreContainer.hidden = false;
              this.scrollIntoView({ behavior: 'smooth', block: 'start' });
              return;
            }

            toHide.forEach((card) => card.classList.add('hair-goal-card--conceal'));

            // Wait for the last card's animation to finish, then hide all at once
            toHide[toHide.length - 1].addEventListener(
              'animationend',
              () => {
                toHide.forEach((card) => {
                  card.classList.remove('hair-goal-card--conceal');
                  card.classList.add('hair-goal-card--hidden');
                });
                lessContainer.hidden = true;
                if (moreContainer) moreContainer.hidden = false;
                this.scrollIntoView({ behavior: 'smooth', block: 'start' });
              },
              { once: true }
            );
          });
        }
      }
    }
  );
}

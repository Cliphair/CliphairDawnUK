if (!customElements.get('pulldown-container')) {
  customElements.define(
    'pulldown-container',
    class PulldownContainer extends HTMLElement {
      constructor() {
        super();
        this.abortController = new AbortController();
        this.activeOpener = null;
      }

      connectedCallback() {
        this.mainContainer = this.querySelector('.main-grid');
        if (!this.mainContainer) return;

        this.mainContainer.addEventListener('click', this.handleGridClick.bind(this), {
          signal: this.abortController.signal,
        });

        window.addEventListener('resize', this.handleResize.bind(this));
      }

      disconnectedCallback() {
        this.abortController.abort();
        window.removeEventListener('resize', this.handleResize.bind(this));
      }

      handleGridClick(event) {
        const opener = event.target.closest('.pulldown-opener');
        if (!opener) return;
        this.openerClick(opener);
      }

      openerClick(opener) {
        const isOpen = opener.getAttribute('aria-expanded') === 'true';

        this.clear();

        if (isOpen) return;

        this.activeOpener = opener;
        opener.setAttribute('aria-expanded', 'true');
        opener.setAttribute('data-open', 'true');

        const pulldownId = opener.dataset.pulldownId;
        opener.setAttribute('aria-controls', pulldownId);

        const template = document.getElementById(pulldownId);
        if (!template || !template.content) return;

        const mobileCols = parseInt(this.mainContainer.dataset.columnsMobile || '2', 10);
        const desktopCols = parseInt(this.mainContainer.dataset.columnsDesktop || '4', 10);
        const columns = window.innerWidth < 990 ? mobileCols : desktopCols;

        const items = [...this.mainContainer.querySelectorAll('.main-grid__item')];
        const openerItem = opener.closest('.main-grid__item');
        const index = items.indexOf(openerItem);
        const row = Math.floor(index / columns);
        const insertAfterIndex = Math.min((row + 1) * columns - 1, items.length - 1);

        const pulldownRow = document.createElement('li');
        pulldownRow.classList.add('grid__item', 'grid__item--pulldown');
        pulldownRow.appendChild(template.content.cloneNode(true));

        items[insertAfterIndex].after(pulldownRow);
      }

      handleResize() {
        if (!this.activeOpener) return;
        this.openerClick(this.activeOpener);
      }

      clear() {
        if (this.activeOpener) {
          this.activeOpener.removeAttribute('aria-expanded');
          this.activeOpener.removeAttribute('aria-controls');
          this.activeOpener.removeAttribute('data-open');
          this.activeOpener = null;
        }

        this.mainContainer?.querySelectorAll('.grid__item--pulldown')?.forEach((el) => el.remove());
      }
    }
  );
}

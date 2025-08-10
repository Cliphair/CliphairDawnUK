if (!customElements.get('collection-modal')) {
  customElements.define(
    'collection-modal',
    class CollectionModal extends ModalDialog {
      constructor() {
        super();
        this.modalContent = this.querySelector('.text-content');
        this.options = ["Length", "Colour Group"];
      }

      show(opener) {
        console.log("Opener ", opener)
        const loadingSpinner = opener.closest('modal-opener').querySelector('.loading-overlay__spinner');
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
        console.log("Spinner ", loadingSpinner)
        const collectionHandle = this.dataset.collectionHandle;

        const loadSelects = this.options.map(option =>
          this.populateSelects(collectionHandle, option)
        );

        Promise.all(loadSelects).then(() => {
          this.setupFilterListeners(collectionHandle);
          super.show(opener);

          if (loadingSpinner) loadingSpinner.classList.add('hidden');
        });
      }

      hide(preventFocus = false) {
        if (preventFocus) this.openedBy = null;
        super.hide();
      }

      populateSelects(collectionHandle, filterLabel) {
        const selectContainer = this.querySelector(
          `[data-filter-type="${filterLabel.toLowerCase().replaceAll(" ", "-")}"]`
        );
        if (!selectContainer) return Promise.resolve();

        return fetch(`/collections/${collectionHandle}`)
          .then(res => res.text())
          .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const filterDetails = doc.querySelectorAll('facet-filters-form details');

            let found = false;

            for (const detail of filterDetails) {
              const labelSpan = detail.querySelector('summary span');
              const currentLabel = labelSpan?.textContent?.trim();

              if (currentLabel?.toLowerCase().includes(filterLabel.toLowerCase())) {
                this.buildSelectFromFacet(detail, selectContainer.querySelector("select"));
                found = true;
                break;
              }
            }

            if (!found) {
              selectContainer.remove(); // 💥 Remove the block if no filter found
            }
          });
      }

      buildSelectFromFacet(detailEl, selectTarget) {
        const inputs = detailEl.querySelectorAll('input');
        selectTarget.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select an option';
        selectTarget.appendChild(defaultOption);

        if (inputs.length) {
          selectTarget.name = inputs[0].name;
        }

        inputs.forEach(input => {
          const value = input.value;
          const label = input.closest('label')?.querySelector('span')?.textContent?.trim() || value;

          const option = document.createElement('option');
          option.value = value;
          option.textContent = label;

          selectTarget.appendChild(option);
        });
      }

      setupFilterListeners(collectionHandle) {
        const selects = this.querySelectorAll('select[name^="filter."]');

        selects.forEach(select => {
          select.addEventListener('change', () => {
            const params = new URLSearchParams();

            selects.forEach(s => {
              const key = s.name;
              const value = s.value;

              if (value) {
                params.append(key, value);
              }
            });

            const finalUrl = `/collections/${collectionHandle}?${params.toString()}`;
            const viewAllBtn = this.querySelector('#view-all-button');
            if (viewAllBtn) {
              viewAllBtn.href = finalUrl;
            }
          });
        });
      }
    }
  );
}
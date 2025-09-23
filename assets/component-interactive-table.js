if (!customElements.get('custom-select')) {
  customElements.define(
    'custom-select',
    class CustomSelect extends HTMLElement {
      constructor() {
        super();
        this.selectedValue = this.getAttribute('data-selected') || '';
        this.label = this.querySelector('.custom-select__label');
        this.options = this.querySelector('ul');
        this.trigger = this.querySelector('button');

        this.init();
      }

      init() {
        this.trigger.addEventListener('click', (e) => {
          e.preventDefault();
          this.open();
        });

        document.addEventListener('click', this.handleOutsideClick.bind(this));
      }

      open() {
        const expanded = this.trigger.getAttribute('aria-expanded') === 'true';
        this.trigger.setAttribute('aria-expanded', !expanded);
        this.trigger.classList.add('clicked');
        this.options.hidden = expanded;
      }

      close() {
        this.options.hidden = true;
        this.trigger.setAttribute('aria-expanded', false);
        this.trigger.classList.remove('clicked');
      }

      select(element) {
        const selectedValue = element.getAttribute('data-value');
        this.selectedValue = selectedValue;
        this.dataset.selected = selectedValue;
        this.label.innerText = element.innerText;

        this.options.querySelectorAll('li').forEach((li) => li.classList.remove('selected'));
        element.classList.add('selected');

        this.close();

        this.dispatchEvent(
          new CustomEvent('selection-changed', {
            detail: { value: selectedValue },
            bubbles: true,
          })
        );
      }

      populateOptions(items, selectedIndex = 0) {
        if (!items) return;

        this.options.innerHTML = '';

        items.forEach((item, i) => {
          const listElement = document.createElement('li');
          listElement.dataset.value = item.value;
          listElement.innerText = item.name;
          listElement.role = 'option';

          if (i === selectedIndex) {
            listElement.classList.add('selected');
            this.setAttribute('data-selected', item.value);
            this.selectedValue = item.value;
            this.label.innerText = item.name;
          }

          listElement.addEventListener('click', () => this.select(listElement));

          this.options.appendChild(listElement);
        });
      }

      handleOutsideClick(e) {
        if (!this.contains(e.target)) {
          this.close();
        }
      }
    }
  );
}

if (!customElements.get('interactive-table')) {
  customElements.define(
    'interactive-table',
    class InteractiveTable extends HTMLElement {
      constructor() {
        super();
        this.options = JSON.parse(this.querySelector('script[type="application/json"]').textContent);
        this.table = this.querySelector('table');
        this.selects = this.querySelectorAll('custom-select');
        this.checkmarkIcon = this.querySelector('.check-mark-container');
        this.init();
      }

      init() {
        this.showLoading();

        this.createMainTable(); // updates header and body structure
        this.populateTable(); // fills table with actual content

        this.selects.forEach((select) => {
          select.addEventListener('selection-changed', (e) => {
            this.populateTable();
          });
        });

        this.hideLoading(); // skeleton disappears naturally
      }

      createMainTable() {
        this.updateTableHeader();
        this.updateTableBody();
      }

      populateTable() {
        const selectedValues = Array.from(this.selects).map((select) => select.dataset.selected);
        const rows = this.table.querySelectorAll('tbody tr');

        rows.forEach((row, index) => {
          const cells = row.querySelectorAll('td');
          for (let i = 0; i < selectedValues.length; i++) {
            const cell = cells[i + 1]; // skip the first cell which is for features
            const value =
              this.options[selectedValues[i]].features[Object.keys(this.options[selectedValues[i]].features)[index]];

            if (this.checkmarkIcon) {
              cell.innerHTML = value ? this.checkmarkIcon.innerHTML : '';
            } else {
              cell.textContent = value || ''; // set the cell content or empty if no value
            }
          }
        });

        const buttonCell = rows[rows.length - 1].querySelectorAll('td');
        for (let i = 0; i < selectedValues.length; i++) {
          const cell = buttonCell[i + 1]; // skip the first cell which is for features
          const value =
              this.options[selectedValues[i]].button[Object.keys(this.options[selectedValues[i]].button)[i]];

          console.log(value);

          const button = document.createElement('a');
          button.classList.add('button');
          button.href= value.url || "#"
          button.textContent = value.label || "View Collection"

          cell.appendChild(button);
        }
      }

      updateTableHeader() {
        this.populateSelectOptions();
      }

      updateTableBody() {
        const tableBody = this.table.querySelector('tbody');
        const columns = this.selects.length + 1; // considering the fist column for features

        // features available in the first option
        const featuresObj = Object.values(this.options)[0].features;
        const features = Object.keys(featuresObj);

        tableBody.innerHTML = ''; // clear existing rows

        features.forEach((feature) => {
          const row = document.createElement('tr');
          for (let i = 0; i < columns; i++) {
            const cell = document.createElement('td');
            if (i == 0) {
              cell.textContent = feature; // first column is the feature name
            }
            row.appendChild(cell);
          }
          tableBody.appendChild(row);
        });

        const buttonRow = document.createElement('tr');
        buttonRow.classList.add('no-border');
        for (let i = 0; i < columns; i++) {
          const cell = document.createElement('td');
          buttonRow.appendChild(cell);
        }
        tableBody.appendChild(buttonRow);
      }

      populateSelectOptions() {
        const selectsOptions = this.getValuesAndNames();

        for (let i = 0; i < this.selects.length; i++) {
          this.selects[i].populateOptions(selectsOptions, i);
        }
      }

      getValuesAndNames() {
        const selectsOptions = [];
        for (const [key, value] of Object.entries(this.options)) {
          selectsOptions.push({
            value: key,
            name: value.name,
          });
        }

        return selectsOptions;
      }

      renderSkeletonTable() {
        const tableBody = this.table.querySelector('tbody');
        const columns = this.selects.length + 1; // +1 for the feature name column

        // Use first available option to infer number of rows
        const firstKey = Object.keys(this.options)[0];
        const features = Object.keys(this.options[firstKey].features);

        tableBody.innerHTML = ''; // Clear existing content

        features.forEach(() => {
          const row = document.createElement('tr');
          for (let i = 0; i < columns; i++) {
            const cell = document.createElement('td');
            cell.classList.add('skeleton-cell');
            row.appendChild(cell);
          }
          tableBody.appendChild(row);
        });
      }

      showLoading() {
        this.setAttribute('aria-busy', 'true');
        this.renderSkeletonTable();
      }

      hideLoading() {
        this.setAttribute('aria-busy', 'false');
      }

      selectElementClick(event) {
        const clickedElement = event.target;
        const parentElement = clickedElement.closest('custom-select');

        const selectLabel = parentElement.querySelector('.custom-select__label');
        const value = clickedElement.dataset.value;
        const text = clickedElement.textContent.trim();

        selectLabel.textContent = text;
        parentElement.dataset.selected = value;

        parentElement.querySelectorAll('li').forEach((li) => li.classList.remove('selected'));
        clickedElement.classList.add('selected');

        clickedElement.closest('.custom-select__options').hidden = true;
        parentElement.querySelector('.custom-select__trigger').setAttribute('aria-expanded', 'false');

        // Trigger external callback here if needed
        this.populateTable();
      }
    }
  );
}

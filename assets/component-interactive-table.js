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

// if (!customElements.get('interactive-table')) {
//   customElements.define(
//     'interactive-table',
//     class InteractiveTable extends HTMLElement {
//       constructor() {
//         super();
//         this.options = JSON.parse(this.querySelector('script[type="application/json"]').textContent);
//         this.table = this.querySelector('table');
//         this.selects = this.querySelectorAll('custom-select');
//         this.checkmarkIcon = this.querySelector('.check-mark-container');
//         this.init();
//       }

//       init() {
//         this.showLoading();

//         this.createMainTable(); // updates header and body structure
//         this.populateTable(); // fills table with actual content

//         this.selects.forEach((select) => {
//           select.addEventListener('selection-changed', (e) => {
//             this.populateTable();
//           });
//         });

//         this.hideLoading(); // skeleton disappears naturally
//       }

//       createMainTable() {
//         this.updateTableHeader();
//         this.updateTableBody();
//       }

//       populateTable() {
//         const selectedValues = Array.from(this.selects).map((select) => select.dataset.selected);
//         const rows = this.table.querySelectorAll('tbody tr');

//         rows.forEach((row, index) => {
//           const cells = row.querySelectorAll('td');
//           for (let i = 0; i < selectedValues.length; i++) {
//             const cell = cells[i + 1]; // skip the first cell which is for features
//             const value =
//               this.options[selectedValues[i]].features[Object.keys(this.options[selectedValues[i]].features)[index]];

//             if (this.checkmarkIcon) {
//               cell.innerHTML = value ? this.checkmarkIcon.innerHTML : '';
//             } else {
//               cell.textContent = value || ''; // set the cell content or empty if no value
//             }
//           }
//         });

//         const buttonCell = rows[rows.length - 1].querySelectorAll('td');
//         for (let i = 0; i < selectedValues.length; i++) {
//           const cell = buttonCell[i + 1]; // skip the first cell which is for features
//           const value =
//               this.options[selectedValues[i]].button;

//           console.log(value);

//           const button = document.createElement('a');
//           button.classList.add('button');
//           button.href= value.url || "#"
//           button.textContent = "View Collection"

//           cell.appendChild(button);
//         }
//       }

//       updateTableHeader() {
//         this.populateSelectOptions();
//       }

//       updateTableBody() {
//         const tableBody = this.table.querySelector('tbody');
//         const columns = this.selects.length + 1; // considering the fist column for features

//         // features available in the first option
//         const featuresObj = Object.values(this.options)[0].features;
//         const features = Object.keys(featuresObj);

//         tableBody.innerHTML = ''; // clear existing rows

//         features.forEach((feature) => {
//           const row = document.createElement('tr');
//           for (let i = 0; i < columns; i++) {
//             const cell = document.createElement('td');
//             if (i == 0) {
//               cell.textContent = feature; // first column is the feature name
//             }
//             row.appendChild(cell);
//           }
//           tableBody.appendChild(row);
//         });

//         const buttonRow = document.createElement('tr');
//         buttonRow.classList.add('no-border');
//         for (let i = 0; i < columns; i++) {
//           const cell = document.createElement('td');
//           buttonRow.appendChild(cell);
//         }
//         tableBody.appendChild(buttonRow);
//       }

//       populateSelectOptions() {
//         const selectsOptions = this.getValuesAndNames();

//         for (let i = 0; i < this.selects.length; i++) {
//           this.selects[i].populateOptions(selectsOptions, i);
//         }
//       }

//       getValuesAndNames() {
//         const selectsOptions = [];
//         for (const [key, value] of Object.entries(this.options)) {
//           selectsOptions.push({
//             value: key,
//             name: value.name,
//           });
//         }

//         return selectsOptions;
//       }

//       renderSkeletonTable() {
//         const tableBody = this.table.querySelector('tbody');
//         const columns = this.selects.length + 1; // +1 for the feature name column

//         // Use first available option to infer number of rows
//         const firstKey = Object.keys(this.options)[0];
//         const features = Object.keys(this.options[firstKey].features);

//         tableBody.innerHTML = ''; // Clear existing content

//         features.forEach(() => {
//           const row = document.createElement('tr');
//           for (let i = 0; i < columns; i++) {
//             const cell = document.createElement('td');
//             cell.classList.add('skeleton-cell');
//             row.appendChild(cell);
//           }
//           tableBody.appendChild(row);
//         });
//       }

//       showLoading() {
//         this.setAttribute('aria-busy', 'true');
//         this.renderSkeletonTable();
//       }

//       hideLoading() {
//         this.setAttribute('aria-busy', 'false');
//       }

//       selectElementClick(event) {
//         const clickedElement = event.target;
//         const parentElement = clickedElement.closest('custom-select');

//         const selectLabel = parentElement.querySelector('.custom-select__label');
//         const value = clickedElement.dataset.value;
//         const text = clickedElement.textContent.trim();

//         selectLabel.textContent = text;
//         parentElement.dataset.selected = value;

//         parentElement.querySelectorAll('li').forEach((li) => li.classList.remove('selected'));
//         clickedElement.classList.add('selected');

//         clickedElement.closest('.custom-select__options').hidden = true;
//         parentElement.querySelector('.custom-select__trigger').setAttribute('aria-expanded', 'false');

//         // Trigger external callback here if needed
//         this.populateTable();
//       }
//     }
//   );
// }

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

        // Detect fixed option by URL (if present)
        this.fixedOptionKey = null;
        if (this.dataset.collectionUrl) {
          for (const [key, option] of Object.entries(this.options)) {
            if (option.button?.url === this.dataset.collectionUrl) {
              this.fixedOptionKey = key;
              break;
            }
          }
        }

        this.init();
      }

      init() {
        this.showLoading();

        this.createMainTable();   // builds header + body skeleton
        this.populateTable();     // fills initial content

        // Re-bind listeners (after header is built)
        this.selects = this.querySelectorAll('custom-select');
        this.selects.forEach((select, idx) => {
          // If first column is locked, ignore events for the first (hidden) select
          if (this.fixedOptionKey && idx === 0) return;
          select.addEventListener('selection-changed', () => this.populateTable());
        });

        this.hideLoading();
      }

      createMainTable() {
        this.updateTableHeader();
        this.updateTableBody();
      }

      populateTable() {
        // Always read current selects from DOM
        const selects = this.querySelectorAll('custom-select');

        // Build selected values from selects
        const selectedValues = Array.from(selects).map((select) => select.dataset.selected || '');

        // Force first column to the fixed key when applicable
        if (this.fixedOptionKey && selectedValues.length > 0) {
          selectedValues[0] = this.fixedOptionKey;
        }

        const rows = Array.from(this.table.querySelectorAll('tbody tr'));
        const featureRowCount = Math.max(rows.length - 1, 0); // exclude button row

        // Fill feature rows
        for (let r = 0; r < featureRowCount; r++) {
          const row = rows[r];
          const cells = row.querySelectorAll('td');
          for (let c = 0; c < selectedValues.length; c++) {
            const key = selectedValues[c];
            const cell = cells[c + 1]; // +1 to skip feature name column
            let value = '';

            if (key && this.options[key]) {
              const featuresKeys = Object.keys(this.options[key].features);
              const featureKey = featuresKeys[r];
              value = this.options[key].features[featureKey];
            }

            if (this.checkmarkIcon) {
              cell.innerHTML = value ? this.checkmarkIcon.innerHTML : '';
            } else {
              cell.textContent = value || '';
            }
          }
        }

        // Fill button row
        if (rows.length) {
          const buttonCells = rows[rows.length - 1].querySelectorAll('td');
          for (let c = 0; c < selectedValues.length; c++) {
            const key = selectedValues[c];
            const cell = buttonCells[c + 1]; // +1 to skip feature column
            cell.innerHTML = '';

            if (key && this.options[key]?.button) {
              const btnData = this.options[key].button;
              const a = document.createElement('a');
              a.classList.add('button');
              a.href = btnData.url || '#';
              a.textContent = btnData.label || 'View Collection';
              cell.appendChild(a);
            }
          }
        }
      }

      updateTableHeader() {
        this.populateSelectOptions();
      }

      updateTableBody() {
        // Columns = 1 (feature names) + number of selects (we keep the locked select hidden but present)
        const columns = this.querySelectorAll('custom-select').length + 1;

        const tableBody = this.table.querySelector('tbody');
        const firstKey = Object.keys(this.options)[0];
        const features = Object.keys(this.options[firstKey].features);

        tableBody.innerHTML = '';

        // Feature rows
        features.forEach((feature) => {
          const tr = document.createElement('tr');
          for (let i = 0; i < columns; i++) {
            const td = document.createElement('td');
            if (i === 0) td.textContent = feature;
            tr.appendChild(td);
          }
          tableBody.appendChild(tr);
        });

        // Button row
        const buttonRow = document.createElement('tr');
        buttonRow.classList.add('no-border');
        for (let i = 0; i < columns; i++) {
          const td = document.createElement('td');
          buttonRow.appendChild(td);
        }
        tableBody.appendChild(buttonRow);
      }

      populateSelectOptions() {
        const selectsOptions = this.getValuesAndNames();
        // Ensure we have the latest NodeList
        this.selects = this.querySelectorAll('custom-select');

        if (this.fixedOptionKey && this.selects.length) {
          // 1) Lock first select: populate with single fixed option, then hide; add plain text label
          const fixedSelect = this.selects[0];
          const fixed = this.options[this.fixedOptionKey];

          fixedSelect.populateOptions([{ value: this.fixedOptionKey, name: fixed.name }], 0);
          fixedSelect.setAttribute('data-selected', this.fixedOptionKey);

          // Hide the select UI but keep it in DOM so counts stay consistent
          const trigger = fixedSelect.querySelector('.custom-select__trigger');
          if (trigger) trigger.setAttribute('disabled', 'true');
          fixedSelect.style.display = 'none';
          fixedSelect.setAttribute('aria-hidden', 'true');

          // Ensure visible plain-text label exists in the same <th>
          const th = fixedSelect.closest('th') || fixedSelect.parentElement;
          if (th && !th.querySelector('.plain-text-select')) {
            const div = document.createElement('div');
            div.className = 'plain-text-select';
            div.textContent = fixed.name;
            th.insertBefore(div, th.firstChild);
          } else if (th) {
            th.querySelector('.plain-text-select').textContent = fixed.name;
          }

          // 2) Second column defaults to first non-fixed option
          if (this.selects[1]) {
            const firstOtherIdx = selectsOptions.findIndex(opt => opt.value !== this.fixedOptionKey);
            const idxToUse = firstOtherIdx >= 0 ? firstOtherIdx : 0;
            this.selects[1].populateOptions(selectsOptions, idxToUse);
          }

          // 3) Remaining selects: normal population (index as-is for deterministic defaults)
          for (let i = 2; i < this.selects.length; i++) {
            this.selects[i].populateOptions(selectsOptions, i);
          }
        } else {
          // No match -> normal behavior
          this.selects.forEach((select, i) => select.populateOptions(selectsOptions, i));
        }
      }

      getValuesAndNames() {
        const arr = [];
        for (const [key, value] of Object.entries(this.options)) {
          arr.push({ value: key, name: value.name });
        }
        return arr;
      }

      renderSkeletonTable() {
        // Columns = feature column + number of selects (locked select is still counted)
        const columns = this.querySelectorAll('custom-select').length + 1;

        const tableBody = this.table.querySelector('tbody');
        const firstKey = Object.keys(this.options)[0];
        const features = Object.keys(this.options[firstKey].features);

        tableBody.innerHTML = '';
        features.forEach(() => {
          const tr = document.createElement('tr');
          for (let i = 0; i < columns; i++) {
            const td = document.createElement('td');
            td.classList.add('skeleton-cell');
            tr.appendChild(td);
          }
          tableBody.appendChild(tr);
        });
      }

      showLoading() {
        this.setAttribute('aria-busy', 'true');
        this.renderSkeletonTable();
      }

      hideLoading() {
        this.setAttribute('aria-busy', 'false');
      }
    }
  );
}


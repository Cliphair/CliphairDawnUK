if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.form.querySelector('[name=id]').disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        const selectBoxes = [...document.querySelectorAll(".select__select")];
        let formIsValid = true;

        for (const selectBox of selectBoxes) {
          const selectedOption = selectBox.options[selectBox.selectedIndex];
          if (
            !selectedOption ||
            selectedOption.disabled ||
            selectedOption.classList.contains('placeholder')
          ) {
            selectBox.classList.add("product-form__error");
            selectBox.focus();
            formIsValid = false;
            break;
          }
        }

        if (!formIsValid) {
          this.handleErrorMessage("You must select all the options");
          return;
        }

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading-overlay__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButton.querySelector('span').classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, { source: 'product-form', productVariantId: formData.get('id'), cartData: response });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              this.cart.renderContents(response);
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading-overlay__spinner').classList.add('hidden');
            this.addToCartEvent();
            this.updateDeliveryProgress();
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        if (!errorMessage) {
          const errorElements = [...document.querySelectorAll('.product-form__error')];
          errorElements.forEach(element => {
            element.classList.remove('product-form__error');
            element.blur();
          });
        }

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      updateDeliveryProgress() {
        fetch('/cart.js')
          .then(res => res.json())
          .then(cart => {
            updateDeliveryThreshold(cart.total_price / 100);
          });
      }

      addToCartEvent() {
        this.googleAnalyticsEvent();
      }

      googleAnalyticsEvent() {
        const productForm = this.form;
        const itemSku = productForm.querySelector('input[name="sku"]').value;                  // product variant sku
        const itemName = productForm.querySelector('input[name="product-title"]').value;       // product title
        const itemVariant = productForm.querySelector('input[name="option-title"]').value;    // product variant title
        const itemPrice = parseInt(productForm.querySelector('input[name="price"]').value);      // product variant price
        const itemBrand = productForm.querySelector('input[name="vendor"]').value;      // product vendor
        const itemCategory = productForm.querySelector('input[name="type"]').value;   // product type
        const itemCategory2 = productForm.querySelector('input[name="colour-group"]').value;  // product colour group
        const itemCategory3 = productForm.querySelector('input[name="colour-name"]').value;  // product colour name
        const storeCurrency = productForm.querySelector('input[name="currency"]').value;

        const quantityInput = document.querySelector(`.quantity__input[form="${productForm.getAttribute("id")}"]`);
        const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

        const value = quantity * itemPrice;

        dataLayer.push({ 'ecommerce': null });
        dataLayer.push({
          'event': 'gtm_add_to_cart',
          'ecommerce': {
            'currency': storeCurrency,
            'value': value,
            'items': [{
              'item_id': itemSku,
              'item_name': itemName,
              'item_brand': itemBrand,
              'item_category': itemCategory,
              'item_category2': itemCategory2,
              'item_category3': itemCategory3,
              'item_variant': itemVariant,
              'price': itemPrice,
              'quantity': quantity
            }]
          }
        });
      }
    }
  );
}

window.addEventListener('load', function() {
  document.querySelector('#shopify-pc__banner__btn-manage-prefs').addEventListener('click', function() {
    updateCheckboxOrder();
    if (window.matchMedia("(max-width: 749px)").matches) {
      updateBannerUI();
    }
  })
});

function updateBannerUI(){
  const buttonsContainer = document.querySelector('.shopify-pc__prefs__header-actions');
  const clonedContainer = buttonsContainer.cloneNode();

  const declineButton=document.querySelector('#shopify-pc__prefs__header-decline');
  const saveButton=document.querySelector('#shopify-pc__prefs__header-save');

  clonedContainer.appendChild(declineButton);
  clonedContainer.appendChild(saveButton);

  let footer = document.createElement('footer');
  footer.style = 'padding:0px 32px;';
  footer.appendChild(clonedContainer);

  document.querySelector('.shopify-pc__prefs__scrollable').appendChild(footer);
}

function updateCheckboxOrder(){
  document.querySelector('.shopify-pc__prefs__options').insertBefore(document.querySelector('#shopify-pc__prefs__analytics'), document.querySelector('#shopify-pc__prefs__marketing'));
}
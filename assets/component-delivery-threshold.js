// Function to be called from the add to cart button or any other event that updates the cart value
function updateDeliveryThreshold(currentCartValue) {
  const deliveryThresholdContainer = document.querySelectorAll('.delivery-threshold');
  if (!deliveryThresholdContainer.length) return;

  deliveryThresholdContainer.forEach((container) => {
    console.log(container)
    const progressBar = container.querySelector('.delivery-threshold__progress-bar');
    const labelValue = container.querySelector('.delivery-threshold__label-value');

    const maxValue = parseFloat(progressBar.max);
    const remaining = Math.max(0, maxValue - currentCartValue);

    // Update progress bar
    progressBar.value = currentCartValue;
    progressBar.setAttribute('aria-valuenow', currentCartValue.toFixed(2));

    if (remaining > 0) {
      labelValue.innerText = remaining.toFixed(2);
      container.classList.remove('delivery-threshold-complete');
      container.classList.add('delivery-threshold-incomplete');
    } else {
      container.classList.add('delivery-threshold-complete');
      container.classList.remove('delivery-threshold-incomplete');
    }
  });
}

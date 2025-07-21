document.addEventListener("DOMContentLoaded", () => {
  const loadMoreButton = document.querySelector(".load-more__button");
  const loadingContainer = document.querySelector("#ProductGridContainer > .collection");
  const productGrid = document.querySelector('#product-grid');
  const paginationList = document.querySelector('.pagination__list');

  if (!loadMoreButton) return;

  loadMoreButton.addEventListener("click", (event) => {
    event.preventDefault();

    const nextPageUrl = loadMoreButton.dataset.nextUrl.trim();

    loadMoreButton.disabled = true;
    loadingContainer.classList.add("loading");

    if (!nextPageUrl) return;

    fetch(nextPageUrl)
      .then((response) => response.text())
      .then((responseText) => {

        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const loadedProducts = html.querySelectorAll('#product-grid > .grid__item');
        const loadedNextPageUrl = html.querySelector(".load-more__button").dataset.nextUrl.trim();

        for (let product of loadedProducts) {
          productGrid.appendChild(product);
        }

        if (paginationList) {
          paginationList.innerHTML = html.querySelector('.pagination__list').innerHTML;
        }

        loadMoreButton.dataset.nextUrl = loadedNextPageUrl;

        if (loadedNextPageUrl) {
          loadMoreButton.disabled = false;
        }
        yotpoWidgetsContainer.initWidgets();
        loadingContainer.classList.remove("loading");

        const loadedSchemaItems = Array.from(loadedProducts).map((el, i) => {
          const urlEl = el.querySelector('[data-product-url]');
          const url = urlEl ? urlEl.getAttribute('data-product-url') : null;
          if (!url) return null;
        
          return {
            "@type": "ListItem",
            "position": window.ItemListSchema.length + i + 1,
            "url": url.startsWith('http') ? url : window.location.origin + url
          };
        }).filter(Boolean);

        window.ItemListSchema = window.ItemListSchema.concat(loadedSchemaItems);
        updateItemListSchema();
      })

  })
})
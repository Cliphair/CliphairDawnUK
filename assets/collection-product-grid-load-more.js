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

      })
      .finally(() => {
        addAjaxLoadedItemsToSchema();
      });
  })
})

function addAjaxLoadedItemsToSchema() {
  const currentPage=window.SchemaInformation.currentPage;
  const pageSize =window.SchemaInformation.pageSize;
  const offset = (currentPage - 1) * pageSize;

  const allItems = document.querySelectorAll(".grid__item[data-product-url]");

  console.log(currentPage)
  console.log(pageSize)
  console.log(offset)
  console.log(allItems)

  const newItems = Array.from(loadedProducts).map((el, i) => {
    const urlEl = el.querySelector('[data-product-url]');
    const url = urlEl?.getAttribute('data-product-url');
    if (!url) return null;

    return {
      "@type": "ListItem",
      "position": offset + i + 1,
      "url": url.startsWith('http') ? url : window.location.origin + url
    };
  }).filter(Boolean);

  window.ItemListSchema.push(...newItems);
  updateItemListSchema();
}

function updateItemListSchema() {
    const scriptId = 'item-list-schema';
    const oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = scriptId;
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": document.title,
      "itemListOrder": "https://schema.org/ItemListOrderAscending",
      "numberOfItems": window.ItemListSchema.length,
      "itemListElement": window.ItemListSchema
    });

  document.head.appendChild(script);
}
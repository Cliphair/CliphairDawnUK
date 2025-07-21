// document.addEventListener("DOMContentLoaded", () => {
//   const loadMoreButton = document.querySelector(".load-more__button");
//   const loadingContainer = document.querySelector("#ProductGridContainer > .collection");
//   const productGrid = document.querySelector('#product-grid');
//   const paginationList = document.querySelector('.pagination__list');

//   if (!loadMoreButton) return;

//   loadMoreButton.addEventListener("click", (event) => {
//     event.preventDefault();

//     const nextPageUrl = loadMoreButton.dataset.nextUrl.trim();

//     loadMoreButton.disabled = true;
//     loadingContainer.classList.add("loading");

//     if (!nextPageUrl) return;

//     fetch(nextPageUrl)
//       .then((response) => response.text())
//       .then((responseText) => {

//         const html = new DOMParser().parseFromString(responseText, 'text/html');
//         const loadedProducts = html.querySelectorAll('#product-grid > .grid__item');
//         const loadedNextPageUrl = html.querySelector(".load-more__button").dataset.nextUrl.trim();

//         for (let product of loadedProducts) {
//           productGrid.appendChild(product);
//         }

//         if (paginationList) {
//           paginationList.innerHTML = html.querySelector('.pagination__list').innerHTML;
//         }

//         loadMoreButton.dataset.nextUrl = loadedNextPageUrl;

//         if (loadedNextPageUrl) {
//           loadMoreButton.disabled = false;
//         }
//         yotpoWidgetsContainer.initWidgets();
//         loadingContainer.classList.remove("loading");

//       })
//       .finally(() => {
//         addAjaxLoadedItemsToSchema();
//       });
//   })
// })

document.addEventListener("DOMContentLoaded", () => {
  setupLoadMoreHandler();
});

function setupLoadMoreHandler() {
  const oldButton = document.querySelector(".load-more__button");

  if (!oldButton) return;

  // Clone to ensure clean state
  const loadMoreButton = oldButton.cloneNode(true);
  oldButton.replaceWith(loadMoreButton);

  loadMoreButton.addEventListener("click", (event) => {
    event.preventDefault();

    const nextPageUrl = loadMoreButton.dataset.nextUrl?.trim();
    if (!nextPageUrl) {
      loadMoreButton.disabled = true;
      loadMoreButton.textContent = "No more products";
      return;
    }

    loadMoreButton.disabled = true;
    const loadingContainer = document.querySelector("#ProductGridContainer > .collection");
    const productGrid = document.querySelector('#product-grid');
    const paginationList = document.querySelector('.pagination__list');

    loadingContainer?.classList.add("loading");

    fetch(nextPageUrl)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const loadedProducts = html.querySelectorAll('#product-grid > .grid__item');
        const newPaginationList = html.querySelector('.pagination__list');
        const freshButton = html.querySelector('.load-more__button');

        // Append new products
        loadedProducts.forEach(product => productGrid.appendChild(product));

        // Update pagination
        if (paginationList && newPaginationList) {
          paginationList.innerHTML = newPaginationList.innerHTML;
        }

        // Handle Load More button update
        if (freshButton?.dataset.nextUrl) {
          // Rebind handler for new button
          loadMoreButton.replaceWith(freshButton);
          setupLoadMoreHandler();
        } else {
          // No more products to load
          loadMoreButton.disabled = true;
          loadMoreButton.textContent = "No more products";
        }

        yotpoWidgetsContainer?.initWidgets();
        loadingContainer?.classList.remove("loading");
      })
      .finally(() => {
        addAjaxLoadedItemsToSchema();
      });
  });
}

// Schema management
function addAjaxLoadedItemsToSchema() {
  const currentPage = window.SchemaInformation?.currentPage || 1;
  const pageSize = window.SchemaInformation?.pageSize || 15;
  const offset = (currentPage - 1) * pageSize;

  const allItems = document.querySelectorAll(".grid__item[data-product-url]");

  const itemsSchema = Array.from(allItems).map((el, i) => {
    const url = el.getAttribute('data-product-url');
    if (!url) return null;

    return {
      "@type": "ListItem",
      "position": offset + i + 1,
      "url": url.startsWith('http') ? url : window.location.origin + url
    };
  }).filter(Boolean);

  updateItemListSchema(itemsSchema);
}

function updateItemListSchema(items) {
  const scriptId = 'item-list-schema';
  const oldScript = document.getElementById(scriptId);
  const placement = oldScript?.parentElement || document.head;
  if (oldScript) oldScript.remove();

  const totalItems = window.SchemaInformation?.totalItems || items.length;

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = scriptId;
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": document.title,
    "itemListOrder": "https://schema.org/ItemListOrderAscending",
    "numberOfItems": totalItems,
    "itemListElement": items
  });

  placement.appendChild(script);
  console.log("✅ Updated schema injected:", script);
}
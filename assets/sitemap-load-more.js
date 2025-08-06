document.addEventListener("DOMContentLoaded", () => {
  const loadMoreButton = document.querySelector(".load-more__button");
  // const loadingContainer = document.querySelector("#ProductGridContainer > .collection");
  const list = document.querySelector('.sitemap-list');
  const paginationList = document.querySelector('.pagination__list');

  if (!loadMoreButton) return;

  loadMoreButton.addEventListener("click", (event) => {
    event.preventDefault();

    const nextPageUrl = loadMoreButton.dataset.nextUrl.trim();

    loadMoreButton.disabled = true;
    // loadingContainer.classList.add("loading");

    if (!nextPageUrl) return;

    fetch(nextPageUrl)
      .then((response) => response.text())
      .then((responseText) => {

        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const loadedList = html.querySelectorAll('.sitemap-list > .sitemap-item');
        const loadedNextPageUrl = html.querySelector(".load-more__button").dataset.nextUrl.trim();

        for (let listElement of loadedList) {
          list.appendChild(listElement);
        }

        if (paginationList) {
          paginationList.innerHTML = html.querySelector('.pagination__list').innerHTML;
        }

        loadMoreButton.dataset.nextUrl = loadedNextPageUrl;

        if (loadedNextPageUrl) {
          loadMoreButton.disabled = false;
        }
        // yotpoWidgetsContainer.initWidgets();
        // loadingContainer.classList.remove("loading");
      })

  })
})
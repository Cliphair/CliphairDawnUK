// document.addEventListener("DOMContentLoaded", () => {
//   const loadMoreButton = document.querySelector(".load-more__button");
//   const articlesGrid = document.querySelector('.blog-articles');
//   const paginationList = document.querySelector('.pagination__list');

//   if (!loadMoreButton) return;

//   loadMoreButton.addEventListener("click", (event) => {
//     event.preventDefault();

//     const nextPageUrl = loadMoreButton.dataset.nextUrl.trim();

//     loadMoreButton.disabled = true;

//     if (!nextPageUrl) return;

//     fetch(nextPageUrl)
//       .then((response) => response.text())
//       .then((responseText) => {

//         const html = new DOMParser().parseFromString(responseText, 'text/html');
//         const loadedArticles = html.querySelectorAll('.blog-articles > .blog-articles__article');
//         const loadedNextPageUrl = html.querySelector(".load-more__button").dataset.nextUrl.trim();

//         for (let article of loadedArticles) {
//           articlesGrid.appendChild(article);
//         }

//         if (paginationList) {
//           paginationList.innerHTML = html.querySelector('.pagination__list').innerHTML;
//         }

//         loadMoreButton.dataset.nextUrl = loadedNextPageUrl;

//         if (loadedNextPageUrl) {
//           loadMoreButton.disabled = false;
//         }
//       })

//   })
// })

document.addEventListener("DOMContentLoaded", () => {
  const getEls = () => ({
    articlesGrid: document.querySelector(".blog-articles"),
    paginationList: document.querySelector(".pagination__list"),
  });

  const setLoading = (btn, isLoading) => {
    if (btn) btn.disabled = isLoading;
  };

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".load-more__button");
    if (!button) return;

    event.preventDefault();

    const { articlesGrid, paginationList } = getEls();
    const nextPageUrl = (button.dataset.nextUrl || "").trim();
    if (!nextPageUrl || !articlesGrid) return;

    setLoading(button, true);

    try {
      const response = await fetch(nextPageUrl, { credentials: "same-origin" });
      const responseText = await response.text();
      const html = new DOMParser().parseFromString(responseText, "text/html");

      html.querySelectorAll(".blog-articles > .blog-articles__article").forEach((item) => {
        articlesGrid.appendChild(item);
      });

      const newPaginationList = html.querySelector(".pagination__list");
      if (paginationList && newPaginationList) {
        paginationList.innerHTML = newPaginationList.innerHTML;
      }

      const newButton = html.querySelector(".load-more__button");
      const newNextUrl = (newButton?.dataset?.nextUrl || "").trim();

      if (!newNextUrl) {
        button.remove();
      } else {
        button.dataset.nextUrl = newNextUrl;
        button.disabled = false;
      }
    } catch (err) {
      console.error("Load more failed:", err);
      button.disabled = false;
    }
  });
});
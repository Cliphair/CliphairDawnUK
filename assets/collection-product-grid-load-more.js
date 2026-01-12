document.addEventListener("DOMContentLoaded", () => {
  const getEls = () => ({
    loadingContainer: document.querySelector("#ProductGridContainer > .collection"),
    productGrid: document.querySelector("#product-grid"),
    paginationList: document.querySelector(".pagination__list"),
  });

  const setLoading = (btn, container, isLoading) => {
    if (btn) btn.disabled = isLoading;
    if (container) container.classList.toggle("loading", isLoading);
  };

  const safeInitYotpo = () => {
    try {
      if (window.yotpoWidgetsContainer?.initWidgets) window.yotpoWidgetsContainer.initWidgets();
    } catch (e) { }
  };

  const syncRelLinksToHeadFromFetchedDoc = (fetchedDoc) => {
    const prevHref = (fetchedDoc.querySelector('link[rel="prev"]')?.getAttribute("href") || "").trim();
    const nextHref = (fetchedDoc.querySelector('link[rel="next"]')?.getAttribute("href") || "").trim();

    const upsert = (rel, href) => {
      let el = document.head.querySelector(`link[rel="${rel}"]`);
      if (!href) {
        el?.remove();
        return;
      }
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    upsert("prev", prevHref);
    upsert("next", nextHref);
  };

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".load-more__button");
    if (!button) return;

    event.preventDefault();

    const { loadingContainer, productGrid, paginationList } = getEls();
    const nextPageUrl = (button.dataset.nextUrl || "").trim();
    if (!nextPageUrl || !productGrid) return;

    setLoading(button, loadingContainer, true);

    try {
      const response = await fetch(nextPageUrl, { credentials: "same-origin" });
      const responseText = await response.text();
      const html = new DOMParser().parseFromString(responseText, "text/html");

      syncRelLinksToHeadFromFetchedDoc(html);

      html.querySelectorAll("#product-grid > .grid__item").forEach((item) => {
        productGrid.appendChild(item);
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

      safeInitYotpo();
    } catch (err) {
      console.error("Load more failed:", err);
      button.disabled = false;
    } finally {
      if (loadingContainer) loadingContainer.classList.remove("loading");
    }
  });
});
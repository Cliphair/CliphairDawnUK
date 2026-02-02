// Prevent the browser from restoring scroll on reload/back (otherwise prepending pages will push you down)
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

document.addEventListener("DOMContentLoaded", () => {
  const getEls = () => ({
    // loadingContainer: document.querySelector("#ProductGridContainer > .collection"),
    productGrid: document.querySelector(".blog-articles"),
    paginationList: document.querySelector(".pagination__list"),
    loadMoreButton: document.querySelector(".load-more__button"),
  });

  const setLoading = (btn, container, isLoading) => {
    if (btn) btn.disabled = isLoading;
    if (container) container.classList.toggle("loading", isLoading);
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

  // -------- URL helpers --------
  const getPageFromUrl = (url) => {
    try {
      const u = new URL(url, window.location.origin);
      return parseInt(u.searchParams.get("page") || "1", 10) || 1;
    } catch {
      return 1;
    }
  };

  const setCurrentPageInAddressBar = (page) => {
    const u = new URL(window.location.href);
    if (page <= 1) u.searchParams.delete("page");
    else u.searchParams.set("page", String(page));
    history.pushState({ page }, "", u.toString());
  };

  const buildPageUrl = (page) => {
    const u = new URL(window.location.href);
    if (page <= 1) u.searchParams.delete("page");
    else u.searchParams.set("page", String(page));
    return u.toString();
  };

  const scrollToProductGridTop = () => {
    // const { productGrid } = getEls();
    // if (!productGrid) {
    //   window.scrollTo(0, 0);
    //   return;
    // }
    // const y = productGrid.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo(0, 0);
  };

  // -------- click "load more" --------
  const loadNextPage = async ({ buttonOverride = null } = {}) => {
    const { productGrid, paginationList, loadMoreButton } = getEls();
    const button = buttonOverride || loadMoreButton;

    const nextPageUrl = (button?.dataset?.nextUrl || "").trim();
    if (!nextPageUrl || !productGrid) return;

    // setLoading(button, loadingContainer, true);

    try {
      const response = await fetch(nextPageUrl, { credentials: "same-origin" });
      const responseText = await response.text();
      const html = new DOMParser().parseFromString(responseText, "text/html");

      syncRelLinksToHeadFromFetchedDoc(html);

      html.querySelectorAll(".blog-articles > .blog-articles__article").forEach((item) => {
        productGrid.appendChild(item);
      });

      const newPaginationList = html.querySelector(".pagination__list");
      if (paginationList && newPaginationList) {
        paginationList.innerHTML = newPaginationList.innerHTML;
      }

      const newButton = html.querySelector(".load-more__button");
      const newNextUrl = (newButton?.dataset?.nextUrl || "").trim();

      if (!newNextUrl) {
        button?.remove();
      } else if (button) {
        button.dataset.nextUrl = newNextUrl;
        button.disabled = false;
      }

      // Update URL to the page that was just loaded
      const loadedPage = getPageFromUrl(nextPageUrl);
      setCurrentPageInAddressBar(loadedPage);
    } catch (err) {
      console.error("Load more failed:", err);
      if (button) button.disabled = false;
    } finally {
      if (loadingContainer) loadingContainer.classList.remove("loading");
    }
  };

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".load-more__button");
    if (!button) return;

    event.preventDefault();
    await loadNextPage({ buttonOverride: button });
  });

  // -------- auto-preload previous pages by PREPENDING (no clearing, no compensation) --------
  (async () => {
    const { loadingContainer, productGrid, loadMoreButton } = getEls();
    if (!productGrid) return;

    const targetPage = getPageFromUrl(window.location.href);
    if (targetPage <= 1) return;

    // Keep the user at the top experience (prevents the "pushed below grid" issue)
    window.scrollTo(0, 0);

    // setLoading(loadMoreButton, loadingContainer, true);

    // Fetch in reverse: N-1 ... 1 and prepend each page as a block
    for (let p = targetPage - 1; p >= 1; p--) {
      const url = buildPageUrl(p);

      try {
        const res = await fetch(url, { credentials: "same-origin" });
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, "text/html");

        const items = Array.from(doc.querySelectorAll(".blog-articles > .blog-articles__article"));
        if (!items.length) continue;

        const frag = document.createDocumentFragment();
        items.forEach((it) => frag.appendChild(it));

        productGrid.insertBefore(frag, productGrid.firstChild);
      } catch (e) {
        console.error(`Preload page ${p} failed`, e);
        break;
      }
    }

    // safeInitYotpo();

    // if (loadingContainer) loadingContainer.classList.remove("loading");
    if (loadMoreButton) loadMoreButton.disabled = false;

    // After preloading, lock the viewport to the top of the grid (consistent on landing + reload)
    scrollToProductGridTop();
  })();

  // Back/forward: simplest consistent behaviour is to reload to match the URL state
  window.addEventListener("popstate", () => window.location.reload());
});
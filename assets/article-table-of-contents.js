
document.addEventListener('DOMContentLoaded', () => {
  let titles = document.querySelectorAll('.section-main-article .article-main h2');
  let tocList = document.querySelector('.table-of-content__list');
  let tocToggle = document.querySelector('.table-of-content__header');

  if (titles.length > 0) {
    if (tocList) {
      addTitlesToIndex(titles, tocList);
      tocToggle.addEventListener('click', (e) => {
        e.preventDefault();
        tocToggleClick(tocList, tocToggle);
      });
    }

    tocToggleClick(tocList, tocToggle);
  } else {
    const toc = document.querySelector('.table-of-content');
    if (toc) toc.remove();
  }
});

function tocToggleClick(toc, toggleButton) {

  toggleButton.classList.toggle('open')
  toc.classList.toggle('hidden');
}

function cleanTitle(title) {
  if (/^([0-9]\. )|^([1-9][0-9]\. )/.test(title)) {
    return title.slice(3);
  }
  return title;
}

function addTitlesToIndex(titlesList, indexElement) {
  let counter = 1;
  let list = document.createElement('ol');

  for (const title of titlesList) {
    if (title.innerText.trim() !== '') {
      const id = `toc-${counter}`; // unique ID
      title.id = id;

      let listElement = document.createElement('li');
      let anchorElement = document.createElement('a');
      anchorElement.href = `#${id}`;
      anchorElement.innerText = title.innerText.trim();
      anchorElement.title = "Go to " + title.innerText.trim();

      anchorElement.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToId(id); // pass stable id
      });

      listElement.appendChild(anchorElement);
      list.appendChild(listElement);
      counter++;
    }
  }
  indexElement.appendChild(list);
}

function getHeaderHeight() {
  // Always re-check the header's height dynamically
  const header = document.querySelector('sticky-header, .sticky-header, #sticky-header');
  return header ? header.getBoundingClientRect().height : 0;
}

function scrollToId(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn('scrollToId: element not found for id', id);
    return;
  }

  const headerHeight = getHeaderHeight();
  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - headerHeight - 50;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
}

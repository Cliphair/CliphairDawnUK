// Read More Functions
document.addEventListener("DOMContentLoaded", () => {
    let readMoreBtns = document.getElementsByClassName('read-more__btn');
    let readLessBtns = document.getElementsByClassName('read-less__btn');

    for (let btn of readMoreBtns) {
        btn.addEventListener('click', () => {
            openReadMore(btn);
        })
    }

    for (let btn of readLessBtns) {
        btn.addEventListener('click', () => {
            closeReadLess(btn);
        })
    }

    let readMoreButtonType2 = document.getElementsByClassName('read_more_btn');
    for (let button of readMoreButtonType2) {
        button.onclick = null;
        button.addEventListener('click', (event) => {
            let id = event.target.id;
            id.includes("open") ? readMore(id) : readLess(id);
        });
    }
})

function openReadMore(btn) {
    btn.classList.add('hidden');
    btn.parentElement.nextElementSibling.classList.remove('hidden');
}

function closeReadLess(btn) {
    btn.parentElement.previousElementSibling.querySelector('span.hidden').classList.remove('hidden');
    btn.parentElement.classList.add('hidden');
}

function btsVideoTag(videoUrl) {
    let videoBgContainer = document.createElement("div");
    videoBgContainer.id = 'bts__video-container';
    videoBgContainer.classList.add('video__bg');

    let video = ``;
    if (videoUrl.includes("youtube")) {
        let videoId = videoUrl.includes("shorts") ? videoUrl.split("/shorts/")[1] : videoUrl.split("/watch?v=")[1];
        video = `
          <div class='video__container'>
            <div class='close__video'><i onclick='btsCloseBtn()' class="fa-solid fa-xmark close__btn"></i></div>
            <iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}?si=uhRBra05BAOkACcF&amp;controls=0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>
    	`;
    } else {
        video = `
          <div class='video__container'>
            <div class='close__video'><i onclick='btsCloseBtn()' class="fa-solid fa-xmark close__btn"></i></div>
            <video class='bts__video' autoplay muted controls>
                <source src="${videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
          </div>
    	`;
    }
    videoBgContainer.innerHTML = video;
    document.querySelector('body').prepend(videoBgContainer)
    document.querySelector("#bts__video-container").addEventListener('click', btsCloseBtn);

}

function btsCloseBtn() {
    document.querySelector("#bts__video-container").remove();
}

// OLD FUNCTIONS THAT WILL BE REMOVED WHEN COLLECTIONS UPDATED
// Custom read more and less functions
function readMore(clicked_id) {
    let clickedButtonNumber = clicked_id.split('read-button-open');
    let openButton = document.getElementById(clicked_id);

    let textContainerId = 'read-more' + clickedButtonNumber[1];
    let textContainer = document.getElementById(textContainerId);

    openButton.classList.toggle('closed');
    textContainer.classList.toggle('closed');
}

function readLess(clicked_id) {
    let clickedButtonNumber = clicked_id.split('read-button-close');

    let openButtonId = 'read-button-open' + clickedButtonNumber[1];
    let openButton = document.getElementById(openButtonId);

    let textContainerId = 'read-more' + clickedButtonNumber[1];
    let textContainer = document.getElementById(textContainerId);

    openButton.classList.toggle('closed');
    textContainer.classList.toggle('closed');
}

function read_more(button) {
    let target = button.dataset.target;
    let container = document.getElementsByClassName(target)[0];

    container.classList.toggle('hidden');
    button.classList.toggle('hidden');
}

function read_less(clicked_button) {
    let target = clicked_button.dataset.target;
    let container = document.getElementsByClassName(target)[0];
    let readMoreButton = document.getElementById(target);
    container.classList.toggle('hidden');
    readMoreButton.classList.toggle('hidden');
}

// SCROLL ARROW AND DOTS SNIPPETS
// Functions to scroll an element into view based on a button click
function addButtonClick(btnClass) {
    let buttons = document.querySelectorAll(`.${btnClass}`);

    buttons.forEach((button) => {
        button.addEventListener('click', () => {

            let target = button.dataset.target;
            let element = document.querySelector(`[data-index="${target}"]`);

            scrollToElement(element);
            removeActiveClass(btnClass);
            addActiveClass(target);
        })
    })
}

function addActiveClass(target) {
    let button = document.querySelector(`[data-target="${target}"]`);
    button.classList.add("active");
}

function removeActiveClass(elementClass) {
    let button = document.querySelector(`.${elementClass}.active`);
    button.classList.remove("active");
}

function scrollToElement(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Scroll Function
function scrollTo(containerClass, elementIndex) {
    if (!containerClass) return;
    let container = document.querySelector(`.${containerClass}`);
    if (!container) {
        return;
    }
    let childElements = container.children;
    let childElementLengthIndexed = childElements.length - 1;
    elementIndex = (elementIndex < 0) ? 0 : ((elementIndex > childElementLengthIndexed) ? childElementLengthIndexed : elementIndex);
    childElements[elementIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Scroll Functions For Arrow.liquid Snippet
function newScrollArrow(button) {
    // initiate values
    let current = parseInt(button.dataset.index);
    let limit = parseInt(button.dataset.limit);
    let direction = button.dataset.direction;
    let containerClass = button.dataset.containerClass;
    let step = parseInt(button.dataset.stepMobile);

    // change step based on the window size
    let windowSize = window.innerWidth;
    if (windowSize >= 992) {
        step = parseInt(button.dataset.stepDesktop);
    } else if (windowSize >= 768 && windowSize < 992) {
        step = parseInt(button.dataset.stepTablet);
    }

    let next = 0;
    if (direction == "right") {
        next = (current + step >= limit) ? limit : current + step;
        if (current % step == 0) {
            next = current + step + (step - 1);
            next = (next >= limit) ? limit : next;
        }
    } else {
        next = (current - step <= 0) ? 0 : current - step;
        if (current % step == 0) {
            next = current - step - (step - 1);
            next = (next <= 0) ? 0 : next;
        }
    }

    if (current == limit || current == 0) {
        if (direction == "right") {
            next = current + step + (step - 1);
            next = (next >= limit) ? limit : next;
        } else {
            next = current - step - (step - 1);
            next = (next <= 0) ? 0 : next;
        }
    }

    scrollTo(containerClass, next); // scroll to element
    updateArrowsIndex(containerClass, next); // update arrows index value
    disabelArrows(containerClass); // disable arrows
    enableArrows(containerClass); // enable arrow

    // update dots information
    let reference = (direction == "right") ? Math.floor(next / step) : Math.ceil(next / step);
    updateDots(containerClass, reference, next);
}

function updateArrowsIndex(containerClass, value) {
    let arrows = document.querySelectorAll(`.${containerClass} ~ .scroll-arrow`)
    for (let arrow of arrows) {
        arrow.dataset.index = value;
    }
}

function disabelArrows(containerClass) {
    let arrows = document.querySelectorAll(`.${containerClass} ~ .scroll-arrow`)

    for (let arrow of arrows) {
        let arrowIndex = parseInt(arrow.dataset.index);
        let arrowLimit = parseInt(arrow.dataset.limit);

        if (arrow.dataset.direction == "right") {
            if (arrowIndex >= arrowLimit) {
                arrow.classList.add("disabled");
            }
        } else {
            if (arrowIndex <= 0) {
                arrow.classList.add("disabled");
            }
        }
    }
}

function enableArrows(containerClass) {
    let arrows = document.querySelectorAll(`.${containerClass} ~ .scroll-arrow`)

    for (let arrow of arrows) {
        let arrowIndex = parseInt(arrow.dataset.index);
        let arrowLimit = parseInt(arrow.dataset.limit);

        if (arrow.dataset.direction == "right") {
            if (arrowIndex < arrowLimit) {
                arrow.classList.remove("disabled");
            }
        } else {
            if (arrowIndex > 0) {
                arrow.classList.remove("disabled");
            }
        }
    }
}

function updateDots(containerClass, reference, next) {
    let dots = document.querySelectorAll(`.${containerClass} ~ .dot-container .dot-icon`)
    if (dots.length != 0) {
        updateDotIndex(containerClass, next);
        updateDotActive(containerClass, reference);
        removeDotSelectedClass(containerClass);
        addDotSelectedClass(containerClass, reference);
    }
}

// Scroll Functions For Dots.liquid Snippet
function scrollDots(button) {
    // initiate variables
    let limit = parseInt(button.dataset.limit);
    let current = parseInt(button.dataset.index);
    let reference = parseInt(button.dataset.reference);
    let active = parseInt(button.dataset.active);
    let containerClass = button.dataset.containerClass;
    let step = parseInt(button.dataset.step);
    let next = current;
    let isFirst = button.dataset.first;
    let isLast = button.dataset.last;

    // calculate next based on the reference position
    if (active < reference) {
        let dif = reference - active;
        next = (current + (step * dif));
        if (current % step == 0 || current == limit || current == 0) {
            next = current + (step * dif) + (step - 1);
        }
        next = (next >= limit) ? limit : next;
    } else if (active > reference) {
        let dif = active - reference;
        next = (current - (step * dif));
        if (current % step == 0 || current == limit || current == 0) {
            next = current - (step * dif) - (step - 1);
        }
        next = (next <= 0) ? 0 : next;
    }

    // if it's first dot, update next to 0
    if (isFirst) {
        next = 0;
    }
    // if it's last dot, update net to the limit;
    if (isLast) {
        next = limit;
    }

    scrollTo(containerClass, next); // scroll to next element
    updateDotIndex(containerClass, next); // update dots index information
    updateDotActive(containerClass, reference); // update dots active value
    removeDotSelectedClass(containerClass); // remove active class from all the dots
    addDotSelectedClass(containerClass, reference); // add active class to active dots
    updateArrows(containerClass, next); // if there are arrow, update arrows
}

function removeDotSelectedClass(containerClass) {
    let buttons = document.querySelectorAll(`.${containerClass} ~ .dot-container .selected`);
    for (let button of buttons) {
        button.classList.remove("selected");
    }
}

function addDotSelectedClass(containerClass, reference) {
    let buttons = document.querySelectorAll(`.${containerClass} ~ .dot-container [data-reference="${reference}"]`);
    for (let button of buttons) {
        button.classList.add("selected");
    }
}

function updateDotIndex(containerClass, index) {
    let dotButtons = document.querySelectorAll(`.${containerClass} ~ .dot-container .dot-icon`);
    for (let dot of dotButtons) {
        dot.dataset.index = index;
    }
}

function updateDotActive(containerClass, active) {
    let dotButtons = document.querySelectorAll(`.${containerClass} ~ .dot-container .dot-icon`);
    for (let dot of dotButtons) {
        dot.dataset.active = active;
    }
}

function updateArrows(containerClass, index) {
    let arrows = document.querySelectorAll(`.${containerClass} ~ .scroll-arrow`)
    if (arrows.length != 0) {
        for (let arrow of arrows) {
            updateArrowsIndex(containerClass, index)
        }
        disabelArrows(containerClass);
        enableArrows(containerClass);
    }
}

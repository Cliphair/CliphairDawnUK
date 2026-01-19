
(function () {
    'use strict';

    function initSlider(slider) {
        const beforeWrapper = slider.querySelector('[data-before-wrapper]');
        const handle = slider.querySelector('[data-handle]');
        const labelBefore = slider.querySelector('[data-label-before]');
        const labelAfter = slider.querySelector('[data-label-after]');
        const srText = slider.querySelector('[data-sr-text]');
        const beforeImage = slider.querySelector('[data-before-image]');
        const afterImage = slider.querySelector('[data-after-image]');

        let position = parseInt(slider.dataset.initial) || 50;
        let isDragging = false;
        let imagesLoaded = { before: false, after: false };

        // Update slider position
        function updatePosition(newPosition) {
            position = Math.min(Math.max(newPosition, 0), 100);

            beforeWrapper.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
            handle.style.left = position + '%';

            slider.setAttribute('aria-valuenow', Math.round(position));
            if (srText) {
                srText.textContent = `Showing ${Math.round(position)}% after image`;
            }

            // Update label visibility
            if (labelBefore) {
                labelBefore.classList.toggle('is-hidden', position <= 10);
            }
            if (labelAfter) {
                labelAfter.classList.toggle('is-hidden', position >= 90);
            }
        }

        // Get position from pointer event
        function getPositionFromEvent(clientX) {
            const rect = slider.getBoundingClientRect();
            const x = clientX - rect.left;
            return (x / rect.width) * 100;
        }

        // Mouse events
        function onMouseDown(e) {
            e.preventDefault();
            isDragging = true;
            slider.classList.add('is-dragging');
            updatePosition(getPositionFromEvent(e.clientX));

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        function onMouseMove(e) {
            if (!isDragging) return;
            updatePosition(getPositionFromEvent(e.clientX));
        }

        function onMouseUp() {
            isDragging = false;
            slider.classList.remove('is-dragging');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        // Touch events
        function onTouchStart(e) {
            isDragging = true;
            slider.classList.add('is-dragging');
            updatePosition(getPositionFromEvent(e.touches[0].clientX));
        }

        function onTouchMove(e) {
            if (!isDragging) return;
            updatePosition(getPositionFromEvent(e.touches[0].clientX));
        }

        function onTouchEnd() {
            isDragging = false;
            slider.classList.remove('is-dragging');
        }

        // Keyboard navigation
        function onKeyDown(e) {
            const step = 5;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    updatePosition(position - step);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    updatePosition(position + step);
                    break;
                case 'Home':
                    e.preventDefault();
                    updatePosition(0);
                    break;
                case 'End':
                    e.preventDefault();
                    updatePosition(100);
                    break;
            }
        }

        // Image loading
        function checkImagesLoaded() {
            if (imagesLoaded.before && imagesLoaded.after) {
                slider.classList.remove('is-loading');
            }
        }

        if (beforeImage) {
            if (beforeImage.complete) {
                imagesLoaded.before = true;
            } else {
                beforeImage.addEventListener('load', function () {
                    imagesLoaded.before = true;
                    checkImagesLoaded();
                });
            }
        } else {
            imagesLoaded.before = true;
        }

        if (afterImage) {
            if (afterImage.complete) {
                imagesLoaded.after = true;
            } else {
                afterImage.addEventListener('load', function () {
                    imagesLoaded.after = true;
                    checkImagesLoaded();
                });
            }
        } else {
            imagesLoaded.after = true;
        }

        checkImagesLoaded();

        // Event listeners
        slider.addEventListener('mousedown', onMouseDown);
        slider.addEventListener('touchstart', onTouchStart, { passive: true });
        slider.addEventListener('touchmove', onTouchMove, { passive: true });
        slider.addEventListener('touchend', onTouchEnd);
        slider.addEventListener('keydown', onKeyDown);

        // Set initial position
        updatePosition(position);
    }

    // Initialize all sliders on page
    function init() {
        const sliders = document.querySelectorAll('[data-before-after-slider]');
        sliders.forEach(initSlider);
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-init for Shopify section rendering
    if (window.Shopify && window.Shopify.designMode) {
        document.addEventListener('shopify:section:load', init);
    }
})();

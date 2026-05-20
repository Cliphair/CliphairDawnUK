customElements.whenDefined('slider-component-custom').then(() => {
    const SliderParent = customElements.get('slider-component-custom');

    if (customElements.get('split-banner-shade-slider')) return;

    class SplitBannerShadeSlider extends SliderParent {
    }

    customElements.define('split-banner-shade-slider', SplitBannerShadeSlider);
});
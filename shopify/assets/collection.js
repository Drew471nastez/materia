/* Materia Themes. Developed By Materia Themes. */
'use strict';
const options_collection = {
  collectionsLoadMore: '.collections-load-more',
  rangeSlider: '.price-range .range-slider',
  rangeSliderMin: '.range-slider-min',
  rangeSliderMax: '.range-slider-max',
  minPriceRange: '.min-price-range',
  maxPriceRange: '.max-price-range',
  collectionSidebar: '#CollectionSidebar',
  collectionFilterBlocks: '.filter-blocks',
  productgridcontainer: '#productgridcontainer',
  collectionFiltersForm: '#CollectionFiltersForm',
  section: '.sec__collection-main',
};

class BtnFilter extends HTMLElement {
  constructor() {
    super();
    this.collectionSidebar = document.getElementById('CollectionSidebar');
    this.addEventListener('click', this.onOpen.bind(this), false);
  }
  onOpen() {
    if (!this.classList.contains('open')) {
      this.collectionSidebar.classList.add('open');
      document.documentElement.classList.add('open-drawer', 'open-sidebar');
      root.style.setProperty('padding-right', getScrollBarWidth.init() + 'px');
      this.classList.add('open');
    } else {
      this.collectionSidebar.classList.remove('open');
      document.documentElement.classList.remove('open-drawer', 'open-sidebar');
      root.style.removeProperty('padding-right');
      this.classList.remove('open');
    }
  }
}
customElements.define('btn-filter', BtnFilter);
class CloseFilter extends HTMLElement {
  constructor() {
    super();
    this.collectionSidebar = document.getElementById('CollectionSidebar');
    this.addEventListener('click', this.onClose.bind(this), false);
  }
  onClose() {
    this.collectionSidebar.classList.remove('open');
    document.documentElement.classList.remove('open-drawer', 'open-sidebar');
    document.querySelector('.btn-filter').classList.remove('open');
    root.style.removeProperty('padding-right');
  }
}
customElements.define('close-filter', CloseFilter);

class FacetApplyCanvas extends CloseFilter {
  constructor() {
    super();
    this.addEventListener('click', this.onClose.bind(this), false);
  }
}
customElements.define('facet-apply-canvas', FacetApplyCanvas);

class GridMode extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.gridMode.bind(this), false);
  }
  async gridMode() {
    if (this.classList.contains('active')) return;
    const view_mode = this.getAttribute('data-grid-mode');
    if (view_mode == 1) return;
  await Motion.animate(
      document.querySelectorAll(
        'motion-element.product-item__wrapper.slide_in'
      ),
      {
        transform: ['translateY(0)', 'translateY(3.5rem)'],
        opacity: [1, 0.01],
        visibility: ['visible', 'hidden'],
      },
      {
        duration: 0.3,
        delay: Motion.stagger(0.05),
        easing: [0, 0, 0.3, 1],
      }
    );


    for (var item of document.querySelectorAll('grid-mode')) {
      item.classList.remove('active');
    }
    const container_switch = document.querySelector(
      '.container-products-switch'
    );
    this.classList.add('active');
    const data_view_mode = container_switch.getAttribute('data-view-mode');
    container_switch.classList.remove('grid-columns-' + data_view_mode);
    container_switch.setAttribute('data-view-mode', view_mode);
    container_switch.classList.add('grid-columns-' + view_mode);
    Motion.animate(
      document.querySelectorAll(
        'motion-element.product-item__wrapper.slide_in'
      ),
      {
        transform: ['translateY(3.5rem)', 'translateY(0)'],
        opacity: [0.01, 1],
        visibility: ['hidden', 'visible'],
      },
      {
        duration: 0.3,
        delay: Motion.stagger(0.1),
        easing: [0, 0, 0.3, 1],
      }
    );
  }
}
customElements.define('grid-mode', GridMode);

class ViewMode extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.viewMode.bind(this), false);
  }
  viewMode() {
    const view_mode = this.getAttribute('data-view');
    if (this.classList.contains('actived')) return;
    var queryString = window.location.search;
    queryString = eventCollectionShopify.removeParam('view', queryString);
    if (view_mode == 'list') {
      var searchParams = queryString.replace('?', '') + '&view=list';
    } else {
      var searchParams = queryString.replace('?', '') + '&view=grid';
    }
    const url = eventCollectionShopify.renderUrl(searchParams);
    eventCollectionShopify.renderSectionFilter(url, searchParams);
  }
}
customElements.define('view-mode', ViewMode);

class FilterItem extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.filterItem.bind(this), false);
  }
  filterItem() {
    if (this.querySelector('.tooltip')) {
      this.querySelector('.tooltip').classList.toggle('current-filter');
    } else {
      if (this.closest('li')) {
        this.closest('li').classList.toggle('current-filter');
      }
    }
    const url = this.getAttribute('data-href');
    eventCollectionShopify.renderSectionFilter(url);
  }
}
customElements.define('filter-item', FilterItem);

class FacetClearAll extends CloseFilter {
  constructor() {
    super();
    this.addEventListener('click', this.filterItem.bind(this), false);
  }
  filterItem() {
    const url = this.getAttribute('data-href');
    eventCollectionShopify.renderSectionFilter(url);
    this.onClose();
  }
}
customElements.define('facet-clear-all', FacetClearAll);

class FilterSort extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.filterSort.bind(this), false);
  }
  filterSort() {
    const value = this.getAttribute('value');
    let queryString = window.location.search;
    queryString = eventCollectionShopify.removeParam('sort_by', queryString);
    const searchParams = queryString.replace('?', '') + '&sort_by=' + value;
    const url = eventCollectionShopify.renderUrl(searchParams);
    eventCollectionShopify.renderSectionFilter(url, searchParams);
  }
}
customElements.define('filter-sort', FilterSort);

class SelectSorter extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.activeFilterSort.bind(this), false);
  }
  activeFilterSort() {
    if (this.closest('.select-custom').classList.contains('active')) {
      this.closest('.select-custom').classList.remove('active');
    } else {
      this.closest('.select-custom').classList.add('active');
    }
  }
}
customElements.define('select-sorter', SelectSorter);

var eventCollectionShopify = (function () {
  return {
    init: function () {
      this.ionRangeSlider();
      let windowWidth = window.innerWidth;
      if (windowWidth <= 1024) {
        const horizontal = document.querySelector('.horizontal-filter');
        if (horizontal) {
          const collapsible = document.querySelectorAll('collapsible-block');
          collapsible.forEach((e) => {
            e.classList.add('active');
          });
        }
      }
    },

    ionRangeSlider: function () {
      const price_range = document.querySelector('.price-range');
      const maxRange = document.querySelector(
        options_collection.rangeSliderMax
      );
      const minRange = document.querySelector(
        options_collection.rangeSliderMin
      );
      const minPrice = document.querySelector('.min-price-range');
      const maxPrice = document.querySelector('.max-price-range');
      var minPriceRange = 0;
      var maxPriceRange = 0;
      if (!price_range) return;
      document.querySelector(options_collection.minPriceRange).addEventListener(
        'change',
        (event) => {
          event.preventDefault();
          const target = event.currentTarget;
          target.value = target.value.replace(',', '');
          if (Number(minRange.min) + Number(target.value) >= 0) {
            if (Number(target.value) > Number(maxRange.max)) {
              minPrice.value = Number(maxRange.max);
            } else {
              minPrice.value = Number(target.value);
            }
          } else {
            minPrice.value = Number(minRange.min);
          }
          const formData = new FormData(
            document.querySelector(options_collection.collectionFiltersForm)
          );
          const params = new URLSearchParams(formData).toString();
          const nameMin = minPrice.getAttribute('name');
          const nameMax = maxPrice.getAttribute('name');
          var queryString = window.location.search;
          queryString = this.removeParam(nameMin, queryString);
          queryString = this.removeParam(nameMax, queryString);
          var searchParams = queryString.replace('?', '') + '&' + params;
          const url = this.renderUrl(searchParams);
          this.renderSectionFilter(url, searchParams);
        },
        false
      );
      document.querySelector(options_collection.maxPriceRange).addEventListener(
        'change',
        (event) => {
          event.preventDefault();
          const target = event.currentTarget;
          target.value = target.value.replace(',', '');
          if (Number(maxRange.max) - Number(target.value) >= 0) {
            maxPrice.value = Number(target.value);
          } else {
            maxPrice.value = Number(maxRange.max);
          }
          const formData = new FormData(
            document.querySelector(options_collection.collectionFiltersForm)
          );
          const params = new URLSearchParams(formData).toString();
          const nameMin = minPrice.getAttribute('name');
          const nameMax = maxPrice.getAttribute('name');
          var queryString = window.location.search;
          queryString = this.removeParam(nameMin, queryString);
          queryString = this.removeParam(nameMax, queryString);
          var searchParams = queryString.replace('?', '') + '&' + params;
          const url = this.renderUrl(searchParams);
          this.renderSectionFilter(url, searchParams);
        },
        false
      );
      document
        .querySelector(options_collection.rangeSliderMin)
        .addEventListener(
          'input',
          (event) => {
            event.preventDefault();
            const target = event.currentTarget;
            if (Number(maxRange.value) - Number(target.value) >= 1) {
              minPrice.value = Number(target.value);
              minPriceRange = Number(target.value) * 100;
            } else {
              target.value = Number(maxRange.value) - 1;
              minPriceRange = (Number(maxRange.value) - 1) * 100;
            }
            const price_format = Shopify.formatMoney(
              minPriceRange,
              cartStrings.money_format
            );
            document.querySelector('.price-lable .min').innerHTML =
              price_format;
            target
              .closest('.price-range')
              .style.setProperty(
                '--range-from',
                (minRange.value / Number(target.getAttribute('max'))) * 100 +
                  '%'
              );
          },
          false
        );
      document
        .querySelector(options_collection.rangeSliderMax)
        .addEventListener(
          'input',
          (event) => {
            event.preventDefault();
            const target = event.currentTarget;
            if (target.value - minRange.value >= 1) {
              maxPrice.value = target.value;
              maxPriceRange = Number(target.value) * 100;
            } else {
              target.value = Number(minRange.value) + Number(1);
              maxPriceRange = (Number(minRange.value) + Number(1)) * 100;
            }
            const price_format = Shopify.formatMoney(
              maxPriceRange,
              cartStrings.money_format
            );
            document.querySelector('.price-lable .max').innerHTML =
              price_format;
            target
              .closest('.price-range')
              .style.setProperty(
                '--range-to',
                (maxRange.value / Number(target.getAttribute('max'))) * 100 +
                  '%'
              );
          },
          false
        );
      document
        .querySelectorAll(options_collection.rangeSlider)
        .forEach((sliderRange) => {
          sliderRange.addEventListener(
            'change',
            (event) => {
              event.preventDefault();
              const target = event.currentTarget;
              const formData = new FormData(
                document.querySelector(options_collection.collectionFiltersForm)
              );
              const params = new URLSearchParams(formData).toString();
              const nameMin = minPrice.getAttribute('name');
              const nameMax = maxPrice.getAttribute('name');
              var queryString = window.location.search;
              queryString = this.removeParam(nameMin, queryString);
              queryString = this.removeParam(nameMax, queryString);
              var searchParams = queryString.replace('?', '') + '&' + params;
              const url = this.renderUrl(searchParams);
              this.renderSectionFilter(url, searchParams);
            },
            false
          );
        });
    },

    removeParam: function (key, sourceURL) {
      var rtn = sourceURL.split('?')[0],
        param,
        params_arr = [],
        queryString =
          sourceURL.indexOf('?') !== -1 ? sourceURL.split('?')[1] : '';
      if (queryString !== '') {
        params_arr = queryString.split('&');
        for (var i = params_arr.length - 1; i >= 0; i -= 1) {
          param = params_arr[i].split('=')[0];
          if (param === key) {
            params_arr.splice(i, 1);
          }
        }
        if (params_arr.length) rtn = rtn + '?' + params_arr.join('&');
      }
      return rtn;
    },

    renderUrl: function (searchParams) {
      const sectionId = document.querySelector(options_collection.section)
        .dataset.sectionId;
      const url = `${window.location.pathname}?section_id=${sectionId}&${searchParams}`;
      return url;
    },

    renderSectionFilter: function (url, searchParams) {
      // A newer filter, sort or view choice cancels the request still in
      // flight, so a slow older response can never paint over a newer one.
      if (this._filterRequest) this._filterRequest.abort();
      const request = (this._filterRequest = new AbortController());
      const isCurrent = () => this._filterRequest === request;
      this.toggleLoading(document.body, true);
      const grid_list = document.querySelector('grid-list')
      grid_list?.hideGridItems?.();
      fetch(`${url}`, { signal: request.signal })
        .then((response) => {
          if (!response.ok) {
            var error = new Error(response.status);
            throw error;
          }
          return response.text();
        })
        .then((responseText) => {
          if (!isCurrent()) return;
          if (window.innerWidth <= 1024) {
            const collectionFilterBlocks = new DOMParser()
              .parseFromString(responseText, 'text/html')
              .querySelector(options_collection.collectionFilterBlocks);
            document.querySelector(
              options_collection.collectionFilterBlocks
            ).innerHTML = collectionFilterBlocks.innerHTML;
            const productgridcontainer = new DOMParser()
              .parseFromString(responseText, 'text/html')
              .querySelector(options_collection.productgridcontainer);
            document.querySelector(
              options_collection.productgridcontainer
            ).innerHTML = productgridcontainer.innerHTML;
            if (
              document
                .querySelector(options_collection.collectionSidebar)
                .classList.contains('open')
            ) {
              document.querySelector(options_collection.collectionSidebar).classList.remove('open')
            }
          } else {
            const newSection = new DOMParser()
              .parseFromString(responseText, 'text/html')
              .querySelector(options_collection.section);
            document
              .querySelector(options_collection.section)
              .replaceWith(newSection);
          }
          document.documentElement.classList.remove('hside_opened', 'open-drawer', 'open-sidebar');
          const sectionElement = document.querySelector(
            '#productgridcontainer'
          );
          
          if (sectionElement) {
            const elementPosition = sectionElement.getBoundingClientRect().top;
            const offsetPosition = window.pageYOffset;
            const extraOffset = 100;
            const scrollToPosition =
              elementPosition + offsetPosition - extraOffset;
            window.scrollTo({
              top: scrollToPosition,
              behavior: 'smooth',
            });
          }
        })
        .catch((error) => {
          if (error && error.name === 'AbortError') return;
          throw error;
        })
        .finally(() => {
          if (!isCurrent()) return;
          this._filterRequest = null;
          // Always clear the loading bar — even when the fetch errored, so the
          // animated body.loading::after progress bar can't get stranded.
          eventCollectionShopify.toggleLoading(document.body, false);
          // After the section is replaced, the original `grid_list` reference
          // points at a detached element. Re-query so showGridItems() actually
          // reveals products in the current DOM. Also force-refresh any lazy
          // images whose src wasn't materialised during the re-render (this
          // fixes occasional blank product tiles after a filter change).
          const fresh_grid_list = document.querySelector('grid-list');
          if (fresh_grid_list && typeof fresh_grid_list.showGridItems === 'function') {
            fresh_grid_list.showGridItems();
          }
          if (typeof initLazyloadItem === 'function') initLazyloadItem();
          if (typeof BlsLazyloadImg !== 'undefined' && BlsLazyloadImg.init) {
            BlsLazyloadImg.init(fresh_grid_list || document);
          }
          // Safety net — hydrate any <img> still holding a data-src/data-srcset
          // without a matching src. Runs after the browser paints so we don't
          // race the lazy-load observer.
          requestAnimationFrame(() => {
            document.querySelectorAll('#productgridcontainer img').forEach((img) => {
              const dataSrc = img.getAttribute('data-src');
              const dataSrcset = img.getAttribute('data-srcset');
              if (dataSrcset && !img.getAttribute('srcset')) {
                img.setAttribute('srcset', dataSrcset);
              }
              if (dataSrc && (!img.getAttribute('src') || img.getAttribute('src') === '')) {
                img.setAttribute('src', dataSrc);
              }
              img.classList.add('loaded', 'lazyloaded');
            });
          });
          eventCollectionShopify.ionRangeSlider();
        });
      this.updateUrl(url, searchParams);
    },

    toggleLoading: function (event, loading) {
      if (event) {
        if (loading) {
          event.classList.add('start', 'loading');
        } else {
          event.classList.add('finish');
          setTimeout(function () {
            event.classList.remove('start', 'loading', 'finish');
          }, 500);
        }
      }
    },

    updateUrl: function (url, searchParams = false) {
      if (searchParams) {
        const urlUpdate = `${window.location.pathname}?${searchParams}`;
        window.history.pushState({ url: urlUpdate }, '', urlUpdate);
      } else {
        window.history.pushState({ url: url }, '', url);
      }
    },
  };
})();
eventCollectionShopify.init();

/* ==========================================================================
   Bottom-sheet drag-to-dismiss — filter sidebar + Sort By on mobile.
   iOS-style real-time finger tracking via a dedicated .sheet-grab-area at
   the top of each sheet. Unified pointer/touch handling so drag works on
   every mobile device. Release past threshold → close; else snap back.
   ========================================================================== */
(function bindBottomSheetDrag() {
  const DRAG_THRESHOLD = 80;       // px beyond which release will close the sheet
  const VELOCITY_THRESHOLD = 0.5;  // px/ms — a flick closes regardless of distance
  const MAX_WIDTH = 1024.98;

  function isMobile() {
    return window.matchMedia(`(max-width: ${MAX_WIDTH}px)`).matches;
  }

  function ensureGrabArea(container) {
    if (!container) return null;
    let zone = container.querySelector(':scope > .sheet-grab-area');
    if (!zone) {
      zone = document.createElement('div');
      zone.className = 'sheet-grab-area';
      zone.setAttribute('aria-hidden', 'true');
      container.prepend(zone);
    }
    return zone;
  }

  function ensureBackdrop() {
    let bd = document.querySelector('.collection-filter-backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.className = 'collection-filter-backdrop';
      document.body.appendChild(bd);
    }
    return bd;
  }

  /* --- Filter sidebar bottom sheet ------------------------------------- */
  function initFilterSheet() {
    const sheet = document.getElementById('CollectionSidebar');
    if (!sheet) return;
    const grab = ensureGrabArea(sheet);
    const backdrop = ensureBackdrop();

    // Sync backdrop visibility with .open class on the sheet (MutationObserver
    // so it tracks whether BtnFilter/CloseFilter/drag-close toggles the class).
    if (!sheet.dataset.filterObserverBound) {
      sheet.dataset.filterObserverBound = '1';
      const syncBackdrop = () => {
        if (!isMobile()) { backdrop.classList.remove('open'); return; }
        if (sheet.classList.contains('open')) backdrop.classList.add('open');
        else backdrop.classList.remove('open');
      };
      new MutationObserver(syncBackdrop).observe(sheet, { attributes: true, attributeFilter: ['class'] });
      syncBackdrop();

      // Click-away on backdrop → smooth close
      backdrop.addEventListener('click', () => {
        if (!sheet.classList.contains('open')) return;
        sheet.style.setProperty('--sheet-drag-y', '0px');
        sheet.classList.remove('open');
        document.documentElement.classList.remove('open-drawer', 'open-sidebar');
        const btnFilter = document.querySelector('.btn-filter');
        if (btnFilter) btnFilter.classList.remove('open');
        if (typeof root !== 'undefined' && root.style) root.style.removeProperty('padding-right');
      });
    }

    if (!grab || grab.dataset.sheetBound === '1') return;
    grab.dataset.sheetBound = '1';

    let startY = 0, currentY = 0, startTime = 0, dragging = false;

    const onStart = (e) => {
      if (!isMobile() || !sheet.classList.contains('open')) return;
      const touchY = e.touches ? e.touches[0].clientY : e.clientY;
      dragging = true;
      startY = currentY = touchY;
      startTime = Date.now();
      sheet.classList.add('sheet-dragging');
    };
    const onMove = (e) => {
      if (!dragging) return;
      const touchY = e.touches ? e.touches[0].clientY : e.clientY;
      currentY = touchY;
      const delta = Math.max(0, currentY - startY);
      sheet.style.setProperty('--sheet-drag-y', delta + 'px');
      if (delta > 0 && e.cancelable) e.preventDefault();
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      const delta = Math.max(0, currentY - startY);
      const velocity = delta / Math.max(Date.now() - startTime, 1);
      sheet.classList.remove('sheet-dragging');
      if (delta > DRAG_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
        sheet.style.setProperty('--sheet-drag-y', '0px');
        sheet.classList.remove('open');
        document.documentElement.classList.remove('open-drawer', 'open-sidebar');
        const btnFilter = document.querySelector('.btn-filter');
        if (btnFilter) btnFilter.classList.remove('open');
        if (typeof root !== 'undefined' && root.style) root.style.removeProperty('padding-right');
      } else {
        sheet.style.setProperty('--sheet-drag-y', '0px');
      }
    };

    grab.addEventListener('touchstart', onStart, { passive: true });
    grab.addEventListener('touchmove', onMove, { passive: false });
    grab.addEventListener('touchend', onEnd, { passive: true });
    grab.addEventListener('touchcancel', onEnd, { passive: true });
    grab.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') return; onStart(e); grab.setPointerCapture(e.pointerId); });
    grab.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; onMove(e); });
    grab.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') return; onEnd(e); });
    grab.addEventListener('pointercancel', (e) => { if (e.pointerType === 'touch') return; onEnd(e); });
  }

  /* --- Sort By bottom sheet -------------------------------------------- */
  function initSortSheet() {
    const wrap = document.querySelector('.toolbar-sorter .select-custom');
    if (!wrap) return;
    const content = wrap.querySelector('.select-custom__content');
    if (!content) return;
    const grab = ensureGrabArea(content);
    if (!grab || grab.dataset.sheetBound === '1') {
      // Click-away handler bound once regardless
      if (wrap.dataset.clickAwayBound !== '1') {
        wrap.dataset.clickAwayBound = '1';
        document.addEventListener('click', (e) => {
          if (!isMobile() || !wrap.classList.contains('active')) return;
          if (content.contains(e.target)) return;
          if (wrap.querySelector('select-sorter')?.contains(e.target)) return;
          closeSort();
        });
      }
      return;
    }
    grab.dataset.sheetBound = '1';

    let startY = 0, currentY = 0, startTime = 0, dragging = false;

    function closeSort() {
      wrap.classList.remove('active');
      content.style.setProperty('--sheet-drag-y', '0px');
    }

    const onStart = (e) => {
      if (!isMobile() || !wrap.classList.contains('active')) return;
      const touchY = e.touches ? e.touches[0].clientY : e.clientY;
      dragging = true;
      startY = currentY = touchY;
      startTime = Date.now();
      wrap.classList.add('sheet-dragging');
    };
    const onMove = (e) => {
      if (!dragging) return;
      const touchY = e.touches ? e.touches[0].clientY : e.clientY;
      currentY = touchY;
      const delta = Math.max(0, currentY - startY);
      content.style.setProperty('--sheet-drag-y', delta + 'px');
      if (delta > 0 && e.cancelable) e.preventDefault();
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      const delta = Math.max(0, currentY - startY);
      const velocity = delta / Math.max(Date.now() - startTime, 1);
      wrap.classList.remove('sheet-dragging');
      if (delta > DRAG_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
        closeSort();
      } else {
        content.style.setProperty('--sheet-drag-y', '0px');
      }
    };

    grab.addEventListener('touchstart', onStart, { passive: true });
    grab.addEventListener('touchmove', onMove, { passive: false });
    grab.addEventListener('touchend', onEnd, { passive: true });
    grab.addEventListener('touchcancel', onEnd, { passive: true });
    grab.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') return; onStart(e); grab.setPointerCapture(e.pointerId); });
    grab.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; onMove(e); });
    grab.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') return; onEnd(e); });
    grab.addEventListener('pointercancel', (e) => { if (e.pointerType === 'touch') return; onEnd(e); });

    // Click-away on the dimmed area (outside sheet) closes it
    if (wrap.dataset.clickAwayBound !== '1') {
      wrap.dataset.clickAwayBound = '1';
      document.addEventListener('click', (e) => {
        if (!isMobile() || !wrap.classList.contains('active')) return;
        if (content.contains(e.target)) return;
        if (wrap.querySelector('select-sorter')?.contains(e.target)) return;
        closeSort();
      });
    }
  }

  function initAll() {
    initFilterSheet();
    initSortSheet();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  // Re-bind after filter form re-renders (sidebar HTML replaced).
  document.addEventListener('shopify:section:load', initAll);
  window.addEventListener('pageshow', initAll);
})();

/* ==========================================================================
   Facets: filters, sort, active pills and pages of the search and collection
   sections (<facets-root>, drawn by snippets/facets-toolbar and
   snippets/facets-panel). Every control is a link or a GET form that works
   without this script; with it, a choice fetches the section alone
   (?section_id=), swaps the parts marked data-facets-part in place, and
   records the address with history.pushState so Back and Forward walk the
   choices. The sort list and the filter drawer are popovers: the browser
   opens and closes them; this only places the sort list under its button on
   a computer.
   ========================================================================== */
(function facets() {
  if (customElements.get('facets-root')) return;
  const SORT_DROPDOWN = '(min-width: 750px)';
  const cssEscape = (value) => (window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&'));
  let request = null;

  class FacetsRoot extends HTMLElement {
    connectedCallback() {
      if (this._bound) {
        this.markSort();
        return;
      }
      this._bound = true;
      this.onClick = this.onClick.bind(this);
      this.onKeydown = this.onKeydown.bind(this);
      this.onSubmit = this.onSubmit.bind(this);
      this.onChange = this.onChange.bind(this);
      this.onToggle = this.onToggle.bind(this);
      this.placeSortPanel = this.placeSortPanel.bind(this);
      this.addEventListener('click', this.onClick);
      this.addEventListener('keydown', this.onKeydown);
      this.addEventListener('submit', this.onSubmit);
      this.addEventListener('change', this.onChange);
      // toggle does not bubble: listen while it passes down to the popover.
      this.addEventListener('toggle', this.onToggle, true);
      this.addEventListener(
        'beforetoggle',
        (event) => {
          if (event.newState === 'open' && event.target.hasAttribute && event.target.hasAttribute('data-facets-sort-panel')) {
            this.placeSortPanel();
          }
        },
        true
      );
      this.markSort();
      this.showClearFallback();
      // A row of dropdowns on a computer is a drawer on a phone: open its
      // panels there as the section's Default state says.
      if (this.querySelector('.facets-panel--horizontal') && !this.dropdownRow) {
        this.querySelectorAll('details[data-facets-group][data-open-default]').forEach((group) => {
          group.open = true;
        });
      }
      if (!history.state || !history.state.facets) {
        try {
          history.replaceState(Object.assign({}, history.state, { facets: this.sectionId }), '', location.href);
        } catch (error) {}
      }
    }

    disconnectedCallback() {
      document.documentElement.classList.remove('facets-locked');
      this.unwatchSortPanel();
    }

    get sectionId() {
      return this.dataset.sectionId;
    }

    get path() {
      return this.dataset.facetsPath || location.pathname;
    }

    onClick(event) {
      if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const sort = event.target.closest('a[data-facets-sort]');
      if (sort && this.contains(sort)) {
        event.preventDefault();
        const panel = sort.closest('[popover]');
        if (panel && panel.matches(':popover-open')) panel.hidePopover();
        if (sort.getAttribute('aria-current') === 'true') return;
        const url = new URL(location.href);
        url.searchParams.set('sort_by', sort.dataset.facetsSort);
        url.searchParams.delete('page');
        this.markSort(sort.dataset.facetsSort);
        this.go(url.href, { focus: '[data-facets-sort-trigger]' });
        return;
      }
      const link = event.target.closest('a[data-facets-link]');
      if (link && this.contains(link)) {
        event.preventDefault();
        if (link.getAttribute('aria-disabled') === 'true') return;
        // Show the choice at once (the box, the count on the Filter button);
        // the section's fresh markup then confirms it.
        if (link.getAttribute('role') === 'checkbox') {
          const on = link.getAttribute('aria-checked') !== 'true';
          link.setAttribute('aria-checked', String(on));
          this.bumpBadge(on ? 1 : -1);
        } else if (link.matches('.facets-pill:not(.facets-pill--clear)')) {
          this.bumpBadge(-1);
        } else if (link.matches('.facets-pill--clear, .facets-panel__clear, .facets-empty__action, .facets-empty__clear')) {
          this.bumpBadge(-Infinity);
        }
        this.go(link.href);
        return;
      }
      const page = event.target.closest('.pagination a[href]');
      if (page && this.contains(page)) {
        event.preventDefault();
        this.go(page.href, { scroll: true });
      }
    }

    onKeydown(event) {
      if (event.key === 'Escape' && this.dropdownRow) {
        const open = event.target.closest('details[data-facets-group][open]');
        if (open) {
          open.open = false;
          open.querySelector('summary').focus();
        }
        return;
      }
      if (event.key !== ' ' && event.key !== 'Spacebar') return;
      const box = event.target.closest('a[role="checkbox"]');
      if (!box || !this.contains(box)) return;
      event.preventDefault();
      box.click();
    }

    onSubmit(event) {
      const form = event.target.closest('form[data-facets-price]');
      if (!form || !this.contains(form)) return;
      event.preventDefault();
      const url = new URL(location.href);
      url.searchParams.delete('page');
      form.querySelectorAll('input[name]:not([type="hidden"])').forEach((input) => {
        const value = String(input.value || '').trim().replace(',', '.');
        if (value === '' || Number.isNaN(Number(value))) url.searchParams.delete(input.name);
        else url.searchParams.set(input.name, String(Math.max(0, Number(value))));
      });
      this.go(url.href);
    }

    onChange(event) {
      const input = event.target.closest('form[data-facets-price] input');
      if (!input || !this.contains(input)) return;
      const form = input.form;
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }

    /* The row of dropdowns on a computer: one open at a time, closed by a
       click outside it or Escape. */
    get dropdownRow() {
      return window.matchMedia('(min-width: 1025px)').matches && this.querySelector('.facets-panel--horizontal');
    }

    closeDropdowns(except) {
      this.querySelectorAll('.facets-panel--horizontal details[data-facets-group][open]').forEach((group) => {
        if (group !== except) group.open = false;
      });
    }

    onToggle(event) {
      if (event.target.matches && event.target.matches('details[data-facets-group]')) {
        if (event.target.open && this.dropdownRow) {
          this.closeDropdowns(event.target);
          if (!this._outside) {
            this._outside = (e) => {
              if (!this.isConnected) return document.removeEventListener('pointerdown', this._outside, true);
              const inside = e.target.closest && e.target.closest('.facets-panel--horizontal details[data-facets-group]');
              if (!inside || !this.contains(inside)) this.closeDropdowns();
            };
            document.addEventListener('pointerdown', this._outside, true);
          }
        }
        return;
      }
      const pop = event.target;
      if (!(pop instanceof HTMLElement) || !pop.hasAttribute('popover') || !this.contains(pop)) return;
      const open = event.newState === 'open';
      this.querySelectorAll(`[popovertarget="${cssEscape(pop.id)}"]:not([popovertargetaction="hide"])`).forEach((button) => {
        button.setAttribute('aria-expanded', String(open));
      });
      if (pop.hasAttribute('data-facets-sort-panel')) {
        if (open) {
          this.placeSortPanel();
          this.watchSortPanel();
          const current = pop.querySelector('[aria-current="true"]') || pop.querySelector('a[data-facets-sort]');
          if (current) current.focus({ preventScroll: true });
        } else {
          this.unwatchSortPanel();
        }
      }
      if (pop.hasAttribute('data-facets-panel')) {
        document.documentElement.classList.toggle('facets-locked', open);
      }
    }

    get sortPanel() {
      return this.querySelector('[data-facets-sort-panel]');
    }

    placeSortPanel() {
      const panel = this.sortPanel;
      const trigger = this.querySelector('[data-facets-sort-trigger]');
      if (!panel || !trigger) return;
      if (!window.matchMedia(SORT_DROPDOWN).matches) {
        panel.style.removeProperty('top');
        panel.style.removeProperty('left');
        panel.style.removeProperty('width');
        panel.removeAttribute('data-placed');
        return;
      }
      // Placed before it is drawn (beforetoggle), so it never shows anywhere
      // else first: the end edges line up, which needs no measuring.
      const box = trigger.getBoundingClientRect();
      const rtl = getComputedStyle(this).direction === 'rtl';
      const width = Math.round(Math.max(box.width, 240));
      const height = panel.offsetHeight;
      let left = rtl ? box.left : box.right - width;
      left = Math.min(Math.max(8, left), Math.max(8, document.documentElement.clientWidth - width - 8));
      let top = box.bottom + 6;
      if (height && top + height > window.innerHeight - 8 && box.top - height - 6 > 8) top = box.top - height - 6;
      panel.style.width = `${width}px`;
      panel.style.top = `${Math.round(top)}px`;
      panel.style.left = `${Math.round(left)}px`;
      panel.setAttribute('data-placed', '');
    }

    watchSortPanel() {
      window.addEventListener('scroll', this.placeSortPanel, { passive: true });
      window.addEventListener('resize', this.placeSortPanel, { passive: true });
    }

    unwatchSortPanel() {
      window.removeEventListener('scroll', this.placeSortPanel);
      window.removeEventListener('resize', this.placeSortPanel);
    }

    /* The option the address asks for is the current one, whatever the
       platform printed (a search page may not echo sort_by back). */
    markSort(value) {
      const options = this.querySelectorAll('a[data-facets-sort]');
      if (!options.length) return;
      const wanted = value || new URL(location.href).searchParams.get('sort_by');
      const match = wanted && [...options].find((option) => option.dataset.facetsSort === wanted);
      if (!match) return;
      options.forEach((option) => {
        if (option === match) option.setAttribute('aria-current', 'true');
        else option.removeAttribute('aria-current');
      });
      const current = this.querySelector('[data-facets-part="sort-current"]');
      if (current) current.textContent = match.textContent.trim();
    }

    bumpBadge(delta) {
      const badge = this.querySelector('[data-facets-part="badge"]');
      if (!badge) return;
      const next = Math.max(0, (parseInt(badge.textContent, 10) || 0) + delta);
      badge.textContent = next > 0 ? String(next) : '';
    }

    showClearFallback() {
      const fallback = this.querySelector('[data-facets-clear-fallback]');
      if (!fallback) return;
      const params = new URL(location.href).searchParams;
      fallback.hidden = ![...params.keys()].some((key) => key.startsWith('filter.'));
    }

    async go(href, options = {}) {
      const { push = true, focus = null, scroll = false } = options;
      const url = new URL(href, location.href);
      url.searchParams.delete('section_id');
      const fetchUrl = new URL(url.href);
      fetchUrl.searchParams.set('section_id', this.sectionId);
      if (request) request.abort();
      const mine = (request = new AbortController());
      this.setBusy(true);
      try {
        const response = await fetch(fetchUrl.href, {
          signal: mine.signal,
          headers: { Accept: 'text/html' },
          credentials: 'same-origin',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        if (mine !== request) return;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const next =
          doc.querySelector(`facets-root[data-section-id="${cssEscape(this.sectionId)}"]`) ||
          doc.querySelector('facets-root');
        if (!next) throw new Error('No facets in the response');
        const target = url.pathname + url.search + url.hash;
        if (push && target !== location.pathname + location.search + location.hash) {
          history.pushState({ facets: this.sectionId }, '', target);
        }
        this.swap(next, { focus, scroll });
      } catch (error) {
        if (error && error.name === 'AbortError') return;
        // The page itself always answers: fall back to loading it.
        if (push) location.assign(url.href);
      } finally {
        if (mine === request) {
          request = null;
          this.setBusy(false);
        }
      }
    }

    setBusy(busy) {
      this.classList.toggle('is-loading', busy);
      if (busy) this.setAttribute('aria-busy', 'true');
      else this.removeAttribute('aria-busy');
    }

    swap(next, { focus = null, scroll = false } = {}) {
      // A new layout (filters appear or go, results appear or go): replace it all.
      if ((next.dataset.facetsShape || '') !== (this.dataset.facetsShape || '')) {
        const panel = this.querySelector('[data-facets-panel]');
        const reopen = panel && panel.matches(':popover-open');
        this.replaceWith(next);
        if (reopen) {
          const nextPanel = next.querySelector('[data-facets-panel]');
          try { nextPanel && nextPanel.showPopover(); } catch (error) {}
        }
        next.afterSwap(null, scroll);
        return;
      }
      const active = document.activeElement;
      const key = focus || (active && this.contains(active) && active.dataset.facetsKey ? `[data-facets-key="${cssEscape(active.dataset.facetsKey)}"]` : null);
      const groups = new Map();
      this.querySelectorAll('details[data-facets-group]').forEach((group) => groups.set(group.dataset.facetsGroup, group.open));
      const results = this.querySelector('[data-facets-part="results"]');
      if (results) this.holdHeight(results);
      next.querySelectorAll('[data-facets-part]').forEach((part) => {
        const here = this.querySelector(`[data-facets-part="${cssEscape(part.dataset.facetsPart)}"]`);
        if (here) here.innerHTML = part.innerHTML;
      });
      this.querySelectorAll('details[data-facets-group]').forEach((group) => {
        if (groups.has(group.dataset.facetsGroup)) group.open = groups.get(group.dataset.facetsGroup);
      });
      this.afterSwap(key, scroll);
    }

    afterSwap(key, scroll) {
      this.markSort();
      this.showClearFallback();
      if (key) {
        const target = this.querySelector(key);
        if (target) target.focus({ preventScroll: true });
      }
      const grid = this.closest('grid-list');
      if (grid && typeof grid.showGridItems === 'function') grid.showGridItems();
      try {
        if (typeof initLazyloadItem === 'function') initLazyloadItem();
        if (typeof BlsLazyloadImg !== 'undefined' && BlsLazyloadImg.init) BlsLazyloadImg.init(this);
      } catch (error) {}
      if (scroll) {
        const top = this.getBoundingClientRect().top + window.scrollY - 100;
        if (window.scrollY > top) window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
      this.dispatchEvent(new CustomEvent('facets:updated', { bubbles: true }));
    }

    /* Keep the results' height until the visitor next touches the page, so
       fewer results never pull the footer up under them. */
    holdHeight(results) {
      results.style.minHeight = `${results.offsetHeight}px`;
      const release = () => {
        results.style.removeProperty('min-height');
        document.removeEventListener('pointerdown', release, true);
        document.removeEventListener('keydown', release, true);
      };
      document.addEventListener('pointerdown', release, true);
      document.addEventListener('keydown', release, true);
    }
  }
  customElements.define('facets-root', FacetsRoot);

  window.addEventListener('popstate', () => {
    document.querySelectorAll('facets-root').forEach((root) => {
      if (location.pathname.replace(/\/$/, '') === root.path.replace(/\/$/, '')) root.go(location.href, { push: false });
    });
  });
})();

/* Materia: the Sort by sheet on phones follows the finger like the theme's
   other bottom sheets (shared materiaSheetDrag in materia-experience.js):
   pull it down from its grabber or title, or from the list at its top. */
(() => {
  if (window.__materiaFacetsSortDrag) return;
  const bind = () => {
    if (window.__materiaFacetsSortDrag || typeof window.materiaSheetDrag !== 'function') return;
    window.__materiaFacetsSortDrag = true;
    const phone = () => window.matchMedia('(max-width: 749.98px)').matches;
    window.materiaSheetDrag({
      root: document,
      sheet: (target) => {
        const sheet = target.closest && target.closest('[data-facets-sort-panel]');
        return sheet && phone() && sheet.matches(':popover-open') ? sheet : null;
      },
      handle: (target) => !!(target.closest && target.closest('.facets-sheet__head') && !target.closest('.facets-sheet__close')),
      blocked: (target) => !!(target.closest && target.closest('.facets-sheet__close')),
      progress: (sheet, p, dragging) => {
        if (dragging || p > 0) sheet.style.setProperty('--sheet-pull', p.toFixed(3));
        else sheet.style.removeProperty('--sheet-pull');
      },
      dismiss: (sheet) => {
        // Already off screen: close without the slide out, then reset.
        sheet.classList.add('is-drag-closed');
        sheet.hidePopover();
        sheet.style.removeProperty('--sheet-pull');
      },
    });
    document.addEventListener(
      'beforetoggle',
      (event) => {
        if (event.newState === 'open' && event.target.hasAttribute && event.target.hasAttribute('data-facets-sort-panel')) {
          event.target.classList.remove('is-drag-closed');
        }
      },
      true
    );
  };
  bind();
  if (!window.__materiaFacetsSortDrag) document.addEventListener('DOMContentLoaded', bind, { once: true });
})();

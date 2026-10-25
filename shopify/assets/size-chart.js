/* Assigned chart values, including converted ranges and non-measurement
   columns, come from Storelib. Never guess garment measurements here. */
(() => {
  const key = 'materia:size-chart-unit';
  const charts = root => [...(root?.querySelectorAll?.('[data-mt-size-chart]') || [])];
  const sectionOf = chart => chart.closest('.shopify-section, [data-section-id]') || document;
  const highlight = (chart, value) => {
    chart.querySelectorAll('tbody tr').forEach(row => {
      const selected = !!value && row.cells[0]?.textContent.trim().toLowerCase() === value.trim().toLowerCase();
      if (selected) row.setAttribute('aria-current','true');
      else row.removeAttribute('aria-current');
    });
  };
  const isSize = (input, chart) => {
    const label = (input.name || '') + ' ' + (input.closest('fieldset')?.querySelector('legend,.form__label')?.textContent || '');
    return (chart.dataset.sizeTriggers || 'Size').split(',').some(name => name.trim() && label.toLowerCase().includes(name.trim().toLowerCase()));
  };
  const init = root => charts(root).forEach(chart => {
    let preferred;
    try { preferred = localStorage.getItem(key); } catch (_) {}
    const unit = chart.querySelector(`.mt-size-chart__units input[value="${preferred === 'in' ? 'in' : 'cm'}"]`);
    if (preferred && unit) unit.checked = true;
    const selected = [...sectionOf(chart).querySelectorAll('select,input[type="radio"]:checked')].find(input => !chart.contains(input) && isSize(input,chart));
    if (selected) highlight(chart,selected.value);
  });
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.matches('.mt-size-chart__units input')) {
      if (!['cm','in'].includes(input.value)) return;
      try { localStorage.setItem(key,input.value); } catch (_) {}
      charts(document).forEach(chart => {
        const unit = chart.querySelector(`.mt-size-chart__units input[value="${input.value}"]`);
        if (unit) unit.checked = true;
      });
    } else if (input.matches('select,input[type="radio"]')) {
      charts(document).forEach(chart => { if (sectionOf(chart).contains(input) && isSize(input,chart)) highlight(chart,input.value); });
    }
  });
  ['storelib:section-load','shopify:section:load'].forEach(name => document.addEventListener(name,event=>init(event.target)));
  init(document);
})();

/* Materia Themes. Size charts on the product page and in Featured product.
   - The chart Storelib gives a product (Products > Size charts) is drawn on
     the server by snippets/product-size-chart-content. When its data came
     in a shape the server could not read, it is drawn here from the JSON
     next to it. Values come from Storelib; never guess measurements here.
   - A product's chart only reaches its own page, so a Featured product's
     size guide asks that page for it ([data-size-chart-remote], answered by
     sections/size-chart-data) and shows its link once a chart arrives.
   - The cm / in switch is remembered, and the row for the chosen size is
     marked. */
(() => {
  const key = 'materia:size-chart-unit';
  let sequence = 0;
  const normalize = raw => {
    for (let i=0;i<4;i++) {
      if (typeof raw === 'string') { try { raw=JSON.parse(raw); } catch (_) { return null; } }
      else if (raw?.value != null) raw=raw.value;
      else if (raw?.chart && !raw.columns) raw=raw.chart;
      else break;
    }
    return raw && typeof raw === 'object' ? raw : null;
  };
  const isMeasure = (col,i) => col && typeof col === 'object'
    ? (col.measure===true || col.measurement===true || col.isMeasurement===true || col.convert===true || (i>0 && col.measure==null && col.measurement==null && col.isMeasurement==null && col.convert==null))
    : i>0;
  const hydrate = root => (root?.querySelectorAll?.('[data-assigned-chart-host]') || []).forEach(host => {
    const source=host.querySelector('[data-assigned-chart-source]');
    const payload=source?.dataset.chartJson || source?.textContent;
    if (!source || host._chartSource===payload) return;
    let chart;
    try { chart=normalize(JSON.parse(payload)); } catch (_) { return; }
    const columns=chart?.columns || chart?.headers;
    if (!Array.isArray(columns) || !columns.length) return;
    const columnName=col=>typeof col==='object' ? col.label || col.name || col.key || '' : String(col);
    const rowsOf = rows => {
      if (!Array.isArray(rows)) return [];
      return rows.map(row=>{
        if (Array.isArray(row)) return row;
        if (typeof row==='string') return row.split('|').map(s=>s.trim());
        const values=row?.cells || row?.values;
        if (Array.isArray(values)) return values.length===columns.length-1 ? [row.size || row.label || row.name || '',...values] : values;
        return columns.map((col,i)=>row?.[col.key || col.id || columnName(col)] ?? (i===0 ? row?.size || row?.label || row?.name || '' : ''));
      });
    };
    const rows=rowsOf(chart.rows),cm=rowsOf(chart.rows_cm || chart.tables?.cm?.rows),inch=rowsOf(chart.rows_in || chart.tables?.in?.rows);
    if (!rows.length && !cm.length && !inch.length) return;
    const baseUnit=chart.unit==='in' ? 'in' : chart.unit==='cm' ? 'cm' : '';
    const convert = (value,to) => {
      const m=String(value).trim().match(/^(\d+(?:\.\d+)?)(\s*[-–]\s*(\d+(?:\.\d+)?))?$/);
      if (!m || !baseUnit || to===baseUnit) return String(value);
      const factor=to==='in'?1/2.54:2.54;
      return (Number(m[1])*factor).toFixed(1)+(m[3]?'–'+(Number(m[3])*factor).toFixed(1):'');
    };
    const explicit=columns.some(c=>c && typeof c==='object' && (c.measure===true || c.measurement===true || c.isMeasurement===true || c.convert===true));
    const converted = to => rows.map(row=>row.map((cell,i)=>isMeasure(columns[i],i) ? convert(cell,to) : String(cell ?? '')));
    const both=(cm.length && inch.length) || (baseUnit && chart.has_measurements!==false && explicit && (!chart.units || (chart.units.includes('cm') && chart.units.includes('in'))));
    const box=document.createElement('div');
    box.className='mt-size-chart'+(both?' mt-size-chart--units':'');box.dataset.mtSizeChart='';
    box.dataset.sizeTriggers=host.querySelector('[data-size-triggers]')?.dataset.sizeTriggers || 'Size';
    const name=chart.name || chart.title || '';
    if(name){const title=document.createElement('p');title.className='mt-size-chart__name';const strong=document.createElement('strong');strong.textContent=name;title.append(strong);box.append(title);}
    if(both){
      const controls=document.createElement('div');controls.className='mt-size-chart__units';controls.setAttribute('role','radiogroup');controls.setAttribute('aria-label','Units');
      const group='mt-size-unit-live-'+(++sequence);
      ['cm','in'].forEach(unit=>{const label=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name=group;input.value=unit;input.checked=unit===baseUnit;label.append(input,document.createTextNode(' '+unit));controls.append(label);});
      box.append(controls);
    }
    (both?['cm','in']:['one']).forEach(unit=>{
      const data=unit==='cm'?(cm.length?cm:converted('cm')):unit==='in'?(inch.length?inch:converted('in')):rows.length?rows:cm.length?cm:inch;
      const shownUnit=unit==='one'?(chart.unit||''):unit;
      const scroll=document.createElement('div');scroll.className='mt-size-chart__scroll';scroll.dataset.unit=unit;scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',(name||'Size chart')+(unit==='one'?'':' ('+unit+')'));
      const table=document.createElement('table');table.className='mt-size-chart__table';table.dataset.unit=unit;
      const head=table.createTHead().insertRow();columns.forEach((col,i)=>{const th=document.createElement('th');th.scope='col';th.textContent=columnName(col)+(shownUnit && isMeasure(col,i)?' ('+shownUnit+')':'');head.append(th);});
      const body=table.createTBody();data.forEach(row=>{const tr=body.insertRow();row.forEach((value,i)=>{const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=String(value??'');tr.append(cell);});});
      scroll.append(table);box.append(scroll);
    });
    const noteText=typeof chart.notes==='string'?chart.notes:chart.notes?.value;
    if(noteText){const notes=document.createElement('p');notes.className='mt-size-chart__notes';notes.textContent=noteText;box.append(notes);}
    const existingImage=host.querySelector('.mt-size-chart__image');
    const imageAddress=typeof chart.image==='string'?chart.image:chart.image?.url || chart.image?.src;
    let chartImage;
    try {
      const imageUrl=new URL(imageAddress,location.href);
      if(imageAddress && ['http:','https:'].includes(imageUrl.protocol)) {
        chartImage=document.createElement('img');chartImage.className='mt-size-chart__image';chartImage.src=imageUrl.href;chartImage.alt=name || 'Size chart';chartImage.loading='lazy';chartImage.decoding='async';
        if(chart.image?.width && chart.image?.height){chartImage.width=chart.image.width;chartImage.height=chart.image.height;}
      }
    } catch (_) {}
    if(chartImage || existingImage)box.append(chartImage || existingImage.cloneNode(true));
    if(chart.measuring_guide){
      const guide=document.createElement('div');guide.className='mt-size-chart__guide';
      if(chart.measuring_guide.text){const text=document.createElement('p');text.textContent=chart.measuring_guide.text;guide.append(text);}
      const address=typeof chart.measuring_guide.image==='string'?chart.measuring_guide.image:chart.measuring_guide.image?.url || chart.measuring_guide.image?.src;
      try{const url=new URL(address,location.href);if(address && ['http:','https:'].includes(url.protocol)){const img=document.createElement('img');img.src=url.href;img.alt='';img.loading='lazy';img.decoding='async';img.className='mt-size-chart__image';guide.append(img);}}catch(_){}
      box.append(guide);
    }
    host.replaceChildren(box,source);host._chartSource=payload;
  });

  /* A product's chart from its own page, once per address. */
  const remote = new Map();
  const ask = (url, section) => fetch(url + (url.includes('?') ? '&' : '?') + 'section_id=' + section, {credentials: 'same-origin'})
    .then(r => r.ok ? r.text() : '').then(html => new DOMParser().parseFromString(html || '', 'text/html')).catch(() => null);
  const chartFor = url => {
    if (!remote.has(url)) remote.set(url, ask(url, 'size-chart-data').then(doc => {
      const host = doc?.querySelector('[data-assigned-chart-host]');
      if (host) return host;
      // The data section answered for this product and it has no chart.
      if (doc?.querySelector('[data-size-chart-data][data-product]:not([data-product=""])')) return null;
      return ask(url, 'main').then(page => page?.querySelector('[data-assigned-chart-host]') || null);
    }).catch(() => null));
    return remote.get(url);
  };
  const place = (slot, host) => {
    const root = slot.closest('[data-size-chart-root]') || slot.parentElement;
    const copy = document.importNode(host, true);
    const group = 'mt-size-unit-remote-' + (++sequence);
    copy.querySelectorAll('.mt-size-chart__units input').forEach(input => { input.name = group; });
    slot.replaceChildren(copy);
    slot.hidden = false;
    if (root) {
      root.querySelectorAll('[data-size-chart-fallback]').forEach(el => el.remove());
      root.querySelectorAll('[data-size-chart-preview]').forEach(el => el.remove());
      const id = root.getAttribute('data-size-chart-root');
      // The builder note held the block's attributes (so the block stays
      // selectable): hand them to the size guide before the note goes.
      if (id) document.querySelectorAll('[data-size-chart-preview]').forEach(el => {
        if (el.getAttribute('data-size-chart-preview') !== id) return;
        [...el.attributes].forEach(a => {
          if (!/^(class|style|aria-|data-size-chart|data-editor-preview)/.test(a.name) && !root.hasAttribute(a.name)) root.setAttribute(a.name, a.value);
        });
        el.remove();
      });
      root.querySelectorAll('[data-size-chart-await]').forEach(el => { el.hidden = false; });
      if (root.hasAttribute('data-size-chart-await')) root.hidden = false;
    }
    init(slot);
  };
  const load = slot => {
    if (slot._mtAsked) return;
    slot._mtAsked = true;
    const url = slot.dataset.sizeChartRemote;
    const local = /^\/(?!\/)/.test(url || '') || (url || '').startsWith(location.origin + '/');
    if (!local) return;
    chartFor(url).then(host => { if (host && slot.isConnected) place(slot, host); });
  };
  // Ask when the link (or its block) comes near the screen; a slot in a
  // closed dialog is watched through the block that holds it.
  const watcher = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    watcher.unobserve(entry.target);
    (entry.target._mtSlots || []).forEach(load);
    entry.target._mtSlots = [];
  }), {rootMargin: '800px 0px'}) : null;
  const askRemote = root => (root?.querySelectorAll?.('[data-size-chart-remote]') || []).forEach(slot => {
    if (slot._mtAsked || slot._mtWatched) return;
    const target = [slot.closest('[data-size-chart-root]'), slot.closest('.shopify-section, [data-section-id]')].find(el => el && el.getClientRects().length);
    if (watcher && target) {
      (target._mtSlots = target._mtSlots || []).push(slot);
      slot._mtWatched = true;
      watcher.observe(target);
    } else load(slot);
  });

  const charts = root => [...(root?.querySelectorAll?.('[data-mt-size-chart]') || [])];
  const sectionOf = chart => chart.closest('.shopify-section, [data-section-id]') || document;
  const syncUnit = chart => {
    const unit=chart.querySelector('.mt-size-chart__units input:checked')?.value;
    chart.querySelectorAll('[data-unit]').forEach(el=>{el.hidden=!!unit && el.dataset.unit!=='one' && el.dataset.unit!==unit;});
  };
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
  function init(root) {
    hydrate(root);
    askRemote(root);
    charts(root).forEach(chart => {
      let preferred;
      try { preferred = localStorage.getItem(key); } catch (_) {}
      const unit = chart.querySelector(`.mt-size-chart__units input[value="${preferred === 'in' ? 'in' : 'cm'}"]`);
      if (preferred && unit) unit.checked = true;
      syncUnit(chart);
      const selected = [...sectionOf(chart).querySelectorAll('select,input[type="radio"]:checked')].find(input => !chart.contains(input) && isSize(input,chart));
      if (selected) highlight(chart,selected.value);
    });
  }
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.matches('.mt-size-chart__units input')) {
      if (!['cm','in'].includes(input.value)) return;
      try { localStorage.setItem(key,input.value); } catch (_) {}
      charts(document).forEach(chart => {
        const unit = chart.querySelector(`.mt-size-chart__units input[value="${input.value}"]`);
        if (unit) unit.checked = true;
        syncUnit(chart);
      });
    } else if (input.matches('select,input[type="radio"]')) {
      charts(document).forEach(chart => { if (sectionOf(chart).contains(input) && isSize(input,chart)) highlight(chart,input.value); });
    }
  });
  ['storelib:section-load','shopify:section:load'].forEach(name => document.addEventListener(name,event=>init(event.target && event.target.querySelectorAll ? event.target : document)));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(document));
  else init(document);
})();

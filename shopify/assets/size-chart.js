/* Assigned chart values, including converted ranges and non-measurement
   columns, come from Storelib. Never guess garment measurements here. */
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
        const values=row?.cells || row?.values;
        if (Array.isArray(values)) return values.length===columns.length-1 ? [row.size || row.label || row.name || '',...values] : values;
        return columns.map((col,i)=>row?.[col.key || col.id || columnName(col)] ?? (i===0 ? row?.size || row?.label || row?.name || '' : ''));
      });
    };
    const rows=rowsOf(chart.rows),cm=rowsOf(chart.rows_cm),inch=rowsOf(chart.rows_in);
    if (!rows.length && !cm.length && !inch.length) return;
    const baseUnit=chart.unit==='in' ? 'in' : 'cm';
    const convert = (value,to) => {
      const m=String(value).trim().match(/^(\d+(?:\.\d+)?)(\s*[-–]\s*(\d+(?:\.\d+)?))?$/);
      if (!m || to===baseUnit) return String(value);
      const factor=to==='in'?1/2.54:2.54;
      return (Number(m[1])*factor).toFixed(1)+(m[3]?'–'+(Number(m[3])*factor).toFixed(1):'');
    };
    const measured=columns.some(c=>c && typeof c==='object' && (c.measurement===true || c.isMeasurement===true || c.convert===true));
    const converted = to => rows.map(row=>row.map((cell,i)=>{
      const col=columns[i];
      return col && typeof col==='object' && (col.measurement===true || col.isMeasurement===true || col.convert===true) ? convert(cell,to) : String(cell ?? '');
    }));
    const both=(cm.length && inch.length) || measured;
    const fragment=document.createDocumentFragment(),box=document.createElement('div');
    box.className='mt-size-chart'+(both?' mt-size-chart--units':'');box.dataset.mtSizeChart='';
    box.dataset.sizeTriggers=host.querySelector('[data-size-triggers]')?.dataset.sizeTriggers || 'Size';
    const title=document.createElement('p');title.className='mt-size-chart__name';title.textContent=chart.name || chart.title || '';if(title.textContent)box.append(title);
    if(both){
      const controls=document.createElement('div');controls.className='mt-size-chart__units';controls.setAttribute('role','radiogroup');controls.setAttribute('aria-label','Units');
      const name='mt-size-unit-live-'+(++sequence);
      ['cm','in'].forEach(unit=>{const label=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name=name;input.value=unit;input.checked=unit===baseUnit;label.append(input,document.createTextNode(unit));controls.append(label);});
      box.append(controls);
    }
    (both?['cm','in']:['one']).forEach(unit=>{
      const data=unit==='cm'?(cm.length?cm:converted('cm')):unit==='in'?(inch.length?inch:converted('in')):rows.length?rows:cm.length?cm:inch;
      const table=document.createElement('table');table.className='mt-size-chart__table';table.dataset.unit=unit;
      const head=table.createTHead().insertRow();columns.forEach(col=>{const th=document.createElement('th');th.scope='col';th.textContent=columnName(col);head.append(th);});
      const body=table.createTBody();data.forEach(row=>{const tr=body.insertRow();row.forEach((value,i)=>{const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=String(value??'');tr.append(cell);});});box.append(table);
    });
    const noteText=typeof chart.notes==='string'?chart.notes:chart.notes?.value;
    if(noteText){const notes=document.createElement('p');notes.className='mt-size-chart__notes';notes.textContent=noteText;box.append(notes);}
    const existingImage=host.querySelector('.mt-size-chart__image');
    const imageAddress=typeof chart.image==='string'?chart.image:chart.image?.url || chart.image?.src;
    let chartImage;
    try {
      const imageUrl=new URL(imageAddress,location.href);
      if(imageAddress && ['http:','https:'].includes(imageUrl.protocol)) {
        chartImage=document.createElement('img');chartImage.className='mt-size-chart__image';chartImage.src=imageUrl.href;chartImage.alt=chart.name || chart.title || 'Size chart';chartImage.loading='lazy';chartImage.decoding='async';
        if(chart.image?.width && chart.image?.height){chartImage.width=chart.image.width;chartImage.height=chart.image.height;}
      }
    } catch (_) {}
    if(chartImage || existingImage)box.append(chartImage || existingImage.cloneNode(true));
    fragment.append(box);host.replaceChildren(fragment,source);host._chartSource=payload;
  });
  const charts = root => [...(root?.querySelectorAll?.('[data-mt-size-chart]') || [])];
  const sectionOf = chart => chart.closest('.shopify-section, [data-section-id]') || document;
  const syncUnit = chart => {
    const unit=chart.querySelector('.mt-size-chart__units input:checked')?.value;
    chart.querySelectorAll('table[data-unit]').forEach(table=>{table.hidden=!!unit && table.dataset.unit!=='one' && table.dataset.unit!==unit;});
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
  const init = root => { hydrate(root); charts(root).forEach(chart => {
    let preferred;
    try { preferred = localStorage.getItem(key); } catch (_) {}
    const unit = chart.querySelector(`.mt-size-chart__units input[value="${preferred === 'in' ? 'in' : 'cm'}"]`);
    if (preferred && unit) unit.checked = true;
    syncUnit(chart);
    const selected = [...sectionOf(chart).querySelectorAll('select,input[type="radio"]:checked')].find(input => !chart.contains(input) && isSize(input,chart));
    if (selected) highlight(chart,selected.value);
  }); };
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
  ['storelib:section-load','shopify:section:load'].forEach(name => document.addEventListener(name,event=>init(event.target)));
  init(document);
})();

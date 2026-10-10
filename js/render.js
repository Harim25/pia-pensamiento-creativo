/* Dibuja en pantalla lo que hay en el store: resumen, lista de baños y reportes. */
(function (App) {
  'use strict';

  const { SUPPLIES, BUILDING_COUNT } = App.data;
  const { byId, timeAgo, icon } = App.utils;
  const store = App.store;

  function renderSummary() {
    const counts = { ok: 0, warn: 0, off: 0 };
    store.restrooms.forEach(function (restroom) {
      counts[store.getStatus(restroom).level]++;
    });
    byId('summary-ok').textContent = counts.ok;
    byId('summary-warn').textContent = counts.warn;
    byId('summary-off').textContent = counts.off;
    byId('feed-count').textContent = store.feed.length;
  }

  /* Botones "Todos, 1, 2, ... 12". Solo se dibuja una vez */
  function renderBuildingPicker() {
    let html = '<button type="button" data-building="all" aria-pressed="true">Todos</button>';
    for (let building = 1; building <= BUILDING_COUNT; building++) {
      html += '<button type="button" data-building="' + building + '" aria-pressed="false">' + building + '</button>';
    }
    byId('building-picker').innerHTML = html;
  }

  function chipsHTML(restroom) {
    let html = '';
    SUPPLIES.forEach(function (supply) {
      const available = restroom.supplies[supply.key].value === 'si';
      html += '<span class="chip ' + (available ? 'chip--ok' : 'chip--bad') + '">'
        + icon(available ? 'i-check' : 'i-x') + supply.chip + '</span>';
    });
    const faultCount = store.activeFaultCount(restroom);
    if (faultCount) {
      html += '<span class="chip chip--warn">' + icon('i-warn') + faultCount
        + (faultCount === 1 ? ' falla' : ' fallas') + '</span>';
    }
    return html;
  }

  function restroomRowHTML(restroom) {
    const status = store.getStatus(restroom);
    return '<button type="button" class="restroom-row' + (status.level === 'off' ? ' is-unavailable' : '') + '" data-id="' + restroom.id + '">'
      + '<span class="restroom-row-top">'
      + '<span class="restroom-name"><b>' + store.genderLabel(restroom.gender) + '</b><span class="restroom-floor">Piso ' + restroom.floor + '</span></span>'
      + '<span class="restroom-row-end"><span class="status-pill status-pill--' + status.level + '">' + icon(status.icon) + status.label + '</span>' + icon('i-chev') + '</span>'
      + '</span>'
      + '<span class="chips">' + chipsHTML(restroom) + '</span>'
      + '</button>';
  }

  /* filters = { gender: 'all' | 'H' | 'M', building: 'all' | número, onlyProblems: boolean } */
  function renderList(filters) {
    const visible = store.restrooms.filter(function (restroom) {
      return (filters.gender === 'all' || restroom.gender === filters.gender)
        && (filters.building === 'all' || restroom.building === Number(filters.building))
        && (!filters.onlyProblems || store.getStatus(restroom).level !== 'ok');
    });

    if (!visible.length) {
      byId('building-list').innerHTML = '<p class="empty-state">Ningún baño coincide con estos filtros. Cambia el edificio o quita «Solo con problemas».</p>';
      return;
    }

    /* Agrupa por edificio conservando el orden */
    const groups = {};
    const order = [];
    visible.forEach(function (restroom) {
      if (!groups[restroom.building]) {
        groups[restroom.building] = [];
        order.push(restroom.building);
      }
      groups[restroom.building].push(restroom);
    });

    let html = '';
    order.forEach(function (building) {
      /* El conteo del encabezado considera todos los baños del edificio, no solo los filtrados */
      const all = store.restrooms.filter(function (r) { return r.building === building; });
      const withProblems = all.filter(function (r) { return store.getStatus(r).level !== 'ok'; }).length;
      html += '<section class="building-card">'
        + '<div class="building-card-header">'
        + '<h2>Edificio <span class="building-number">' + building + '</span></h2>'
        + '<span class="building-card-meta">' + (withProblems ? withProblems + ' de ' + all.length + ' con problemas' : 'Todo en orden') + '</span>'
        + '</div>'
        + groups[building].map(restroomRowHTML).join('')
        + '</section>';
    });
    byId('building-list').innerHTML = html;
  }

  function renderFeed() {
    byId('feed').innerHTML = store.feed.map(function (report) {
      return '<li class="feed-item">'
        + '<span class="building-number" aria-hidden="true">' + report.building + '</span>'
        + '<div class="feed-item-body">'
        + '<div class="feed-item-title"><span>Edificio ' + report.building + ' · ' + store.genderLabel(report.gender) + ' · Piso ' + report.floor + '</span>'
        + '<small data-at="' + report.at + '">' + timeAgo(report.at) + '</small></div>'
        + '<ul>' + report.texts.map(function (text) { return '<li>' + text + '</li>'; }).join('') + '</ul>'
        + '</div></li>';
    }).join('');
  }

  /* Actualiza los "hace X min" de todo elemento con data-at */
  function refreshTimes() {
    document.querySelectorAll('[data-at]').forEach(function (element) {
      element.textContent = timeAgo(Number(element.getAttribute('data-at')));
    });
  }

  function renderAll(filters) {
    renderSummary();
    renderList(filters);
    renderFeed();
  }

  App.render = { renderSummary, renderBuildingPicker, renderList, renderFeed, refreshTimes, renderAll };
})(window.BanosFIME);

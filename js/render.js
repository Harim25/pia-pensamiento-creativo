/* Dibuja en pantalla lo que hay en el store: resumen, lista de baños y reportes. */
(function (App) {
  'use strict';

  const { SUPPLIES, BUILDING_COUNT } = App.data;
  const { byId, escapeHTML, timeAgo, icon } = App.utils;
  const store = App.store;

  function renderSummary() {
    const counts = { ok: 0, warn: 0, off: 0, unknown: 0 };
    store.restrooms.forEach(function (restroom) {
      counts[store.getStatus(restroom).level]++;
    });
    byId('summary-ok').textContent = counts.ok;
    byId('summary-warn').textContent = counts.warn;
    byId('summary-off').textContent = counts.off;
    byId('summary-unknown').textContent = counts.unknown;
    byId('feed-count').textContent = store.getFeed().length;
    byId('staff-count').textContent = store.restrooms.filter(store.hasProblems).length;
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
      const value = restroom.supplies[supply.key].value;
      const look = { si: ['chip--ok', 'i-check'], no: ['chip--bad', 'i-x'], '?': ['chip--unknown', 'i-unknown'] }[value];
      html += '<span class="chip ' + look[0] + '">' + icon(look[1]) + supply.chip + '</span>';
    });
    const faultCount = store.activeFaultCount(restroom);
    if (faultCount) {
      html += '<span class="chip chip--warn">' + icon('i-warn') + faultCount
        + (faultCount === 1 ? ' falla' : ' fallas') + '</span>';
    }
    if (restroom.photos.length) {
      html += '<span class="chip chip--neutral">' + icon('i-camera') + restroom.photos.length
        + (restroom.photos.length === 1 ? ' foto' : ' fotos') + '</span>';
    }
    return html;
  }

  function statusPillHTML(restroom) {
    const status = store.getStatus(restroom);
    return '<span class="status-pill status-pill--' + status.level + '">' + icon(status.icon) + status.label + '</span>';
  }

  function restroomRowHTML(restroom) {
    const level = store.getStatus(restroom).level;
    const dim = level === 'off' || level === 'unknown';
    return '<button type="button" class="restroom-row' + (dim ? ' is-unavailable' : '') + '" data-id="' + restroom.id + '">'
      + '<span class="restroom-row-top">'
      + '<span class="restroom-name"><b>' + store.genderLabel(restroom.gender) + '</b><span class="restroom-floor">Piso ' + restroom.floor + '</span></span>'
      + '<span class="restroom-row-end">' + statusPillHTML(restroom) + icon('i-chev') + '</span>'
      + '</span>'
      + '<span class="chips">' + chipsHTML(restroom) + '</span>'
      + '</button>';
  }

  /* filters = { gender: 'all' | 'H' | 'M', building: 'all' | número, onlyProblems: boolean } */
  function renderList(filters) {
    const visible = store.restrooms.filter(function (restroom) {
      return (filters.gender === 'all' || restroom.gender === filters.gender)
        && (filters.building === 'all' || restroom.building === Number(filters.building))
        && (!filters.onlyProblems || store.hasProblems(restroom));
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
      const withProblems = all.filter(store.hasProblems).length;
      const withReports = all.filter(function (r) { return r.reportCount > 0; }).length;
      let meta = 'Todo en orden';
      if (withProblems) meta = withProblems + ' de ' + all.length + ' con problemas';
      else if (!withReports) meta = 'Sin reportes recientes';

      html += '<section class="building-card">'
        + '<div class="building-card-header">'
        + '<h2>Edificio <span class="building-number">' + building + '</span></h2>'
        + '<span class="building-card-meta">' + meta + '</span>'
        + '</div>'
        + groups[building].map(restroomRowHTML).join('')
        + '</section>';
    });
    byId('building-list').innerHTML = html;
  }

  function renderFeed() {
    const feed = store.getFeed();
    byId('feed-note').textContent = 'Reportes de las últimas ' + App.config.reportLifetimeHours
      + ' horas. Los más viejos caducan y ya no cuentan para el estado de los baños.';

    if (!feed.length) {
      byId('feed').innerHTML = '<li class="empty-state">Nadie ha reportado en las últimas horas. ¡Sé el primero!</li>';
      return;
    }

    byId('feed').innerHTML = feed.map(function (report) {
      return '<li class="feed-item">'
        + '<span class="building-number" aria-hidden="true">' + report.building + '</span>'
        + '<div class="feed-item-body">'
        + '<div class="feed-item-title"><span>Edificio ' + report.building + ' · ' + store.genderLabel(report.gender) + ' · Piso ' + report.floor
        + (report.isStaff ? ' <span class="staff-badge">Intendencia</span>' : '') + '</span>'
        + '<small data-at="' + report.at + '">' + timeAgo(report.at) + '</small></div>'
        + '<ul>' + report.texts.map(function (text) { return '<li>' + escapeHTML(text) + '</li>'; }).join('') + '</ul>'
        + (report.comment ? '<p class="feed-comment">«' + escapeHTML(report.comment) + '»</p>' : '')
        + (report.photoUrl ? '<a class="feed-photo" href="' + escapeHTML(report.photoUrl) + '" target="_blank" rel="noopener"><img src="' + escapeHTML(report.photoUrl) + '" alt="Foto del reporte" loading="lazy"></a>' : '')
        + '</div></li>';
    }).join('');
  }

  /* Lista de pendientes para intendencia: primero los no disponibles, luego los que tienen más tareas */
  function renderStaff() {
    const order = { off: 0, warn: 1 };
    const pending = store.restrooms
      .filter(store.hasProblems)
      .sort(function (a, b) {
        const byLevel = order[store.getStatus(a).level] - order[store.getStatus(b).level];
        return byLevel || store.pendingTasks(b).length - store.pendingTasks(a).length;
      });

    if (!pending.length) {
      byId('staff-list').innerHTML = '<p class="empty-state">No hay pendientes. Todos los baños reportados están en orden.</p>';
      return;
    }

    byId('staff-list').innerHTML = pending.map(function (restroom) {
      return '<section class="staff-card">'
        + '<div class="staff-card-top">'
        + '<span class="building-number" aria-hidden="true">' + restroom.building + '</span>'
        + '<div class="staff-card-title"><b>Edificio ' + restroom.building + ' · ' + store.genderLabel(restroom.gender) + '</b>'
        + '<small>Piso ' + restroom.floor + ' · <span data-at="' + restroom.updatedAt + '">' + timeAgo(restroom.updatedAt) + '</span></small></div>'
        + statusPillHTML(restroom)
        + '</div>'
        + '<ul class="task-list">' + store.pendingTasks(restroom).map(function (task) { return '<li>' + escapeHTML(task) + '</li>'; }).join('') + '</ul>'
        + '<button type="button" class="secondary-button" data-attend="' + restroom.id + '">' + icon('i-check') + 'Marcar como atendido</button>'
        + '</section>';
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
    renderStaff();
  }

  App.render = { renderSummary, renderBuildingPicker, renderList, renderFeed, renderStaff, refreshTimes, renderAll };
})(window.BanosFIME);

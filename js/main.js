/* Punto de entrada: carga los reportes, guarda los filtros activos y conecta los eventos de la página. */
(function (App) {
  'use strict';

  const { byId, setPressed } = App.utils;
  const { api, store, render, auth, reportSheet, staff } = App;

  const TIME_REFRESH_INTERVAL = 30000;

  const filters = { gender: 'all', building: 'all', onlyProblems: false };
  let view = 'restrooms';

  function renderAll() {
    render.renderAll(filters);
  }

  function showView(newView) {
    view = newView;
    setPressed(byId('staff-view-button').parentNode, 'data-view', view);
    byId('panel-restrooms').hidden = view !== 'restrooms';
    byId('panel-feed').hidden = view !== 'feed';
    byId('panel-staff').hidden = view !== 'staff';
  }

  /* La vista de pendientes solo aparece con una cuenta de personal */
  function handleUserChange(user) {
    const isStaff = Boolean(user && user.role === 'staff');
    byId('staff-view-button').hidden = !isStaff;
    if (!isStaff && view === 'staff') showView('restrooms');
  }

  function showLoadState(text, withRetry) {
    const box = byId('load-state');
    box.hidden = !text;
    box.innerHTML = '';
    if (!text) return;
    box.textContent = text;
    if (withRetry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'link-button';
      button.textContent = 'Reintentar';
      button.addEventListener('click', loadReports);
      box.appendChild(document.createTextNode(' '));
      box.appendChild(button);
    }
  }

  async function loadReports() {
    showLoadState('Cargando el estado de los baños…');
    try {
      const reports = await api.fetchReports(Date.now() - store.LIFETIME);
      store.setReports(reports);
      showLoadState('');
    } catch (error) {
      showLoadState('No se pudo cargar el estado de los baños. ' + error.message, true);
    }
    renderAll();
  }

  document.addEventListener('click', function (event) {
    const target = event.target;

    const row = target.closest('.restroom-row');
    if (row) {
      reportSheet.open(row.getAttribute('data-id'));
      return;
    }

    const genderButton = target.closest('[data-gender]');
    if (genderButton) {
      filters.gender = genderButton.getAttribute('data-gender');
      setPressed(genderButton.parentNode, 'data-gender', filters.gender);
      render.renderList(filters);
      return;
    }

    const buildingButton = target.closest('[data-building]');
    if (buildingButton) {
      filters.building = buildingButton.getAttribute('data-building');
      setPressed(byId('building-picker'), 'data-building', filters.building);
      render.renderList(filters);
      return;
    }

    const viewButton = target.closest('[data-view]');
    if (viewButton) showView(viewButton.getAttribute('data-view'));
  });

  byId('only-problems').addEventListener('change', function (event) {
    filters.onlyProblems = event.target.checked;
    render.renderList(filters);
  });

  byId('demo-tag').hidden = api.mode !== 'demo';

  auth.onChange(handleUserChange);
  reportSheet.init({ onReport: renderAll });
  staff.init({ onReport: renderAll });

  /* Reportes de otras personas en tiempo real */
  api.subscribe(function (report) {
    if (store.addReport(report)) renderAll();
  });

  /* Al volver a la pestaña, recarga por si se perdió algún reporte */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && api.mode === 'supabase') loadReports();
  });

  /* Actualiza los "hace X min" y quita los reportes que ya caducaron */
  setInterval(function () {
    if (store.hasExpiredReports()) {
      store.rebuild();
      renderAll();
    } else {
      render.refreshTimes();
    }
  }, TIME_REFRESH_INTERVAL);

  render.renderBuildingPicker();
  auth.init();
  loadReports();
})(window.BanosFIME);

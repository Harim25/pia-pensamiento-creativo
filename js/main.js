/* Punto de entrada: guarda los filtros activos y conecta los eventos de la página. */
(function (App) {
  'use strict';

  const { byId, setPressed } = App.utils;
  const { render, reportSheet } = App;

  const TIME_REFRESH_INTERVAL = 30000;

  const filters = { gender: 'all', building: 'all', onlyProblems: false };

  function showView(view) {
    byId('panel-restrooms').hidden = view !== 'restrooms';
    byId('panel-feed').hidden = view !== 'feed';
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
    if (viewButton) {
      const view = viewButton.getAttribute('data-view');
      setPressed(viewButton.parentNode, 'data-view', view);
      showView(view);
    }
  });

  byId('only-problems').addEventListener('change', function (event) {
    filters.onlyProblems = event.target.checked;
    render.renderList(filters);
  });

  reportSheet.init({
    onReport: function () { render.renderAll(filters); }
  });

  setInterval(render.refreshTimes, TIME_REFRESH_INTERVAL);

  render.renderBuildingPicker();
  render.renderAll(filters);
})(window.BanosFIME);

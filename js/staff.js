/* Vista de intendencia: marcar como atendido un baño con pendientes. */
(function (App) {
  'use strict';

  const { byId, showToast } = App.utils;
  const store = App.store;

  let onReport = function () {};

  async function markAttended(button) {
    const user = App.auth.getUser();
    if (!user || user.role !== 'staff') return;
    const restroom = store.findRestroom(button.getAttribute('data-attend'));
    button.disabled = true;
    button.textContent = 'Guardando…';
    try {
      const saved = await App.api.createReport(user, store.allGoodReport(restroom.id, 'Atendido por intendencia'), null);
      store.addReport(saved);
      onReport();
      showToast('Edificio ' + restroom.building + ' · ' + store.genderLabel(restroom.gender) + ' quedó en orden.');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Marcar como atendido';
      showToast(error.message);
    }
  }

  function init(options) {
    onReport = options.onReport;
    byId('staff-list').addEventListener('click', function (event) {
      const button = event.target.closest('[data-attend]');
      if (button) markAttended(button);
    });
  }

  App.staff = { init };
})(window.BanosFIME);

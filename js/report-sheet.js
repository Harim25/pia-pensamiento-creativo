/* Hoja de reporte: abre el formulario de un baño, lo envía al store y avisa. */
(function (App) {
  'use strict';

  const { SUPPLIES, FAULTS, ACCESS_STATES } = App.data;
  const { byId, lowerFirst, timeAgo, confirmationsText } = App.utils;
  const store = App.store;

  const SUPPLY_OPTIONS = [['si', 'Hay'], ['no', 'No hay'], ['?', 'No sé']];
  const TOAST_DURATION = 3200;

  let current = null;      /* baño que se está reportando */
  let lastFocus = null;    /* elemento que tenía el foco antes de abrir */
  let toastTimer = null;
  let onReport = function () {};

  function optionHTML(name, value, label, checked) {
    return '<label class="option"><input type="radio" name="' + name + '" value="' + value + '"' + (checked ? ' checked' : '') + '><span>' + label + '</span></label>';
  }

  function formHTML(restroom) {
    let html = '';

    html += '<fieldset class="question" aria-describedby="meta-acceso"><legend>¿Está abierto?</legend>'
      + '<p class="question-meta" id="meta-acceso">Ahora: ' + lowerFirst(store.accessState(restroom.access.value).label) + '. ' + confirmationsText(restroom.access.confirmations) + '</p>'
      + '<div class="options options--2">'
      + ACCESS_STATES.map(function (state) {
        return optionHTML('access', state.key, state.label, restroom.access.value === state.key);
      }).join('')
      + '</div></fieldset>';

    SUPPLIES.forEach(function (supply) {
      const state = restroom.supplies[supply.key];
      html += '<fieldset class="question" aria-describedby="meta-' + supply.key + '"><legend>' + supply.label + '</legend>'
        + '<p class="question-meta" id="meta-' + supply.key + '">Ahora: ' + (state.value === 'si' ? 'hay' : 'no hay') + '. ' + confirmationsText(state.confirmations) + '</p>'
        + '<div class="options options--3">'
        + SUPPLY_OPTIONS.map(function (option) {
          return optionHTML('supply_' + supply.key, option[0], option[1], state.value === option[0]);
        }).join('')
        + '</div></fieldset>';
    });

    html += '<fieldset class="question"><legend>Fallas que ves</legend>'
      + '<p class="question-meta">Marca todas las que apliquen.</p>'
      + '<div class="fault-list">'
      + FAULTS.map(function (fault) {
        const state = restroom.faults[fault.key];
        return '<label class="fault-check"><input type="checkbox" name="fault_' + fault.key + '" value="1"' + (state.active ? ' checked' : '') + '>'
          + '<span>' + fault.label + (state.active ? '<small>' + confirmationsText(state.confirmations) + '</small>' : '') + '</span></label>';
      }).join('')
      + '</div></fieldset>';

    return html;
  }

  /* Convierte el formulario en el objeto `answers` que espera store.submitReport */
  function readAnswers(form) {
    const formData = new FormData(form);
    const answers = { access: formData.get('access'), supplies: {}, faults: {} };
    SUPPLIES.forEach(function (supply) {
      answers.supplies[supply.key] = formData.get('supply_' + supply.key);
    });
    FAULTS.forEach(function (fault) {
      answers.faults[fault.key] = formData.get('fault_' + fault.key) === '1';
    });
    return answers;
  }

  function focusRow(id) {
    const row = document.querySelector('.restroom-row[data-id="' + id + '"]');
    if (row) row.focus();
    return Boolean(row);
  }

  function open(id) {
    current = store.findRestroom(id);
    lastFocus = document.activeElement;
    byId('sheet-title').textContent = 'Edificio ' + current.building + ' · ' + store.genderLabel(current.gender);
    byId('sheet-subtitle').innerHTML = 'Piso ' + current.floor + ' · Actualizado <span data-at="' + current.updatedAt + '">' + timeAgo(current.updatedAt) + '</span>';
    byId('report-form').innerHTML = formHTML(current);
    byId('scrim').hidden = false;
    byId('sheet').hidden = false;
    document.body.style.overflow = 'hidden';
    byId('sheet').querySelector('.sheet-body').scrollTop = 0;
    byId('sheet-close').focus();
  }

  function close() {
    if (byId('sheet').hidden) return;
    byId('sheet').hidden = true;
    byId('scrim').hidden = true;
    document.body.style.overflow = '';
    const id = current && current.id;
    current = null;
    /* Regresa el foco a la fila del baño (o a donde estaba antes) */
    if (!(id && focusRow(id)) && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function showToast(message) {
    const toast = byId('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, TOAST_DURATION);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!current) return;
    const id = current.id;
    const changes = store.submitReport(id, readAnswers(event.target));
    close();
    onReport();
    focusRow(id);
    showToast(changes.length ? 'Reporte enviado. Gracias por avisar.' : 'Gracias. Confirmaste el estado actual.');
  }

  /* Con la hoja abierta: Escape la cierra y Tab no se sale de ella */
  function handleKeydown(event) {
    if (byId('sheet').hidden) return;
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = Array.from(byId('sheet').querySelectorAll('button, input')).filter(function (el) { return !el.disabled; });
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  /* options.onReport: función que se llama después de enviar un reporte (para redibujar) */
  function init(options) {
    onReport = options.onReport;
    byId('report-form').addEventListener('submit', handleSubmit);
    byId('scrim').addEventListener('click', close);
    byId('sheet-close').addEventListener('click', close);
    document.addEventListener('keydown', handleKeydown);
  }

  App.reportSheet = { init, open, close };
})(window.BanosFIME);

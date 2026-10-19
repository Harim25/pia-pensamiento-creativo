/* Hoja de reporte: muestra el estado de un baño y el formulario para reportarlo. */
(function (App) {
  'use strict';

  const { SUPPLIES, FAULTS, ACCESS_STATES } = App.data;
  const { byId, escapeHTML, lowerFirst, timeAgo, confirmationsText, compressImage, showToast } = App.utils;
  const store = App.store;
  const dialog = App.dialog;

  const SUPPLY_OPTIONS = [['si', 'Hay'], ['no', 'No hay'], ['?', 'No sé']];
  const COMMENT_MAX = 280;

  let current = null;      /* baño que se está viendo */
  let onReport = function () {};

  function optionHTML(name, value, label, checked) {
    return '<label class="option"><input type="radio" name="' + name + '" value="' + value + '"' + (checked ? ' checked' : '') + '><span>' + label + '</span></label>';
  }

  function supplyMeta(state) {
    if (state.value === '?') return 'Ahora: sin datos.';
    return 'Ahora: ' + (state.value === 'si' ? 'hay' : 'no hay') + '. ' + confirmationsText(state.confirmations);
  }

  function formHTML(restroom) {
    let html = '';
    const accessMeta = restroom.reportCount
      ? 'Ahora: ' + lowerFirst(store.accessState(restroom.access.value).label) + '. ' + confirmationsText(restroom.access.confirmations)
      : 'Nadie lo ha reportado en las últimas horas.';

    html += '<fieldset class="question" aria-describedby="meta-acceso"><legend>¿Está abierto?</legend>'
      + '<p class="question-meta" id="meta-acceso">' + accessMeta + '</p>'
      + '<div class="options options--2">'
      + ACCESS_STATES.map(function (state) {
        return optionHTML('access', state.key, state.label, restroom.access.value === state.key);
      }).join('')
      + '</div></fieldset>';

    SUPPLIES.forEach(function (supply) {
      const state = restroom.supplies[supply.key];
      html += '<fieldset class="question" aria-describedby="meta-' + supply.key + '"><legend>' + supply.label + '</legend>'
        + '<p class="question-meta" id="meta-' + supply.key + '">' + supplyMeta(state) + '</p>'
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

    html += '<fieldset class="question"><legend>Foto y comentario <span class="optional">(opcional)</span></legend>'
      + '<p class="question-meta">Una foto ayuda a que los demás confíen en tu reporte. Evita que salgan personas.</p>'
      + '<label class="photo-picker">'
      + '<input type="file" name="photo" id="report-photo" accept="image/*" capture="environment">'
      + '<span>' + App.utils.icon('i-camera') + '<span id="report-photo-label">Tomar o elegir foto</span></span>'
      + '</label>'
      + '<div class="photo-preview" id="report-photo-preview" hidden></div>'
      + '<label class="field"><span class="sr-only">Comentario</span>'
      + '<textarea name="comment" id="report-comment" rows="2" maxlength="' + COMMENT_MAX + '" placeholder="Por ejemplo: el dispensador del fondo es el que no sirve"></textarea>'
      + '</label>'
      + '</fieldset>';

    return html;
  }

  function photosHTML(restroom) {
    if (!restroom.photos.length) return '';
    return '<p class="field-label">Fotos recientes</p><div class="photo-strip">'
      + restroom.photos.map(function (photo) {
        return '<a href="' + escapeHTML(photo.url) + '" target="_blank" rel="noopener">'
          + '<img src="' + escapeHTML(photo.url) + '" alt="Foto del baño" loading="lazy">'
          + '<small data-at="' + photo.at + '">' + timeAgo(photo.at) + '</small></a>';
      }).join('')
      + '</div>';
  }

  /* Convierte el formulario en un reporte para App.api.createReport */
  function readReport(form) {
    const formData = new FormData(form);
    const report = {
      restroomId: current.id,
      access: formData.get('access'),
      supplies: {},
      faults: {},
      comment: String(formData.get('comment') || '').trim().slice(0, COMMENT_MAX)
    };
    SUPPLIES.forEach(function (supply) {
      report.supplies[supply.key] = formData.get('supply_' + supply.key);
    });
    FAULTS.forEach(function (fault) {
      report.faults[fault.key] = formData.get('fault_' + fault.key) === '1';
    });
    return report;
  }

  function showError(text) {
    byId('report-error').textContent = text || '';
    byId('report-error').hidden = !text;
  }

  function focusRow(id) {
    const row = document.querySelector('.restroom-row[data-id="' + id + '"]');
    if (row) row.focus();
    return Boolean(row);
  }

  function open(id) {
    current = store.findRestroom(id);
    const user = App.auth.getUser();

    byId('sheet-title').textContent = store.restroomName(current);
    byId('sheet-subtitle').innerHTML = current.floor + ' · '
      + (current.updatedAt ? 'Actualizado <span data-at="' + current.updatedAt + '">' + timeAgo(current.updatedAt) + '</span>' : 'Sin reportes recientes');
    byId('sheet-photos').innerHTML = photosHTML(current);
    byId('sheet-login-notice').hidden = Boolean(user);
    byId('sheet-footer').hidden = !user;
    byId('report-form').hidden = !user;
    byId('report-form').innerHTML = user ? formHTML(current) : '';
    showError('');

    dialog.open(byId('sheet'), {
      onClose: function () {
        current = null;
        return focusRow(id);
      }
    });
  }

  function handlePhotoChange(event) {
    if (event.target.id !== 'report-photo') return;
    const file = event.target.files[0];
    const preview = byId('report-photo-preview');
    if (preview.dataset.url) URL.revokeObjectURL(preview.dataset.url);
    if (!file) {
      preview.hidden = true;
      byId('report-photo-label').textContent = 'Tomar o elegir foto';
      return;
    }
    const url = URL.createObjectURL(file);
    preview.dataset.url = url;
    preview.innerHTML = '<img src="' + url + '" alt="Vista previa de tu foto"><button type="button" class="link-button" id="report-photo-remove">Quitar foto</button>';
    preview.hidden = false;
    byId('report-photo-label').textContent = 'Cambiar foto';
  }

  function handlePhotoRemove(event) {
    if (!event.target.closest('#report-photo-remove')) return;
    const input = byId('report-photo');
    input.value = '';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const user = App.auth.getUser();
    if (!current || !user) return;

    const id = current.id;
    const report = readReport(event.target);
    const file = byId('report-photo').files[0];
    const submit = byId('report-submit');
    showError('');
    submit.disabled = true;
    submit.textContent = file ? 'Subiendo foto…' : 'Enviando…';

    try {
      const photo = file ? await compressImage(file, App.config.photoMaxSize) : null;
      const saved = await App.api.createReport(user, report, photo);
      store.addReport(saved);
      dialog.close();
      onReport();
      focusRow(id);
      const last = store.getFeed()[0];
      const onlyConfirmed = last && last.id === saved.id && /^(Confirmó|Todo en orden)/.test(last.texts[0]);
      showToast(onlyConfirmed ? 'Gracias. Confirmaste el estado actual.' : 'Reporte enviado. Gracias por avisar.');
    } catch (error) {
      showError(error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = 'Enviar reporte';
    }
  }

  /* options.onReport: función que se llama después de enviar un reporte (para redibujar) */
  function init(options) {
    onReport = options.onReport;
    byId('report-form').addEventListener('submit', handleSubmit);
    byId('report-form').addEventListener('change', handlePhotoChange);
    byId('report-form').addEventListener('click', handlePhotoRemove);
    byId('sheet-login-button').addEventListener('click', function () {
      const id = current && current.id;
      dialog.close();
      App.auth.openSignIn({ then: function () { if (id) open(id); } });
    });
  }

  App.reportSheet = { init, open };
})(window.BanosFIME);

/* Funciones pequeñas de apoyo que no dependen de los datos. */
(function (App) {
  'use strict';

  const MINUTE = 60000;

  function byId(id) {
    return document.getElementById(id);
  }

  /* "Abierto" -> "abierto" */
  function lowerFirst(text) {
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  /* Tiempo relativo a partir de una marca en milisegundos: "hace 5 min" */
  function timeAgo(timestamp) {
    const minutes = Math.max(0, Math.round((Date.now() - timestamp) / MINUTE));
    if (minutes < 1) return 'hace un momento';
    if (minutes < 60) return 'hace ' + minutes + ' min';
    return 'hace ' + Math.floor(minutes / 60) + ' h';
  }

  function confirmationsText(count) {
    return count === 1 ? '1 persona lo reportó.' : count + ' personas lo confirman.';
  }

  /* HTML de un ícono del sprite de index.html */
  function icon(id) {
    return '<svg class="icon" aria-hidden="true"><use href="#' + id + '"/></svg>';
  }

  /* Marca como presionado solo el botón del grupo cuyo atributo vale `value` */
  function setPressed(group, attribute, value) {
    group.querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute(attribute) === String(value)));
    });
  }

  App.utils = { MINUTE, byId, lowerFirst, timeAgo, confirmationsText, icon, setPressed };
})(window.BanosFIME);

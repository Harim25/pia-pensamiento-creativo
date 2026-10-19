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

  /* Evita que texto escrito por usuarios (comentarios, correos) se interprete como HTML */
  function escapeHTML(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  /* Identificador único (para nombres de fotos y reportes de prueba) */
  function uniqueId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /*
    Reduce una foto a `maxSize` píxeles por lado y la convierte a JPEG.
    Así las fotos del celular (que pesan varios MB) suben rápido.
    Regresa una promesa con un Blob.
  */
  function compressImage(file, maxSize) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = function () {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('No se pudo procesar la foto.'));
        }, 'image/jpeg', 0.8);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('El archivo no es una imagen válida.'));
      };
      image.src = url;
    });
  }

  let toastTimer = null;

  /* Aviso temporal en la parte de abajo de la pantalla */
  function showToast(message) {
    const toast = byId('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 3200);
  }

  App.utils = {
    MINUTE, byId, lowerFirst, escapeHTML, timeAgo, confirmationsText, icon,
    setPressed, uniqueId, compressImage, showToast
  };
})(window.BanosFIME);

/*
  Tema claro u oscuro. Se carga en el <head> para aplicar el tema guardado
  antes de que se dibuje la página. 'system' sigue la configuración del celular.
*/
window.BanosFIME = window.BanosFIME || {};

(function (App) {
  'use strict';

  const STORAGE_KEY = 'banoticias-theme';

  function apply(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function get() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'system';
    } catch (error) {
      return 'system';
    }
  }

  function set(theme) {
    apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      /* Sin almacenamiento (modo privado): el tema dura solo esta visita */
    }
  }

  apply(get());

  App.theme = { get, set };
})(window.BanosFIME);

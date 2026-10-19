/*
  Manejo de las hojas (ventanas que suben desde abajo): reporte, inicio de
  sesión y cuenta. Solo puede haber una abierta. Se encarga del fondo oscuro,
  de cerrar con Escape o tocando afuera, y de que Tab no se salga de la hoja.
*/
(function (App) {
  'use strict';

  const { byId } = App.utils;

  let active = null;   /* { element, onClose, returnFocus } */

  /*
    options.focus:   elemento que recibe el foco al abrir (por defecto, la X)
    options.onClose: función al cerrar; si regresa true, ya se encargó del foco
  */
  function open(element, options) {
    options = options || {};
    if (active) close();
    active = { element: element, onClose: options.onClose, returnFocus: document.activeElement };
    byId('scrim').hidden = false;
    element.hidden = false;
    document.body.style.overflow = 'hidden';
    const body = element.querySelector('.sheet-body');
    if (body) body.scrollTop = 0;
    (options.focus || element.querySelector('.sheet-close')).focus();
  }

  function close() {
    if (!active) return;
    const closing = active;
    active = null;
    closing.element.hidden = true;
    byId('scrim').hidden = true;
    document.body.style.overflow = '';
    const handledFocus = closing.onClose && closing.onClose();
    if (!handledFocus && closing.returnFocus && document.contains(closing.returnFocus) && closing.returnFocus.focus) {
      closing.returnFocus.focus();
    }
  }

  function isOpen(element) {
    return Boolean(active) && (!element || active.element === element);
  }

  /* Elementos a los que se puede llegar con Tab dentro de la hoja abierta */
  function focusableIn(element) {
    return Array.from(element.querySelectorAll('button, input, textarea, select, a[href]')).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
  }

  document.addEventListener('keydown', function (event) {
    if (!active) return;
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = focusableIn(active.element);
      if (!focusable.length) return;
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
  });

  document.addEventListener('click', function (event) {
    if (!active) return;
    if (event.target === byId('scrim') || event.target.closest('.sheet-close')) close();
  });

  App.dialog = { open, close, isOpen };
})(window.BanosFIME);

/*
  Sesión del usuario: botón de cuenta del encabezado, hoja de inicio de
  sesión / crear cuenta y hoja de cuenta (configuración y cerrar sesión).
*/
(function (App) {
  'use strict';

  const { byId, setPressed, showToast } = App.utils;
  const api = App.api;
  const dialog = App.dialog;

  const ROLE_LABELS = { student: 'Cuenta de usuario', staff: 'Cuenta de personal' };

  let user = null;
  let mode = 'signin';         /* 'signin' | 'signup' */
  let afterSignIn = null;      /* qué hacer cuando se inicie sesión (por ejemplo, volver al reporte) */
  const listeners = [];

  function getUser() {
    return user;
  }

  /* Avisa a `callback` cada vez que cambia el usuario */
  function onChange(callback) {
    listeners.push(callback);
  }

  function setUser(newUser) {
    user = newUser;
    byId('account-button-label').textContent = user ? user.email.split('@')[0] : 'Iniciar sesión';
    byId('account-button').setAttribute('aria-label', user ? 'Mi cuenta (' + user.email + ')' : 'Iniciar sesión');
    listeners.forEach(function (callback) { callback(user); });
  }

  /* --- Hoja de inicio de sesión --- */

  function showMessage(id, text) {
    byId(id).textContent = text || '';
    byId(id).hidden = !text;
  }

  function setMode(newMode) {
    mode = newMode;
    const signingUp = mode === 'signup';
    setPressed(byId('auth-sheet'), 'data-auth-mode', mode);
    byId('auth-title').textContent = signingUp ? 'Crear cuenta' : 'Iniciar sesión';
    byId('auth-submit').textContent = signingUp ? 'Crear cuenta' : 'Iniciar sesión';
    byId('auth-password').setAttribute('autocomplete', signingUp ? 'new-password' : 'current-password');
    showMessage('auth-error', '');
    showMessage('auth-success', '');
  }

  /* options.then: función que se llama después de iniciar sesión */
  function openSignIn(options) {
    afterSignIn = (options && options.then) || null;
    setMode('signin');
    byId('auth-demo-hint').hidden = api.mode !== 'demo';
    dialog.open(byId('auth-sheet'), { focus: byId('auth-email') });
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = byId('auth-email').value.trim();
    const password = byId('auth-password').value;
    showMessage('auth-error', '');
    showMessage('auth-success', '');

    if (!email || !password) {
      showMessage('auth-error', 'Escribe tu correo y tu contraseña.');
      return;
    }

    const submit = byId('auth-submit');
    const label = submit.textContent;
    submit.disabled = true;
    submit.textContent = 'Un momento…';
    try {
      if (mode === 'signup') {
        const result = await api.signUp(email, password);
        if (result.needsConfirmation) {
          showMessage('auth-success', 'Listo. Te enviamos un correo para confirmar tu cuenta; abre el enlace y después inicia sesión aquí.');
          return;
        }
      } else {
        await api.signIn(email, password);
      }
      setUser(await api.getUser());
      byId('auth-password').value = '';
      const next = afterSignIn;
      afterSignIn = null;
      dialog.close();
      showToast(mode === 'signup' ? 'Cuenta creada. ¡Bienvenido!' : 'Sesión iniciada.');
      if (next) next();
    } catch (error) {
      showMessage('auth-error', error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = label;
    }
  }

  /* --- Hoja de cuenta --- */

  function openAccount() {
    byId('account-email').textContent = user.email;
    byId('account-role').textContent = ROLE_LABELS[user.role] || ROLE_LABELS.student;
    const current = App.theme.get();
    byId('theme-options').querySelectorAll('input').forEach(function (input) {
      input.checked = input.value === current;
    });
    dialog.open(byId('account-sheet'));
  }

  async function handleSignOut() {
    await api.signOut();
    setUser(null);
    dialog.close();
    showToast('Cerraste sesión.');
  }

  /* --- Inicio --- */

  function init() {
    api.onAuthChange(setUser);

    byId('account-button').addEventListener('click', function () {
      if (user) openAccount();
      else openSignIn();
    });
    byId('auth-sheet').addEventListener('click', function (event) {
      const modeButton = event.target.closest('[data-auth-mode]');
      if (modeButton) setMode(modeButton.getAttribute('data-auth-mode'));
    });
    byId('auth-form').addEventListener('submit', handleAuthSubmit);
    byId('sign-out-button').addEventListener('click', handleSignOut);
    byId('theme-options').addEventListener('change', function (event) {
      App.theme.set(event.target.value);
    });

    return api.getUser().then(setUser);
  }

  App.auth = { init, getUser, onChange, openSignIn };
})(window.BanosFIME);

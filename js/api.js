/*
  Comunicación con la base de datos.

  Hay dos versiones con las mismas funciones:
    - Supabase: la real. Se usa cuando config.js tiene URL y llave.
    - Prueba: guarda todo en memoria con reportes de ejemplo; se usa si
      config.js está vacío. Sirve para trabajar sin internet o sin cuenta.

  El resto de la página solo usa App.api y no sabe cuál de las dos es.

  Forma de un reporte dentro de la página:
    { id, restroomId: '3M', at: milisegundos, access: 'abierto',
      supplies: { papel: 'si' | 'no' | '?', ... },
      faults:   { puerta: true | false, ... },
      comment: '', photoUrl: null | 'https://...', isStaff: false }

  Forma del usuario: { id, email, role: 'student' | 'staff' } o null.
*/
(function (App) {
  'use strict';

  const config = App.config;
  const { SUPPLIES, FAULTS, GENDERS, BUILDING_COUNT, SAMPLE_REPORTS } = App.data;
  const { MINUTE, uniqueId } = App.utils;

  /* Traduce los errores más comunes de Supabase */
  function friendlyMessage(error) {
    const message = (error && error.message) || String(error);
    if (/Invalid login credentials/i.test(message)) return 'Correo o contraseña incorrectos.';
    if (/already registered|already been registered/i.test(message)) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
    if (/Password should be at least/i.test(message)) return 'La contraseña debe tener al menos 6 caracteres.';
    if (/Email not confirmed/i.test(message)) return 'Primero confirma tu correo con el enlace que te enviamos.';
    if (/valid email|invalid format|Unable to validate email/i.test(message)) return 'Escribe un correo válido.';
    if (/rate limit|too many/i.test(message)) return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(message)) return 'No hay conexión. Revisa tu internet.';
    return message;
  }

  /* ------------------------------------------------------------------ */
  /* Supabase                                                            */
  /* ------------------------------------------------------------------ */

  function createSupabaseApi() {
    const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    const COLUMNS = 'id, restroom_id, created_at, access, supplies, faults, comment, photo_path, is_staff';

    function toReport(row) {
      return {
        id: row.id,
        restroomId: row.restroom_id,
        at: Date.parse(row.created_at),
        access: row.access,
        supplies: row.supplies || {},
        faults: row.faults || {},
        comment: row.comment || '',
        photoUrl: row.photo_path
          ? client.storage.from(config.photoBucket).getPublicUrl(row.photo_path).data.publicUrl
          : null,
        isStaff: Boolean(row.is_staff)
      };
    }

    async function getUser() {
      const { data } = await client.auth.getSession();
      const session = data.session;
      if (!session) return null;
      const { data: profile } = await client.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      return { id: session.user.id, email: session.user.email, role: profile ? profile.role : 'student' };
    }

    return {
      mode: 'supabase',

      getUser: getUser,

      /* Avisa cada vez que alguien inicia o cierra sesión */
      onAuthChange: function (callback) {
        client.auth.onAuthStateChange(function (event) {
          if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return;
          /* Supabase pide no llamar a la base de datos dentro de este evento; por eso el setTimeout */
          setTimeout(function () { getUser().then(callback); }, 0);
        });
      },

      signIn: async function (email, password) {
        const { error } = await client.auth.signInWithPassword({ email: email, password: password });
        if (error) throw new Error(friendlyMessage(error));
      },

      /* Regresa { needsConfirmation: true } si Supabase pide confirmar el correo */
      signUp: async function (email, password) {
        const { data, error } = await client.auth.signUp({ email: email, password: password });
        if (error) throw new Error(friendlyMessage(error));
        return { needsConfirmation: !data.session };
      },

      signOut: async function () {
        await client.auth.signOut();
      },

      /* Reportes desde `since` (milisegundos), del más viejo al más nuevo */
      fetchReports: async function (since) {
        const { data, error } = await client
          .from('reports')
          .select(COLUMNS)
          .gte('created_at', new Date(since).toISOString())
          .order('created_at', { ascending: true })
          .limit(2000);
        if (error) throw new Error(friendlyMessage(error));
        return data.map(toReport);
      },

      /* Guarda un reporte. `photo` es un Blob o null */
      createReport: async function (user, report, photo) {
        let photoPath = null;
        if (photo) {
          photoPath = user.id + '/' + uniqueId() + '.jpg';
          const upload = await client.storage.from(config.photoBucket).upload(photoPath, photo, { contentType: 'image/jpeg' });
          if (upload.error) throw new Error('No se pudo subir la foto. ' + friendlyMessage(upload.error));
        }
        const { data, error } = await client
          .from('reports')
          .insert({
            restroom_id: report.restroomId,
            access: report.access,
            supplies: report.supplies,
            faults: report.faults,
            comment: report.comment || null,
            photo_path: photoPath
          })
          .select(COLUMNS)
          .single();
        if (error) throw new Error(friendlyMessage(error));
        return toReport(data);
      },

      /* Llama a `callback` con cada reporte nuevo que haga cualquier persona */
      subscribe: function (callback) {
        client
          .channel('reports')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, function (payload) {
            callback(toReport(payload.new));
          })
          .subscribe();
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Modo de prueba                                                      */
  /* ------------------------------------------------------------------ */

  /* Convierte SAMPLE_REPORTS de data.js en una lista de reportes con fecha */
  function buildDemoReports() {
    const now = Date.now();
    const reports = [];

    function add(restroomId, minutesAgo, sample) {
      const supplies = {};
      SUPPLIES.forEach(function (supply) {
        const reported = sample.supplies && sample.supplies[supply.key];
        supplies[supply.key] = reported ? reported[0] : 'si';
      });
      const faults = {};
      FAULTS.forEach(function (fault) {
        faults[fault.key] = Boolean(sample.faults && sample.faults[fault.key]);
      });
      reports.push({
        id: uniqueId(), restroomId: restroomId, at: now - minutesAgo * MINUTE,
        access: sample.access || 'abierto', supplies: supplies, faults: faults,
        comment: '', photoUrl: null, isStaff: false, userId: 'demo'
      });
    }

    for (let building = 1; building <= BUILDING_COUNT; building++) {
      GENDERS.forEach(function (gender, genderIndex) {
        const id = building + gender.key;
        /* Algunos baños se quedan sin reportes, para ver cómo se ven */
        if ((building * 2 + genderIndex) % 7 === 3) return;

        const sample = SAMPLE_REPORTS[id];
        const minutesAgo = sample ? sample.minutesAgo : 5 + ((building * 7 + genderIndex * 3) % 50);

        /* Un reporte inicial con todo en orden... */
        add(id, minutesAgo + 40, {});

        /* ...y, si tiene datos de ejemplo, varias personas que confirman el problema */
        if (sample) {
          const counts = [1]
            .concat(Object.values(sample.supplies || {}).map(function (s) { return s[1]; }))
            .concat(Object.values(sample.faults || {}));
          const people = Math.max.apply(null, counts);
          for (let i = people - 1; i >= 0; i--) add(id, minutesAgo + i, sample);
        }
      });
    }
    return reports.sort(function (a, b) { return a.at - b.at; });
  }

  function createDemoApi() {
    const reports = buildDemoReports();
    const listeners = [];
    let user = null;

    /* Simula el tiempo que tarda la red */
    function later(value) {
      return new Promise(function (resolve) { setTimeout(function () { resolve(value); }, 300); });
    }

    function setUser(newUser) {
      user = newUser;
      listeners.forEach(function (callback) { callback(user); });
    }

    function fakeSignIn(email, password) {
      if (!/^\S+@\S+\.\S+$/.test(email)) return Promise.reject(new Error('Escribe un correo válido.'));
      if (password.length < 6) return Promise.reject(new Error('La contraseña debe tener al menos 6 caracteres.'));
      return later().then(function () {
        setUser({ id: 'demo-' + email, email: email, role: /^intendencia/i.test(email) ? 'staff' : 'student' });
      });
    }

    return {
      mode: 'demo',

      getUser: function () { return Promise.resolve(user); },

      onAuthChange: function (callback) { listeners.push(callback); },

      signIn: fakeSignIn,

      signUp: function (email, password) {
        return fakeSignIn(email, password).then(function () { return { needsConfirmation: false }; });
      },

      signOut: function () {
        setUser(null);
        return Promise.resolve();
      },

      fetchReports: function (since) {
        return later(reports.filter(function (r) { return r.at >= since; }));
      },

      /* Aplica las mismas reglas anti-spam que la base de datos real */
      createReport: function (currentUser, report, photo) {
        const isStaff = currentUser.role === 'staff';
        const recent = reports.some(function (r) {
          return r.userId === currentUser.id && r.restroomId === report.restroomId && Date.now() - r.at < 10 * MINUTE;
        });
        if (!isStaff && recent) {
          return Promise.reject(new Error('Ya reportaste este baño hace poco. Espera unos minutos para volver a reportarlo.'));
        }
        const saved = Object.assign({}, report, {
          id: uniqueId(),
          at: Date.now(),
          photoUrl: photo ? URL.createObjectURL(photo) : null,
          isStaff: isStaff,
          userId: currentUser.id
        });
        reports.push(saved);
        return later(saved);
      },

      subscribe: function () {}
    };
  }

  const useSupabase = Boolean(config.supabaseUrl && config.supabaseKey && window.supabase);
  if (config.supabaseUrl && !window.supabase) {
    console.warn('No se pudo cargar Supabase desde el CDN; se usa el modo de prueba.');
  }

  App.api = useSupabase ? createSupabaseApi() : createDemoApi();
})(window.BanosFIME);

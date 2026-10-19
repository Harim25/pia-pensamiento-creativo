/*
  Configuración general y conexión con Supabase.

  Para conectar la base de datos, pega aquí la URL del proyecto y la llave
  PÚBLICA (en Supabase: Project Settings → API Keys → "Publishable key",
  empieza con sb_publishable_). Esa llave está hecha para ir en el navegador
  y se puede subir a GitHub; lo que protege los datos son las reglas de
  supabase/schema.sql.

  NUNCA pongas aquí la llave secreta (sb_secret_...).

  Si dejas los dos campos vacíos, la página funciona en modo de prueba con
  datos de ejemplo y nada se guarda.
*/
window.BanosFIME = window.BanosFIME || {};

window.BanosFIME.config = {
  supabaseUrl: '',
  supabaseKey: '',

  /* Horas que un reporte cuenta para el estado de un baño. Después caduca */
  reportLifetimeHours: 8,

  /* Nombre del bucket de Supabase Storage donde se guardan las fotos */
  photoBucket: 'report-photos',

  /* Tamaño máximo (en píxeles, por lado) al que se reducen las fotos antes de subirlas */
  photoMaxSize: 1280
};

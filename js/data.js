/*
  Catálogos y datos de ejemplo.
  Aquí se define QUÉ se puede reportar y con qué datos arranca la página.
  Para agregar un insumo, una falla o un edificio, basta con editar este archivo.
*/
window.BanosFIME = window.BanosFIME || {};

(function (App) {
  'use strict';

  /* Insumos. chip: texto corto de la etiqueta, noun: texto para "Hay ..." / "No hay ..." */
  const SUPPLIES = [
    { key: 'papel', label: 'Papel higiénico', chip: 'Papel', noun: 'papel higiénico' },
    { key: 'jabon', label: 'Jabón', chip: 'Jabón', noun: 'jabón' },
    { key: 'agua', label: 'Agua', chip: 'Agua', noun: 'agua' },
    { key: 'toallas', label: 'Papel para secar manos', chip: 'Toallas', noun: 'papel para secar manos' }
  ];

  /* Fallas de infraestructura */
  const FAULTS = [
    { key: 'puerta', label: 'Puerta de cubículo rota' },
    { key: 'cerrojo', label: 'Cerrojo dañado' },
    { key: 'dispensador', label: 'Dispensador descompuesto' },
    { key: 'fuga', label: 'Inodoro o lavabo tapado, o con fuga' },
    { key: 'luz', label: 'Sin luz' }
  ];

  /* Estados de acceso. feed: texto que aparece en "Reportes recientes" */
  const ACCESS_STATES = [
    { key: 'abierto', label: 'Abierto', feed: 'Está abierto' },
    { key: 'cerrado', label: 'Cerrado', feed: 'Está cerrado' },
    { key: 'mantenimiento', label: 'En mantenimiento', feed: 'Está en mantenimiento' },
    { key: 'limpieza', label: 'En limpieza', feed: 'Lo están limpiando' }
  ];

  /* Tipos de baño. El orden importa: coincide con el de FLOORS */
  const GENDERS = [
    { key: 'H', label: 'Hombres' },
    { key: 'M', label: 'Mujeres' }
  ];

  const BUILDING_COUNT = 12;

  /* DATO DE EJEMPLO. Piso del baño en cada edificio: [hombres, mujeres] */
  const FLOORS = {
    1: [1, 2], 2: [1, 2], 3: [3, 2], 4: [1, 1], 5: [1, 1], 6: [1.5, 2.5],
    7: [1, 1], 8: [2, 2], 9: [1.5, 2.5], 10: [3, 2], 11: [1, 2], 12: [2, 3]
  };

  /*
    DATOS DE EJEMPLO. Solo se usan en el modo de prueba (sin Supabase), para
    generar reportes falsos al abrir la página; ver buildDemoReports en api.js.
    Baños que arrancan con algún problema; los que no aparecen aquí arrancan
    en orden. La clave es edificio + tipo ('3M').
      access:     estado de acceso (si no se pone, está abierto)
      supplies:   insumo -> [valor ('si' | 'no'), número de confirmaciones]
      faults:     falla -> número de confirmaciones
      minutesAgo: minutos desde el último reporte
  */
  const SAMPLE_REPORTS = {
    '1H': { supplies: { papel: ['no', 3] }, faults: { cerrojo: 2 }, minutesAgo: 4 },
    '2H': { supplies: { jabon: ['no', 2] }, faults: { dispensador: 1 }, minutesAgo: 11 },
    '2M': { access: 'limpieza', minutesAgo: 2 },
    '3M': { supplies: { papel: ['no', 4], toallas: ['no', 2] }, minutesAgo: 7 },
    '4H': { faults: { puerta: 2 }, minutesAgo: 19 },
    '4M': { supplies: { agua: ['no', 3] }, minutesAgo: 6 },
    '5H': { access: 'mantenimiento', minutesAgo: 35 },
    '6H': { supplies: { papel: ['no', 2], jabon: ['no', 2] }, minutesAgo: 9 },
    '6M': { faults: { cerrojo: 3, dispensador: 2 }, minutesAgo: 14 },
    '7M': { supplies: { papel: ['no', 5] }, minutesAgo: 3 },
    '8H': { access: 'cerrado', minutesAgo: 48 },
    '9H': { supplies: { jabon: ['no', 1] }, faults: { dispensador: 3 }, minutesAgo: 22 },
    '10M': { faults: { fuga: 2 }, minutesAgo: 27 },
    '11H': { supplies: { papel: ['no', 2] }, minutesAgo: 16 },
    '12M': { faults: { luz: 1 }, minutesAgo: 41 }
  };

  App.data = { SUPPLIES, FAULTS, ACCESS_STATES, GENDERS, BUILDING_COUNT, FLOORS, SAMPLE_REPORTS };
})(window.BanosFIME);

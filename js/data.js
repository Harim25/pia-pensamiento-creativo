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

  /* Tipos de baño */
  const GENDERS = [
    { key: 'H', label: 'Hombres' },
    { key: 'M', label: 'Mujeres' }
  ];

  /*
    Edificios con baños para alumnos, en el orden en que aparecen en la página.
      key:   identificador corto, solo números o MAYÚSCULAS (máximo 5). El baño
             se guarda en la base de datos como key + H/M, por ejemplo '3M' o 'BIBH'.
             No lo cambies si ya hay reportes guardados, porque se perderían.
      name:  nombre que se muestra.
      plate: texto de la placa (el cuadrito verde).
      H, M:  baño de hombres y de mujeres, con el texto de su piso. Si un
             edificio no tiene uno de los dos, se quita esa parte.

    No se incluyen Aulas de Posgrado, CCPI y CIDET (los alumnos no pueden usar
    sus baños), el Centro de Desarrollo Físico y Cultural (al parecer solo para
    grupos artísticos) ni la Cafetería (no tiene baño). No existe Edificio 10.
  */
  const BUILDINGS = [
    { key: '1', name: 'Edificio 1', plate: '1', H: { floor: 'Piso 1' }, M: { floor: 'Piso 2' } },
    { key: '2', name: 'Edificio 2', plate: '2', H: { floor: 'Piso 1' }, M: { floor: 'Piso 2' } },
    { key: '3', name: 'Edificio 3', plate: '3', H: { floor: 'Piso 3' }, M: { floor: 'Piso 2' } },
    { key: '4', name: 'Edificio 4', plate: '4', H: { floor: 'Piso 1' }, M: { floor: 'Piso 1' } },
    { key: '5', name: 'Edificio 5', plate: '5', H: { floor: 'Piso 1' }, M: { floor: 'Piso 1' } },
    { key: '6', name: 'Edificio 6', plate: '6', H: { floor: 'Entre piso 2 y 3' }, M: { floor: 'Entre piso 1 y 2' } },
    { key: '7', name: 'Edificio 7', plate: '7', H: { floor: 'Piso 1' }, M: { floor: 'Piso 1' } },
    { key: '8', name: 'Edificio 8', plate: '8', H: { floor: 'Piso 2' }, M: { floor: 'Piso 2' } },
    { key: '9', name: 'Edificio 9', plate: '9', H: { floor: 'Entre piso 2 y 3' }, M: { floor: 'Entre piso 1 y 2' } },
    { key: '11', name: 'Edificio 11', plate: '11', H: { floor: 'Entre piso 2 y 3' }, M: { floor: 'Entre piso 1 y 2' } },
    { key: '12', name: 'Edificio 12', plate: '12', H: { floor: 'Piso 1' }, M: { floor: 'Piso 1' } },
    { key: 'BIB', name: 'Biblioteca', plate: 'BIB', H: { floor: 'Piso 1' }, M: { floor: 'Piso 1' } },
    { key: 'POL', name: 'Polideportivo', plate: 'POL', H: { floor: 'Piso 1' }, M: { floor: 'Piso 1' } }
  ];

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
    '11H': { supplies: { papel: ['no', 2] }, minutesAgo: 16 },
    '12M': { faults: { luz: 1 }, minutesAgo: 41 },
    'BIBM': { faults: { fuga: 2 }, minutesAgo: 27 }
  };

  App.data = { SUPPLIES, FAULTS, ACCESS_STATES, GENDERS, BUILDINGS, SAMPLE_REPORTS };
})(window.BanosFIME);

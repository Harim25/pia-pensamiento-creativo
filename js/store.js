/*
  Estado de la aplicación: la lista de baños, los reportes recientes y las
  reglas para calcular el estado y aplicar un reporte. No toca el HTML.

  Hoy todo vive en memoria y se pierde al recargar. Cuando haya un servidor,
  este es el archivo que cambia: `restrooms` y `feed` se cargarían de ahí y
  `submitReport` enviaría el reporte en lugar de modificar los datos locales.
*/
(function (App) {
  'use strict';

  const { SUPPLIES, FAULTS, ACCESS_STATES, GENDERS, BUILDING_COUNT, FLOORS, SAMPLE_REPORTS } = App.data;
  const { MINUTE, lowerFirst } = App.utils;

  const startedAt = Date.now();

  /* --- Consultas a los catálogos --- */

  function genderLabel(key) {
    return GENDERS.find(function (g) { return g.key === key; }).label;
  }

  function accessState(key) {
    return ACCESS_STATES.find(function (a) { return a.key === key; });
  }

  function supplyPhrase(key, value) {
    const supply = SUPPLIES.find(function (s) { return s.key === key; });
    return (value === 'si' ? 'Hay ' : 'No hay ') + supply.noun;
  }

  function faultLabel(key) {
    return FAULTS.find(function (f) { return f.key === key; }).label;
  }

  /* --- Datos iniciales --- */

  /*
    Arma un baño a partir de los datos de ejemplo. Forma del objeto:
      { id, building, gender, floor, updatedAt,
        access:   { value, confirmations },
        supplies: { papel: { value: 'si' | 'no', confirmations }, ... },
        faults:   { puerta: { active, confirmations }, ... } }
  */
  function buildRestroom(building, gender, genderIndex) {
    const id = building + gender;
    const sample = SAMPLE_REPORTS[id] || {};

    const supplies = {};
    SUPPLIES.forEach(function (supply) {
      const reported = sample.supplies && sample.supplies[supply.key];
      supplies[supply.key] = reported
        ? { value: reported[0], confirmations: reported[1] }
        : { value: 'si', confirmations: 1 + ((building + genderIndex) % 3) };
    });

    const faults = {};
    FAULTS.forEach(function (fault) {
      const confirmations = (sample.faults && sample.faults[fault.key]) || 0;
      faults[fault.key] = { active: confirmations > 0, confirmations: confirmations };
    });

    const minutesAgo = sample.minutesAgo !== undefined
      ? sample.minutesAgo
      : 5 + ((building * 7 + genderIndex * 3) % 50);

    return {
      id: id,
      building: building,
      gender: gender,
      floor: FLOORS[building][genderIndex],
      access: {
        value: sample.access || 'abierto',
        confirmations: sample.access ? 1 : 1 + (building % 3)
      },
      supplies: supplies,
      faults: faults,
      updatedAt: startedAt - minutesAgo * MINUTE
    };
  }

  const restrooms = [];
  for (let building = 1; building <= BUILDING_COUNT; building++) {
    GENDERS.forEach(function (gender, genderIndex) {
      restrooms.push(buildRestroom(building, gender.key, genderIndex));
    });
  }

  /* Reportes recientes de ejemplo, del más nuevo al más viejo */
  const feed = [];
  restrooms.forEach(function (restroom) {
    const sample = SAMPLE_REPORTS[restroom.id];
    if (!sample) return;
    const texts = [];
    if (sample.access) texts.push(accessState(sample.access).feed);
    Object.keys(sample.supplies || {}).forEach(function (key) {
      texts.push(supplyPhrase(key, sample.supplies[key][0]));
    });
    Object.keys(sample.faults || {}).forEach(function (key) {
      texts.push(faultLabel(key));
    });
    feed.push({
      building: restroom.building,
      gender: restroom.gender,
      floor: restroom.floor,
      at: restroom.updatedAt,
      texts: texts
    });
  });
  feed.sort(function (a, b) { return b.at - a.at; });

  /* --- Reglas --- */

  function findRestroom(id) {
    return restrooms.find(function (r) { return r.id === id; });
  }

  /* Estado general de un baño. level: 'ok' | 'warn' | 'off' */
  function getStatus(restroom) {
    if (restroom.access.value !== 'abierto') {
      return { level: 'off', label: accessState(restroom.access.value).label, icon: 'i-off' };
    }
    const missingSupply = SUPPLIES.some(function (s) { return restroom.supplies[s.key].value === 'no'; });
    if (missingSupply) return { level: 'warn', label: 'Con faltantes', icon: 'i-warn' };
    const hasFault = FAULTS.some(function (f) { return restroom.faults[f.key].active; });
    if (hasFault) return { level: 'warn', label: 'Con fallas', icon: 'i-warn' };
    return { level: 'ok', label: 'En orden', icon: 'i-check' };
  }

  function activeFaultCount(restroom) {
    return FAULTS.filter(function (f) { return restroom.faults[f.key].active; }).length;
  }

  /*
    Aplica un reporte a un baño. Si la respuesta coincide con lo que ya se
    sabía, suma una confirmación; si es distinta, reemplaza el dato y
    reinicia el conteo.
      answers = {
        access:   'abierto' | 'cerrado' | 'mantenimiento' | 'limpieza',
        supplies: { papel: 'si' | 'no' | '?', ... }   ('?' = no sé, se ignora)
        faults:   { puerta: true | false, ... }
      }
    Regresa la lista de textos de lo que cambió (vacía si solo confirmó).
  */
  function submitReport(id, answers) {
    const restroom = findRestroom(id);
    const changes = [];

    if (answers.access === restroom.access.value) {
      restroom.access.confirmations++;
    } else {
      restroom.access = { value: answers.access, confirmations: 1 };
      changes.push(accessState(answers.access).feed);
    }

    SUPPLIES.forEach(function (supply) {
      const answer = answers.supplies[supply.key];
      const current = restroom.supplies[supply.key];
      if (answer === '?') return;
      if (answer === current.value) {
        current.confirmations++;
      } else {
        restroom.supplies[supply.key] = { value: answer, confirmations: 1 };
        changes.push(supplyPhrase(supply.key, answer));
      }
    });

    FAULTS.forEach(function (fault) {
      const reported = answers.faults[fault.key];
      const current = restroom.faults[fault.key];
      if (reported && current.active) {
        current.confirmations++;
      } else if (reported && !current.active) {
        restroom.faults[fault.key] = { active: true, confirmations: 1 };
        changes.push(fault.label);
      } else if (!reported && current.active) {
        restroom.faults[fault.key] = { active: false, confirmations: 0 };
        changes.push('Ya no hay: ' + lowerFirst(fault.label));
      }
    });

    restroom.updatedAt = Date.now();
    feed.unshift({
      building: restroom.building,
      gender: restroom.gender,
      floor: restroom.floor,
      at: restroom.updatedAt,
      texts: changes.length ? changes : ['Confirmó el estado actual']
    });

    return changes;
  }

  App.store = {
    restrooms, feed,
    genderLabel, accessState,
    findRestroom, getStatus, activeFaultCount, submitReport
  };
})(window.BanosFIME);

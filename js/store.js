/*
  Estado de la aplicación: la lista de baños, los reportes recientes y las
  reglas para calcular el estado de cada baño. No toca el HTML ni la red.

  El estado de un baño se calcula repasando sus reportes de las últimas
  horas (config.reportLifetimeHours), del más viejo al más nuevo. Si un
  reporte coincide con lo que ya se sabía, suma una confirmación; si es
  distinto, reemplaza el dato y reinicia el conteo. Los reportes más viejos
  caducan y dejan de contar.
*/
(function (App) {
  'use strict';

  const { SUPPLIES, FAULTS, ACCESS_STATES, GENDERS, BUILDINGS } = App.data;
  const { MINUTE, lowerFirst } = App.utils;

  const LIFETIME = App.config.reportLifetimeHours * 60 * MINUTE;
  const MAX_PHOTOS = 4;

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

  /* --- Baños --- */

  /*
    Forma de un baño:
      { id: '3M', building: '3', buildingName: 'Edificio 3', plate: '3', gender: 'M',
        floor: 'Piso 2', reportCount, updatedAt, photos: [{ url, at }],
        access:   { value, confirmations },
        supplies: { papel: { value: 'si' | 'no' | '?', confirmations }, ... },
        faults:   { puerta: { active, confirmations }, ... } }
    reportCount = 0 significa que no hay reportes recientes.
  */
  const restrooms = [];
  BUILDINGS.forEach(function (building) {
    GENDERS.forEach(function (gender) {
      const place = building[gender.key];
      if (!place) return;
      restrooms.push({
        id: building.key + gender.key,
        building: building.key,
        buildingName: building.name,
        plate: building.plate,
        gender: gender.key,
        floor: place.floor
      });
    });
  });

  /* "Edificio 3 · Mujeres" */
  function restroomName(restroom) {
    return restroom.buildingName + ' · ' + genderLabel(restroom.gender);
  }

  function resetRestroom(restroom) {
    restroom.reportCount = 0;
    restroom.updatedAt = null;
    restroom.photos = [];
    restroom.access = { value: 'abierto', confirmations: 0 };
    restroom.supplies = {};
    SUPPLIES.forEach(function (supply) {
      restroom.supplies[supply.key] = { value: '?', confirmations: 0 };
    });
    restroom.faults = {};
    FAULTS.forEach(function (fault) {
      restroom.faults[fault.key] = { active: false, confirmations: 0 };
    });
  }

  function findRestroom(id) {
    return restrooms.find(function (r) { return r.id === id; });
  }

  /*
    Aplica un reporte al estado de un baño.
    Regresa los textos de lo que cambió, para "Reportes recientes".
  */
  function applyReport(restroom, report) {
    const changes = [];

    if (report.access === restroom.access.value) {
      restroom.access.confirmations++;
    } else {
      restroom.access = { value: report.access, confirmations: 1 };
      changes.push(accessState(report.access).feed);
    }

    SUPPLIES.forEach(function (supply) {
      const answer = report.supplies[supply.key];
      const current = restroom.supplies[supply.key];
      if (answer !== 'si' && answer !== 'no') return; /* "No sé" no cuenta */
      if (answer === current.value) {
        current.confirmations++;
      } else {
        /* Si antes no se sabía nada, solo vale la pena avisar cuando falta algo */
        if (current.value !== '?' || answer === 'no') changes.push(supplyPhrase(supply.key, answer));
        restroom.supplies[supply.key] = { value: answer, confirmations: 1 };
      }
    });

    FAULTS.forEach(function (fault) {
      const reported = Boolean(report.faults[fault.key]);
      const current = restroom.faults[fault.key];
      if (reported && current.active) {
        current.confirmations++;
      } else if (reported) {
        restroom.faults[fault.key] = { active: true, confirmations: 1 };
        changes.push(fault.label);
      } else if (current.active) {
        restroom.faults[fault.key] = { active: false, confirmations: 0 };
        changes.push('Ya no hay: ' + lowerFirst(fault.label));
      }
    });

    return changes;
  }

  /* --- Reportes --- */

  let reports = [];   /* todos los reportes cargados, del más viejo al más nuevo */
  let feed = [];      /* reportes vigentes ya traducidos a texto, del más nuevo al más viejo */
  let oldestActiveAt = null;

  /* Recalcula todos los baños con los reportes que no han caducado */
  function rebuild() {
    const since = Date.now() - LIFETIME;
    restrooms.forEach(resetRestroom);
    feed = [];
    oldestActiveAt = null;

    reports.forEach(function (report) {
      if (report.at < since) return;
      const restroom = findRestroom(report.restroomId);
      if (!restroom) return;
      if (oldestActiveAt === null) oldestActiveAt = report.at;

      const wasUnknown = restroom.reportCount === 0;
      const changes = applyReport(restroom, report);
      restroom.reportCount++;
      restroom.updatedAt = report.at;
      if (report.photoUrl) {
        restroom.photos.unshift({ url: report.photoUrl, at: report.at });
        restroom.photos.length = Math.min(restroom.photos.length, MAX_PHOTOS);
      }

      let texts = changes;
      if (!texts.length) {
        if (report.isStaff) texts = ['El personal lo dejó en orden'];
        else if (wasUnknown) texts = ['Todo en orden'];
        else texts = ['Confirmó el estado actual'];
      }
      feed.unshift({
        id: report.id,
        restroom: restroom,
        at: report.at,
        texts: texts,
        comment: report.comment,
        photoUrl: report.photoUrl,
        isStaff: report.isStaff
      });
    });
  }

  function setReports(list) {
    reports = list.slice().sort(function (a, b) { return a.at - b.at; });
    rebuild();
  }

  /* Agrega un reporte nuevo. Regresa false si ya estaba (llega dos veces: al guardarlo y por tiempo real) */
  function addReport(report) {
    if (reports.some(function (r) { return r.id === report.id; })) return false;
    reports.push(report);
    reports.sort(function (a, b) { return a.at - b.at; });
    rebuild();
    return true;
  }

  /* true si algún reporte que contaba ya caducó (hay que recalcular) */
  function hasExpiredReports() {
    return oldestActiveAt !== null && oldestActiveAt < Date.now() - LIFETIME;
  }

  function getFeed() {
    return feed;
  }

  /* --- Reglas --- */

  /* Estado general de un baño. level: 'ok' | 'warn' | 'off' | 'unknown' */
  function getStatus(restroom) {
    if (!restroom.reportCount) {
      return { level: 'unknown', label: 'Sin reportes', icon: 'i-unknown' };
    }
    if (restroom.access.value !== 'abierto') {
      return { level: 'off', label: accessState(restroom.access.value).label, icon: 'i-off' };
    }
    const missingSupply = SUPPLIES.some(function (s) { return restroom.supplies[s.key].value === 'no'; });
    if (missingSupply) return { level: 'warn', label: 'Con faltantes', icon: 'i-warn' };
    if (activeFaultCount(restroom)) return { level: 'warn', label: 'Con fallas', icon: 'i-warn' };
    return { level: 'ok', label: 'En orden', icon: 'i-check' };
  }

  function hasProblems(restroom) {
    const level = getStatus(restroom).level;
    return level === 'warn' || level === 'off';
  }

  function activeFaultCount(restroom) {
    return FAULTS.filter(function (f) { return restroom.faults[f.key].active; }).length;
  }

  /* Lo que el personal tiene que hacer en un baño */
  function pendingTasks(restroom) {
    const tasks = [];
    SUPPLIES.forEach(function (supply) {
      if (restroom.supplies[supply.key].value === 'no') tasks.push('Reponer ' + supply.noun);
    });
    FAULTS.forEach(function (fault) {
      if (restroom.faults[fault.key].active) tasks.push('Revisar: ' + lowerFirst(fault.label));
    });
    if (restroom.access.value !== 'abierto') tasks.push('Reportado como ' + lowerFirst(accessState(restroom.access.value).label));
    return tasks;
  }

  /* Reporte con todo en orden (lo usa el personal al marcar un baño como atendido) */
  function allGoodReport(restroomId, comment) {
    const supplies = {};
    SUPPLIES.forEach(function (s) { supplies[s.key] = 'si'; });
    const faults = {};
    FAULTS.forEach(function (f) { faults[f.key] = false; });
    return { restroomId: restroomId, access: 'abierto', supplies: supplies, faults: faults, comment: comment || '' };
  }

  App.store = {
    LIFETIME,
    restrooms,
    genderLabel, accessState, restroomName,
    findRestroom, getStatus, hasProblems, activeFaultCount, pendingTasks, allGoodReport,
    setReports, addReport, rebuild, hasExpiredReports, getFeed
  };
})(window.BanosFIME);

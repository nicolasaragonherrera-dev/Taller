/**
 * MASTI MOTOR — Piloto automático de citas
 * ----------------------------------------
 * Recibe las solicitudes del formulario de la web y:
 *   1. Las guarda en la hoja «Citas» (registro de coches).
 *   2. Crea un evento AMARILLO «PENDIENTE» en Google Calendar.
 *   3. Envía un aviso al Gmail del taller.
 *
 * Instalación: ver automatizacion/GUIA.md (10 minutos, gratis).
 */

const CONFIG = {
  calendario: 'primary',      // calendario principal del Gmail del taller
  duracionMin: 60,            // duración por defecto de la cita
  horaManana: 8,              // franja «Mañana» → 08:00
  horaTarde: 15,              // franja «Tarde»  → 15:00
  zona: 'Europe/Madrid',
};

const COLUMNAS = ['Recibida', 'Estado', 'Día', 'Franja', 'Nombre', 'Teléfono',
                  'Matrícula', 'Vehículo', 'Servicio', 'Qué nota', 'Evento'];

/** Punto de entrada de la web (POST). */
function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.web) return ok_();                                   // trampa antispam
  if (!p.nombre || !p.telefono) return ok_();                // datos mínimos

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cita = limpiar_(p);
    const evento = crearEvento_(cita);
    guardarFila_(cita, evento);
    avisar_(cita, evento);
  } finally {
    lock.releaseLock();
  }
  return ok_();
}

/** Comprobación desde el navegador: abre la URL y debe decir «Masti Motor OK». */
function doGet() {
  return ContentService.createTextOutput('Masti Motor OK');
}

function limpiar_(p) {
  const t = v => String(v || '').trim().slice(0, 500);
  return {
    nombre: t(p.nombre),
    telefono: t(p.telefono),
    matricula: t(p.matricula).toUpperCase().replace(/\s+/g, ''),
    vehiculo: t(p.vehiculo),
    servicio: t(p.servicio) || 'Sin especificar',
    fecha: t(p.fecha),            // AAAA-MM-DD o vacío
    franja: t(p.franja),
    mensaje: t(p.mensaje),
  };
}

/** Día pedido, o el siguiente día laborable si no indica ninguno. */
function diaCita_(cita) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(cita.fecha)) {
    const [y, m, d] = cita.fecha.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date();
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}

function crearEvento_(cita) {
  const cal = CONFIG.calendario === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CONFIG.calendario);

  const dia = diaCita_(cita);
  const titulo = ['PENDIENTE', cita.matricula || 'Sin matrícula', cita.vehiculo, cita.servicio, cita.nombre]
    .filter(Boolean).join(' · ');
  const descripcion = [
    'Solicitud desde la web — LLAMAR PARA CONFIRMAR',
    '',
    `Cliente: ${cita.nombre}`,
    `Teléfono: ${cita.telefono}`,
    `Matrícula: ${cita.matricula || '—'}`,
    `Vehículo: ${cita.vehiculo || '—'}`,
    `Servicio: ${cita.servicio}`,
    `Franja pedida: ${cita.franja || 'Me da igual'}${cita.fecha ? '' : ' (no indicó día)'}`,
    `Qué nota: ${cita.mensaje || '—'}`,
  ].join('\n');

  let ev;
  if (/Mañana|Tarde/.test(cita.franja)) {
    const inicio = new Date(dia);
    inicio.setHours(/Tarde/.test(cita.franja) ? CONFIG.horaTarde : CONFIG.horaManana, 0, 0, 0);
    const fin = new Date(inicio.getTime() + CONFIG.duracionMin * 60000);
    ev = cal.createEvent(titulo, inicio, fin, { description: descripcion });
  } else {
    ev = cal.createAllDayEvent(titulo, dia, { description: descripcion });
  }
  ev.setColor(CalendarApp.EventColor.YELLOW);
  return ev;
}

function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Citas');
  if (!sh) {
    sh = ss.insertSheet('Citas');
    sh.appendRow(COLUMNAS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold').setBackground('#1F2C6C').setFontColor('#FFCC00');
  }
  return sh;
}

function guardarFila_(cita, ev) {
  const f = d => Utilities.formatDate(d, CONFIG.zona, 'dd/MM/yyyy HH:mm');
  hoja_().appendRow([
    f(new Date()), 'Pendiente',
    Utilities.formatDate(diaCita_(cita), CONFIG.zona, 'dd/MM/yyyy'),
    cita.franja || 'Me da igual',
    cita.nombre, "'" + cita.telefono, cita.matricula, cita.vehiculo,
    cita.servicio, cita.mensaje, ev.getId(),
  ]);
}

function avisar_(cita, ev) {
  const yo = Session.getEffectiveUser().getEmail();
  const dia = Utilities.formatDate(ev.getStartTime(), CONFIG.zona, 'EEEE dd/MM');
  MailApp.sendEmail({
    to: yo,
    subject: `🔧 Nueva cita web: ${cita.matricula || cita.vehiculo || cita.nombre} · ${cita.servicio}`,
    body: [
      `${cita.nombre} pide cita para ${dia} (${cita.franja || 'sin franja'}).`,
      '',
      `Teléfono: ${cita.telefono}`,
      `Matrícula: ${cita.matricula || '—'} · Vehículo: ${cita.vehiculo || '—'}`,
      `Servicio: ${cita.servicio}`,
      `Qué nota: ${cita.mensaje || '—'}`,
      '',
      'Ya está en el calendario en AMARILLO como PENDIENTE.',
      'Llama al cliente y luego dile a Gemini: «Confirma la cita de ' + (cita.matricula || cita.nombre) + '».',
    ].join('\n'),
  });
}

function ok_() {
  return ContentService.createTextOutput('ok');
}

/** Ejecutar UNA vez a mano desde el editor para dar permisos y probar. */
function probar() {
  doPost({ parameter: {
    nombre: 'Prueba', telefono: '600000000', matricula: '1234ABC', vehiculo: 'Seat León',
    servicio: 'Electrónica y diagnosis', fecha: '', franja: 'Mañana (08–13)', mensaje: 'Testigo motor encendido',
  }});
}

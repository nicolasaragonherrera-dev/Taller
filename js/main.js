/* MASTI MOTOR — interacción y movimiento.
   Sin dependencias. Todo funciona sin JS; esto lo mejora. */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Intro ---------- */
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-loaded')));

  /* ---------- Año ---------- */
  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- Estado abierto / cerrado (hora de Madrid) ---------- */
  const SHIFTS = [[8 * 60, 13 * 60], [15 * 60, 19 * 60]];
  const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  function madridNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day: wd, min: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10) };
  }

  function nextOpening(day, min) {
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7;
      if (d === 0 || d === 6) continue;
      for (const [o] of SHIFTS) {
        if (i > 0 || o > min) {
          const when = i === 0 ? 'hoy' : i === 1 ? 'mañana' : `el ${DAYS[d]}`;
          return `abre ${when} a las ${fmt(o)}`;
        }
      }
    }
    return '';
  }

  function updateStatus() {
    const { day, min } = madridNow();
    const workday = day >= 1 && day <= 5;
    const shift = workday && SHIFTS.find(([o, c]) => min >= o && min < c);
    const text = shift
      ? `Abierto ahora · hasta las ${fmt(shift[1])}`
      : `Cerrado · ${nextOpening(day, min)}`;
    $$('[data-status]').forEach(el => {
      el.classList.toggle('is-open', !!shift);
      el.classList.toggle('is-closed', !shift);
      $('[data-status-text]', el).textContent = text;
    });
    $$('.hours__table tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === day));
  }
  updateStatus();
  setInterval(updateStatus, 60_000);

  /* ---------- Header: estado scroll, progreso, dock ---------- */
  const hdr = $('[data-hdr]');
  const bar = $('[data-progress]');
  const dock = $('[data-dock]');
  const heroActions = $('.hero__actions');
  const book = $('#reserva');
  let heroCtaVisible = true, bookVisible = false;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { heroCtaVisible = e.isIntersecting; syncDock(); }).observe(heroActions);
    new IntersectionObserver(([e]) => { bookVisible = e.isIntersecting; syncDock(); }, { threshold: .15 }).observe(book);
  }
  function syncDock() { dock.classList.toggle('is-visible', !heroCtaVisible && !bookVisible); }

  let scrollP = 0;
  function onScroll() {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollP = max > 0 ? y / max : 0;
    hdr.classList.toggle('is-scrolled', y > 8);
    bar.style.transform = `scaleX(${scrollP})`;
    updateMethod();
    updateStretch();
    updateFacade();
  }
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menú móvil ---------- */
  const menu = $('[data-menu]');
  const menuBtn = $('[data-menu-btn]');
  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    if (open) $('a', menu).focus();
  }
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  matchMedia('(min-width: 761px)').addEventListener('change', e => e.matches && setMenu(false));

  /* ---------- Reveal ---------- */
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const sibs = [...e.target.parentElement.children].filter(n => n.hasAttribute('data-reveal'));
        e.target.style.transitionDelay = `${Math.min(sibs.indexOf(e.target), 5) * 70}ms`;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- Nav activa ---------- */
  const navLinks = $$('.nav a');
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(l => l.classList.toggle('is-active', l.hash === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(a => { const el = $(a.hash); if (el) navIO.observe(el); });

  /* ---------- Método: paso actual + calibre ---------- */
  const steps = $$('[data-step]');
  const gauge = $('[data-gauge]');
  const methodSec = $('#metodo');
  function updateMethod() {
    if (!steps.length) return;
    const mid = innerHeight * .5;
    let current = 0;
    steps.forEach((s, i) => { if (s.getBoundingClientRect().top < mid) current = i; });
    steps.forEach((s, i) => s.classList.toggle('is-current', i === current));
    const r = methodSec.getBoundingClientRect();
    const p = clamp((mid - r.top) / (r.height - innerHeight * .3), 0, 1);
    gauge.style.transform = `scaleX(${p})`;
  }

  /* ---------- «Masti-Loidi 15»: la anchura tipográfica responde al scroll ---------- */
  const stretch = $('[data-stretch]');
  function updateStretch() {
    if (!stretch || reduced) return;
    const r = stretch.getBoundingClientRect();
    const p = clamp(1 - (r.top + r.height / 2) / innerHeight, 0, 1);
    stretch.style.setProperty('--w', (62 + p * 40).toFixed(1));
  }

  /* ---------- Nave 15: la persiana sube con el scroll ---------- */
  const facade = $('[data-facade]');
  function updateFacade() {
    if (!facade || reduced) return;
    const r = facade.getBoundingClientRect();
    const p = clamp((innerHeight * .85 - r.top) / (r.height * .7), 0, 1);
    facade.style.setProperty('--open', (p * p * (3 - 2 * p)).toFixed(3));
  }

  /* ---------- Contadores ---------- */
  const counters = $$('[data-count]');
  if ('IntersectionObserver' in window && !reduced) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target, to = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0);
        const t0 = performance.now(), dur = 1400;
        const step = now => {
          const k = clamp((now - t0) / dur, 0, 1), eased = 1 - Math.pow(1 - k, 4);
          el.textContent = (to * eased).toFixed(dec).replace('.', ',');
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        cio.unobserve(el);
      });
    }, { threshold: .6 });
    counters.forEach(c => cio.observe(c));
  }

  /* ---------- Botones magnéticos (solo escritorio) ---------- */
  if (finePointer && !reduced) {
    $$('[data-magnet]').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * .18;
        const y = (e.clientY - r.top - r.height / 2) * .3;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('pointerleave', () => (btn.style.transform = ''));
    });
  }

  /* =========================================================
     LA SEÑAL — recurso gráfico propietario.
     Izquierda: ruido (el síntoma). Derecha: señal limpia (el diagnóstico).
     El scroll «diagnostica»: cuanto más avanzas, menos ruido.
     El cursor perturba la traza localmente.
     ========================================================= */
  const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  const vnoise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function makeSignal(svg, mode) {
    const trace = $('.signal__trace', svg);
    const grid = $('.signal__grid', svg);
    let W = 0, H = 0, visible = false, raf = 0;
    let pointerX = -1, pointerAmt = 0, pointerTarget = 0;

    function size() {
      const r = svg.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const mid = H / 2;
      let g = `M0 ${mid} H${W}`;
      for (let x = 0; x <= W; x += 32) g += ` M${x} ${mid - 3} V${mid + 3}`;
      for (let x = 0; x <= W; x += 160) g += ` M${x} ${mid - 9} V${mid + 9}`;
      grid.setAttribute('d', g);
    }

    function draw(t) {
      const mid = H / 2, amp = H * .46;
      const step = W < 600 ? 3 : 4;
      const calm = mode === 'hero' ? clamp(scrollP * 3, 0, .85) : 1;
      pointerAmt += (pointerTarget - pointerAmt) * .08;
      let d = '';
      for (let x = 0; x <= W; x += step) {
        const u = x / W;
        let y;
        if (mode === 'hero') {
          // envolvente del ruido: fuerte a la izquierda, se apaga hacia el centro
          const noiseEnv = (1 - smooth(.18, .62, u)) * (1 - calm);
          const n = (vnoise(x * .045 + t * 2.2) - .5) * 1.6 + (vnoise(x * .17 - t * 3.1) - .5) * .9 + Math.sin(x * .09 + t * 5) * .15;
          // señal limpia: pulso periódico
          const cleanEnv = smooth(.45, .75, u);
          const ph = ((x - t * 90) % 120 + 120) % 120;
          const pulse = ph < 6 ? -Math.sin(ph / 6 * Math.PI) * .75 : ph < 14 ? Math.sin((ph - 6) / 8 * Math.PI) * .28 : 0;
          y = n * noiseEnv * .9 + pulse * cleanEnv * .7 + Math.sin(x * .02 + t) * .04;
          if (pointerX >= 0) {
            const g = Math.exp(-Math.pow((x - pointerX) / 70, 2));
            y += (vnoise(x * .2 + t * 8) - .5) * 1.4 * g * pointerAmt;
          }
        } else {
          const ph = ((x - t * 60) % 180 + 180) % 180;
          y = ph < 8 ? -Math.sin(ph / 8 * Math.PI) * .8 : ph < 20 ? Math.sin((ph - 8) / 12 * Math.PI) * .25 : 0;
        }
        d += (x ? 'L' : 'M') + x + ' ' + (mid + y * amp).toFixed(1);
      }
      trace.setAttribute('d', d);
    }

    function loop(now) {
      draw(now / 1000);
      if (visible) raf = requestAnimationFrame(loop);
    }

    size(); draw(0);
    new ResizeObserver(() => { size(); draw(performance.now() / 1000); }).observe(svg);

    if (reduced) return;
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    }).observe(svg);

    if (mode === 'hero' && finePointer) {
      const hero = svg.closest('.hero');
      hero.addEventListener('pointermove', e => {
        const r = svg.getBoundingClientRect();
        pointerX = e.clientX - r.left; pointerTarget = 1;
      });
      hero.addEventListener('pointerleave', () => (pointerTarget = 0));
    }
  }
  $$('[data-signal]').forEach(svg => makeSignal(svg, svg.dataset.signal));

  /* ---------- Servicio preseleccionado desde los canales ---------- */
  const form = $('[data-form]');
  $$('[data-service]').forEach(a => a.addEventListener('click', () => {
    const r = $(`input[name="servicio"][value="${a.dataset.service}"]`, form);
    if (r) r.checked = true;
  }));

  /* ---------- Formulario ---------- */
  const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  $('#f-date').min = today.toISOString().slice(0, 10);
  $('#f-plate').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });

  function setErr(field, msg) {
    const wrap = field.closest('.field');
    wrap.classList.toggle('has-error', !!msg);
    const err = $('.field__err', wrap);
    if (err) err.textContent = msg || '';
    const input = wrap.querySelector('input, textarea, select');
    if (input && input.type !== 'radio') input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form.web.value) return; // trampa antispam
    const name = form.nombre, tel = form.telefono;
    const service = form.querySelector('input[name="servicio"]:checked');
    let firstBad = null;

    const nameOk = name.value.trim().length >= 2;
    setErr(name, nameOk ? '' : 'Dinos tu nombre.');
    if (!nameOk) firstBad = firstBad || name;

    const digits = tel.value.replace(/\D/g, '');
    const telOk = digits.length >= 9;
    setErr(tel, telOk ? '' : 'Necesitamos un teléfono para confirmarte la cita.');
    if (!telOk) firstBad = firstBad || tel;

    const srvField = $('.chips', form);
    $('.field__err', srvField).textContent = service ? '' : 'Elige una opción (puede ser «No lo sé»).';
    if (!service) firstBad = firstBad || $('input[name="servicio"]', form);

    if (firstBad) { firstBad.focus(); return; }

    const lines = [
      'Solicitud de cita — web Garaje Masti Motor', '',
      `Nombre: ${name.value.trim()}`,
      `Teléfono: ${tel.value.trim()}`,
      `Matrícula: ${form.matricula.value.trim() || '—'}`,
      `Vehículo: ${form.vehiculo.value.trim() || '—'}`,
      `Servicio: ${service.value}`,
      `Día preferido: ${form.fecha.value || '—'}`,
      `Franja: ${form.franja.value || 'Me da igual'}`, '',
      `Qué nota: ${form.mensaje.value.trim() || '—'}`
    ];
    const subject = `Cita — ${service.value} — ${name.value.trim()}`;
    const done = $('[data-done]', form);
    const btn = $('button[type="submit"]', form);
    const endpoint = form.dataset.endpoint;
    let sent = false;

    // Piloto automático: Apps Script crea la cita en Google Calendar + hoja + aviso por correo
    if (endpoint) {
      btn.disabled = true;
      try {
        const data = new URLSearchParams(new FormData(form));
        data.set('servicio', service.value);
        await fetch(endpoint, { method: 'POST', mode: 'no-cors', body: data });
        sent = true;
      } catch (_) { /* sin red: cae al correo */ }
      btn.disabled = false;
    }

    if (!sent) {
      location.href = `mailto:mastimotor@yahoo.es?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
      $('[data-done-k]', form).textContent = 'Solicitud preparada';
      $('[data-done-t]', form).textContent = 'Envía el correo que se ha abierto y te llamamos para confirmar.';
      $('[data-done-p]', form).innerHTML = '¿No se ha abierto tu correo? Llámanos al <a href="tel:+34943010950">943 01 09 50</a>.';
    } else {
      form.querySelectorAll('input:not([type=radio]), textarea, select').forEach(el => { if (el.name !== 'web') el.value = ''; });
    }
    done.hidden = false;
    done.focus();
  });

  /* ---------- Logotipo del footer: ajustado al ancho exacto ---------- */
  const word = $('.ftr__word');
  function fitWord() {
    word.style.setProperty('--fit', '100px');
    const avail = word.parentElement.clientWidth - parseFloat(getComputedStyle(word.parentElement).paddingLeft) * 2;
    const range = document.createRange(); range.selectNodeContents(word);
    word.style.setProperty('--fit', `${(98 * avail / range.getBoundingClientRect().width).toFixed(2)}px`);
  }
  if (document.fonts) document.fonts.ready.then(fitWord); else fitWord();
  let lastW = 0;
  addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; fitWord(); } }, { passive: true });

  onScroll();
})();

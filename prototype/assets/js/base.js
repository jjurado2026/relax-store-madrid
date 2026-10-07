/* =====================================================================================
   RELAX STORE LAS ROZAS — «Cota» · base.js
   window.RS: visibilidad y bucles, revelar al entrar, cotas, horario en vivo (hora de
   Madrid), WhatsApp con mensaje, la cesta compartida del hueco, el METRO, menú del móvil,
   cabecera, hero (entrada y bucles) y barra fija. Sin dependencias.
   Guía para las secciones: _interno/modulos/GUIA-SECCIONES.md
   ===================================================================================== */
(() => {
  'use strict';
  const raiz = document.documentElement;
  const QUIETO = raiz.classList.contains('quieto') || !raiz.classList.contains('anima');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const parametro = n => new URLSearchParams(location.search).get(n);
  const RS = window.RS = Object.assign(window.RS || {}, { quieto: QUIETO, anima: !QUIETO, $, $$, parametro });

  /* -----------------------------------------------------------------------------------
     1 · BUCLES: solo corren con el elemento en pantalla y la pestaña visible
     RS.bucle(el, { cada: ms, paso(b) })            → intervalo
     RS.bucle(el, { animar(dt, t, b) })             → requestAnimationFrame (dt en ms, máx. 64)
     RS.bucle(el, { alActivar(b), alPausar(b) })    → arranque y parada propios (p. ej. WAAPI)
     Opción pausaConCursor: true → se para con el cursor, el foco o el dedo encima.
     Devuelve b: { activo, pausar(motivo), seguir(motivo), parar(), reanudar() }.
     En .quieto nunca arranca.
     ----------------------------------------------------------------------------------- */
  const bucles = new Set();
  const porElemento = new Map();
  const enPantalla = new WeakMap();
  const ioBucle = new IntersectionObserver(es => {
    for (const e of es) {
      enPantalla.set(e.target, e.isIntersecting);
      e.target.classList.toggle('en-pantalla', e.isIntersecting);
      const lista = porElemento.get(e.target);
      if (lista) lista.forEach(b => { b.enPantalla = e.isIntersecting; b.revisar(); });
    }
  }, { rootMargin: '60px 0px' });
  RS.vigilar = el => { if (el && !porElemento.has(el)) { porElemento.set(el, new Set()); ioBucle.observe(el); } };

  RS.bucle = (el, op = {}) => {
    const b = { el, op, enPantalla: !!enPantalla.get(el), pausas: new Set(), activo: false, detenido: false, _i: 0, _r: 0, _t: 0 };
    const puede = () => !QUIETO && b.enPantalla && !document.hidden && !b.pausas.size && !b.detenido;
    const arrancar = () => {
      b.activo = true;
      if (op.cada) b._i = setInterval(() => op.paso && op.paso(b), op.cada);
      if (op.animar) {
        const f = t => { if (!b.activo) return; const dt = b._t ? Math.min(64, t - b._t) : 16; b._t = t; op.animar(dt, t, b); b._r = requestAnimationFrame(f); };
        b._r = requestAnimationFrame(f);
      }
      op.alActivar && op.alActivar(b);
    };
    const detener = () => { b.activo = false; clearInterval(b._i); cancelAnimationFrame(b._r); b._t = 0; op.alPausar && op.alPausar(b); };
    b.revisar = () => { const p = puede(); if (p && !b.activo) arrancar(); else if (!p && b.activo) detener(); return b; };
    b.pausar = (motivo = 'manual') => { b.pausas.add(motivo); return b.revisar(); };
    b.seguir = (motivo = 'manual') => { b.pausas.delete(motivo); return b.revisar(); };
    b.parar = () => { b.detenido = true; return b.revisar(); };
    b.reanudar = () => { b.detenido = false; return b.revisar(); };
    if (op.pausaConCursor) {
      let reloj = 0;
      el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') b.pausar('cursor'); });
      el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') b.seguir('cursor'); });
      el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { clearTimeout(reloj); b.pausar('dedo'); } });
      const soltar = e => { if (e.pointerType !== 'mouse') { clearTimeout(reloj); reloj = setTimeout(() => b.seguir('dedo'), 2500); } };
      el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
      el.addEventListener('focusin', () => b.pausar('foco'));
      el.addEventListener('focusout', e => { if (!el.contains(e.relatedTarget)) b.seguir('foco'); });
    }
    bucles.add(b);
    RS.vigilar(el);
    porElemento.get(el).add(b);
    return b.revisar();
  };
  document.addEventListener('visibilitychange', () => {
    raiz.classList.toggle('pestana-oculta', document.hidden);
    bucles.forEach(b => b.revisar());
  });
  // congela todo (capturas de un fotograma)
  RS.pausarTodo = () => { document.getAnimations().forEach(a => a.pause()); bucles.forEach(b => b.parar()); };

  /* -----------------------------------------------------------------------------------
     2 · REVELAR AL ENTRAR: [data-revelar] recibe .dentro una vez, cuando su borde superior
     pasa el 88 % de la pantalla. RS.revelar(el, fn) añade una llamada a ese momento.
     En .quieto, todo entra a la vez y en su estado final.
     ----------------------------------------------------------------------------------- */
  const llamadas = new WeakMap();
  const entrar = el => {
    el._revelado = true; el.classList.add('dentro');
    const fns = llamadas.get(el); llamadas.delete(el);
    if (fns) fns.forEach(f => f(el));
  };
  const ioRevelar = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { ioRevelar.unobserve(e.target); entrar(e.target); }
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0 });
  RS.revelar = (el, fn) => {
    if (!el) return;
    if (el._revelado) { fn && fn(el); return; }
    if (fn) { if (!llamadas.has(el)) llamadas.set(el, []); llamadas.get(el).push(fn); }
    if (QUIETO) entrar(el); else ioRevelar.observe(el);
  };

  /* -----------------------------------------------------------------------------------
     3 · LA COTA
     RS.cota.medir(el)                  abre la cota (línea desde el centro, puntas con muelle)
     RS.cota.cerrar(el)                 la cierra
     RS.cota.remedir(el, frase, firma)  se cierra, cambia el rótulo y vuelve a medir (Promise)
     RS.cota.html(frase, firma, clases) marcado listo para insertar
     ----------------------------------------------------------------------------------- */
  RS.cota = {
    medir(el) {
      if (!el) return;
      el.classList.add('is-referida');
      if (QUIETO) el.classList.add('is-medida');
      else requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-medida')));
    },
    cerrar(el) { el && el.classList.remove('is-medida'); },
    remedir(el, frase, firma) {
      return new Promise(fin => {
        if (!el) return fin();
        const poner = () => {
          if (frase != null) { const f = $('.cota__frase', el); if (f) f.textContent = frase; }
          if (firma != null) { const g = $('.cota__firma', el); if (g) g.textContent = firma; }
        };
        if (QUIETO) { poner(); el.classList.add('is-referida', 'is-medida'); return fin(); }
        el.classList.remove('is-medida');
        setTimeout(() => { poner(); requestAnimationFrame(() => el.classList.add('is-medida')); setTimeout(fin, 820); }, 320);
      });
    },
    html(frase = '', firma = '', clases = '', atributos = 'data-cota') {
      const t = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      return `<div class="cota ${clases}" ${atributos} aria-hidden="true"><span class="cota__ref cota__ref--ini"></span><span class="cota__ref cota__ref--fin"></span><span class="cota__linea"></span><span class="cota__punta cota__punta--ini"></span><span class="cota__punta cota__punta--fin"></span><span class="cota__texto">${frase ? `<span class="cota__frase">${t(frase)}</span>` : ''}${firma ? `<span class="cota__firma">${t(firma)}</span>` : ''}</span></div>`;
    }
  };

  /* -----------------------------------------------------------------------------------
     4 · HORARIO Y ESTADO EN VIVO (ficha de Google: L-S 11:15–13:45 y 17:30–20:30)
     RS.ahora()  → { dia (0 dom … 6 sáb), min (desde las 00:00), fijada }   hora de Madrid;
                   ?ahora=2026-10-07T12:30 la fija (para capturas y pruebas)
     RS.estado() → { abierto, texto, dia, min, hoyAbre, proximo }
     Pinta todos los [data-estado] (clases .abierto / .cerrado) y emite «rs:estado».
     ----------------------------------------------------------------------------------- */
  const HORARIO = RS.HORARIO = {
    dias: [1, 2, 3, 4, 5, 6],
    tramos: [[675, 825], [1050, 1230]],
    nombres: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    texto: 'De lunes a sábado, de 11:15 a 13:45 y de 17:30 a 20:30. Domingo, cerrado.'
  };
  const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  RS.hhmm = hhmm;
  RS.ahora = () => {
    const p = parametro('ahora');
    const m = p && p.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/);
    if (m) return { dia: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay(), min: (+m[4]) * 60 + (+m[5]), fijada: true };
    const x = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(q => [q.type, q.value]));
    const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { dia: dias[x.weekday] ?? new Date().getDay(), min: ((+x.hour) % 24) * 60 + (+x.minute), fijada: false };
  };
  RS.estado = (a = RS.ahora()) => {
    const { dia, min } = a, [[a1, c1], [a2, c2]] = HORARIO.tramos, hoyAbre = HORARIO.dias.includes(dia);
    let sig = 1; while (!HORARIO.dias.includes((dia + sig) % 7) && sig < 7) sig++;
    const proximo = sig === 1 ? 'mañana' : `el ${HORARIO.nombres[(dia + sig) % 7]}`;
    let abierto = false, texto;
    if (hoyAbre && ((min >= a1 && min < c1) || (min >= a2 && min < c2))) {
      abierto = true;
      const cierra = min < c1 ? c1 : c2, falta = cierra - min;
      texto = falta <= 30 ? `Abierto, cierra en ${falta} min` : `Abierto ahora, hasta las ${hhmm(cierra)}`;
    } else if (hoyAbre && min < a1) texto = `Cerrado, abre hoy a las ${hhmm(a1)}`;
    else if (hoyAbre && min < a2) texto = `Cerrado a mediodía, abre a las ${hhmm(a2)}`;
    else texto = `Cerrado, abre ${proximo} a las ${hhmm(a1)}`;
    return { abierto, texto, dia, min, hoyAbre, proximo };
  };
  RS.pintarEstado = (contenedor = document) => {
    const e = RS.estado();
    $$('[data-estado]', contenedor).forEach(el => { el.textContent = e.texto; el.classList.toggle('abierto', e.abierto); el.classList.toggle('cerrado', !e.abierto); });
    document.dispatchEvent(new CustomEvent('rs:estado', { detail: e }));
    return e;
  };
  setInterval(() => { if (!document.hidden) RS.pintarEstado(); }, 60000);

  /* -----------------------------------------------------------------------------------
     5 · WHATSAPP Y LA CESTA DEL HUECO
     RS.whatsapp(texto)       → https://wa.me/34660969906?text=…
     RS.preguntarPor(modelo)  → enlace con el mensaje de ese modelo (y la medida, si la hay)
     RS.hueco = { medida, modelos[], datos{} }: lo comparten el hero, las postales y el croquis.
       .set({ medida, …datos }, origen) · .anadir(m) · .quitar(m) · .alternar(m) → bool · .tiene(m)
       .mensaje() · .enlace() · .on(fn) → función para dejar de escuchar
       .redactar = h => texto   (opcional: el croquis lo define para redactar el mensaje completo)
     Cada cambio emite «rs:hueco» en document con { medida, modelos, datos, cambio, origen, modelo }
     y actualiza todos los a[data-wa] (salvo data-wa="propio").
     ----------------------------------------------------------------------------------- */
  const WA_NUM = '34660969906';
  RS.TEL = '+34916319222';
  RS.whatsapp = texto => `https://wa.me/${WA_NUM}` + (texto ? `?text=${encodeURIComponent(texto)}` : '');
  const enumerar = l => l.length <= 1 ? (l[0] || '') : `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}`;
  RS.enumerar = enumerar;
  const modelosTexto = l => l.length > 1 ? `los modelos ${enumerar(l)}` : `el modelo ${l[0]}`;
  const redaccionBase = h => {
    const cm = h.medida, l = h.modelos;
    if (cm && l.length) return `Hola, Relax Store. Mi hueco mide ${cm} cm de ancho y me interesa${l.length > 1 ? 'n' : ''} ${modelosTexto(l)}. Os mando una foto del hueco. ¿Cuándo puedo pasar a verlo?`;
    if (cm) return `Hola, Relax Store. Mi hueco mide ${cm} cm de ancho y busco un sofá o una cama a medida. Os mando una foto del hueco. ¿Cuándo puedo pasar a verlo?`;
    if (l.length) return `Hola, Relax Store. Me interesa${l.length > 1 ? 'n' : ''} ${modelosTexto(l)}, a la medida de mi hueco. ¿Os mando las medidas y una foto?`;
    return 'Hola, Relax Store. Busco un sofá o una cama a medida para un hueco de mi casa. ¿Os mando las medidas y una foto?';
  };
  RS.redaccionBase = redaccionBase;
  RS.preguntarPor = modelo => RS.whatsapp(RS.hueco.medida
    ? `Hola, Relax Store. Me interesa el modelo ${modelo} para un hueco de ${RS.hueco.medida} cm de ancho. ¿Os mando una foto del hueco?`
    : `Hola, Relax Store. Me interesa el modelo ${modelo} a la medida de mi hueco. ¿Os mando las medidas y una foto?`);

  const hueco = RS.hueco = {
    medida: 0, modelos: [], datos: {}, redactar: null,
    set(cambios = {}, origen = '') {
      let cambio = 'datos';
      if ('medida' in cambios) {
        const v = Math.max(0, Math.min(999, Math.round(+cambios.medida || 0)));
        if (v === this.medida && Object.keys(cambios).length === 1) return this;
        this.medida = v; cambio = 'medida';
      }
      const resto = { ...cambios }; delete resto.medida;
      Object.assign(this.datos, resto);
      emitir(cambio, origen);
      return this;
    },
    tiene(m) { return this.modelos.includes(m); },
    anadir(m, origen = '') { if (m && !this.tiene(m)) { this.modelos.push(m); emitir('anadir', origen, m); } return this; },
    quitar(m, origen = '') { const i = this.modelos.indexOf(m); if (i >= 0) { this.modelos.splice(i, 1); emitir('quitar', origen, m); } return this; },
    alternar(m, origen = '') { if (this.tiene(m)) this.quitar(m, origen); else this.anadir(m, origen); return this.tiene(m); },
    vaciar(origen = '') { this.modelos = []; this.medida = 0; this.datos = {}; emitir('vaciar', origen); return this; },
    mensaje() {
      if (typeof this.redactar === 'function') { try { const t = this.redactar(this); if (t) return t; } catch (e) { console.warn('RS.hueco.redactar', e); } }
      return redaccionBase(this);
    },
    enlace() { return RS.whatsapp(this.mensaje()); },
    on(fn) { const h = e => fn(e.detail); document.addEventListener('rs:hueco', h); return () => document.removeEventListener('rs:hueco', h); }
  };
  const pintarWA = () => {
    const url = hueco.enlace();
    $$('a[data-wa]').forEach(a => { if (a.dataset.wa !== 'propio') a.href = url; });
    const t = $('[data-wa-texto]'), boton = t && t.closest('a');
    if (t) {
      if (hueco.medida) {
        t.innerHTML = `<span class="wa-verbo">Mandar </span>«${hueco.medida} cm»<span class="wa-por"> por WhatsApp</span>`;
        boton.setAttribute('aria-label', `Mandar mi medida, ${hueco.medida} cm, por WhatsApp`);
      } else {
        t.innerHTML = '<span class="wa-largo">Escríbenos por </span>WhatsApp';
        boton.removeAttribute('aria-label');
      }
    }
  };
  RS.pintarWA = pintarWA;
  function emitir(cambio, origen, modelo) {
    pintarWA();
    document.dispatchEvent(new CustomEvent('rs:hueco', { detail: { medida: hueco.medida, modelos: [...hueco.modelos], datos: { ...hueco.datos }, cambio, origen, modelo } }));
  }

  /* -----------------------------------------------------------------------------------
     6 · EL METRO
     const m = RS.metro(el, { max: 400, etiqueta: 'Ancho del hueco, en centímetros', alCambiar(valor, desde) {} })
     el: un .metro con data-metro (data-max opcional). Si no trae .metro__regla, se crea.
     m.valor · m.tocado · m.fijar(cm, { animar = true, silencio = false }) · m.borrar()
     m.disparar() (sale hasta el final y se recoge con su «clac») · m.tiron() · m.recoger() · m.redibujar()
     Emite «metro:cambio» (burbujea) con { valor, desde }. Con .quieto funciona sin física.
     Una segunda llamada sobre el mismo el devuelve la misma instancia y suma las opciones.
     ----------------------------------------------------------------------------------- */
  let nMetro = 0;
  RS.metro = (el, op = {}) => {
    if (!el) return null;
    if (el._metro) { Object.assign(el._metro._op, op); return el._metro; }
    const O = Object.assign({}, op);
    const MAX = O.max || +el.dataset.max || 400, CABO = 30, id = ++nMetro;
    let regla = $('.metro__regla', el);
    if (!regla) {
      regla = document.createElement('div'); regla.className = 'metro__regla';
      regla.innerHTML = `<span class="metro__caja" aria-hidden="true"></span><div class="metro__via" aria-hidden="true"><span class="metro__cinta"></span></div>`
        + `<span class="metro__una" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="${MAX}" aria-valuenow="0" aria-valuetext="Sin medir"></span>`
        + `<span class="metro__lectura" aria-hidden="true"><span></span></span>`
        + (el.dataset.pista ? `<span class="metro__pista" aria-hidden="true">${el.dataset.pista}</span>` : '')
        + `<span class="metro__fin" aria-hidden="true">${(MAX / 100).toLocaleString('es-ES')} m</span>`;
      el.appendChild(regla);
    }
    const via = $('.metro__via', el), cinta = $('.metro__cinta', el), una = $('.metro__una', el), caja = $('.metro__caja', el),
          lectura = $('.metro__lectura', el), lecturaTxt = $('.metro__lectura span', el),
          input = $('.metro__campo input', el), borrarB = $('.metro__borrar', el);
    una.setAttribute('aria-valuemax', MAX);
    if (O.etiqueta || el.dataset.etiqueta) una.setAttribute('aria-label', O.etiqueta || el.dataset.etiqueta);
    if (!una.getAttribute('aria-label')) una.setAttribute('aria-label', 'Medida, en centímetros');
    if (input && !input.id) input.id = `metro-${id}`;
    let W = 300, x = 0, valor = 0, tocado = false, animId = 0, arrastrando = false;

    const pintar = () => {
      const px = CABO + x * (W - CABO);
      el.classList.toggle('fuera', x > .015); el.classList.toggle('al-final', x > .8);
      if (!valor) { const cm = Math.round(x * MAX); lecturaTxt.textContent = cm > 4 ? `${cm} cm` : ''; lectura.classList.add('fantasma'); }
      else lectura.classList.remove('fantasma');
      cinta.style.transform = `translateX(${(px - W).toFixed(2)}px)`;
      una.style.transform = `translateX(${px.toFixed(2)}px)`;
      lectura.style.setProperty('--x', px.toFixed(2) + 'px');
    };
    const dibujarCinta = () => {
      W = Math.max(120, via.clientWidth - 8);
      el.style.setProperty('--via', W + 'px');
      el.style.setProperty('--caja-w', caja.offsetWidth + 'px');
      const pxcm = (W - CABO) / MAX, h = cinta.clientHeight || 26;
      const paso = pxcm >= .9 ? 5 : 10, numCada = pxcm >= 1 ? 50 : 100;
      let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" aria-hidden="true">`;
      for (let cm = 0; cm <= MAX; cm += paso) {           // el 0 está en la uña, como en un metro de verdad
        const px = W - cm * pxcm, largo = cm % 50 === 0 ? .62 : cm % 10 === 0 ? .42 : .24;
        s += `<rect x="${(px - 1).toFixed(1)}" y="0" width="1.4" height="${(h * largo).toFixed(1)}" fill="#fff" opacity="${cm % 10 === 0 ? 1 : .7}"/>`;
        if (cm % numCada === 0 && cm > 0) s += `<text x="${(px - 4).toFixed(1)}" y="${(h - 4).toFixed(1)}" font-family="Epilogue, sans-serif" font-weight="700" font-size="${Math.min(12, h * .42).toFixed(1)}" fill="#fff" text-anchor="end">${cm}</text>`;
      }
      cinta.innerHTML = s + '</svg>';
      pintar();
    };
    const fijarValor = (cm, desde, silencio) => {
      valor = Math.max(0, Math.min(999, Math.round(cm) || 0));
      el.classList.toggle('con-medida', valor > 0);
      lecturaTxt.textContent = valor ? (valor > MAX ? `${valor} cm +` : `${valor} cm`) : '';
      una.setAttribute('aria-valuenow', Math.min(valor, MAX));
      una.setAttribute('aria-valuetext', valor ? `${valor} centímetros` : 'Sin medir');
      if (input && desde !== 'input') input.value = valor || '';
      if (!silencio) {
        O.alCambiar && O.alCambiar(valor, desde);
        el.dispatchEvent(new CustomEvent('metro:cambio', { bubbles: true, detail: { valor, desde } }));
      }
    };
    const parar = () => cancelAnimationFrame(animId);
    const expoOut = k => k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
    // tween corto: sale disparado
    const tween = (a, b, ms, ease, fin) => {
      parar(); const t0 = performance.now();
      const paso = t => { const k = Math.min(1, (t - t0) / ms); x = a + (b - a) * ease(k); pintar(); if (k < 1) animId = requestAnimationFrame(paso); else fin && fin(); };
      animId = requestAnimationFrame(paso);
    };
    // muelle hacia un objetivo (cuando escribes una medida)
    const muelle = (obj, fin) => {
      parar(); let v = 0, t0 = performance.now();
      const paso = t => {
        const dt = Math.min(.032, (t - t0) / 1000); t0 = t;
        const a = -260 * (x - obj) - 24 * v; v += a * dt; x += v * dt; pintar();
        if (Math.abs(v) > .002 || Math.abs(x - obj) > .0005) animId = requestAnimationFrame(paso); else { x = obj; pintar(); fin && fin(); }
      };
      animId = requestAnimationFrame(paso);
    };
    // «clac»: la caja da un respingo al chocar la uña
    const clac = fuerza => {
      if (QUIETO || !caja.animate) return;
      const g = Math.min(1, fuerza);
      caja.animate([
        { transform: 'none' },
        { transform: `translateX(${(-5 * g).toFixed(1)}px) rotate(${(-7 * g).toFixed(1)}deg)`, offset: .28 },
        { transform: `translateX(${(1.5 * g).toFixed(1)}px) rotate(${(2.5 * g).toFixed(1)}deg)`, offset: .62 },
        { transform: 'none' }
      ], { duration: 320, easing: 'ease-out' });
    };
    // recogida: la cinta vuelve acelerando y rebota al chocar con la caja
    const recoger = (hasta = 0, fin) => {
      if (QUIETO) { x = hasta; pintar(); fin && fin(); return; }
      parar(); let v = 0, t0 = performance.now(), rebotes = 0; const A = 7.5;
      const paso = t => {
        const dt = Math.min(.032, (t - t0) / 1000); t0 = t; v -= A * dt; x += v * dt;
        if (x <= hasta) {
          x = hasta;
          if (rebotes === 0) clac(Math.abs(v) / 3);
          if (rebotes < 2 && v < -.4) { v = -v * .3; rebotes++; } else { pintar(); fin && fin(); return; }
        }
        pintar(); animId = requestAnimationFrame(paso);
      };
      animId = requestAnimationFrame(paso);
    };

    // arrastrar la uña (o pulsar en la vía)
    const desdePuntero = e => { const r = via.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left - CABO) / (W - CABO))); };
    const empezar = e => {
      if (e.button > 0) return;
      parar(); tocado = true; arrastrando = true; el.classList.add('tirando');
      try { una.setPointerCapture(e.pointerId); } catch (_) { /* sin captura */ }
      x = desdePuntero(e); pintar(); fijarValor(x * MAX, 'arrastre'); e.preventDefault();
    };
    una.addEventListener('pointerdown', empezar);
    via.addEventListener('pointerdown', empezar);
    una.addEventListener('pointermove', e => { if (!arrastrando) return; x = desdePuntero(e); pintar(); fijarValor(x * MAX, 'arrastre'); });
    const soltar = () => { if (!arrastrando) return; arrastrando = false; el.classList.remove('tirando'); if (valor === 0) { x = 0; pintar(); } };
    una.addEventListener('pointerup', soltar); una.addEventListener('pointercancel', soltar); una.addEventListener('lostpointercapture', soltar);
    una.addEventListener('keydown', e => {
      const k = e.key, salto = e.shiftKey ? 10 : 1; let v = Math.min(valor, MAX);
      if (k === 'ArrowRight' || k === 'ArrowUp') v += salto; else if (k === 'ArrowLeft' || k === 'ArrowDown') v -= salto;
      else if (k === 'PageUp') v += 10; else if (k === 'PageDown') v -= 10; else if (k === 'Home') v = 0; else if (k === 'End') v = MAX; else return;
      e.preventDefault(); tocado = true; v = Math.max(0, Math.min(MAX, v)); fijarValor(v, 'teclado'); x = v / MAX; parar(); pintar();
    });
    if (input) input.addEventListener('input', () => {
      tocado = true; const v = parseInt(input.value, 10) || 0; fijarValor(v, 'input');
      const obj = Math.min(v, MAX) / MAX; if (QUIETO) { x = obj; pintar(); } else muelle(obj);
    });
    if (borrarB) borrarB.addEventListener('click', () => { api.borrar(); input && input.focus(); });

    new ResizeObserver(dibujarCinta).observe(via);
    dibujarCinta();

    const api = {
      el, _op: O, max: MAX,
      get valor() { return valor; },
      get tocado() { return tocado; },
      fijar(cm, { animar = true, silencio = false } = {}) {
        fijarValor(cm, 'api', silencio);
        const obj = Math.min(valor, MAX) / MAX;
        if (QUIETO || !animar) { parar(); x = obj; pintar(); } else if (valor) muelle(obj); else recoger(0);
        return api;
      },
      borrar() { fijarValor(0, 'borrar'); recoger(0); return api; },
      disparar(fin) {                       // sale hasta el final (520 ms, expo) y vuelve con su «clac»
        if (QUIETO || tocado || valor) return api;
        tween(0, 1, 520, expoOut, () => setTimeout(() => { if (!tocado && !valor) recoger(0, fin); }, 160));
        return api;
      },
      tiron() {                             // un tirón corto, como quien prueba el metro
        if (QUIETO || tocado || valor || arrastrando) return api;
        tween(0, .1 + Math.random() * .06, 260, expoOut, () => setTimeout(() => { if (!tocado && !valor) recoger(0); }, 120));
        return api;
      },
      recoger(fin) { recoger(0, fin); return api; },
      reiniciar() { parar(); tocado = false; fijarValor(0, 'api', true); x = 0; pintar(); return api; },
      redibujar: dibujarCinta
    };
    el._metro = api;
    return api;
  };

  /* -----------------------------------------------------------------------------------
     7 · CABECERA: sombra al bajar · MENÚ DEL MÓVIL accesible (foco atrapado, Escape)
     ----------------------------------------------------------------------------------- */
  const cab = $('[data-cab]'), tope = $('[data-tope]');
  if (cab && tope) new IntersectionObserver(es => cab.classList.toggle('bajada', !es[0].isIntersecting)).observe(tope);

  const bMenu = $('.cab__menu'), panel = $('#menu-movil');
  if (bMenu && panel) {
    let abierto = false, reloj = 0;
    const enfocables = () => [bMenu, ...$$('a[href], button:not([disabled])', panel)];
    const abrir = () => {
      abierto = true; clearTimeout(reloj);
      bMenu.setAttribute('aria-expanded', 'true'); panel.hidden = false;
      if (QUIETO) panel.classList.add('abierto'); else requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('abierto')));
      const primero = $('a[href]', panel); primero && primero.focus({ preventScroll: true });
    };
    const cerrar = (devolver = true) => {
      if (!abierto) return;
      abierto = false; bMenu.setAttribute('aria-expanded', 'false'); panel.classList.remove('abierto');
      reloj = setTimeout(() => { if (!abierto) panel.hidden = true; }, QUIETO ? 0 : 460);
      if (devolver) bMenu.focus();
    };
    RS.menu = { abrir, cerrar, get abierto() { return abierto; } };
    bMenu.addEventListener('click', () => abierto ? cerrar() : abrir());
    $$('a', panel).forEach(a => a.addEventListener('click', () => cerrar(false)));
    document.addEventListener('keydown', e => {
      if (!abierto) return;
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
      if (e.key === 'Tab') {
        const f = enfocables(), i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
      }
    });
    document.addEventListener('pointerdown', e => { if (abierto && !panel.contains(e.target) && !bMenu.contains(e.target)) cerrar(false); });
    matchMedia('(min-width: 1100px)').addEventListener('change', e => { if (e.matches) cerrar(false); });
  }

  /* -----------------------------------------------------------------------------------
     8 · HERO «El hueco»
     ----------------------------------------------------------------------------------- */
  const hero = $('[data-hero]');
  const plano = hero && $('[data-plano]', hero);
  const cotaHero = plano && $('[data-cota="hero"]', plano);
  const marco = plano && $('.plano__marco', plano);
  const metroHero = hero && RS.metro($('[data-metro="hero"]', hero), {
    etiqueta: 'Ancho de tu hueco, en centímetros',
    alCambiar: v => hueco.set({ medida: v }, 'hero')
  });
  // si la medida llega desde otra sección (el croquis), el metro del hero la muestra
  hueco.on(d => { if (metroHero && d.cambio === 'medida' && d.origen !== 'hero' && d.medida !== metroHero.valor) metroHero.fijar(d.medida, { silencio: true, animar: false }); });

  // una columna: se mide lo que ocupa el resto del hero y la foto toma el alto que queda
  const ajustarHero = () => {
    if (!hero) return;
    if (getComputedStyle(hero).display === 'grid') { hero.style.removeProperty('--reserva'); hero.style.setProperty('--cota-h', cotaHero.offsetHeight + 'px'); return; }
    const img = $('img', marco), cs = getComputedStyle(hero), gap = parseFloat(cs.rowGap) || 0;
    const hijos = [...hero.children].filter(e => getComputedStyle(e).display !== 'none');
    let h = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + gap * (hijos.length - 1);
    hijos.forEach(e => { const m = getComputedStyle(e); h += e.offsetHeight + parseFloat(m.marginTop) + parseFloat(m.marginBottom); });
    hero.style.setProperty('--reserva', Math.ceil(h - img.offsetHeight + 2) + 'px');
  };
  RS.ajustarHero = ajustarHero;

  if (hero) {
    ajustarHero();
    let rz = 0;
    addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(ajustarHero); });
    if (document.fonts) document.fonts.ready.then(ajustarHero);

    // la cota del hero vuelve a medir cada 6 s con frases reales (fachada y reseñas)
    const FRASES = [
      ['Camas y sofás a medida', 'Rótulo de la tienda, C/ Turín 17D'],
      ['a la medida exacta del hueco', 'Carlos M., reseña en Google'],
      ['al hueco entre dos columnas', 'Dani G., reseña en Google'],
      ['adaptado a las medidas del hueco', 'Juan Carlos C., reseña en Google']
    ];
    let iFrase = 0, mirando = false;
    const remedir = () => { if (mirando) return; iFrase = (iFrase + 1) % FRASES.length; RS.cota.remedir(cotaHero, ...FRASES[iFrase]); };

    // la mira: dos líneas azules siguen al cursor y la cota marca su posición; zoom 1,06 hacia el cursor
    if (marco && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      marco.addEventListener('pointerenter', () => { mirando = true; plano.classList.add('mirando'); });
      marco.addEventListener('pointerleave', () => { mirando = false; plano.classList.remove('mirando'); });
      marco.addEventListener('pointermove', e => {
        const r = marco.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        marco.style.setProperty('--mx-px', px + 'px'); marco.style.setProperty('--my-px', py + 'px');
        marco.style.setProperty('--mx', (px / r.width * 100) + '%'); marco.style.setProperty('--my', (py / r.height * 100) + '%');
        plano.style.setProperty('--mx-cota', (e.clientX - cotaHero.getBoundingClientRect().left) + 'px');
      });
    }

    // entrada orquestada: texto 50-850 ms, columnas, la foto cae a los 300, la cota mide a los 720, el metro sale a los 1.050
    let relojes = [];
    const luego = (fn, ms) => relojes.push(setTimeout(fn, ms));
    let bCota = null, bTiron = null;
    const secuencia = () => {
      hero.classList.add('entra');
      luego(() => RS.cota.medir(cotaHero), 720);
      luego(() => metroHero && metroHero.disparar(), 1050);
      luego(() => hero.classList.add('listo'), 2300);
      luego(() => {
        if (!bCota) bCota = RS.bucle(hero, { cada: 6000, paso: remedir }); else bCota.reanudar();
        if (!bTiron) bTiron = RS.bucle(hero, { cada: 7000, paso: () => metroHero && metroHero.tiron() }); else bTiron.reanudar();
      }, 2400);
    };
    const arrancar = () => {
      if (QUIETO) { hero.classList.add('entra', 'listo'); RS.cota.medir(cotaHero); return; }
      secuencia();
    };
    // vuelve a empezar la entrada (botón de la propuesta y capturas)
    RS.hero = {
      repetir() {
        if (QUIETO) return;
        relojes.forEach(clearTimeout); relojes = [];
        bCota && bCota.parar(); bTiron && bTiron.parar();
        raiz.classList.add('sin-trans');
        hero.classList.remove('entra', 'listo'); cotaHero.classList.remove('is-medida', 'is-referida');
        iFrase = 0; const f = $('.cota__frase', cotaHero), g = $('.cota__firma', cotaHero); f.textContent = FRASES[0][0]; g.textContent = FRASES[0][1];
        metroHero && metroHero.reiniciar();
        void hero.offsetWidth;
        raiz.classList.remove('sin-trans');
        secuencia();
      },
      ajustar: ajustarHero
    };
    window.cotaRepetir = RS.hero.repetir; window.cotaPausar = RS.pausarTodo;
    const fuentes = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]) : Promise.resolve();
    fuentes.then(() => requestAnimationFrame(arrancar));
  }

  /* -----------------------------------------------------------------------------------
     9 · BARRA FIJA DEL MÓVIL: aparece cuando queda menos de un cuarto del hero a la vista
     ----------------------------------------------------------------------------------- */
  const barra = $('[data-barra]');
  if (barra && hero) new IntersectionObserver(es => { const e = es[es.length - 1]; barra.classList.toggle('visible', !e.isIntersecting || e.intersectionRatio < .25); }, { threshold: [0, .25] }).observe(hero);
  else if (barra) barra.classList.add('visible');

  /* -----------------------------------------------------------------------------------
     10 · ARRANQUE: revelar, cotas, bucles de CSS, estado, metros y enlaces de WhatsApp
     RS.iniciar(contenedor) vuelve a recorrer un trozo de página añadido después.
     ----------------------------------------------------------------------------------- */
  RS.iniciar = (c = document) => {
    $$('[data-revelar]', c).forEach(el => RS.revelar(el));
    $$('[data-cota]', c).forEach(el => {
      const v = el.dataset.cota;
      if (v === 'hero') return;
      if (v === 'manual') { if (QUIETO) RS.cota.medir(el); return; }
      RS.revelar(el, RS.cota.medir);
    });
    $$('[data-bucle]', c).forEach(RS.vigilar);
    $$('[data-metro]', c).forEach(el => { if (el.dataset.metro !== 'manual') RS.metro(el); });
    RS.pintarEstado(c);
    pintarWA();
  };
  RS.iniciar();
  document.dispatchEvent(new CustomEvent('rs:listo'));
})();

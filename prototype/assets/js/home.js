/* ===== coleccion ===== */
;(() => {
/* «Nuestra colección»: las cotas se abren cuando cada foto ha caído en su hueco; al pasar el
   cursor (o al enfocar el marco), la cota vuelve a medir y la foto se acerca hacia el cursor. */
(() => {
  'use strict';
  const RS = window.RS, sec = document.getElementById('coleccion');
  if (!RS || !sec) return;
  const piezas = [...sec.querySelectorAll('.coleccion__pieza')];
  const ancho = matchMedia('(min-width: 900px)');

  piezas.forEach((pieza, i) => {
    const cota = pieza.querySelector('.cota');
    const marco = pieza.querySelector('.coleccion__marco');
    // la cota se abre cuando la foto ya ha caído (900 ms + su retardo)
    RS.revelar(pieza, () => {
      if (RS.quieto) { RS.cota.medir(cota); return; }
      setTimeout(() => RS.cota.medir(cota), ancho.matches ? 820 + i * 140 : 700);
    });
    // la cota vuelve a medir al entrar el cursor o el foco (una vez por entrada)
    let midiendo = false;
    const remedir = () => {
      if (RS.quieto || midiendo || !cota.classList.contains('is-medida')) return;
      midiendo = true;
      RS.cota.remedir(cota).then(() => { midiendo = false; });
    };
    pieza.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') remedir(); });
    marco.addEventListener('focus', remedir);
    // el zoom va hacia el cursor
    marco.addEventListener('pointermove', e => {
      const r = marco.getBoundingClientRect();
      marco.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      marco.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  });
})();

})();

/* ===== postales ===== */
;(() => {
/* «Los sofás, en postales»: el expositor.
   · Dar la vuelta (clic, toque, Intro o Espacio) → reverso con «Preguntar por…» y «Añadir a mi hueco».
     Volver: botón, Escape o abrir otra postal. La cara oculta queda inert + aria-hidden.
   · Escritorio: la postal se inclina hacia el cursor; el expositor deriva muy despacio (ida y vuelta)
     y se para con cursor, foco o dedo; también se arrastra con el ratón.
   · Móvil: carril con imán; avanza una postal cada 5 s mientras nadie lo toque.
   · Filtros: las que salen se van girando, las que entran caen (escalonadas).
   · «Tu hueco»: RS.hueco.alternar(modelo); la cuenta lleva al croquis. */
(() => {
  'use strict';
  const RS = window.RS, sec = document.getElementById('postales');
  if (!RS || !sec) return;
  const $ = (s, c = sec) => c.querySelector(s), $$ = (s, c = sec) => [...c.querySelectorAll(s)];
  const vitrina = $('[data-vitrina]'), lista = $('.postales__expositor');
  const items = $$('.postales__item');
  const filtros = $$('[data-filtro]');
  const aviso = $('[data-aviso]'), cesta = $('.postales__cesta'), cestaTxt = $('.postales__cesta-texto');
  const control = $('[data-control]');
  const ancho = matchMedia('(min-width: 900px)');
  const finoCursor = matchMedia('(hover: hover) and (pointer: fine)');
  const MUELLE = getComputedStyle(document.documentElement).getPropertyValue('--muelle').trim() || 'cubic-bezier(.34, 1.56, .64, 1)';
  const GRUPOS = { carro: 'deslizantes de carro', relax: 'relax', deslizantes: 'deslizantes', cama: 'sofás cama', butacas: 'butacas' };
  let girada = null;
  const avisar = t => { aviso.textContent = ''; setTimeout(() => { aviso.textContent = t; }, 40); };

  /* ---------- 1 · dar la vuelta ---------- */
  const caras = it => ({ frente: $('.postales__frente', it), dorso: $('.postales__dorso', it) });
  const ponerCara = (it, atras) => {
    const { frente, dorso } = caras(it);
    it.classList.toggle('girada', atras);
    frente.inert = atras; dorso.inert = !atras;
    if (atras) { frente.setAttribute('aria-hidden', 'true'); dorso.removeAttribute('aria-hidden'); }
    else { dorso.setAttribute('aria-hidden', 'true'); frente.removeAttribute('aria-hidden'); }
  };
  const girar = (it, { foco = true } = {}) => {
    if (girada && girada !== it) volver(girada, { foco: false });
    girada = it; ponerCara(it, true);
    bucle && bucle.pausar('girada');
    if (foco) $('.postales__preguntar', it).focus({ preventScroll: true });
    // que la postal girada quede entera a la vista (fuera del difuminado de los bordes)
    const r = it.getBoundingClientRect(), v = vitrina.getBoundingClientRect(), m = parseFloat(getComputedStyle(vitrina).paddingLeft) || 16;
    const dx = r.left < v.left + m ? r.left - v.left - m : r.right > v.right - m ? r.right - v.right + m : 0;
    if (dx) vitrina.scrollBy({ left: dx, behavior: RS.quieto ? 'auto' : 'smooth' });
  };
  const volver = (it, { foco = true } = {}) => {
    ponerCara(it, false);
    if (girada === it) girada = null;
    if (!girada) bucle && bucle.seguir('girada');
    if (foco) $('.postales__frente', it).focus({ preventScroll: true });
  };

  /* ---------- 2 · la cesta del hueco ---------- */
  const pintarItem = it => {
    const m = it.dataset.modelo, dentro = RS.hueco.tiene(m), b = $('.postales__anadir', it);
    it.classList.toggle('en-hueco', dentro);
    b.setAttribute('aria-pressed', dentro ? 'true' : 'false');
    $('span', b).textContent = dentro ? 'Quitar de mi hueco' : 'Añadir a mi hueco';
    $('.postales__frente', it).setAttribute('aria-label', `Dar la vuelta a la postal ${m}` + (dentro ? ' (en tu hueco)' : ''));
  };
  const pintarPreguntar = () => items.forEach(it => { $('.postales__preguntar', it).href = RS.preguntarPor(it.dataset.modelo); });
  let cuentaAntes = 0;
  const pintarCesta = () => {
    const n = RS.hueco.modelos.length;
    cesta.hidden = n === 0;
    cestaTxt.textContent = `Tu hueco: ${n} ${n === 1 ? 'modelo' : 'modelos'}`;
    cesta.setAttribute('aria-label', `Tu hueco: ${n} ${n === 1 ? 'modelo' : 'modelos'}. Ir al croquis`);
    if (n && n !== cuentaAntes && !RS.quieto) { cesta.classList.remove('respingo'); void cesta.offsetWidth; cesta.classList.add('respingo'); }
    cuentaAntes = n;
  };
  const pintarTodo = () => { items.forEach(pintarItem); pintarPreguntar(); pintarCesta(); };
  RS.hueco.on(d => {
    pintarTodo();
    if (d.origen === 'postales' && d.modelo) avisar(d.cambio === 'anadir' ? `${d.modelo}, añadido a tu hueco. Va en tu mensaje del croquis.` : `${d.modelo}, fuera de tu hueco.`);
  });

  /* ---------- 3 · clics, teclado e inclinación ---------- */
  let arrastrado = false;
  sec.addEventListener('click', e => {
    if (arrastrado) { e.preventDefault(); e.stopPropagation(); arrastrado = false; return; }
    const it = e.target.closest('.postales__item'); if (!it) return;
    if (e.target.closest('.postales__frente')) { girar(it, { foco: e.detail === 0 }); return; }
    if (e.target.closest('.postales__volver')) { volver(it); return; }
    if (e.target.closest('.postales__anadir')) { RS.hueco.alternar(it.dataset.modelo, 'postales'); return; }
    if (e.target.closest('.postales__preguntar')) return;
    if (e.target.closest('.postales__dorso')) volver(it, { foco: false });   // un toque en el papel vuelve a la foto
  }, true);
  sec.addEventListener('keydown', e => {
    if (e.key === 'Escape' && girada && girada.contains(document.activeElement)) { e.preventDefault(); volver(girada); }
  });
  // la postal se inclina hacia el cursor (solo escritorio con ratón)
  items.forEach(it => {
    const img = $('.postales__frente img', it);
    it.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || !finoCursor.matches || RS.quieto) return;
      const r = img.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      it.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg'); it.style.setProperty('--rx', (y * -11).toFixed(2) + 'deg');
    });
    it.addEventListener('pointerleave', () => { it.style.removeProperty('--rx'); it.style.removeProperty('--ry'); });
  });

  /* ---------- 4 · filtros ---------- */
  const visibles = () => items.filter(it => !it.hidden);
  // con pocos modelos (caben en una balda), una sola fila centrada; si no, dos baldas en ladrillo
  const unaFila = () => {
    const v = visibles(), w = v[0] ? v[0].offsetWidth : 0;
    if (!ancho.matches || !w) { vitrina.classList.remove('una-fila'); return; }
    const cs = getComputedStyle(vitrina), disp = vitrina.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    vitrina.classList.toggle('una-fila', (v.length - 1) * w * .87 + w <= disp);
  };
  const ordenar = () => {
    const v = visibles();
    v.forEach((it, i) => { it.style.setProperty('--fila', i % 2); it.style.setProperty('--orden', i); it.classList.toggle('ultima', i === v.length - 1); });
    unaFila();
  };
  new ResizeObserver(() => unaFila()).observe(vitrina);
  const contar = () => filtros.forEach(f => {
    const k = f.dataset.filtro, n = k === 'todos' ? items.length : items.filter(it => it.dataset.grupo === k).length;
    $('.postales__cuenta', f).textContent = n;
    f.setAttribute('aria-label', `${f.firstChild.textContent.trim()}, ${n} ${n === 1 ? 'postal' : 'postales'}`);
  });
  let filtrando = 0;
  const filtrar = async k => {
    const turno = ++filtrando;
    filtros.forEach(f => f.setAttribute('aria-pressed', f.dataset.filtro === k ? 'true' : 'false'));
    if (girada) volver(girada, { foco: false });
    const entra = it => k === 'todos' || it.dataset.grupo === k;
    const salen = items.filter(it => !it.hidden && !entra(it)), quedan = items.filter(entra);
    const n = quedan.length;
    avisar(k === 'todos' ? `Mostrando las ${n} postales.` : `Mostrando ${n} ${n === 1 ? 'postal' : 'postales'}: ${GRUPOS[k]}.`);
    if (RS.quieto || !lista.animate) {
      items.forEach(it => { it.hidden = !entra(it); }); ordenar(); vitrina.scrollLeft = 0; pos = 0; return;
    }
    // salen girando sobre sí mismas (de canto) y caen un poco
    const enPantalla = it => { const r = it.getBoundingClientRect(), v = vitrina.getBoundingClientRect(); return r.right > v.left && r.left < v.right; };
    const fuera = salen.filter(enPantalla);
    await Promise.all(fuera.map((it, i) => it.animate([
      { transform: 'none', opacity: 1 },
      { transform: `translateY(40px) rotateY(${it.style.getPropertyValue('--lado') > 0 ? '' : '-'}88deg) rotate(${it.style.getPropertyValue('--lado') * 9}deg) scale(.86)`, opacity: 0 }
    ], { duration: 420, delay: i * 35, easing: 'cubic-bezier(.55, 0, .75, .25)', fill: 'forwards' }).finished.catch(() => {})));
    if (turno !== filtrando) return;
    items.forEach(it => { it.hidden = !entra(it); it.getAnimations().forEach(a => a.cancel()); });
    ordenar(); vitrina.scrollLeft = 0; pos = 0; sentido = 1;
    // las que entran caen en el expositor, una a una, con muelle
    visibles().forEach((it, i) => {
      if (!enPantalla(it)) return;
      const lado = +it.style.getPropertyValue('--lado') || 1;
      it.animate([
        { transform: `translateY(-96px) rotate(${lado * 20}deg) scale(1.1)`, opacity: 0, offset: 0 },
        { opacity: 1, offset: .3 },
        { transform: 'none', opacity: 1 }
      ], { duration: 1050, delay: 60 + i * 70, easing: MUELLE, fill: 'backwards' });
    });
  };
  filtros.forEach(f => f.addEventListener('click', () => { if (f.getAttribute('aria-pressed') !== 'true') filtrar(f.dataset.filtro); }));

  /* ---------- 5 · el expositor se desplaza solo (y se arrastra) ---------- */
  let pos = 0, sentido = 1, espera = 0, propio = -1, pasoMovil = 0, bucle = null;
  const VEL = 26;                      // px por segundo, ida y vuelta
  vitrina.addEventListener('scroll', () => { if (Math.abs(vitrina.scrollLeft - propio) > 2) pos = vitrina.scrollLeft; }, { passive: true });
  const animar = dt => {
    const max = vitrina.scrollWidth - vitrina.clientWidth;
    if (max < 4) return;
    if (ancho.matches) {
      if (espera > 0) { espera -= dt; return; }
      pos += sentido * VEL * dt / 1000;
      if (pos >= max) { pos = max; sentido = -1; espera = 1600; } else if (pos <= 0) { pos = 0; sentido = 1; espera = 1600; }
      propio = Math.round(pos); vitrina.scrollLeft = propio;
    } else {
      pasoMovil += dt;
      if (pasoMovil < 5000) return;
      pasoMovil = 0;
      const v = visibles(), izq = vitrina.scrollLeft;
      const sig = v.find(it => it.offsetLeft - parseFloat(getComputedStyle(vitrina).paddingLeft) > izq + 8);
      vitrina.scrollTo({ left: sig && izq < max - 4 ? sig.offsetLeft - parseFloat(getComputedStyle(vitrina).paddingLeft) : 0, behavior: 'smooth' });
    }
  };
  // arrastrar con el ratón (escritorio)
  let arrastre = null;
  vitrina.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.postales__dorso')) return;
    arrastre = { x: e.clientX, izq: vitrina.scrollLeft, movido: false, id: e.pointerId };
  });
  vitrina.addEventListener('pointermove', e => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const dx = e.clientX - arrastre.x;
    if (!arrastre.movido && Math.abs(dx) > 6) { arrastre.movido = true; vitrina.classList.add('arrastrando'); try { vitrina.setPointerCapture(e.pointerId); } catch (_) {} }
    if (arrastre.movido) { vitrina.scrollLeft = arrastre.izq - dx; pos = vitrina.scrollLeft; }
  });
  const soltar = () => { if (!arrastre) return; if (arrastre.movido) { arrastrado = true; setTimeout(() => { arrastrado = false; }, 60); } vitrina.classList.remove('arrastrando'); arrastre = null; };
  vitrina.addEventListener('pointerup', soltar); vitrina.addEventListener('pointercancel', soltar);

  /* ---------- 6 · arranque ---------- */
  // las fotos perezosas que quedan fuera del carril no llegarían a cargarse nunca: cuando la
  // sección se acerca a la pantalla, se piden todas (26 × ~17 KB)
  const fotos = $$('.postales__frente img');
  const pedir = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    pedir.disconnect(); fotos.forEach(f => { f.loading = 'eager'; });
  }, { rootMargin: '900px 0px' });
  pedir.observe(sec);
  contar(); ordenar(); pintarTodo();
  if (!RS.quieto) {
    bucle = RS.bucle(vitrina, { pausaConCursor: true, animar });
    bucle.pausar('entrada');
    RS.revelar(lista, () => setTimeout(() => bucle.seguir('entrada'), 1800));
    control.hidden = false;
    control.addEventListener('click', () => {
      const parado = !control.classList.contains('parado');
      control.classList.toggle('parado', parado);
      $('span', control).textContent = parado ? 'Mover el expositor' : 'Parar el expositor';
      parado ? bucle.parar() : bucle.reanudar();
    });
  }
})();

})();

/* ===== croquis ===== */
;(() => {
/* «Tu hueco, a escala, por WhatsApp»: el croquis.
   · Formulario → RS.hueco (medida = ancho, compartida con el metro del hero; datos: tipo, fondo,
     alto, condiciones, franja, colchón). Los modelos llegan de las postales (RS.hueco.modelos).
   · RS.hueco.redactar: el mensaje completo que mandan TODOS los botones de WhatsApp.
   · El dibujo: planta a escala real (1 unidad = 1 cm; si no cabe, todo, cuadrícula incluida, se
     reduce por igual). Cada pieza se coloca con transform y se mueve con muelle (CSS). */
(() => {
  'use strict';
  const RS = window.RS, sec = document.getElementById('croquis');
  if (!RS || !sec) return;
  const $ = (s, c = sec) => c.querySelector(s), $$ = (s, c = sec) => [...c.querySelectorAll(s)];
  const form = $('[data-croquis]'), svg = $('[data-svg]'), titulo = $('#croquis-svg-t');
  const el = n => $(`[data-el="${n}"]`, svg), parte = (g, p) => $(`[data-p="${p}"]`, g);
  const burbuja = $('[data-mensaje]'), errorP = $('[data-error]');
  form.addEventListener('submit', e => e.preventDefault());

  /* ---------- estado ---------- */
  const E = { tipo: '', fondo: 0, alto: 0, cond: new Set(), franja: '', cAncho: 0, cLargo: 0 };
  const TIPOS = { 'sofa': 'un sofá a medida', 'sofa-cama': 'un sofá cama a medida', 'chaise': 'una chaise longue o una rinconera a medida', 'butaca': 'una butaca o un sillón a medida', 'cama': 'una cama o un canapé a medida', 'cabecero': 'un cabecero a medida' };
  const CONDICIONES = { columnas: 'hay columnas o un pilar', esquina: 'va en una esquina', puerta: 'la puerta o el ascensor son estrechos', mascotas: 'tengo mascotas' };
  const ORDEN_COND = ['columnas', 'esquina', 'puerta', 'mascotas'];
  const esColchon = () => E.tipo === 'colchon';
  const condiciones = () => ORDEN_COND.filter(c => E.cond.has(c));

  /* ---------- el mensaje (lo usan todos los botones de WhatsApp) ---------- */
  RS.hueco.redactar = h => {
    const d = h.datos || {}, colchon = d.tipo === 'colchon';
    const cond = colchon ? [] : (d.condiciones || []);
    const propio = d.tipo || d.fondo || d.alto || cond.length || d.franja || (d.colchon && (d.colchon.ancho || d.colchon.largo));
    if (!propio) return '';                       // solo medida o modelos: la redacción base
    const l = ['Hola, Relax Store.'];
    if (colchon) {
      const a = d.colchon && d.colchon.ancho, g = d.colchon && d.colchon.largo;
      l.push(a && g ? `Busco un colchón de ${a} × ${g} cm.` : a ? `Busco un colchón de ${a} cm de ancho.` : 'Busco un colchón.');
    } else {
      const tipo = TIPOS[d.tipo] || 'un sofá o una cama a medida';
      const m = [h.medida && `${h.medida} cm de ancho`, d.fondo && `${d.fondo} cm de fondo`, d.alto && `${d.alto} cm de alto`].filter(Boolean);
      l.push(m.length ? `Busco ${tipo} para un hueco de ${RS.enumerar(m)}.` : `Busco ${tipo} para un hueco de mi casa.`);
      if (cond.length) l.push(`Además, ${RS.enumerar(cond.map(c => CONDICIONES[c]))}.`);
    }
    const mod = h.modelos || [];
    if (mod.length === 1) l.push(`Me interesa el modelo ${mod[0]}.`);
    else if (mod.length > 1) l.push(`Me interesan los modelos ${RS.enumerar(mod)}.`);
    if (d.franja) l.push(`Me viene bien pasar por la ${d.franja}.`);
    l.push(colchon ? '¿Qué me recomendáis?' : 'Os mando una foto del hueco.');
    return l.join('\n');
  };
  const guardar = () => RS.hueco.set({
    tipo: E.tipo, fondo: E.fondo, alto: E.alto, condiciones: condiciones(), franja: E.franja,
    colchon: { ancho: E.cAncho, largo: E.cLargo }
  }, 'croquis');

  /* ---------- metros ---------- */
  const metros = {};
  const comprobar = () => {
    const malo = $$('.croquis__metro:not([hidden]) input').some(i => { const v = +i.value; return i.value !== '' && (v < 30 || v > 999); });
    errorP.hidden = !malo;
    $$('.croquis__metro').forEach(m => { const i = $('input', m), v = +i.value, mal = !m.hidden && i.value !== '' && (v < 30 || v > 999); m.classList.toggle('invalido', mal); i.setAttribute('aria-invalid', mal ? 'true' : 'false'); });
  };
  $$('.croquis__metro').forEach(m => {
    const k = m.dataset.medida;
    const nombres = { ancho: 'Ancho del hueco', fondo: 'Fondo del hueco', alto: 'Alto del hueco', 'c-ancho': 'Ancho del colchón', 'c-largo': 'Largo del colchón' };
    metros[k] = RS.metro(m, {
      etiqueta: `${nombres[k]}, en centímetros`,
      alCambiar(v, desde) {
        if (desde !== 'arrastre') pop(k);
        if (k === 'ancho') RS.hueco.set({ medida: v }, 'croquis');
        else { if (k === 'fondo') E.fondo = v; if (k === 'alto') E.alto = v; if (k === 'c-ancho') E.cAncho = v; if (k === 'c-largo') E.cLargo = v; guardar(); }
        if (!errorP.hidden) comprobar();
      }
    });
    $('input', m).addEventListener('change', comprobar);
    $('input', m).setAttribute('aria-describedby', 'croquis-error');
  });
  errorP.id = 'croquis-error';

  /* ---------- qué buscas, colchón, condiciones, franja ---------- */
  const grupoMedidas = $('[data-medidas]'), grupoColchon = $('[data-colchon]'), grupoCond = $('[data-condiciones]');
  $$('input[name="croquis-tipo"]').forEach(r => r.addEventListener('change', () => {
    E.tipo = r.value;
    grupoMedidas.hidden = esColchon(); grupoColchon.hidden = !esColchon(); grupoCond.hidden = esColchon();
    comprobar(); guardar();
  }));
  const chipsColchon = (nombre, k, metro) => $$(`input[name="${nombre}"]`).forEach(r => r.addEventListener('change', () => {
    const otra = r.value === 'otra', mEl = metro.el;
    mEl.hidden = !otra;
    if (otra) { const v = metro.valor; E[k] = v; requestAnimationFrame(() => { metro.redibujar(); $('input', mEl).focus(); }); }
    else { E[k] = +r.value; }
    pop(k === 'cAncho' ? 'c-ancho' : 'c-largo'); comprobar(); guardar();
  }));
  chipsColchon('croquis-c-ancho', 'cAncho', metros['c-ancho']);
  chipsColchon('croquis-c-largo', 'cLargo', metros['c-largo']);
  $$('.croquis__interruptor input').forEach(c => c.addEventListener('change', () => { c.checked ? E.cond.add(c.name) : E.cond.delete(c.name); guardar(); }));
  $$('[data-franja]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.franja, ya = E.franja === v;
    E.franja = ya ? '' : v;
    $$('[data-franja]').forEach(x => x.setAttribute('aria-pressed', x.dataset.franja === E.franja ? 'true' : 'false'));
    guardar();
  }));

  /* ---------- modelos (desde las postales) ---------- */
  const listaModelos = $('[data-modelos]'), vacio = $('[data-modelos-vacio]');
  const X = '<span class="croquis__x" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span>';
  const pintarModelos = () => {
    const l = RS.hueco.modelos;
    vacio.hidden = l.length > 0;
    listaModelos.innerHTML = l.map(m => `<button class="chip croquis__modelo" type="button" data-modelo="${m.replace(/"/g, '&quot;')}" aria-label="Quitar ${m} de mi hueco">${m}${X}</button>`).join('');
  };
  listaModelos.addEventListener('click', e => {
    const b = e.target.closest('[data-modelo]'); if (!b) return;
    const i = [...listaModelos.children].indexOf(b);
    RS.hueco.quitar(b.dataset.modelo, 'croquis');
    const sig = listaModelos.children[i] || listaModelos.children[i - 1];
    (sig || $('.croquis__a-postales')).focus();
  });

  /* ---------- empezar de nuevo ---------- */
  $('[data-reiniciar]').addEventListener('click', () => {
    form.reset();
    Object.assign(E, { tipo: '', fondo: 0, alto: 0, franja: '', cAncho: 0, cLargo: 0 }); E.cond.clear();
    $$('[data-franja]').forEach(x => x.setAttribute('aria-pressed', 'false'));
    grupoMedidas.hidden = false; grupoColchon.hidden = true; grupoCond.hidden = false;
    metros['c-ancho'].el.hidden = true; metros['c-largo'].el.hidden = true;
    Object.values(metros).forEach(m => m.fijar(0, { silencio: true }));
    RS.hueco.set({ medida: 0 }, 'croquis');
    RS.hueco.vaciar('croquis');
    comprobar(); dibujar();
    $('input[name="croquis-tipo"]').focus();
  });

  /* ---------- el dibujo ---------- */
  const VB_W = 560, VB_H = 320, MURO_Y = 58, PIL = 35, ESQ = 18, MARGEN = 24, SITIO_COTA = 92, ZOOM_MAX = 1.5;
  const tr = (x, y, extra = '') => `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)${extra}`;
  const poner = (g, t) => { if (g) g.style.transform = t; };
  let k = 1;                                   // unidades de la lámina por píxel de pantalla (letra y puntas constantes)
  const medirLetra = () => { const w = svg.getBoundingClientRect().width || VB_W; k = VB_W / w; svg.style.setProperty('--k', k.toFixed(4)); };
  const textoPop = new Map();
  function pop(clave) { textoPop.set(clave, true); }
  // papel milimetrado en centímetros, con el origen en la esquina del hueco: cuadro de 10 cm, raya de 50 cm y de 1 m
  (() => {
    const lin = paso => { let d = ''; for (let x = -800; x <= 900; x += paso) d += `M${x} -300V500`; for (let y = -300; y <= 500; y += paso) d += `M-800 ${y}H900`; return d; };
    const c = el('cuadricula');
    parte(c, 'mm').setAttribute('d', lin(10)); parte(c, 'm50').setAttribute('d', lin(50)); parte(c, 'm1').setAttribute('d', lin(100));
  })();

  function dibujar() {
    const col = esColchon();
    const ancho = col ? E.cAncho : RS.hueco.medida;
    const fondoReal = col ? E.cLargo : E.fondo;
    const fondo = fondoReal || (col ? 190 : 80);
    const conCol = !col && E.cond.has('columnas'), conEsq = !col && E.cond.has('esquina'), conPuerta = !col && E.cond.has('puerta');
    svg.classList.toggle('con-ancho', ancho > 0);
    svg.classList.toggle('con-fondo', ancho > 0 && fondoReal > 0);
    svg.classList.toggle('sin-fondo', !fondoReal);
    svg.classList.toggle('colchon', col);
    const ver = (n, si) => { const g = el(n); if (g) g.toggleAttribute('data-oculto', !si); };
    ver('cota-ancho', ancho > 0); ver('rotulo-hueco', ancho > 0); ver('cota-fondo', ancho > 0 && fondoReal > 0); ver('vacio', !ancho);
    ver('pilar-izq', conCol && !conEsq); ver('rotulo-col-izq', conCol && !conEsq); ver('pilar-der', conCol); ver('rotulo-col-der', conCol);
    ver('esquina', conEsq); ver('rotulo-esquina', conEsq); ver('puerta', conPuerta); ver('rotulo-puerta', conPuerta);

    // escala: todo (cuadrícula incluida) a la misma escala, hasta 1,5 unidades por cm, para que el hueco llene la lámina
    const izqExtra = conEsq ? ESQ : (conCol ? PIL : 0), derExtra = conCol ? PIL : 0;
    const anchoDib = ancho || 200;
    const totalCm = (conEsq ? 0 : izqExtra) + anchoDib + derExtra;
    const s = Math.min(ZOOM_MAX, (VB_W - 2 * MARGEN - SITIO_COTA - (conEsq ? ESQ : 0)) / totalCm, (VB_H - MURO_Y - 78) / fondo);
    const w = anchoDib * s, h = fondo * s;
    const bloque = (conEsq ? 0 : izqExtra * s) + w + derExtra * s + SITIO_COTA;
    const x0 = conEsq ? MARGEN + ESQ : Math.max(MARGEN, (VB_W - bloque) / 2 + izqExtra * s);   // borde izquierdo del hueco
    const y0 = MURO_Y;
    poner(el('cuadricula'), tr(x0, y0, ` scale(${s.toFixed(4)})`));

    poner(el('hueco'), tr(x0, y0, ` scale(${w.toFixed(2)}, ${h.toFixed(2)})`));
    poner(el('pilar-izq'), tr(x0 - PIL * s, y0, ` scale(${s.toFixed(3)})`));
    poner(el('pilar-der'), tr(x0 + w, y0, ` scale(${s.toFixed(3)})`));
    poner(el('esquina'), tr(x0 - ESQ, 40));
    poner(el('puerta'), tr(VB_W - 168, VB_H - 12));

    // cota del ancho, debajo del hueco
    const ca = el('cota-ancho'), yA = y0 + h + 34, pk = ` scale(${k.toFixed(3)})`;
    poner(parte(ca, 'linea'), tr(x0, yA, ` scale(${w.toFixed(2)}, 1)`));
    poner(parte(ca, 'ref1'), tr(x0, y0 + h + 6, ` scale(1, ${(yA - y0 - h + 4).toFixed(2)})`));
    poner(parte(ca, 'ref2'), tr(x0 + w, y0 + h + 6, ` scale(1, ${(yA - y0 - h + 4).toFixed(2)})`));
    poner(parte(ca, 'punta1'), tr(x0, yA, ` rotate(0deg)${pk}`));
    poner(parte(ca, 'punta2'), tr(x0 + w, yA, ` rotate(180deg)${pk}`));
    poner(parte(ca, 'texto'), tr(x0 + w / 2, yA - 9 * k));
    const tA = $('text', parte(ca, 'texto')); const vA = ancho ? `${ancho} cm` : '';
    if (tA.textContent !== vA) { tA.textContent = vA; animarTexto(parte(ca, 'texto'), col ? 'c-ancho' : 'ancho'); }

    // cota del fondo, a la derecha
    const cf = el('cota-fondo'), xF = x0 + w + derExtra * s + 30;
    poner(parte(cf, 'linea'), tr(xF, y0, ` scale(1, ${h.toFixed(2)})`));
    poner(parte(cf, 'ref1'), tr(x0 + w + derExtra * s + 6, y0 + h, ` scale(${(xF - x0 - w - derExtra * s + 2).toFixed(2)}, 1)`));
    poner(parte(cf, 'punta1'), tr(xF, y0, ` rotate(90deg)${pk}`));
    poner(parte(cf, 'punta2'), tr(xF, y0 + h, ` rotate(-90deg)${pk}`));
    poner(parte(cf, 'texto'), tr(xF + 10 * k, y0 + h / 2 + 8 * k));
    const tF = $('text', parte(cf, 'texto')); const vF = fondoReal ? `${fondoReal} cm` : '';
    if (tF.textContent !== vF) { tF.textContent = vF; animarTexto(parte(cf, 'texto'), col ? 'c-largo' : 'fondo'); }

    // rótulos
    const rh = el('rotulo-hueco'), tH = $('[data-t="hueco"]', rh), tAl = $('[data-t="alto"]', rh);
    tH.textContent = col ? (E.cAncho && E.cLargo ? `${E.cAncho} × ${E.cLargo} cm` : '') : 'tu hueco';
    const vAl = !col && E.alto ? `alto ${E.alto} cm` : '';
    if (tAl.textContent !== vAl) { tAl.textContent = vAl; if (vAl) animarTexto(rh, 'alto'); }
    poner(rh, tr(x0 + w / 2, y0 + h / 2 + (vAl ? -2 : 8 * k)));
    poner(el('rotulo-col-izq'), tr(x0 - PIL * s / 2, 30));
    poner(el('rotulo-col-der'), tr(x0 + w + PIL * s / 2, 30));
    poner(el('rotulo-esquina'), tr(x0 - ESQ - 9, y0 + 120));
    poner(el('rotulo-puerta'), tr(VB_W - 96, VB_H - 102));
    poner(el('vacio'), tr(x0 + w / 2, y0 + h + 40));

    // la escala: 1 m
    const es = el('escala'), L = 100 * s;
    poner(es, tr(conEsq ? MARGEN + ESQ + 14 : MARGEN, VB_H - 14));
    poner(parte(es, 'barra'), ` scale(${L.toFixed(2)}, 1)`);
    poner(parte(es, 'm0'), 'none'); poner(parte(es, 'm1'), tr(L / 2, 0)); poner(parte(es, 'm2'), tr(L, 0));
    poner(parte(es, 'texto'), tr(L + 8, 4 * k));

    // título accesible
    if (!ancho) titulo.textContent = 'Croquis vacío: pon el ancho para dibujar tu hueco.';
    else if (col) titulo.textContent = `Croquis de tu colchón: ${ancho} cm de ancho${E.cLargo ? ` y ${E.cLargo} cm de largo` : ''}.`;
    else {
      const extra = [conCol && 'entre columnas', conEsq && 'en una esquina'].filter(Boolean);
      titulo.textContent = `Croquis de tu hueco: ${ancho} cm de ancho${E.fondo ? ` y ${E.fondo} cm de fondo` : ''}${extra.length ? ', ' + extra.join(', ') : ''}.`;
    }
  }
  // la cifra «vuelve a medir»: se cierra y se abre con muelle (solo si no viene de arrastrar)
  function animarTexto(g, clave) {
    if (RS.quieto || !textoPop.get(clave) || !g.animate) return;
    textoPop.delete(clave);
    const t = $('text', g) || g;
    t.animate([{ opacity: 0, transform: 'translateY(6px) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 650, easing: getComputedStyle(document.documentElement).getPropertyValue('--muelle').trim() || 'ease-out' });
  }

  /* ---------- vista previa del mensaje ---------- */
  let antes = [];
  const pintarMensaje = () => {
    const lineas = RS.hueco.mensaje().split('\n');
    burbuja.innerHTML = '';
    lineas.forEach(t => {
      const s = document.createElement('span'); s.className = 'croquis__linea'; s.textContent = t;
      if (antes.length && !antes.includes(t)) s.classList.add('nueva');
      burbuja.appendChild(s);
    });
    antes = lineas;
  };

  /* ---------- sincronía con el hero y las postales ---------- */
  RS.hueco.on(d => {
    if (d.cambio === 'medida' && d.origen !== 'croquis' && metros.ancho.valor !== d.medida) metros.ancho.fijar(d.medida, { silencio: true });
    if (d.cambio === 'anadir' || d.cambio === 'quitar' || d.cambio === 'vaciar') pintarModelos();
    dibujar(); pintarMensaje();
  });
  let rz = 0;
  new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { medirLetra(); dibujar(); }); }).observe(svg);

  // arranque: si el hero ya trae medida, el croquis la toma
  if (RS.hueco.medida) metros.ancho.fijar(RS.hueco.medida, { silencio: true, animar: false });
  medirLetra(); pintarModelos(); dibujar(); pintarMensaje();
  RS.pintarWA();
})();

})();

/* ===== opiniones ===== */
;(() => {
/* OPINIONES — la cinta que mide tiempo.
   · Las notas van en fila; cada una cuelga de SU fecha en la cinta (cordel + pinza).
   · La cinta se gradúa en meses: marzo · abril · mayo 2026 (de derecha a izquierda, la más reciente primero).
   · Con ratón: la cinta avanza sola (≈ 24 px/s, RS.bucle) y al llegar al final se recoge con su «clac»;
     se para con cursor, foco o dedo, se puede arrastrar y tiene botón para pararla.
   · Táctil: carril con scroll-snap; la cinta pasa de nota en nota cada 5 s.
   · .quieto: todo en su sitio, sin bucle. */
(() => {
  'use strict';
  const sec = document.getElementById('opiniones');
  if (!sec || !window.RS) return;
  const $ = (s, c = sec) => c.querySelector(s), $$ = (s, c = sec) => [...c.querySelectorAll(s)];
  const visor = $('.opiniones__visor'), carril = $('.opiniones__carril'), pista = $('.opiniones__pista'), deriva = $('.opiniones__deriva'),
        cinta = $('.opiniones__cinta'), caja = $('.opiniones__caja'), botonParar = $('.opiniones__parar');
  const notas = $$('.opiniones__nota');
  if (!visor || !carril || !notas.length) return;
  const QUIETO = RS.quieto;
  const FINO = matchMedia('(hover: hover) and (pointer: fine)').matches;
  sec.classList.toggle('fino', FINO);
  const DIA = 864e5, MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fecha = n => Date.parse(n.dataset.fecha + 'T12:00:00Z');
  notas.forEach((n, i) => n.style.setProperty('--i', Math.min(i, 6)));

  /* ---------- 1 · maquetar: cordeles a su fecha y la graduación de la cinta ---------- */
  let limite = 0;
  const maquetar = () => {
    const w = notas[0].offsetWidth, h = cinta.offsetHeight;
    const caida = Math.max(20, notas[0].offsetTop - h - 10);          // del borde de la cinta a la pinza
    const ultima = fecha(notas[0]);
    // notas del mismo día comparten marca (sus cordeles forman una V)
    const anclas = [];
    notas.forEach(n => {
      const f = fecha(n), c = n.offsetLeft + w / 2, g = anclas[anclas.length - 1];
      if (g && g.f === f) { g.xs.push(c); g.ns.push(n); } else anclas.push({ f, xs: [c], ns: [n] });
    });
    anclas.forEach(a => {
      a.x = a.xs.reduce((s, v) => s + v, 0) / a.xs.length;
      a.t = (ultima - a.f) / DIA;
      a.ns.forEach(n => {
        const ax = a.x - n.offsetLeft, pinza = Math.max(26, Math.min(w - 26, ax));
        const giro = Math.atan2(ax - pinza, caida) * 180 / Math.PI, largo = Math.hypot(ax - pinza, caida);
        n.style.setProperty('--ancla', ax.toFixed(1) + 'px');
        n.style.setProperty('--pinza', pinza.toFixed(1) + 'px');
        n.style.setProperty('--cordel-giro', giro.toFixed(2) + 'deg');
        n.style.setProperty('--cordel-l', (largo + 2).toFixed(1) + 'px');
      });
    });
    // fecha → x: lineal entre marcas consecutivas; fuera, con la escala media
    const pend = anclas.length > 1 ? (anclas[anclas.length - 1].x - anclas[0].x) / Math.max(1, anclas[anclas.length - 1].t - anclas[0].t) : 40;
    const X = t => {
      if (t <= anclas[0].t) return anclas[0].x + (t - anclas[0].t) * pend;
      for (let k = 1; k < anclas.length; k++) if (t <= anclas[k].t) { const a = anclas[k - 1], b = anclas[k]; return a.x + (t - a.t) / ((b.t - a.t) || 1) * (b.x - a.x); }
      const z = anclas[anclas.length - 1]; return z.x + (t - z.t) * pend;
    };
    const x0 = cinta.offsetLeft, W = Math.round(cinta.offsetWidth), H = Math.round(h);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">`;
    for (let x = 10; x < W - 2; x += 10) {           // graduación fina (como la de un metro)
      const medio = x % 50 === 0;
      s += `<rect x="${x - .7}" y="0" width="1.4" height="${(H * (medio ? .36 : .2)).toFixed(1)}" fill="#fff" opacity="${medio ? .9 : .5}"/>`;
    }
    const fs = Math.max(11, Math.min(14, H * .34)).toFixed(1), base = (H - H * .2).toFixed(1);
    const rotulo = (x, texto) => `<text x="${x.toFixed(1)}" y="${base}" font-family="Epilogue, sans-serif" font-weight="700" font-size="${fs}" fill="#fff">${texto}</text>`;
    const d0 = new Date(ultima);
    s += rotulo(14, `${MESES[d0.getUTCMonth()]} ${d0.getUTCFullYear()}`);
    const ant = new Date(fecha(notas[notas.length - 1]));
    for (let y = d0.getUTCFullYear(), m = d0.getUTCMonth(); ; ) {          // cada cambio de mes: marca larga y su nombre
      const ini = Date.UTC(y, m, 1);
      if (ini <= Date.UTC(ant.getUTCFullYear(), ant.getUTCMonth(), 1)) break;
      const bx = X((ultima - ini) / DIA) - x0;
      m--; if (m < 0) { m = 11; y--; }
      if (bx > 0 && bx < W) s += `<rect x="${(bx - 1).toFixed(1)}" y="0" width="2.2" height="${H}" fill="#fff"/>` + rotulo(bx + 8, MESES[m]);
    }
    anclas.forEach(a => {                                                   // la fecha de cada nota: marca y triángulo del logotipo, invertido
      const x = a.x - x0;
      s += `<rect x="${(x - 1.2).toFixed(1)}" y="0" width="2.4" height="${(H * .58).toFixed(1)}" fill="#fff"/><path d="M${(x - 6).toFixed(1)} ${H - 9}h12l-6 9z" fill="#fff"/>`;
    });
    cinta.querySelector('svg')?.remove();
    cinta.insertAdjacentHTML('afterbegin', s + '</svg>');
    medirLimite();
  };
  // el final real del carril (offsetWidth no cuenta los transform de la entrada ni de la deriva)
  function medirLimite() { limite = Math.max(0, pista.offsetWidth - carril.clientWidth); }
  let rz = 0;
  new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { plegar(); maquetar(); }); }).observe(carril);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { plegar(); maquetar(); });

  /* ---------- 2 · la deriva (transform) sobre el scroll nativo ---------- */
  let d = 0, modo = 'avanza', v = 0, acel = 0, rebotes = 0, hasta = 0;
  const pintar = () => { deriva.style.transform = Math.abs(d) > .01 ? `translateX(${(-d).toFixed(2)}px)` : ''; };
  function plegar() {                          // pasa lo avanzado al scroll de verdad (para tocar, enfocar o arrastrar)
    medirLimite();
    if (!d) return;
    const pos = carril.scrollLeft + d; d = 0; pintar();
    carril.scrollLeft = Math.round(pos);
  }
  const clac = () => {
    if (QUIETO || !caja || !caja.animate) return;
    caja.animate([
      { transform: 'none' },
      { transform: 'translateX(7px) rotate(6deg)', offset: .28 },
      { transform: 'translateX(-2px) rotate(-2.5deg)', offset: .64 },
      { transform: 'none' }
    ], { duration: 380, easing: 'ease-out' });
  };
  const animar = (dt, t) => {
    if (t < hasta) return;
    const sl = carril.scrollLeft;
    if (modo === 'avanza') {
      d += dt * .024;
      if (sl + d >= limite) { d = limite - sl; modo = 'recoge'; v = 0; rebotes = 0; acel = 2 * Math.max(200, limite) / (1250 * 1250); hasta = t + 1500; }
    } else {
      let pos = sl + d;
      v += acel * dt; pos -= v * dt;
      if (pos <= 0) {
        pos = 0;
        if (rebotes === 0) clac();
        if (rebotes < 2 && v > .35) { v = -v * .26; rebotes++; }
        else { d = -sl; pintar(); plegar(); modo = 'avanza'; v = 0; hasta = t + 1800; return; }
      }
      d = pos - sl;
    }
    pintar();
  };

  /* ---------- 3 · ir a una nota (flechas y pasos del móvil) ---------- */
  const relleno = () => parseFloat(getComputedStyle(carril).scrollPaddingLeft) || 0;
  const objetivo = n => Math.min(limite, Math.max(0, n.offsetLeft - relleno()));
  const irA = (paso, ciclo = false) => {
    plegar();
    const pos = carril.scrollLeft;
    let i = 0, mejor = Infinity;
    notas.forEach((n, k) => { const dd = Math.abs(objetivo(n) - pos); if (dd < mejor) { mejor = dd; i = k; } });
    let j = i + paso;
    if (paso > 0 && (j >= notas.length || pos >= limite - 2)) { if (!ciclo) return; j = 0; setTimeout(clac, 420); }
    j = Math.max(0, Math.min(notas.length - 1, j));
    carril.scrollTo({ left: objetivo(notas[j]), behavior: QUIETO ? 'auto' : 'smooth' });
  };

  /* ---------- 4 · arrancar el bucle después de la entrada ---------- */
  let bucle = null, parado = false, relojNav = 0;
  const crearBucle = () => {
    if (QUIETO || bucle) return;
    bucle = FINO
      ? RS.bucle(visor, { animar, pausaConCursor: true, alPausar: plegar })
      : RS.bucle(visor, { cada: 5200, paso: () => irA(1, true), pausaConCursor: true });
    if (parado) bucle.parar();
  };
  RS.revelar(visor, () => setTimeout(crearBucle, 2100));

  sec.querySelectorAll('.opiniones__flecha').forEach(b => b.addEventListener('click', () => {
    irA(+b.dataset.paso);
    if (bucle) { bucle.pausar('nav'); clearTimeout(relojNav); relojNav = setTimeout(() => bucle && bucle.seguir('nav'), 6000); }
  }));
  if (botonParar) botonParar.addEventListener('click', () => {
    parado = !parado;
    botonParar.setAttribute('aria-pressed', String(parado));
    $('.opiniones__parar-texto', botonParar).textContent = parado ? 'Mover la cinta' : 'Parar la cinta';
    if (bucle) { if (parado) { bucle.parar(); plegar(); } else bucle.reanudar(); }
  });

  /* ---------- 5 · arrastrar con el ratón ---------- */
  if (FINO) {
    let arr = null;
    carril.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a, button')) return;
      plegar(); arr = { x: e.clientX, s: carril.scrollLeft, movido: false, id: e.pointerId };
      e.preventDefault();
    });
    carril.addEventListener('pointermove', e => {
      if (!arr) return;
      const dx = e.clientX - arr.x;
      if (!arr.movido && Math.abs(dx) > 4) { arr.movido = true; carril.classList.add('arrastrando'); try { carril.setPointerCapture(arr.id); } catch (_) { /* sin captura */ } }
      if (arr.movido) carril.scrollLeft = arr.s - dx;
    });
    const soltar = () => { if (!arr) return; arr = null; carril.classList.remove('arrastrando'); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => carril.addEventListener(t, soltar));
  }

  /* ---------- 6 · «Leer más» de las largas ---------- */
  $$('.opiniones__leer').forEach(b => b.addEventListener('click', () => {
    const resto = document.getElementById(b.getAttribute('aria-controls'));
    if (!resto) return;
    const abrir = resto.hidden;
    resto.hidden = !abrir;
    b.setAttribute('aria-expanded', String(abrir));
    b.textContent = abrir ? 'Leer menos' : 'Leer más';
  }));

  maquetar();
})();

})();

/* ===== valores ===== */
;(() => {
/* VALORES — cada insignia abre su vídeo (su URL real) en una ventana <dialog> dentro de la página.
   preload="none": nada se descarga hasta pulsar. Esc, el botón o un clic fuera la cierran y el foco vuelve a la insignia. */
(() => {
  'use strict';
  const sec = document.getElementById('valores');
  if (!sec) return;
  const ventana = sec.querySelector('.valores__ventana'), video = sec.querySelector('.valores__video'),
        titulo = sec.querySelector('.valores__ventana-titulo'), cerrar = sec.querySelector('.valores__cerrar');
  if (!ventana || !video || typeof ventana.showModal !== 'function') return;
  let origen = null;

  sec.querySelectorAll('.valores__insignia').forEach(b => b.addEventListener('click', () => {
    origen = b;
    const ancho = +b.dataset.ancho || 16, alto = +b.dataset.alto || 9;
    titulo.textContent = b.dataset.titulo || '';
    ventana.style.setProperty('--ar', (ancho / alto).toFixed(4));
    video.width = ancho; video.height = alto;
    if (b.dataset.poster) video.poster = b.dataset.poster; else video.removeAttribute('poster');
    video.src = b.dataset.video;
    ventana.showModal();
    cerrar.focus({ preventScroll: true });
    const p = video.play();
    if (p && p.catch) p.catch(() => { /* sin reproducción automática: queda el botón de play del vídeo */ });
  }));

  cerrar.addEventListener('click', () => ventana.close());
  ventana.addEventListener('click', e => { if (e.target === ventana) ventana.close(); });   // clic en el fondo
  ventana.addEventListener('close', () => {
    video.pause();
    video.removeAttribute('src'); video.load();             // corta la descarga
    if (origen) origen.focus({ preventScroll: true });
  });
})();

})();

/* ===== intro ===== */
;(() => {
/* INTRO — «mirar la tienda alrededor»: con el cursor, la foto se desplaza ±3 % hacia donde miras
   con zoom 1,06, siempre dentro de su marco (el 6 % de zoom deja justo un 3 % por lado). En reposo, entera. */
(() => {
  'use strict';
  const sec = document.getElementById('intro');
  if (!sec || !window.RS) return;
  const plano = sec.querySelector('.intro__plano'), marco = sec.querySelector('.intro__marco'), img = marco && marco.querySelector('img');
  if (!plano || !img) return;
  RS.revelar(plano, () => setTimeout(() => plano.classList.add('listo'), RS.quieto ? 0 : 3300));
  if (RS.quieto || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let tx = 0, ty = 0, ts = 1, x = 0, y = 0, s = 1, raf = 0;
  const paso = () => {
    x += (tx - x) * .085; y += (ty - y) * .085; s += (ts - s) * .085;
    img.style.transform = (Math.abs(s - 1) < .0005 && Math.abs(x) < .005 && Math.abs(y) < .005) ? '' : `translate(${x.toFixed(3)}%, ${y.toFixed(3)}%) scale(${s.toFixed(4)})`;
    raf = (Math.abs(tx - x) > .004 || Math.abs(ty - y) > .004 || Math.abs(ts - s) > .0004) ? requestAnimationFrame(paso) : 0;
  };
  const mover = () => { if (!raf) raf = requestAnimationFrame(paso); };
  marco.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = marco.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    tx = -nx * 2.9; ty = -ny * 2.9; ts = 1.06; mover();
  });
  marco.addEventListener('pointerleave', () => { tx = 0; ty = 0; ts = 1; mover(); });
})();

})();

/* ===== presentacion ===== */
;(() => {
/* PRESENTACIÓN — 1) la cota que subraya «el modelo que más se adecue a tu espacio», un trazo por línea
   de texto (se rehace al cambiar el ancho); 2) el metro del proceso, que sale de su caja ligado al scroll
   (transform con requestAnimationFrame y solo mientras se ve). En .quieto, el metro está fuera del todo. */
(() => {
  'use strict';
  const sec = document.getElementById('presentacion');
  if (!sec || !window.RS) return;
  const QUIETO = RS.quieto;

  /* ---------- 1 · la cota partida por líneas ---------- */
  const texto = sec.querySelector('.presentacion__texto'), span = sec.querySelector('.presentacion__subrayado'), capa = sec.querySelector('.presentacion__trazos');
  const trazar = () => {
    if (!texto || !span || !capa) return;
    const base = texto.getBoundingClientRect();
    const lineas = [...span.getClientRects()].filter(r => r.width > 2);
    const pb = parseFloat(getComputedStyle(span).paddingBottom) || 0;   // la línea cae dentro del hueco bajo la frase
    capa.innerHTML = lineas.map((r, k) => {
      const ini = k === 0, fin = k === lineas.length - 1;
      return `<span class="presentacion__trazo" style="left:${(r.left - base.left).toFixed(1)}px;top:${(r.bottom - base.top - pb * .6 - 8).toFixed(1)}px;width:${r.width.toFixed(1)}px;--k:${k}">`
        + '<i class="t-linea"></i>'
        + (ini ? '<i class="t-punta t-punta--ini"></i><i class="t-ref t-ref--ini"></i>' : '')
        + (fin ? `<i class="t-punta t-punta--fin" style="--k:${k}"></i><i class="t-ref t-ref--fin"></i>` : '') + '</span>';
    }).join('');
  };
  let rz = 0;
  if (texto) new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(trazar); }).observe(texto);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(trazar);

  /* ---------- 2 · el metro del proceso ---------- */
  const metro = sec.querySelector('.presentacion__metro'), via = sec.querySelector('.presentacion__via'),
        cinta = sec.querySelector('.presentacion__cinta'), una = sec.querySelector('.presentacion__una'),
        pasos = [...sec.querySelectorAll('.presentacion__paso')], plazo = sec.querySelector('.presentacion__plazo');
  if (!metro || !via || !cinta) return;
  let marcas = [], vertical = false, largo = 1, medido = false;
  const medir = () => {
    vertical = via.clientHeight > via.clientWidth;
    largo = vertical ? via.clientHeight : via.clientWidth;
    const r = via.getBoundingClientRect();
    marcas = pasos.map(p => { const b = p.getBoundingClientRect(); return vertical ? (b.top + b.height / 2 - r.top) / largo : (b.left + b.width / 2 - r.left) / largo; });
  };
  const pintar = p => {
    if (vertical) { cinta.style.transform = `translateY(${((p - 1) * 100).toFixed(3)}%)`; una.style.transform = `translateY(${(p * largo).toFixed(2)}px)`; }
    else { cinta.style.transform = `translateX(${((p - 1) * 100).toFixed(3)}%)`; una.style.transform = `translateX(${(p * largo).toFixed(2)}px)`; }
    pasos.forEach((paso, i) => paso.classList.toggle('en-cinta', p >= marcas[i] - .015));
    if (plazo) {
      if (p >= .985 && !medido) { medido = true; RS.cota.medir(plazo); }
      else if (p < .9 && medido) { medido = false; RS.cota.cerrar(plazo); }
    }
  };
  if (QUIETO) { medir(); pintar(1); return; }

  let visible = false, raf = 0, ultimo = -1;
  const actualizar = () => {
    raf = 0;
    const r = metro.getBoundingClientRect(), vh = innerHeight;
    const p = Math.max(0, Math.min(1, (vh * .9 - r.top) / (vh * .2 + r.height)));
    if (Math.abs(p - ultimo) < .0005) return;
    ultimo = p; pintar(p);
  };
  const pedir = () => { if (visible && !raf) raf = requestAnimationFrame(actualizar); };
  new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; if (visible) { ultimo = -1; pedir(); } }, { rootMargin: '80px 0px' }).observe(metro);
  addEventListener('scroll', pedir, { passive: true });
  new ResizeObserver(() => { medir(); ultimo = -1; pedir(); }).observe(metro);
  medir(); pintar(0);
})();

})();

/* ===== visita ===== */
;(() => {
/* VISITA — el día de hoy marcado (hora de Madrid, RS.estado), la marca de «ahora» en su franja,
   las cotas del camino que se abren una tras otra, la luz de las letras corpóreas que sigue al cursor
   (canto y sombra), el tercio de vuelta de la A al entrar el cursor y el zoom de la fachada hacia el cursor. */
(() => {
  'use strict';
  const sec = document.getElementById('visita');
  if (!sec || !window.RS) return;
  const QUIETO = RS.quieto;
  const FINO = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- hoy y ahora ---------- */
  const DESDE = 600, HASTA = 1260;                         // eje de las franjas: 10:00 → 21:00
  const marcarHoy = (e = RS.estado()) => {
    sec.querySelectorAll('.visita__tabla tr').forEach(tr => {
      const hoy = +tr.dataset.dia === e.dia;
      tr.classList.toggle('es-hoy', hoy);
      const barras = tr.querySelector('.visita__barras');
      let ahora = barras && barras.querySelector('.visita__ahora');
      if (hoy && barras && e.min >= DESDE && e.min <= HASTA) {
        if (!ahora) { ahora = document.createElement('span'); ahora.className = 'visita__ahora'; barras.appendChild(ahora); }
        ahora.style.setProperty('--x', ((e.min - DESDE) / (HASTA - DESDE)).toFixed(4));
      } else if (ahora) ahora.remove();
    });
  };
  marcarHoy();
  document.addEventListener('rs:estado', ev => marcarHoy(ev.detail));

  /* ---------- las cotas del camino, una tras otra ---------- */
  const camino = sec.querySelector('.visita__camino');
  const cotas = [...sec.querySelectorAll('.visita__cota')];
  if (camino && !QUIETO) RS.revelar(camino, () => cotas.forEach((c, i) => setTimeout(() => RS.cota.medir(c), 200 + i * 420)));

  if (QUIETO || !FINO) return;

  /* ---------- la luz sobre las letras corpóreas y el tercio de vuelta de la A ---------- */
  const rotulo = sec.querySelector('.visita__rotulo'), tri = sec.querySelector('.visita__tri');
  if (rotulo) {
    let lx = 0, ly = 0, tx = 0, ty = 0, raf = 0, n = 0, listo = false;
    RS.revelar(rotulo, () => setTimeout(() => { listo = true; }, 2300));
    const paso = () => {
      lx += (tx - lx) * .09; ly += (ty - ly) * .09;
      rotulo.style.setProperty('--lx', lx.toFixed(4)); rotulo.style.setProperty('--ly', ly.toFixed(4));
      raf = (Math.abs(tx - lx) > .0008 || Math.abs(ty - ly) > .0008) ? requestAnimationFrame(paso) : 0;
    };
    rotulo.addEventListener('pointermove', e => {
      const r = rotulo.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1));
      ty = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1));
      if (!raf) raf = requestAnimationFrame(paso);
    });
    rotulo.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(paso); });
    rotulo.addEventListener('pointerenter', () => { if (listo && tri) { n++; tri.style.setProperty('--n', n); } });
  }

  /* ---------- la fachada se acerca hacia donde apunta el cursor ---------- */
  const marco = sec.querySelector('.visita__marco');
  if (marco) marco.addEventListener('pointermove', e => {
    const r = marco.getBoundingClientRect();
    marco.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    marco.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  });
})();

})();
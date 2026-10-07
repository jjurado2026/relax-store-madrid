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

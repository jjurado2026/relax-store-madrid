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

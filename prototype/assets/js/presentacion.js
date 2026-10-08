/* PRESENTACIÓN — el metro del proceso, que sale de su caja ligado al scroll (transform con
   requestAnimationFrame y solo mientras se ve); al llegar al final aparece el plazo. En .quieto,
   el metro está fuera del todo. (Pase de elegancia, 8-oct-2026: fuera la cota que subrayaba la
   frase; el énfasis es solo de color, en CSS.) */
(() => {
  'use strict';
  const sec = document.getElementById('presentacion');
  if (!sec || !window.RS) return;
  const QUIETO = RS.quieto;

  const metro = sec.querySelector('.presentacion__metro'), via = sec.querySelector('.presentacion__via'),
        cinta = sec.querySelector('.presentacion__cinta'), una = sec.querySelector('.presentacion__una'),
        pasos = [...sec.querySelectorAll('.presentacion__paso')], plazo = sec.querySelector('.presentacion__plazo');
  if (!metro || !via || !cinta) return;
  let marcas = [], vertical = false, largo = 1;
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
      if (p >= .985) plazo.classList.add('visto');
      else if (p < .9) plazo.classList.remove('visto');
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

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

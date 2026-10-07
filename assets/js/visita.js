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

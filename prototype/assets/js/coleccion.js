/* «Nuestra colección» (pase de elegancia, 8-oct-2026): sin cotas sobre las fotos ni zoom que siga al
   cursor; la reacción es quieta y vive en el CSS (la foto sube 4 px y aparece su sombra). Aquí solo
   queda «Medir mi hueco». */

/* «Medir mi hueco»: las puntas de la cota salen del centro del botón (su ancho cambia con la pantalla) */
(() => {
  const zona = document.querySelector('.coleccion__medir-zona');
  if (!zona) return;
  const medir = () => zona.style.setProperty('--mc-mitad', Math.max(40, zona.offsetWidth / 2 - 10) + 'px');
  medir();
  if ('ResizeObserver' in window) new ResizeObserver(medir).observe(zona);
})();

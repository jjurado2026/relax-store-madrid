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

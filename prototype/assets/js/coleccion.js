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

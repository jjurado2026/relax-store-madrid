/* INTRO — la tienda por dentro, entera. Al entrar se retira la persiana y aparece el panel con la firma.
   La foto NO se mueve con el cursor (pedido el 8-oct-2026: «no me gusta que la foto grande se mueva»). */
(() => {
  'use strict';
  const sec = document.getElementById('intro');
  if (!sec || !window.RS) return;
  const plano = sec.querySelector('.intro__plano'), marco = sec.querySelector('.intro__marco'), img = marco && marco.querySelector('img');
  if (!plano || !img) return;
  RS.revelar(plano, () => setTimeout(() => plano.classList.add('listo'), RS.quieto ? 0 : 3300));
})();

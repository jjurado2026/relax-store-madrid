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

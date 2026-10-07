/* «Tu hueco, a escala, por WhatsApp»: el croquis.
   · Formulario → RS.hueco (medida = ancho, compartida con el metro del hero; datos: tipo, fondo,
     alto, condiciones, franja, colchón). Los modelos llegan de las postales (RS.hueco.modelos).
   · RS.hueco.redactar: el mensaje completo que mandan TODOS los botones de WhatsApp.
   · El dibujo: planta a escala real (1 unidad = 1 cm; si no cabe, todo, cuadrícula incluida, se
     reduce por igual). Cada pieza se coloca con transform y se mueve con muelle (CSS). */
(() => {
  'use strict';
  const RS = window.RS, sec = document.getElementById('croquis');
  if (!RS || !sec) return;
  const $ = (s, c = sec) => c.querySelector(s), $$ = (s, c = sec) => [...c.querySelectorAll(s)];
  const form = $('[data-croquis]'), svg = $('[data-svg]'), titulo = $('#croquis-svg-t');
  const el = n => $(`[data-el="${n}"]`, svg), parte = (g, p) => $(`[data-p="${p}"]`, g);
  const burbuja = $('[data-mensaje]'), errorP = $('[data-error]');
  form.addEventListener('submit', e => e.preventDefault());

  /* ---------- estado ---------- */
  const E = { tipo: '', fondo: 0, alto: 0, cond: new Set(), franja: '', cAncho: 0, cLargo: 0 };
  const TIPOS = { 'sofa': 'un sofá a medida', 'sofa-cama': 'un sofá cama a medida', 'chaise': 'una chaise longue o una rinconera a medida', 'butaca': 'una butaca o un sillón a medida', 'cama': 'una cama o un canapé a medida', 'cabecero': 'un cabecero a medida' };
  const CONDICIONES = { columnas: 'hay columnas o un pilar', esquina: 'va en una esquina', puerta: 'la puerta o el ascensor son estrechos', mascotas: 'tengo mascotas' };
  const ORDEN_COND = ['columnas', 'esquina', 'puerta', 'mascotas'];
  const esColchon = () => E.tipo === 'colchon';
  const condiciones = () => ORDEN_COND.filter(c => E.cond.has(c));

  /* ---------- el mensaje (lo usan todos los botones de WhatsApp) ---------- */
  RS.hueco.redactar = h => {
    const d = h.datos || {}, colchon = d.tipo === 'colchon';
    const cond = colchon ? [] : (d.condiciones || []);
    const propio = d.tipo || d.fondo || d.alto || cond.length || d.franja || (d.colchon && (d.colchon.ancho || d.colchon.largo));
    if (!propio) return '';                       // solo medida o modelos: la redacción base
    const l = ['Hola, Relax Store.'];
    if (colchon) {
      const a = d.colchon && d.colchon.ancho, g = d.colchon && d.colchon.largo;
      l.push(a && g ? `Busco un colchón de ${a} × ${g} cm.` : a ? `Busco un colchón de ${a} cm de ancho.` : 'Busco un colchón.');
    } else {
      const tipo = TIPOS[d.tipo] || 'un sofá o una cama a medida';
      const m = [h.medida && `${h.medida} cm de ancho`, d.fondo && `${d.fondo} cm de fondo`, d.alto && `${d.alto} cm de alto`].filter(Boolean);
      l.push(m.length ? `Busco ${tipo} para un hueco de ${RS.enumerar(m)}.` : `Busco ${tipo} para un hueco de mi casa.`);
      if (cond.length) l.push(`Además, ${RS.enumerar(cond.map(c => CONDICIONES[c]))}.`);
    }
    const mod = h.modelos || [];
    if (mod.length === 1) l.push(`Me interesa el modelo ${mod[0]}.`);
    else if (mod.length > 1) l.push(`Me interesan los modelos ${RS.enumerar(mod)}.`);
    if (d.franja) l.push(`Me viene bien pasar por la ${d.franja}.`);
    l.push(colchon ? '¿Qué me recomendáis?' : 'Os mando una foto del hueco.');
    return l.join('\n');
  };
  const guardar = () => RS.hueco.set({
    tipo: E.tipo, fondo: E.fondo, alto: E.alto, condiciones: condiciones(), franja: E.franja,
    colchon: { ancho: E.cAncho, largo: E.cLargo }
  }, 'croquis');

  /* ---------- metros ---------- */
  const metros = {};
  const comprobar = () => {
    const malo = $$('.croquis__metro:not([hidden]) input').some(i => { const v = +i.value; return i.value !== '' && (v < 30 || v > 999); });
    errorP.hidden = !malo;
    $$('.croquis__metro').forEach(m => { const i = $('input', m), v = +i.value, mal = !m.hidden && i.value !== '' && (v < 30 || v > 999); m.classList.toggle('invalido', mal); i.setAttribute('aria-invalid', mal ? 'true' : 'false'); });
  };
  $$('.croquis__metro').forEach(m => {
    const k = m.dataset.medida;
    const nombres = { ancho: 'Ancho del hueco', fondo: 'Fondo del hueco', alto: 'Alto del hueco', 'c-ancho': 'Ancho del colchón', 'c-largo': 'Largo del colchón' };
    metros[k] = RS.metro(m, {
      etiqueta: `${nombres[k]}, en centímetros`,
      alCambiar(v, desde) {
        if (desde !== 'arrastre') pop(k);
        if (k === 'ancho') RS.hueco.set({ medida: v }, 'croquis');
        else { if (k === 'fondo') E.fondo = v; if (k === 'alto') E.alto = v; if (k === 'c-ancho') E.cAncho = v; if (k === 'c-largo') E.cLargo = v; guardar(); }
        if (!errorP.hidden) comprobar();
      }
    });
    $('input', m).addEventListener('change', comprobar);
    $('input', m).setAttribute('aria-describedby', 'croquis-error');
  });
  errorP.id = 'croquis-error';

  /* ---------- qué buscas, colchón, condiciones, franja ---------- */
  const grupoMedidas = $('[data-medidas]'), grupoColchon = $('[data-colchon]'), grupoCond = $('[data-condiciones]');
  $$('input[name="croquis-tipo"]').forEach(r => r.addEventListener('change', () => {
    E.tipo = r.value;
    grupoMedidas.hidden = esColchon(); grupoColchon.hidden = !esColchon(); grupoCond.hidden = esColchon();
    comprobar(); guardar();
  }));
  const chipsColchon = (nombre, k, metro) => $$(`input[name="${nombre}"]`).forEach(r => r.addEventListener('change', () => {
    const otra = r.value === 'otra', mEl = metro.el;
    mEl.hidden = !otra;
    if (otra) { const v = metro.valor; E[k] = v; requestAnimationFrame(() => { metro.redibujar(); $('input', mEl).focus(); }); }
    else { E[k] = +r.value; }
    pop(k === 'cAncho' ? 'c-ancho' : 'c-largo'); comprobar(); guardar();
  }));
  chipsColchon('croquis-c-ancho', 'cAncho', metros['c-ancho']);
  chipsColchon('croquis-c-largo', 'cLargo', metros['c-largo']);
  $$('.croquis__interruptor input').forEach(c => c.addEventListener('change', () => { c.checked ? E.cond.add(c.name) : E.cond.delete(c.name); guardar(); }));
  $$('[data-franja]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.franja, ya = E.franja === v;
    E.franja = ya ? '' : v;
    $$('[data-franja]').forEach(x => x.setAttribute('aria-pressed', x.dataset.franja === E.franja ? 'true' : 'false'));
    guardar();
  }));

  /* ---------- modelos (desde las postales) ---------- */
  const listaModelos = $('[data-modelos]'), vacio = $('[data-modelos-vacio]');
  const X = '<span class="croquis__x" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span>';
  const pintarModelos = () => {
    const l = RS.hueco.modelos;
    vacio.hidden = l.length > 0;
    listaModelos.innerHTML = l.map(m => `<button class="chip croquis__modelo" type="button" data-modelo="${m.replace(/"/g, '&quot;')}" aria-label="Quitar ${m} de mi hueco">${m}${X}</button>`).join('');
  };
  listaModelos.addEventListener('click', e => {
    const b = e.target.closest('[data-modelo]'); if (!b) return;
    const i = [...listaModelos.children].indexOf(b);
    RS.hueco.quitar(b.dataset.modelo, 'croquis');
    const sig = listaModelos.children[i] || listaModelos.children[i - 1];
    (sig || $('.croquis__a-postales')).focus();
  });

  /* ---------- empezar de nuevo ---------- */
  $('[data-reiniciar]').addEventListener('click', () => {
    form.reset();
    Object.assign(E, { tipo: '', fondo: 0, alto: 0, franja: '', cAncho: 0, cLargo: 0 }); E.cond.clear();
    $$('[data-franja]').forEach(x => x.setAttribute('aria-pressed', 'false'));
    grupoMedidas.hidden = false; grupoColchon.hidden = true; grupoCond.hidden = false;
    metros['c-ancho'].el.hidden = true; metros['c-largo'].el.hidden = true;
    Object.values(metros).forEach(m => m.fijar(0, { silencio: true }));
    RS.hueco.set({ medida: 0 }, 'croquis');
    RS.hueco.vaciar('croquis');
    comprobar(); dibujar();
    $('input[name="croquis-tipo"]').focus();
  });

  /* ---------- el dibujo ---------- */
  const VB_W = 560, VB_H = 320, MURO_Y = 58, PIL = 35, ESQ = 18, MARGEN = 24, SITIO_COTA = 92, ZOOM_MAX = 1.5;
  const tr = (x, y, extra = '') => `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)${extra}`;
  const poner = (g, t) => { if (g) g.style.transform = t; };
  let k = 1;                                   // unidades de la lámina por píxel de pantalla (letra y puntas constantes)
  const medirLetra = () => { const w = svg.getBoundingClientRect().width || VB_W; k = VB_W / w; svg.style.setProperty('--k', k.toFixed(4)); };
  const textoPop = new Map();
  function pop(clave) { textoPop.set(clave, true); }
  // papel milimetrado en centímetros, con el origen en la esquina del hueco: cuadro de 10 cm, raya de 50 cm y de 1 m
  (() => {
    const lin = paso => { let d = ''; for (let x = -800; x <= 900; x += paso) d += `M${x} -300V500`; for (let y = -300; y <= 500; y += paso) d += `M-800 ${y}H900`; return d; };
    const c = el('cuadricula');
    parte(c, 'mm').setAttribute('d', lin(10)); parte(c, 'm50').setAttribute('d', lin(50)); parte(c, 'm1').setAttribute('d', lin(100));
  })();

  function dibujar() {
    const col = esColchon();
    const ancho = col ? E.cAncho : RS.hueco.medida;
    const fondoReal = col ? E.cLargo : E.fondo;
    const fondo = fondoReal || (col ? 190 : 80);
    const conCol = !col && E.cond.has('columnas'), conEsq = !col && E.cond.has('esquina'), conPuerta = !col && E.cond.has('puerta');
    svg.classList.toggle('con-ancho', ancho > 0);
    svg.classList.toggle('con-fondo', ancho > 0 && fondoReal > 0);
    svg.classList.toggle('sin-fondo', !fondoReal);
    svg.classList.toggle('colchon', col);
    const ver = (n, si) => { const g = el(n); if (g) g.toggleAttribute('data-oculto', !si); };
    ver('cota-ancho', ancho > 0); ver('rotulo-hueco', ancho > 0); ver('cota-fondo', ancho > 0 && fondoReal > 0); ver('vacio', !ancho);
    ver('pilar-izq', conCol && !conEsq); ver('rotulo-col-izq', conCol && !conEsq); ver('pilar-der', conCol); ver('rotulo-col-der', conCol);
    ver('esquina', conEsq); ver('rotulo-esquina', conEsq); ver('puerta', conPuerta); ver('rotulo-puerta', conPuerta);

    // escala: todo (cuadrícula incluida) a la misma escala, hasta 1,5 unidades por cm, para que el hueco llene la lámina
    const izqExtra = conEsq ? ESQ : (conCol ? PIL : 0), derExtra = conCol ? PIL : 0;
    const anchoDib = ancho || 200;
    const totalCm = (conEsq ? 0 : izqExtra) + anchoDib + derExtra;
    const s = Math.min(ZOOM_MAX, (VB_W - 2 * MARGEN - SITIO_COTA - (conEsq ? ESQ : 0)) / totalCm, (VB_H - MURO_Y - 78) / fondo);
    const w = anchoDib * s, h = fondo * s;
    const bloque = (conEsq ? 0 : izqExtra * s) + w + derExtra * s + SITIO_COTA;
    const x0 = conEsq ? MARGEN + ESQ : Math.max(MARGEN, (VB_W - bloque) / 2 + izqExtra * s);   // borde izquierdo del hueco
    const y0 = MURO_Y;
    poner(el('cuadricula'), tr(x0, y0, ` scale(${s.toFixed(4)})`));

    poner(el('hueco'), tr(x0, y0, ` scale(${w.toFixed(2)}, ${h.toFixed(2)})`));
    poner(el('pilar-izq'), tr(x0 - PIL * s, y0, ` scale(${s.toFixed(3)})`));
    poner(el('pilar-der'), tr(x0 + w, y0, ` scale(${s.toFixed(3)})`));
    poner(el('esquina'), tr(x0 - ESQ, 40));
    poner(el('puerta'), tr(VB_W - 168, VB_H - 12));

    // cota del ancho, debajo del hueco
    const ca = el('cota-ancho'), yA = y0 + h + 34, pk = ` scale(${k.toFixed(3)})`;
    poner(parte(ca, 'linea'), tr(x0, yA, ` scale(${w.toFixed(2)}, 1)`));
    poner(parte(ca, 'ref1'), tr(x0, y0 + h + 6, ` scale(1, ${(yA - y0 - h + 4).toFixed(2)})`));
    poner(parte(ca, 'ref2'), tr(x0 + w, y0 + h + 6, ` scale(1, ${(yA - y0 - h + 4).toFixed(2)})`));
    poner(parte(ca, 'punta1'), tr(x0, yA, ` rotate(0deg)${pk}`));
    poner(parte(ca, 'punta2'), tr(x0 + w, yA, ` rotate(180deg)${pk}`));
    poner(parte(ca, 'texto'), tr(x0 + w / 2, yA - 9 * k));
    const tA = $('text', parte(ca, 'texto')); const vA = ancho ? `${ancho} cm` : '';
    if (tA.textContent !== vA) { tA.textContent = vA; animarTexto(parte(ca, 'texto'), col ? 'c-ancho' : 'ancho'); }

    // cota del fondo, a la derecha
    const cf = el('cota-fondo'), xF = x0 + w + derExtra * s + 30;
    poner(parte(cf, 'linea'), tr(xF, y0, ` scale(1, ${h.toFixed(2)})`));
    poner(parte(cf, 'ref1'), tr(x0 + w + derExtra * s + 6, y0 + h, ` scale(${(xF - x0 - w - derExtra * s + 2).toFixed(2)}, 1)`));
    poner(parte(cf, 'punta1'), tr(xF, y0, ` rotate(90deg)${pk}`));
    poner(parte(cf, 'punta2'), tr(xF, y0 + h, ` rotate(-90deg)${pk}`));
    poner(parte(cf, 'texto'), tr(xF + 10 * k, y0 + h / 2 + 8 * k));
    const tF = $('text', parte(cf, 'texto')); const vF = fondoReal ? `${fondoReal} cm` : '';
    if (tF.textContent !== vF) { tF.textContent = vF; animarTexto(parte(cf, 'texto'), col ? 'c-largo' : 'fondo'); }

    // rótulos
    const rh = el('rotulo-hueco'), tH = $('[data-t="hueco"]', rh), tAl = $('[data-t="alto"]', rh);
    tH.textContent = col ? (E.cAncho && E.cLargo ? `${E.cAncho} × ${E.cLargo} cm` : '') : 'tu hueco';
    const vAl = !col && E.alto ? `alto ${E.alto} cm` : '';
    if (tAl.textContent !== vAl) { tAl.textContent = vAl; if (vAl) animarTexto(rh, 'alto'); }
    poner(rh, tr(x0 + w / 2, y0 + h / 2 + (vAl ? -2 : 8 * k)));
    poner(el('rotulo-col-izq'), tr(x0 - PIL * s / 2, 30));
    poner(el('rotulo-col-der'), tr(x0 + w + PIL * s / 2, 30));
    poner(el('rotulo-esquina'), tr(x0 - ESQ - 9, y0 + 120));
    poner(el('rotulo-puerta'), tr(VB_W - 96, VB_H - 102));
    poner(el('vacio'), tr(x0 + w / 2, y0 + h + 40));

    // la escala: 1 m
    const es = el('escala'), L = 100 * s;
    poner(es, tr(conEsq ? MARGEN + ESQ + 14 : MARGEN, VB_H - 14));
    poner(parte(es, 'barra'), ` scale(${L.toFixed(2)}, 1)`);
    poner(parte(es, 'm0'), 'none'); poner(parte(es, 'm1'), tr(L / 2, 0)); poner(parte(es, 'm2'), tr(L, 0));
    poner(parte(es, 'texto'), tr(L + 8, 4 * k));

    // título accesible
    if (!ancho) titulo.textContent = 'Croquis vacío: pon el ancho para dibujar tu hueco.';
    else if (col) titulo.textContent = `Croquis de tu colchón: ${ancho} cm de ancho${E.cLargo ? ` y ${E.cLargo} cm de largo` : ''}.`;
    else {
      const extra = [conCol && 'entre columnas', conEsq && 'en una esquina'].filter(Boolean);
      titulo.textContent = `Croquis de tu hueco: ${ancho} cm de ancho${E.fondo ? ` y ${E.fondo} cm de fondo` : ''}${extra.length ? ', ' + extra.join(', ') : ''}.`;
    }
  }
  // la cifra «vuelve a medir»: se cierra y se abre con muelle (solo si no viene de arrastrar)
  function animarTexto(g, clave) {
    if (RS.quieto || !textoPop.get(clave) || !g.animate) return;
    textoPop.delete(clave);
    const t = $('text', g) || g;
    t.animate([{ opacity: 0, transform: 'translateY(6px) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 650, easing: getComputedStyle(document.documentElement).getPropertyValue('--muelle').trim() || 'ease-out' });
  }

  /* ---------- vista previa del mensaje ---------- */
  let antes = [];
  const pintarMensaje = () => {
    const lineas = RS.hueco.mensaje().split('\n');
    burbuja.innerHTML = '';
    lineas.forEach(t => {
      const s = document.createElement('span'); s.className = 'croquis__linea'; s.textContent = t;
      if (antes.length && !antes.includes(t)) s.classList.add('nueva');
      burbuja.appendChild(s);
    });
    antes = lineas;
  };

  /* ---------- sincronía con el hero y las postales ---------- */
  RS.hueco.on(d => {
    if (d.cambio === 'medida' && d.origen !== 'croquis' && metros.ancho.valor !== d.medida) metros.ancho.fijar(d.medida, { silencio: true });
    if (d.cambio === 'anadir' || d.cambio === 'quitar' || d.cambio === 'vaciar') pintarModelos();
    dibujar(); pintarMensaje();
  });
  let rz = 0;
  new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { medirLetra(); dibujar(); }); }).observe(svg);

  // arranque: si el hero ya trae medida, el croquis la toma
  if (RS.hueco.medida) metros.ancho.fijar(RS.hueco.medida, { silencio: true, animar: false });
  medirLetra(); pintarModelos(); dibujar(); pintarMensaje();
  RS.pintarWA();
})();

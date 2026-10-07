# Relax Store Las Rozas — Propuesta de nueva homepage

Prototipo de homepage para **Relax Store Las Rozas** ([relaxstoremadrid.com](https://relaxstoremadrid.com/)), tienda de sofás, camas tapizadas y colchones a medida en C/ Turín 17D, Európolis (Las Rozas de Madrid). 4,9 ★ con 404 reseñas en Google.

**Prototipo:** https://jjurado2026.github.io/relax-store-madrid/

**El problema que resuelve:** su home actual pesa 11 MB, tarda más de 6 segundos en pintar algo en un móvil con 4G lenta y su primera pantalla no dice qué venden, no tiene logotipo (es un píxel transparente), ni titular, ni teléfono: este aparece a 7,4 pantallas de scroll y el horario no está en ninguna parte. Encima del hero, una galería vacía de la plantilla intenta cargar seis «fotos de gatitos» de un servicio que ya no existe. Las 29 fichas de producto dicen «Error: Formulario de contacto no encontrado».

## Dirección estética: «Cota»

En dibujo técnico, la *cota* es la línea con dos flechas que dice cuánto mide algo. Su fachada ya es un plano (el cuadro del sofá azul, «Camas y sofás a medida» a rotulador, las letras con el triángulo) y la frase que Google destaca de sus reseñas es *«el sofá cama nos lo hicieron a la medida exacta del hueco»*. La home es ese plano acotado: cada pieza encaja en su hueco con su cota, **cuyas puntas son el triángulo de su logotipo**, y el visitante **tira de un metro** para contar su hueco y mandarlo por WhatsApp. Nadie en Európolis, «la calle de los sofás», usa la medida como lenguaje gráfico.

- **Paleta de su fachada de día:** papel `#F6F8FA`, tinta de rótulo `#0C2B44`, el azul de su triángulo `#136CA8` (solo en lo que mide y en el botón principal) y la mostaza de su pared, solo en las estrellas.
- **Tipografía:** Epilogue para todo y Gochi Hand (la mano de su fachada) solo en las cotas.
- Elegida en un panel de seis direcciones con maqueta real (Cota, Postales, Escaparate, La A, De palabra y Sueños tapizados). Injerta de Postales el expositor de sus sofás-postal y de La A sus letras corpóreas.

## La home, de arriba abajo
1. **Cabecera** con su logotipo real «Rel▲x Store · Las Rozas», teléfono y WhatsApp.
2. **«Sofás y camas a la medida exacta de tu hueco»**: su foto del hero entera entre dos columnas rayadas, su cota, el sello 4,9 · 404 reseñas, **el metro** (tu medida viaja en el WhatsApp) y el estado abierto/cerrado en vivo.
3. **Nuestra colección**: sus tres fotos, cada una en su nicho, con sus lemas a mano.
4. **Los sofás, en postales**: sus 26 postales de catálogo (cada sofá lleva nombre de ciudad) en un expositor; se dan la vuelta y por detrás preguntas por ese modelo o lo añades a tu hueco.
5. **Tu hueco, a escala, por WhatsApp**: qué buscas, medidas con metros, condicionantes y franja; un croquis en papel milimetrado se dibuja a escala y el mensaje sale escrito.
6. **4,9 en Google, con 404 reseñas**: sus 10 reseñas, literales, colgadas de una cinta métrica que mide el tiempo.
7. **La diferencia, nuestros valores**: cota en cadena con sus tres insignias (Chill Out, Pet Friendly, Kids Zone) que abren los vídeos de su tienda.
8. **Intro**: la tienda por dentro, entera y sin velo, con la firma de Jorge.
9. **Presentación y proceso**: del pedido al montaje, un metro que se saca con el scroll.
10. **Ven a probarlo**: sus letras corpóreas, la fachada, cómo llegar con distancias reales, horario de la semana y mapa.
11. **Pie** como el cajetín de un plano. En el móvil, barra fija Llamar · WhatsApp · Cómo llegar.

## Fotos
Las mismas de su web, en el mismo sitio y sin recortar ni retocar color. La del hero y las tres de la colección, ampliadas con IA (Real-ESRGAN, mezcla con remacri para no alisar el tejido). La 003 es de banco de imágenes y la 005 lleva la marca de agua del proveedor: se mantienen porque son las suyas, y la propuesta pide sustituirlas.

## Comprobado, no asumido
Con el kit del taller (Chrome headless por DevTools): **el hero cabe entero en 14 tamaños** (de 320×568 a 2560×1440, incluido el móvil apaisado) · sin desbordamiento horizontal · las fotos a su proporción · dianas táctiles ≥ 44 px · un solo `h1`, todas las imágenes con `alt`, botones con nombre accesible · **cero errores de JavaScript** · con `prefers-reduced-motion` nada se mueve y todo se ve · solo se animan `transform` y `opacity` · fotos y botones reaccionan al cursor. **Peso: ~0,6 MB la primera vista y ~1,2 MB la página entera**, frente a 11 MB.

## Stack
HTML, CSS y JavaScript puro. Cero dependencias, cero build. Epilogue + Gochi Hand autoalojadas.

Parámetros útiles: `?ss` (sin animaciones, para capturas) · `?ahora=2026-10-08T18:00` (fija la hora de Madrid para revisar el estado abierto/cerrado) · `?caducada` (simula la caducidad).

## Caducidad
La propuesta se ve hasta el **jueves 15 de octubre de 2026 a las 23:59** (hora de Madrid). Desde el 16, `index.html` lleva a `caducada.html`: el aviso, el contacto y la home en miniatura. La fecha está en el primer `<script>` de `index.html` (`Date.UTC(2026, 9, 15, 22, 0)`). Abierto como archivo (`file://`) no caduca.

## Ver en local
```bash
cd prototype && python -m http.server 8000
```

## Publicar
```bash
git subtree push --prefix=prototype origin gh-pages
```

---
Diseño y desarrollo: **Juan Jurado** · [jjuradogarciadelrio.com](https://jjuradogarciadelrio.com)

# Continuidad — Personas y vehículos (rediseño aprobado)

## Contrato de datos confirmado (inspección real)

- Los campos de la persona principal son **escalares del documento del hecho**:
  `personas_tipo_usuario`, `personas_sexo`, `personas_edad`, `personas_tipo_vehiculo`,
  junto a `personas_lesionadas` y `personas_fallecidas`. Un documento = un hecho
  (`version` + folio único), sin arrays de personas: no hay uniones 1‑a‑muchos ni
  riesgo de duplicar hechos al cruzar dos de esos campos.
- Por eso `personas_sexo` × `personas_edad` **sí** describe a la misma persona
  principal (no es una unión posicional de arrays). La nota anterior del tablero
  («el archivo no permite ese cruce sin unir registros por folio») era incorrecta.
- `FilaPersonas` ya incluye `hechos`, `lesionadas`, `fallecidas`, `denominador`,
  `lesionadas_en_esos_hechos`, `fallecidas_en_esos_hechos`: la gráfica de
  posiciones no necesita cambios de backend.
- Cero ≠ ausente ≠ no publicado: el servicio agrupa `None`, `""`, «sin dato» en
  una sola fila «Sin dato» y no la convierte en cero.

## Incrementos completados

1. **Contrato + endpoint**: `_cruce_edad_sexo` en `app/services/atlas_service.py`
   usa `repo.cruce(..., "personas_sexo", "personas_edad")` (una sola agregación) y
   agrupa edades con `GRUPOS_EDAD`, con `sin_edad`, `sin_sexo` y cobertura.
   Verificado: grupos Hombre 20 159 / Mujer 9 491 / Sin dato de sexo 1 005;
   celdas suman **30 655 hechos**, **36 266 lesionadas** y **533 fallecidas**
   (= KPI); cobertura 28 029 con edad y sexo, 1 654 sin edad, 1 005 sin sexo.
   Tipos añadidos en `src/api/tipos.ts` (`cruce_edad_sexo`).
2. **Gráfica A «Una categoría, tres lecturas»** (`src/ui/PosicionesTipoPersona.tsx`),
   integrada en `VistaPersonas` sustituyendo la tarjeta de «Tipo de persona».
   Orden por métrica con empate por nombre; conexiones por **identidad de etiqueta**
   (no por fila). Verificado en navegador: 5 categorías, 10 conectores y **2
   conexiones que cambian de posición** (identidad, no fila); Σ hechos 30 655.

## Incrementos completados (continuación)

3. **Gráfica B «Edad y sexo de la persona principal» — burbujas reagrupables**
   (`src/ui/BurbujasEdadSexo.tsx`). Modelo de **nodos planos**: un nodo por combinación
   real edad × sexo, clave estable `edad|sexo`, **una sola escala de área**
   `r = k·√valor` con la misma `k` en las tres agrupaciones. La geometría es un
   **empaquetado circular real** (`packSiblings` de `d3-hierarchy`, instalado): se
   empaqueta con radio de colisión `r + separacion/2` (separación visual 4 px) y se
   conserva `r` como radio visible, sin filas, columnas ni posiciones por índice.
   `k` se elige por bisección como la mayor con la que las tres vistas caben enteras
   (círculos y encabezados) en la región de dibujo. Las vistas agrupadas empaquetan
   cada grupo y colocan los bloques en estanterías; los encabezados reservan su ancho.
   Columna explicativa de 200 px («Cómo leer la gráfica», leyenda de sexo y
   «Restablecer posiciones»), dos selectores alineados (métrica y agrupación),
   transición de 420 ms, tooltip opaco junto al nodo con porcentaje y ambos
   denominadores, leyenda de tamaño abajo a la derecha, notas bajo el dibujo y tabla
   accesible. Arrastre con reorganización local y sin superposiciones.
4. **Gráfica C «Vehículo principal: comparación entre periodos»**
   (`src/ui/VehiculosPeriodos.tsx`): dos consultas `/personas` (A/B) dentro del filtro
   global, vistas Volumen y Cambio con columnas de diferencia, «Sin base en A» y
   sección de detalle. Los controles de periodo A/B se retiraron por petición; todas
   las categorías están visibles.
5. Estado único de métrica Hechos/Lesionadas/Fallecidas compartido por B y C; el
   selector se extrajo a `src/ui/SelectorMetrica.tsx` para que ambas tarjetas usen el
   mismo control.

## Checks del último incremento (composición con empaquetado circular)

- `npx tsc --noEmit` limpio; `npm run build` correcto (bundle 532,5 KB).
- `node tools/verificar-reagrupable.mjs` (navegador real, 1240 px y 390 px); informe
  completo en `evidencias/personas/informe-reagrupable.json`:
  - 24 nodos con clave única en las tres vistas, **mismos nodos**, `r/√valor` idéntico
    (`k = 1,0771`, desvío 0) y **0 solapes** en las tres (separación mínima 3,2–3,7 px).
  - Composición en Conjunto: bbox 400×429 en una región de 826×470 (aspecto 0,93),
    relleno 0,65, hueco medio entre vecinos 3,7 px, **0 nodos aislados**, correlación
    radio↔x = −0,07 (sin degradado de tamaño de izquierda a derecha) y 21 niveles de y.
  - Ninguna vista desborda la región (Por edad 686×446; Por sexo 685×352).
  - Tarjeta: columna explicativa de 200 px, región de 470 px, los dos selectores en la
    misma fila, leyenda de tamaño dentro de la región.
  - Tooltip opaco junto al nodo: «25–34 · Hombre · 6 375 hechos · 20,8 % de 30 655 del
    conjunto · 6 375 de 9 406 en su edad».
  - Transición 0,42 s con nodos en vuelo capturados; reagrupar no dispara consultas
    (0 nuevas) y el movimiento reducido la anula (`1e-06s`).
  - Arrastre: el nodo se mueve 60×70 px, **no vuelve solo**, mueve 15 vecinos, 0
    solapes después y «Restablecer» devuelve la composición calculada.
  - Métricas: Hechos 24 nodos, Lesionadas 24, Fallecidas 9, sin solapes. Estado
    compartido verificado desde el selector de vehículos (9 nodos y vuelta a 24).
  - Filtros: solo Mujer → 8 nodos, todos rosa, 0 solapes; Mujer 25–34 → 1 nodo
    centrado. Sin desborde de página; móvil 390 px con lienzo 311 = ancho CSS.
- Reconciliación con la API: 24 nodos, Σ 30 655 hechos, 36 266 lesionadas, 533 fallecidas.
- Sin regresión vecina: `verificar-personas.mjs` (Σ 30 655, 5 categorías, 2 conexiones
  que cambian de posición) y `verificar-veh.mjs` (12 filas, 12 puntos).
- Capturas: `evidencias/personas/reagrupable-{conjunto,edad,sexo,detalle,transicion,arrastre,fallecidas,filtro-mujer,una-categoria,movil,movil-panel}.png`.
- Sin regresión en paneles vecinos: `verificar-personas.mjs` (Σ 30 655, 5 categorías,
  2 conexiones que cambian de posición) y `verificar-veh.mjs` (12 filas, 12 puntos).

## Ajuste posterior: «Una categoría, tres lecturas» ocupa todo el ancho

La gráfica se quedaba en 660 px centrados porque el `ResizeObserver` medía el nodo
`.at-pos-lienzo`, cuyo ancho lo fija el propio componente: al ser su ancho inicial el
mínimo, nunca crecía y sobraba espacio blanco a los lados. Ahora se mide el contenedor
exterior `.at-pos` con una referencia de estado (el nodo solo existe cuando hay datos),
el lienzo llega al 100 % y las tres columnas se reparten el ancho. Verificado con
`tools/verificar-posiciones.mjs` a 1240 px: contenido 1050 px, lienzo 1048 px, tres
columnas de 336 px, márgenes laterales de 1 px, 10 conectores con **0 desalineados** y
resalte de las 3 píldoras y sus 2 conexiones. En móvil el lienzo queda en 560 px con
desplazamiento interno y la página no desborda (390 px).
Capturas: `evidencias/personas/posiciones-{escritorio,hover,movil}.png`.

## Ajuste posterior: controles y leyendas de «Edad y sexo»

- Los **dos selectores** (métrica y agrupación) van en una sola fila alineada a la
  derecha, con 12 px de separación, misma altura y el mismo estilo segmentado; ya no
  hay selector a la izquierda. En móvil envuelven en dos filas completas, sin recortes.
- La **leyenda de sexo** salió de la columna izquierda: ahora forma un bloque compacto
  en la esquina inferior derecha, con la leyenda de tamaños arriba y el sexo registrado
  debajo, en una fila cuando cabe, con marcadores de 9 px y texto de 11 px. La leyenda
  de tamaño mantiene el nombre de la métrica activa (Hechos, Lesionadas, Fallecidas).
- Las leyendas viven **fuera del SVG**, en una banda propia debajo del dibujo: se
  reserva ese espacio, así que no cubren burbujas ni notas, y los radios no cambian
  (`k = 1,0771`, igual que antes del ajuste).
- Se **retiró** el botón «Restablecer posiciones», sin sustituto. El arrastre se
  conserva y las posiciones ya no se reinician al pasar el cursor ni al repintar.
- Verificado con `tools/verificar-reagrupable.mjs` (1240 px y 390 px):
  `separacionEntreSelectores: 12`, `alineadosDerecha: true`, `leyendasDebajoDelDibujo:
  true`, `ordenLeyendas: [tamano, sexo]`, `leyendasAlineadasDerecha: true`,
  `sexoEnUnaFila: true`, `fuenteSexo: 11px`, `leyendasContraBurbujas: 0`,
  `leyendasContraNotas: 0`, `sinBoton: true`, arrastre persistente
  (`igualQueAlSoltar: true`, 0 solapes) y móvil sin desborde (`scrollWidth` 390).

## Pendiente conocido

- `tools/verificar-interaccion.mjs` sigue apuntando a la tabla retirada.
- Métricas distintas no son comparables entre sí: cada una recalcula `k` (la leyenda de
  tamaño indica los valores vigentes).
- Al reagrupar, `k` es común a las tres vistas, así que la masa de Conjunto no llena el
  ancho de la región: la limita la vista agrupada más ancha y el alto disponible.
- En nodos muy pequeños (radio menor que el texto) no hay etiqueta interior; el valor
  se obtiene con hover, foco o pulsación y en la tabla accesible.

## Ajuste posterior: «Hallazgos del análisis» todo en negro

Los títulos dejaron de usar el color de la métrica y el bloque entero va en `#111318`
(títulos, cuerpo y mensaje vacío). Hizo falta repetir los selectores con
`.hallazgos-host` porque la ficha del proyecto aplica `.hallazgos-host p { color: inherit }`
(mayor especificidad que `.at-hallazgo-texto`) y arrastraba el gris del contenedor.
Verificado con `tools/verificar-hallazgos.mjs`: 8 textos del bloque, un solo color
`rgb(17, 19, 24)` y las mismas cifras (4 349 · 14,2 % · 512 · 1,7 % · 18 112 · 59,1 % ·
08:00 · 4 709 · 15,6 %). Captura: `evidencias/atlas/hallazgos-negro.png`.

## Ajuste posterior: retiro de la tarjeta de cobertura
Se eliminó la sección «Cobertura del conjunto filtrado» de la pestaña de personas
(«Total de hechos», «Con tipo de persona», «Con sexo», «Con edad», «Con vehículo» y su
nota). Con ella se retiraron el marcado `.at-panel--cobertura-personas` y el bloque
CSS `.at-cob-lista`, que no tenían otro consumidor. La vista queda con las tres
gráficas y la nota final de alcance. Verificado con
`tools/verificar-cobertura-personas.mjs`: `existeTituloCobertura: false`,
`restosEnDom: 0`, y quedan los paneles «Una categoría, tres lecturas», «Edad y sexo de
la persona principal» y «Vehículo principal»; `verificar-veh.mjs` y
`verificar-personas.mjs` siguen pasando. Captura:
`evidencias/personas/personas-sin-cobertura.png`.

## Incremento: pestañas, selectores y filtros unificados con el Atlas

- **Componente único** `src/ui/Segmentado.tsx`: pista gris (`--control-track`), cápsula
  grafito (`--control-active`), texto activo blanco, texto inactivo `--control-muted`,
  radio 10/8 y tipografía de los controles existentes. La cápsula se mide por instancia
  con `useId` y se desplaza con `transform`/`width` en **200 ms**: mover un selector no
  mueve la cápsula de otro. Flechas, Inicio y Fin siguen funcionando; con
  `prefers-reduced-motion` el cambio es inmediato.
- Se usan en la vista: métrica (Hechos/Lesionadas/Fallecidas), agrupación
  (Conjunto/Por edad/Por sexo) y presentación (Volumen/Cambio entre periodos).
  `SelectorMetrica` pasa a apoyarse en `Segmentado`; el estado de agrupación se elevó a
  `VistaPersonas` para que los dos selectores vivan en la cabecera.
- **Cabeceras**: título y subtítulo a la izquierda, los dos selectores juntos a la
  derecha, misma línea, centro vertical compartido y 12 px de separación (antes la
  tarjeta de burbujas tenía los controles en una fila aparte).
- **Pestañas**: conservan la cápsula grafito del Atlas (`--control-active`), ahora con
  transición de 220 ms; se añadieron `role="tablist"`, `role="tab"` y `aria-selected`
  manteniendo `aria-current`. Los segmentados usan `role="group"` + `aria-pressed`.
- **Filtros**: los desplegables mantienen su formato (blanco, borde neutro, icono,
  flecha, estado aplicado grafito); en escritorio reparten el ancho con `flex: 1 1 0` y
  12 px uniformes. No se convirtió ningún desplegable en control segmentado.
- Verificado con `tools/verificar-consistencia.mjs` (informe en
  `evidencias/atlas/informe-consistencia.json`): 4 cápsulas con ids distintos,
  `rgb(55, 65, 81)`, `0.2s`, geometría que coincide con su botón activo; selectores a
  12 px, en la misma fila, centrados y pegados a la derecha en ambas tarjetas;
  filtros 199 px × 4 + «Más filtros», huecos de 12 px y ancho cubierto; popover blanco
  opaco con borde y sombra dentro del viewport; pestañas `rgb(55, 65, 81)` con
  `0.22s`; `aria-selected`/`aria-pressed` correctos; móvil sin desborde (`scrollWidth`
  390) y selectores dentro de la tarjeta; movimiento reducido en 0 s.
- `verificar-reagrupable.mjs`, `verificar-personas.mjs`, `verificar-veh.mjs`,
  `verificar-alineacion.mjs`, `verificar-posiciones.mjs` y
  `verificar-cobertura-personas.mjs` siguen pasando. `verificar-banda.mjs` falla en una
  comprobación **previa** a este cambio: espera un `.at-ctrl-value` dentro del control de
  periodo, que ya no existe en `ControlPeriodo.tsx`.
- Capturas: `evidencias/atlas/{tabs-nav,tabs-filtros-escritorio,tabs-filtros-movil,tabs-filtros-popover}.png`.

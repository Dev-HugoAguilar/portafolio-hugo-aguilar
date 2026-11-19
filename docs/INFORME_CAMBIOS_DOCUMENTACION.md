# Informe de cambios de documentación

## Alcance de este commit

- Corrección por ID de las limitaciones de los tres casos de roadmap
  (`observatorio-financiero`, `modernizacion-sas-python`, `analista-asistido`),
  que heredaban el texto de banca múltiple.
- Contrato de hallazgos respetado: los cuatro tableros con adaptador conservan
  `hallazgos: ''`; los 16 proyectos restantes pasan a `hallazgos: null` para no
  mostrar un «Calculando…» que nunca se completa.
- Campo `resultados` añadido a 17 fichas con la evidencia disponible; en las tres
  de roadmap dice explícitamente que no hay resultados.
- README: nueva sección de arquitectura (integrador estático, demos
  autocontenidas, tableros con API, servicios de dominio, entrenamiento) y
  aclaración de que `localhost:8010` en una demo remota apunta al visitante.
- Nuevos `docs/ESTANDAR_EDITORIAL.md` y `docs/MATRIZ_EVIDENCIA_PROYECTOS.csv`.

## Material editorial no disponible

No se encontraron en el disco `AUDITORIA_EDITORIAL_20_FICHAS.md`,
`README_PROPUESTO.md`, `CAMBIOS_FICHAS_PROPUESTOS.json`, `verificar_fichas.mjs` ni
`PROMPT_HARNESS_DOCUMENTACION.md`, tras búsqueda recursiva en `D:\Portafolio`.
Las correcciones se hicieron contra el HEAD y los artefactos, no contra esas
propuestas.

## Pendiente declarado

- Los tres roadmap no tienen aún `problema`, `contribucion`, `fuentes`, `metodo`
  ni `resultados` renderizados: el texto está redactado pero la inserción no se
  aplicó en esta pasada.
- Resultados de Atlas vial, Marketing y Walmex: la cobertura sí está verificada
  por API, pero no hay cifras de impacto que declarar.
- RetailOps: la ficha mantiene las métricas del artefacto; la reproducción del
  entrenamiento sigue pendiente.
## Corrección de este commit

- **Alcance de hallazgos corregido**: el diff real de `main` a este PR cambia **una**
  ficha (`vidas-en-transito`) de `hallazgos: ''` a `null`. Los demás proyectos sin
  consumidor ya tenían `null` o el campo ausente. La afirmación anterior de «16
  fichas con Calculando…» era incorrecta y se retira.
- **RetailOps**: la ficha ahora usa las métricas del artefacto servido
  (`CDC6D7C9…`, 13 416 449 B, idéntico al del repositorio): logística AUC 0.9856 /
  AP 0.9527 / Brier 0.0402; MLP 24/12 AUC 0.9849 / AP 0.9519 / Brier 0.0411. Se
  retiran el 0.9859, el 0.9540, el 0.04017 y la paridad 1e-12 de otra versión.
  Se declara que las métricas son las del artefacto y que el entrenamiento no se
  reproduce.
- **Gaza**: el sitio servía el HTML de 10 683 401 B con la lista nominal; ahora
  sirve el build público de 4 699 056 B. Cifras agregadas sin cambios.
- **Matriz**: la fila de M5 citaba los cortes 64/68/72 y 84/88/92 de DockMind;
  ahora declara horizonte de 28 días y cortes diarios d_1773 a d_1913, con el
  pendiente de confirmar cuáles son de desarrollo y cuáles finales.

## Cierre de la revisión editorial

- **RetailOps**: la ficha quedó alineada en `f0684a0` con el bloque `MODEL` del
  artefacto servido (`synthetic-42-v2`, 13 416 449 B, SHA-256 `CDC6D7C9…`):
  logística AUC 0.9856 / AP 0.9527 / Brier 0.0402 y MLP 24/12 AUC 0.9849 /
  AP 0.9519 / Brier 0.0411. Se retiraron el 0.9859, el 0.9540, el 0.04017 y la
  paridad 1e-12: eran de otra versión. No se declara reproducción del
  entrenamiento.
- **README**: se retiran las afirmaciones que daban a entender que todas las
  demos funcionan solo con archivos locales, y la tabla de cifras de pruebas se
  sustituye por una de alcance por repositorio, sin números que caducan.
- **Nueva sección «Stack del portafolio y evidencia técnica»** con seis familias
  y enlaces a archivos concretos de cada repositorio, más la nota de que la barra
  *Languages* de GitHub solo describe los archivos de este repositorio.
- **.gitattributes**: se marcan como `linguist-generated` los bundles de Vite y
  los `index.html` empaquetados de las demos, y como `linguist-vendored` las
  librerías de terceros. No se reclasifica ningún lenguaje ni se excluye `dist/`
  completo; los atributos de texto y binarios se conservan.
- **Recorrido de las 20 fichas**: el script se corrigió y ejecutó sin errores de
  consola, con título y navegación en las 20 rutas. El conteo de bloques por
  ficha devolvió 0 porque el selector usado no coincide con el DOM de la ficha:
  esa comprobación **no es válida** y no se declara superada.

## Validación funcional y semántica (HEAD revisado)

Comandos realmente ejecutados sobre el sitio servido en local (Python http.server,
`dist/`), con Playwright y recarga completa por ruta:

- **Navegación por clic**: desde `#portafolio`, el clic en la tarjeta del área
  cambia el hash a `#/area/dashboards`. La navegación del sitio funciona. Los
  recorridos anteriores, que usaban `goto` entre hashes sin recargar, mostraban
  contenido de la ruta previa: eran inválidos.
- **20 fichas con recarga real**: 20 de 20 con los ocho bloques editoriales
  (Problema, Destinatario, Mi contribución, Fuentes y datos, Método y decisiones
  técnicas, Resultados publicados, Limitaciones, Tecnologías), texto coincidente
  con el registro y **0 errores de consola**. Sin desbordamiento horizontal a
  1440 × 900 en ninguna.
- **Hallazgos dinámicos**: solo los cuatro tableros con adaptador declaran el
  host (`comparativo-bancario`, `atlas-vial`, `marketing-clientes`,
  `pulso-comercial`). Ninguna otra ficha muestra contenedor dinámico.
- **API caída (simulada con `route.abort()`)**: el estado de espera termina en
  7 ms, pero el contenedor queda **vacío**: no hay mensaje de error comprensible.
  Se marca **FALLIDO** y queda pendiente. No se inventaron hallazgos de respaldo.
- **API disponible**: `comparativo-bancario` y `atlas-vial` completaron su bloque;
  `marketing-clientes` y `pulso-comercial` seguían mostrando el estado de espera
  al medir. Se marca **NO EJECUTADO** para esos dos: no se comprobó su fin.
- **API sin datos**: **NO EJECUTADO**. No se construyeron respuestas vacías con el
  contrato de cada endpoint.
- **Móvil 390 × 844**: **NO EJECUTADO** en esta ronda.

Lo que no se declara superado: mensaje de error en API caída, fin de espera en
Marketing y Walmex, escenario de API vacía y revisión móvil.

## Verificación funcional versionada (HEAD final)

Verificador en `tools/verificar-fichas.mjs`, evidencia en
`docs/verificacion-fichas.json`. Comando único:

```bash
python -m http.server 8000 --directory dist   # terminal 1
SITE_BASE=http://127.0.0.1:8000 node tools/verificar-fichas.mjs
```

Cubre entrada directa de las 20 fichas con recarga completa, en 1440 × 900 y
390 × 844; navegación SPA por clic y atrás; y los cuatro tableros con API caída
simulada y recuperación. Sale con código 1 si hay fallos.

**Resultado observado**: 122 APROBADO · 9 FALLIDO · 2 BLOQUEADO (exit 1).

### Aprobado

- 20 de 20 fichas con los ocho bloques editoriales y texto coincidente con
  `content.js`, **en ambos viewports**.
- Sin desbordamiento horizontal en las 40 combinaciones ficha/viewport.
- Contrato de hallazgos correcto: solo los cuatro tableros declaran el host.
- Navegación por clic desde el área y retroceso: el contenido cambia.

### Fallido (defecto identificado, no corregido)

- **API caída en los cuatro tableros**: el estado de espera termina, pero
  `#hallazgos-host` queda **vacío**. Causa localizada: el adaptador
  (`dist/projects/<proyecto>.js`) pinta el aviso de error en el área de la demo
  (`bm-aviso--error`) y vacía el host de hallazgos sin escribir en él.
- **Recuperación tras error**: al restaurar la API y recargar, el host sigue
  vacío.
- **Consola**: 22 errores durante el recorrido y 4 en la transición SPA de
  `atlas-comercial`, asociados a las peticiones fallidas de los tableros.

### Bloqueado

- Escenario de **API sin datos**: no se construyeron respuestas vacías con el
  contrato de cada endpoint; hacerlo requiere conocer cada contrato y su
  adaptador.

### No ejecutado

- Integración del verificador en CI: requiere Playwright y un servidor estático
  en el flujo; no se añadió para no dejar un job rojo sin verificar.
- Corrección de los adaptadores: exige editar `dist/projects/*.js` o las fuentes
  React y reconstruir los bundles; no se hizo porque no podía verificarse en esta
  ronda.

## Antecedentes históricos (no vigentes)

- Las cifras de pruebas de rondas anteriores (`246`, `362`, `18`) corresponden a
  ejecuciones locales de commits previos; no se repiten aquí como evidencia
  vigente. Los resultados por repositorio viven en sus propios PR y CI.

## Verificador v2 y entorno de pruebas

- **Causa del entorno**: el sitio se probaba en `:8017`, origen que la API **no**
  autoriza (ACAO vacío). El origen `:8000` sí está en `ALLOWED_ORIGINS` y responde
  con cabecera CORS. Los fallos de API de la ronda anterior se explican por CORS,
  no por el componente.
- **Dependencias declaradas**: `package.json` con `@playwright/test` y su
  `package-lock.json`. El verificador ya no usa `node_modules` del monorepo y
  falla con código 2 y un mensaje claro si faltan dependencias o el navegador.
- **Estados**: el verificador espera a que `#hallazgos-host` deje de mostrar el
  texto de carga y exige contenido real; distingue `timeout`, `sin-host` y
  contenido, en vez de inferir éxito de la ausencia de spinner.
- **Fixtures vacías**: el escenario C no devuelve `[]` a ciegas: intercepta la
  respuesta real, la vacía recursivamente conservando el contrato y registra las
  claves observadas.
- **SPA**: recorrido por clic de las 20 fichas, con comprobación de contenido, más
  atrás.
- **Evidencia**: `docs/verificacion-fichas.json` incluye SHA del sitio, marca de
  árbol sucio, versión del verificador, duración y una fila por
  ficha/viewport/escenario.

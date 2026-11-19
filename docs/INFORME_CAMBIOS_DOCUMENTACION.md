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

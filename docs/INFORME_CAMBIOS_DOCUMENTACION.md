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

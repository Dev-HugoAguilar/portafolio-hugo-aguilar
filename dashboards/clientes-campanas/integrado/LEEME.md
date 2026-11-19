# Tablero integrado de «Clientes y campañas»

Este directorio guarda el **rediseño integrado** que el portafolio sirve en
`dist/dashboards/clientes-campanas/index.html`, dentro de la ficha
`#/area/ciencia-de-datos/clientes-campanas`.

No es un tablero nuevo ni una ruta nueva: sustituye la presentación anterior del
mismo proyecto (que se compilaba con React/Vite a `app.js`). La tarjeta, el `id`
del proyecto y su lugar en Ciencia de datos no cambian.

## Estructura

```
integrado/
├── src/          código editable de la entrega, sin modificar
│   ├── template.html     esqueleto con __CSS__, __DATA__ y __JS__
│   ├── styles.css        base del diseño
│   ├── integracion.css   añadidos del rediseño
│   ├── app.js            núcleo: estado, vistas, gráficos
│   ├── integracion.js    ensambla las seis vistas y la cobertura
│   └── laboratorio.js    relieve, bandas y trayectorias
├── paridad/      23 CSV de la entrega + manifiesto, hashes y mapa de cobertura
├── tools/
│   ├── construir.py          artefactos JSON → tablas → HTML servido
│   ├── verificar.py          paridad, invariantes y estado del sitio
│   ├── verificar-servido.mjs verificación en el navegador (Playwright)
│   ├── informe-cobertura.mjs destino, contenido e interacción de los 41 bloques
│   └── capturar-portada.mjs  portada 1600 × 1000 de la tarjeta
└── build/paridad.json        informe de la última construcción
```

`../tools/auditar-visual.mjs`, `../tools/medir-auditoria.mjs` y `../tools/auditar_entrega.py`
documentan la auditoría de la presentación **anterior**; no forman parte de este pipeline.
`../tools/auditar_datos.py` sí: `construir.py` lo reutiliza para tabular los artefactos.

## De dónde salen los datos

1. `marketing_customer_project/src/export_dashboard_artifacts.py` escribe los
   artefactos reales en `dist/dashboards/clientes-campanas/data/*.json`.
2. `construir.py` **vuelve a tabular** esos artefactos con el mismo código que se
   usó en la auditoría (`tools/auditar_datos.py`) y **compara cada tabla byte a
   byte con `paridad/`**. Si una cifra deja de coincidir, la construcción se
   detiene: no se publica un tablero que contradiga la evidencia.
3. Con el diccionario resultante se genera el HTML autónomo (CSS + datos + JS
   incrustados) en `dist/dashboards/clientes-campanas/index.html`.

18 de las 23 tablas se derivan de los artefactos. Cinco son **narrativas o se
midieron sobre el DOM servido** durante la auditoría —indicadores de portada,
contexto de Criteo, referencias de julio, tabla de artefactos e inventario de
bloques— y se leen de `paridad/`, que es su fuente canónica. `verificar.py`
declara cuáles son.

## Comandos

```bash
cd dashboards/clientes-campanas
npm run build              # python integrado/tools/construir.py
npm run verificar          # paridad + invariantes + estado del sitio
npm run verificar-servido  # navegador real contra 127.0.0.1:8000
npm run portada            # recaptura dist/img/clientes-campanas-resumen.jpg
```

`verificar-servido` necesita el sitio levantado:
`python -m http.server 8000 --bind 127.0.0.1` desde `dist/`.

## Cómo se integra en la ficha

- `dist/projects/clientes-campanas.js` monta la página en un marco del mismo
  origen y ajusta su altura al contenido, igual que «Clientes en movimiento».
  Es el patrón que ya usa el portafolio para páginas autónomas.
- El diálogo «Ampliar» se coloca desde el módulo del portafolio: dentro de un
  marco de miles de píxeles, `position: fixed` se resuelve contra la caja del
  marco y el diálogo aparecería fuera de la ventana. Mientras está abierto se
  bloquea el desplazamiento de la página y se restaura al cerrar.
- La pestaña activa se refleja en la URL del portafolio como `?vista=perfiles`
  (la ruta `#/area/…` no se toca) y se restaura al recargar.

## Lo que no se toca

- `src/` es el código recibido, sin ediciones: el HTML servido es idéntico al
  artefacto de referencia de la entrega (mismo SHA-256).
- No se reentrenan modelos ni se recalculan métricas. Los escenarios de potencia
  publicados se mantienen separados del simulador, que usa las tasas redondeadas.
- Los diez análisis que solo existen como datos siguen declarados como tales; no
  se dibuja una visualización que no exista.

## Límites conocidos

- El marco crece con el contenido: los tooltips se posicionan bien respecto del
  cursor, pero su recorte contra el borde inferior de la pantalla usa la altura
  del marco, no la de la ventana.
- Las cinco tablas narrativas conservan el formato de la entrega (miles y
  decimales ya formateados); no se regeneran desde los artefactos.
- Solo septiembre tiene detalle individual completo. Los indicadores de julio se
  conservan como referencia, sin simular hogares.

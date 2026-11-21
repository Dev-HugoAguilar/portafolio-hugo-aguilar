# Corrección de los estados de hallazgos

## Alcance

Se corrigieron las fuentes React de Banca, Atlas vial, Marketing y Walmex y se reconstruyeron sus cuatro bundles publicados. No se cambió la paleta, las cifras editoriales ni el entrenamiento de modelos. Los parches de las fuentes pertenecen a sus repositorios respectivos; este repositorio conserva los bundles y el verificador.

Banca y Atlas devolvían anticipadamente la pantalla de carga/error del catálogo antes de montar el portal de hallazgos. El portal ahora existe también durante carga, fallo y catálogo vacío. Los fallos posteriores de consultas también llegan al componente de hallazgos. Marketing y Walmex incorporan reintento con cancelación de la solicitud anterior y estados explícitos. Los cuatro componentes declaran `data-state` (`loading`, `error`, `empty`, `ready`) y mensajes accesibles.

## Reproducción

```bash
npm ci
npx playwright install chromium
npm run verificar
```

El comando inicia y cierra su propio servidor estático en un puerto libre. La batería predeterminada intercepta la API en Playwright: no necesita MongoDB, credenciales ni modificar CORS. Cada fixture vacía está declarada por endpoint en `tools/qa/empty-api.mjs`; no vacía arbitrariamente objetos ni representa resultados de negocio. Un endpoint inesperado hace fallar los escenarios de estado.

Para una API real, iniciarla con sus datos y autorizar el origen del sitio. Usar el servidor y origen explícitos, por ejemplo:

```bash
npm run serve
SITE_BASE=http://127.0.0.1:8000 API_BASE=http://127.0.0.1:8010 npm run verificar:externo -- --api-real
```

En PowerShell, asignar las variables con `$env:SITE_BASE` y `$env:API_BASE` antes de ejecutar el comando. La corrida real es adicional; el informe indica si fue solicitada. No se declara integración real por superar respuestas interceptadas.

## Qué verifica

- 20 fichas × 2 tamaños: siete campos editoriales completos, presencia de tecnologías, título y subtítulo completos, contrato de host y ausencia de desbordamiento.
- 20 fichas × 2 tamaños: entrada mediante clic, atrás y adelante con contenido actualizado.
- 4 tableros × 2 tamaños × 3 escenarios: fallo de red, respuesta contractual vacía y reintento desde error hacia respuesta vacía.
- 104 casos en total. La recuperación hacia datos reales no equivale a la recuperación hacia un catálogo vacío: no se intercambian las dos afirmaciones.
- Las excepciones JavaScript hacen fallar el caso. Los errores de red/consola se conservan en evidencia; abortos deliberados del escenario de error no se presentan como defectos del producto.

La comparación de títulos respeta el render real: `Título — Subtítulo` se representa en dos elementos. Solo se normalizan espacios; los párrafos deben coincidir completos. No se usa un clasificador basado en frases para determinar `empty`.

## Evidencia y CI

`artifacts/verificacion-fichas.json` es la salida de cada ejecución. Tiene identificador, fecha, SHA base, árbol sucio, hashes del verificador y fixtures, casos previstos/ejecutados, duración, resultados y error fatal. La escritura es atómica y el proceso termina con error si falta cualquier caso, hay fallos o no hay plan. La salida de una prueba de fallo controlado debe ir a otro archivo mediante `VERIFICATION_OUTPUT` para no sustituir la corrida completa.

El workflow `fichas-browser.yml` instala Chromium, ejecuta la batería y conserva el informe incluso cuando falla. Haberlo ejecutado localmente no significa que GitHub Actions lo haya ejecutado: el workflow solo podrá correr cuando se publique la rama.

## Límites

La API local del propietario no está accesible desde el entorno de esta corrección. Aquí no se certifican sus datos, CORS real, MongoDB ni tiempos de respuesta. Los pendientes de reproducción científica de RetailOps, Customer Growth y ORBITA son independientes y permanecen abiertos.

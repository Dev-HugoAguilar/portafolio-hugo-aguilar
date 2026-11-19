# Auditoría del grano y correcciones semánticas · Atlas vial · Ciudad de México

**Fase 0 · Compuerta A.** Este informe no toca la interfaz: audita el grano real de los
datos publicados, verifica qué describen de verdad las cifras y fija qué cruces son
válidos antes de rediseñar nada.

Todo lo que sigue está calculado contra la **versión activa en MongoDB Atlas**
(`ssc-2024-68a5871469`, comunicados oficiales de la SSC 2024), no contra capturas ni
contra la documentación anterior. El detalle máquina-legible está en
`docs/atlas-vial/auditoria-grano.json`.

```powershell
cd backend
.venv\Scripts\python.exe -m scripts.auditar_grano_atlas_vial
```

La auditoría es **solo de lectura**: no escribe, no migra y no crea colecciones ni
índices. Complementa `AUDITORIA-FUENTES.md`, que audita los cinco CSV originales.

---

## 1. Grano: una fila por hecho

| Comprobación | Resultado |
|---|---|
| Documentos en `atlas_hechos` | **30 655** |
| Folios distintos | **30 655** |
| Folios duplicados | **0** |
| Filas por folio | `{1: 30 655}` — exactamente una |
| Clave del hecho | `folio` (único); `_id` solo técnico |
| Versiones en la colección | **1** (`ssc-2024-68a5871469`), sin documentos de versiones anteriores |
| Coincide con la auditoría de los CSV | ✔ 30 655 hechos |

Los cinco recursos del catálogo (hechos, sexo, edad, tipo de persona y vehículos)
tienen **el mismo conjunto de folios**, uno por hecho. El cruce se hizo en la
importación, folio a folio, y el resultado vive en un solo documento. Por eso **ninguna
consulta del tablero necesita una unión**: pedir un cruce no multiplica filas porque
no hay unión que multiplicar.

### Prueba de unión (filas antes y después)

| Prueba | Antes | Después | ¿Se multiplican? |
|---|---:|---:|---|
| Agrupación por folio de toda la colección | 30 655 | 30 655 folios con 1 fila | **No** |
| Autounión `$lookup` por folio (muestra) | 25 | 25 | **No** |

## 2. Qué describe cada campo de personas y de vehículos

Cada documento guarda:

* **un** registro de persona —`personas_sexo`, `personas_edad`, `personas_tipo_usuario`—
  que es **la persona principal del expediente**;
* **un** vehículo principal —`vehiculo_tipo`, `vehiculo_numero`—;
* los **conteos agregados del hecho** —`personas_lesionadas`, `personas_fallecidas`—,
  que son personas, no registros.

Consecuencia práctica: las tres columnas de persona no son tres tablas independientes
de víctimas, sino **tres vistas de la misma persona registrada**. No se suman entre sí
ni reparten el total de lesionadas.

| Campo | Hechos con valor | Sin dato |
|---|---:|---:|
| Tipo de persona registrada | 30 655 | 0 |
| Sexo registrado | 29 650 | **1 005** |
| Edad registrada | 29 001 | **1 654** |
| Tipo de vehículo registrado | 30 653 | **2** |
| Hora del hecho | 30 655 (0–23, ninguno fuera de rango) | 0 |

Cada distribución **cierra** contra el total de hechos (30 655 en las tres), así que
ningún registro se pierde por el camino; lo que falta es un valor dentro de un hecho,
no un hecho.

> **Conciliación con la auditoría de los CSV.** Aquella contó *1 660* registros de edad
> «sin información» (`SD`, `NA`, `2O`, `9M`); aquí quedan **1 654** sin edad porque `2O`
> se corrigió a 20 años y `9M` son meses de vida (0 años): 6 registros recuperados. La
> diferencia está explicada, no perdida.

## 3. (A) o (B): la prueba decisiva

La pregunta era: los fallecimientos que aparecen junto a una categoría de edad o de
sexo, ¿describen **A** personas de esa categoría o **B** el total de fallecidos en
hechos cuyo registro principal tiene esa categoría?

### Respuesta: (A) no existe en los datos publicados

El modelo completo del importador sí calculaba un campo `personas_consecuencia` (si la
persona registrada era lesionada o fallecida). **La compactación operativa lo eliminó**:
hoy `atlas_hechos` no tiene ningún campo que diga si la persona registrada fue quien
murió. Sin ese campo, (A) **no se puede calcular** en Atlas, y por tanto no se publica.

Lo único que existe es (B): *hechos con ese registro*, con sus consecuencias agregadas
en el hecho.

### Y (B) no se puede presentar como (A): la distribución lo demuestra

| Grupo de edad registrada | Hechos | Personas fallecidas **en esos hechos** |
|---|---:|---:|
| 0–14 | 1 399 | **122** |
| 15–24 | 7 535 | **0** |
| 25–34 | 9 406 | 4 |
| 35–44 | 4 979 | 1 |
| 45–54 | 2 833 | 0 |
| 55–64 | 1 582 | 0 |
| 65 y más | 1 267 | 0 |
| Sin edad | 1 654 | **406** |

Lectura obligatoria de esta tabla:

* **406 de las 533 muertes** ocurren en hechos donde la edad del registro no existe;
* de las 127 restantes, **122 quedan en 0–14** y solo **5 en 15–64**;
* esa no puede ser la distribución real de las personas fallecidas: en la Ciudad de
  México mueren sobre todo personas adultas. La edad describe **el registro del hecho**,
  no a quien murió.

Por tanto: **edad × personas fallecidas es un cruce inválido**. Publicarlo produciría
exactamente la afirmación que hay que evitar —«los menores concentran 122 de las 127
muertes»— y sería falso.

Detalle del grupo 0–14: son 111 hechos con al menos un fallecido, 8 con más de un
fallecido y 689 hechos con más personas registradas que la persona de referencia. Nada
de eso autoriza a decir que fallecieron menores.

### El lado legítimo de (B)

Cuando el atributo describe **el hecho** y no a una persona, la suma de consecuencias sí
es válida, porque las personas fallecidas pertenecen a ese hecho:

| Tipo de evento | Hechos | Hechos con ≥1 fallecido | % | Personas fallecidas |
|---|---:|---:|---:|---:|
| Choque | 18 112 | 221 | 1,22 % | 233 |
| Derrapado | 5 866 | 106 | 1,81 % | 106 |
| Atropellado | 4 822 | 165 | **3,42 %** | 173 |
| Caída de pasajero | 611 | 10 | 1,64 % | 10 |
| Caída de ciclista | 761 | 2 | 0,26 % | 2 |
| Volcadura | 483 | 8 | 1,66 % | 9 |

Ese 3,42 % **no** es letalidad: es *la parte de los hechos por atropello que registra al
menos una persona fallecida*. La diferencia es semántica y decide si el tablero miente o
no.

## 4. Coordenadas y cobertura territorial

| Comprobación | Resultado |
|---|---:|
| Hechos con coordenadas utilizables | **30 652** |
| Hechos sin ubicación utilizable | **3** (se conservan en los totales, no se asignan) |
| Alcaldías reconocidas | 16 + **1 hecho sin alcaldía** |
| Desajuste entre alcaldía de texto y geometría oficial | **1 053** (3,4 % de los puntos) |
| Puntos geolocalizados | **30 652** → supera el umbral de 2 000: **Canvas + quadtree obligatorio** |
| Extensión | lon −99,36492 → −98,9403 · lat 19,04824 → 19,59276 |

Los 1 053 desajustes **se informan y no se corrigen**: reasignar un hecho a la alcaldía
de su geometría cambiaría los totales sin trazabilidad. La interfaz debe declarar la
cobertura por alcaldía y no presentar el punto como certeza de pertenencia.

## 5. Ceros frente a ausencias

| Caso | Valor real | Trato exigido |
|---|---:|---|
| Hechos con cero personas fallecidas | 30 143 | Extremo claro de la escala, con el **0 visible** en el tooltip |
| Hechos sin sexo registrado | 1 005 | Rayado/gris neutro, **nunca** el color de cero |
| Hechos sin edad registrada | 1 654 | Ibídem |
| Hechos sin vehículo registrado | 2 | Ibídem |
| Hechos sin intersección semaforizada | 1 | «No publicado», no `false` |
| Hechos sin hora | 0 | — (pero la regla se mantiene: sin hora no es 00:00) |

## 6. Cruces válidos

| Cruce | Por qué es válido | Denominador |
|---|---|---|
| Alcaldía × tipo de evento | Ambos campos describen el hecho; cada hecho cae en una categoría de cada campo | Hechos del filtro |
| Alcaldía × tipo de persona registrada | Registro 1:1 ya vinculado en la importación; cuenta **hechos** | Hechos con registro de persona |
| **Edad registrada × tipo de persona registrada** | Los dos campos describen **al mismo** registro del folio | Hechos con edad |
| Tipo de evento × clasificación vial | Idem hecho | Hechos del filtro |
| Tipo de intersección × tipo de evento | Idem hecho | Hechos del filtro |
| Día × hora · fecha × consecuencia · alcaldía × consecuencia | El hecho tiene una sola fecha, una sola hora y sus propios conteos | Hechos del filtro |
| Tipo de evento × personas fallecidas (suma) | Las personas fallecidas pertenecen al hecho | No aplica; razón con unidad explícita |
| Vehículo × hechos con ≥1 fallecido | Idem hecho | Hechos con ese vehículo |

El cruce **edad × tipo de persona** merece atención: la documentación anterior decía que
no era posible «sin unir registros por folio». Es incorrecto en los dos sentidos: la
unión por folio ya está hecha (1:1, sin multiplicar) y ambos campos describen al mismo
registro de persona. El cruce es válido **para la persona registrada**, con matriz
7 × 5 real:

| Edad \ Tipo | Ciclista | Conductor | Motociclista | Pasajero | Peatón |
|---|---:|---:|---:|---:|---:|
| 0–14 | 101 | 7 | 70 | **834** | 387 |
| 15–24 | 448 | 490 | 4 318 | 1 554 | 725 |
| 25–34 | 685 | 969 | **5 450** | 1 415 | 887 |
| 35–44 | 391 | 864 | 2 289 | 734 | 701 |
| 45–54 | 214 | 559 | 969 | 478 | 613 |
| 55–64 | 155 | 271 | 271 | 337 | 548 |
| 65 y más | 102 | 159 | 73 | 285 | **648** |
| Sin edad | 75 | 272 | 793 | 249 | 265 |

## 7. Cruces inválidos

| Cruce | Por qué se descarta |
|---|---|
| Sexo × edad × tipo de persona como tres recuentos de personas | Los tres describen a la **misma** persona registrada: sumarlos o repartir el total de lesionadas la cuenta tres veces |
| Categoría de edad o sexo × personas fallecidas como (A) | No existe el campo de consecuencia de la persona y la distribución prueba que la edad no describe a quien murió (§3) |
| Personas fallecidas ÷ personas lesionadas como «letalidad» | No hay exposición; el cociente mezcla dos conteos del mismo hecho y no mide probabilidad |
| Hechos ÷ población, vehículos o viajes | El conjunto no publica denominadores de exposición |
| Multiplicar distribuciones marginales (edad × sexo de tablas independientes) | Inventaría combinaciones por persona que el archivo no trae |
| Año contra año | La serie es de un solo año y la fuente la declara **no comparativa** |
| Any `$lookup` por folio en consultas del tablero | Innecesario (grano 1:1) y arriesgado: un cambio de fuente con folios repetidos multiplicaría hechos; la importación ya lo bloquea |

## 8. Correcciones semánticas detectadas en la interfaz y la documentación actuales

| # | Dónde | Qué dice hoy | Corrección |
|---|---|---|---|
| 1 | `src/ui/Hallazgos.tsx:86,105` | «tipo de evento más frecuente frente al de mayor **letalidad** registrada» y «frecuencia y **letalidad** registrada no coinciden» | Retirar «letalidad». El cálculo (personas fallecidas por cada 100 hechos del tipo) no mide letalidad; la comparación válida es «hechos con al menos un fallecido» y «% de esos hechos» |
| 2 | `src/ui/Hallazgos.tsx:100` | «El mayor registro de **fallecidas por cada 100 hechos**…» | Reformular como porcentaje de **hechos con al menos una persona fallecida**, con denominador explícito |
| 3 | `src/ui/Hallazgos.tsx:155` | «no reparten a todas las **víctimas**» | «no describen a todas las personas involucradas en el hecho» |
| 4 | `src/ui/VistaPersonas.tsx:199-205` | Panel «Grupos de edad» que muestra «N fallecidas en esos hechos» | **Quitar** las consecuencias del bloque de edad: publica (B) junto a una categoría de persona y produce la lectura falsa de §3 |
| 5 | `src/ui/VistaPersonas.tsx:203,211` | Barras de **hechos** pintadas con el color de *personas lesionadas* (ámbar) y de *personas fallecidas* (granate) | Una barra de hechos usa el **azul de hechos**. El color debe identificar la métrica, no el panel |
| 6 | `src/ui/PanelContextual.tsx:207` | «Fallecidas por 100 hechos» | «Personas fallecidas por cada 100 hechos registrados», con la unidad delante y sin llamarlo tasa |
| 7 | `docs/atlas-vial/API-Y-METRICAS.md:88-89` | «no se cruzan desgloses (edad × tipo de persona): exigiría unir registros por folio» | Corregido: el cruce es válido para la persona registrada (§6) |
| 8 | `docs/atlas-vial/API-Y-METRICAS.md:106` | Hallazgo con «fallecidas por cada 100 hechos» | Sustituido por hechos con ≥1 fallecido |
| 9 | `docs/atlas-vial/AUDITORIA-FUENTES.md:67-69` | «no se pueden… cruzar entre ellos (edad × tipo de persona exigiría unir registros por folio)» | Corregido (§6) |
| 10 | `backend/app/services/atlas_service.py:427` | Etiqueta «…las personas son las del hecho completo» | Mantener la idea; la redacción definitiva está en el diccionario |

Ninguna de estas correcciones cambia fórmulas del backend, la API ni la ingesta: son
etiquetas, composición y una columna de más en un bloque.

## 9. Lo que el conjunto no permite afirmar

* No hay denominadores de exposición (población, viajes, kilómetros, aforo): **no** se
  calculan tasas por habitante ni por vehículo.
* No hay causa del hecho: ningún patrón es causal.
* No hay serie histórica comparable: la fuente publica un año y la declara **no
  comparativa**.
* No hay personas individuales más allá del registro principal: no se pueden repartir
  consecuencias por sexo, edad o tipo de persona.
* `semaforizada` describe la intersección, no el estado del semáforo en el momento.

## 10. Impacto de la auditoría en el almacenamiento

| Concepto | Valor actual |
|---|---|
| `atlas_hechos` | 30 655 documentos · 24 303 KiB de datos · 6 020 KiB de índices |
| Colecciones `atlas_*` | 4 (`hechos`, `estado`, `importaciones`, `bloqueos`) |
| Colecciones nuevas necesarias para el rediseño | **0** |
| Agregados persistentes nuevos | **0** (los hexágonos y las matrices se calculan al vuelo) |

## Compuerta A · qué se pide aprobar

1. El **grano** documentado: un documento por folio, cruce 1:1 hecho en la importación,
   sin uniones en tiempo de consulta.
2. Que **todas** las cifras de personas por sexo, edad o tipo de persona se publiquen
   como *hechos con ese registro* (**B**), nunca como personas de esa categoría (**A**),
   porque **A** no existe en la colección operativa.
3. Que **edad × personas fallecidas** quede **excluido** del tablero, con la evidencia de
   §3, y que el bloque de edad no muestre consecuencias.
4. Los cruces válidos e inválidos de §6 y §7 con sus motivos.
5. Las diez correcciones semánticas de §8.
6. El **diccionario de métricas** de `DICCIONARIO-METRICAS.md` como fuente única de
   etiquetas, tooltips y pruebas.

Sin esta aprobación no se pasa a wireframes ni a código (Compuerta B).

# Diccionario de métricas · Atlas vial · Ciudad de México

**Fase 0 · Compuerta A.** Fuente única de verdad para etiquetas, tooltips, titulares y
pruebas del rediseño. Toda cifra que aparezca en el tablero debe estar en esta tabla,
con su unidad, su numerador y su denominador; si no está, no se publica.

Verificado contra la versión activa `ssc-2024-68a5871469` (30 655 hechos, periodo
2024-01-01 → 2024-12-31) con `backend/scripts/auditar_grano_atlas_vial.py`. Los motivos
de cada exclusión están en `AUDITORIA-GRANO.md`.

## Reglas de nomenclatura

1. **La unidad va explícita** en la etiqueta o en el tooltip: *hechos*, *personas*,
   *% de hechos*, *personas por cada 100 hechos*.
2. **Un porcentaje siempre declara su denominador.** Nunca «el 3,4 %» sin decir «de los
   hechos por atropello registrados».
3. **Hechos ≠ personas.** Un conteo de personas solo sale de los campos agregados del
   hecho; jamás de multiplicar un desglose por un total.
4. **Atributo de persona = hechos con ese registro.** Sexo, edad y tipo de persona
   describen a *la persona principal del expediente*, no a todas las personas del hecho.
4b. **Las consecuencias solo acompañan atributos del hecho** (alcaldía, fecha, hora,
   tipo de evento, clasificación vial, intersección, vehículo principal). Ninguna
   categoría de persona —sexo, edad, tipo de persona— se muestra junto a personas
   lesionadas o fallecidas, ni siquiera con la etiqueta «en esos hechos».
5. **Cero y ausente son estados distintos.** El cero se pinta con el extremo claro de la
   escala; la ausencia, con rayado o gris neutro.
6. **Prohibidas como etiqueta, título o tooltip**: «riesgo», «peligrosidad»,
   «probabilidad», «letalidad», «tasa de mortalidad», «víctima(s)», «zona peligrosa»,
   «punto negro», «accidente total». Se verifican con prueba automática.

---

## A. Hechos y personas

| Métrica | Unidad | Numerador | Denominador | Frase permitida | Frase prohibida |
|---|---|---|---|---|---|
| Hechos registrados | hechos | Conteo de folios únicos del conjunto filtrado | n/a | «Hechos registrados», «N hechos» | «Accidentes totales», «siniestros» |
| Hechos con al menos una persona fallecida | hechos | Folios con `personas_fallecidas > 0` | n/a | «Hechos con al menos una persona fallecida» | «Hechos mortales», «accidentes fatales» |
| % de hechos con al menos una persona fallecida | % de hechos | Hechos con ≥ 1 persona fallecida | Hechos registrados (**512 de 30 655 = 1,67 %**) | «% de hechos con al menos una persona fallecida» | «Letalidad», «tasa de mortalidad», «riesgo de morir», «probabilidad» |
| Personas lesionadas registradas | personas | Suma de `personas_lesionadas` (**36 266**) | n/a (no hay exposición) | «Personas lesionadas registradas» | «Víctimas», «heridos por accidente» |
| Personas fallecidas registradas | personas | Suma de `personas_fallecidas` (**533**) | n/a | «Personas fallecidas registradas» | «Muertos por accidente», cualquier uso como numerador de una proporción de personas |
| Personas registradas por hecho | personas/hecho | `personas_lesionadas + personas_fallecidas` | Hechos registrados | «Personas registradas por hecho» | «Ocupantes por vehículo», «gravedad media» |
| Hechos con coordenadas utilizables | hechos | Folios con `ubicacion` válida (**30 652**) | Hechos registrados | «Hechos con coordenadas utilizables» | «Hechos mapeados» (implica que el resto no ocurrió) |
| Hechos sin alcaldía reconocida | hechos | Folios con `alcaldia` nula (**1**) | Hechos registrados | «Hechos sin alcaldía reconocida» | Cualquier reasignación sin trazabilidad |
| Cobertura de un campo (hora, sexo, edad, vehículo, semáforo) | hechos y % | Folios con valor en ese campo | Hechos registrados | «N hechos con dato de sexo (M %)» | «Sin datos = 0» |

## B. Territorio

| Métrica | Unidad | Numerador | Denominador | Frase permitida | Frase prohibida |
|---|---|---|---|---|---|
| Hechos registrados por alcaldía | hechos | Conteo por `alcaldia` | n/a | «Iztapalapa registra 3 997 hechos (13,0 % del total)» | «Riesgo de la alcaldía», «zona peligrosa» |
| % de hechos de la alcaldía | % de hechos | Hechos de la alcaldía | Hechos del filtro | «% de los hechos registrados» | «Concentración de riesgo» |
| Personas lesionadas en hechos de la alcaldía | personas | Suma de `personas_lesionadas` de la alcaldía | n/a | «Personas lesionadas en hechos de la alcaldía» | «Lesionados de la alcaldía» |
| Personas fallecidas en hechos de la alcaldía | personas | Suma de `personas_fallecidas` de la alcaldía | n/a | «Personas fallecidas en hechos de la alcaldía» | «Muertes de la alcaldía» como atributo poblacional |
| Hechos con al menos un fallecido por alcaldía | hechos | Folios de la alcaldía con `personas_fallecidas > 0` | Hechos de la alcaldía | «N de M hechos con al menos una persona fallecida» | «Alcaldía letal» |
| Proporción de hechos con al menos un fallecido (eje Y del perfil) | % de hechos | Hechos con ≥ 1 fallecido de la alcaldía | Hechos de la alcaldía | «% de hechos con al menos una persona fallecida» | «Riesgo de morir en la alcaldía» |
| Concentración por hexágono | hechos o personas | Suma dentro de la celda hexagonal | n/a (se informa el área y la resolución) | «Concentración de hechos», «densidad de hechos por celda» | «Zona de riesgo», «punto negro», «peligrosidad» |
| Personas lesionadas por hecho (alcaldía) | personas/hecho | Personas lesionadas en hechos de la alcaldía | Hechos de la alcaldía | «Personas lesionadas por hecho registrado» | «Gravedad media de los accidentes» |
| Personas fallecidas por cada 100 hechos registrados (alcaldía) | personas por 100 hechos | 100 × personas fallecidas | Hechos de la alcaldía | «Personas fallecidas por cada 100 hechos registrados» | «Tasa de letalidad», «tasa de mortalidad vial» |

## C. Tiempo y entorno vial

| Métrica | Unidad | Numerador | Denominador | Frase permitida | Frase prohibida |
|---|---|---|---|---|---|
| Hechos registrados por día | hechos | Conteo por `fecha` | n/a | «Hechos registrados el 12 de junio» | «Día más peligroso» |
| Hechos por día de la semana × hora | hechos | Conteo de la celda | Hechos del filtro (si se muestra %) | «N hechos registrados los viernes de 18 a 19 h» | «Hora de mayor riesgo» |
| % por día × hora | % de hechos | Conteo de la celda | Hechos de la matriz | «% de los hechos registrados» | «Probabilidad de un hecho a esa hora» |
| Peso de una franja horaria (p. ej. 18–20 h) | % de hechos | Hechos de la franja | Hechos con hora registrada | «Entre las 18:00 y las 20:59 se registra el N % de los hechos» | «Franja de mayor riesgo» |
| Promedio de hechos por día observado | hechos/día | Hechos del periodo | Días con registro del periodo (declarado) | «Promedio diario del periodo observado» | «Promedio de accidentes diarios» (sin declarar días) |
| Hechos por tipo de evento | hechos | Conteo por `tipo_evento_norm` | Hechos del filtro (si se muestra %) | «Atropellado: 4 822 hechos (15,7 %)» | «El atropello es el más letal» |
| Hechos por clasificación de la vialidad | hechos | Conteo por `vialidad_norm` | Hechos del filtro | «Hechos registrados por clasificación de la vía» | «Vías peligrosas» |
| Hechos por tipo de intersección | hechos | Conteo por `tipo_interseccion_norm` | Hechos del filtro | «Hechos registrados por tipo de intersección» | «Intersecciones de riesgo» |
| Hechos por intersección semaforizada | hechos | Conteo por `semaforizada` (si/no/sin dato) | Hechos del filtro | «Hechos en intersecciones semaforizadas» | «Falla del semáforo», cualquier lectura causal |
| Hechos con ≥ 1 fallecido por tipo de evento | hechos | Hechos del tipo con `personas_fallecidas > 0` | Hechos de ese tipo | «El 3,4 % de los hechos por atropello registra al menos una persona fallecida» | «Letalidad del atropello», «probabilidad de morir» |
| Composición por intersección (100 %) | % de hechos | Hechos del tipo de evento en esa intersección | Hechos de esa intersección | «Composición de los hechos por tipo de intersección» | «Perfil de riesgo de la intersección» |

## D. Personas y vehículos registrados

| Métrica | Unidad | Numerador | Denominador | Frase permitida | Frase prohibida |
|---|---|---|---|---|---|
| Hechos con un tipo de persona registrada | hechos | Folios con ese valor en `personas_tipo_usuario` | Hechos con tipo registrado (30 655) | «Hechos con persona registrada: motociclista» | «Motociclistas lesionados», «peatones fallecidos», cualquier consecuencia junto a la categoría |
| % de hechos con ese tipo de persona | % de hechos | Hechos con ese registro | Hechos del filtro | «% de los hechos registrados» | «% de las víctimas» |
| Hechos por sexo registrado | hechos | Folios con ese valor en `personas_sexo` | Hechos con sexo registrado (29 650) | «Hechos con sexo registrado: hombre» | «Hombres lesionados», «mujeres fallecidas», cualquier consecuencia junto a la categoría |
| Hechos por grupo de edad registrada | hechos | Folios con edad en el rango | Hechos con edad registrada (29 001) | «Hechos con edad registrada 25–34» | «Fallecidos de 0–14», «menores fallecidos», «víctimas de 15–24» |
| Hechos con ese tipo de vehículo registrado | hechos | Folios con ese valor en `vehiculo_tipo` | Hechos con vehículo registrado (30 653) | «Hechos con motocicleta como vehículo registrado» | «Peligrosidad de la motocicleta», «riesgo por usuario» |
| Hechos con ese vehículo y al menos un fallecido | hechos | Folios con ese vehículo y `personas_fallecidas > 0` | Hechos con ese vehículo | «% de esos hechos con al menos una persona fallecida» | «Riesgo del vehículo», «vehículo más mortífero» |
| Matriz alcaldía × tipo de persona registrada | hechos | Conteo del cruce (campos del mismo documento) | Hechos de la fila (alcaldía) | «Composición de los hechos registrados por tipo de persona» | «Perfil de las víctimas por alcaldía» |
| Matriz edad registrada × tipo de persona registrada | hechos | Conteo del cruce (mismo registro de persona) | Hechos con edad | «Hechos registrados: 25–34 · motociclista» | «Motociclistas de 25–34 lesionados» |
| Comparación A/B de alcaldías | hechos, % de hechos, personas/hecho | Conteos de cada alcaldía con el mismo periodo y filtros | Hechos de cada alcaldía | «Comparación de dos alcaldías con la misma escala» | «La alcaldía A es más peligrosa que B» |
| Composición por tipo de evento A/B | % de hechos | Hechos del tipo en la alcaldía | Hechos de la alcaldía | «Composición de los hechos» | «Tipo de evento dominante en riesgo» |

## E. Cobertura, detalle y exportación

| Métrica | Unidad | Numerador | Denominador | Frase permitida | Frase prohibida |
|---|---|---|---|---|---|
| Cobertura de un desglose | hechos y % | Hechos con ese campo | Hechos registrados | «29 001 de 30 655 hechos tienen edad registrada (94,6 %)» | «Los demás no tuvieron víctimas» |
| Alcance de una exportación | hechos | Filas exportadas del subconjunto filtrado | Hechos del filtro | «La exportación contiene N hechos del filtro aplicado» | «Exportación completa» si hay filtros |
| Detalle de un hecho | hecho | Folio único con fecha, hora, alcaldía, consecuencias y fuente | n/a | «Hecho registrado con folio …» | «Caso de riesgo» |
| Antigüedad de la versión | fecha | `ultima_sincronizacion` de la versión activa | n/a | «Versión publicada el … · sincronización del …» | «Datos en tiempo real» |

---

## F. Medidas derivadas **retiradas** (y su sustituto)

| Medida retirada | Por qué | Sustituto en el tablero |
|---|---|---|
| «Letalidad registrada» por tipo de evento = personas fallecidas ÷ hechos × 100 | No es letalidad (no hay caso índice ni exposición) y se compara entre tipos como si lo fuera | Hechos con ≥ 1 persona fallecida y su % sobre los hechos del tipo |
| «Mayor registro de fallecidas por cada 100 hechos» como titular de hallazgo | Misma razón; el redondeo a dos decimales sugiere una precisión inexistente | «% de hechos con al menos una persona fallecida» |
| Consecuencias junto a grupos de edad («N fallecidas en esos hechos» del panel de edad) | Presenta (B) junto a una categoría de persona; con estos datos produce una lectura falsa (122 de 127 muertes en 0–14) | El bloque de edad muestra solo hechos; las consecuencias viven en bloques de hecho (territorio, tiempo, vehículo) |
| «Fallecidas por 100 hechos» en el panel contextual | Ambigüedad de unidad y riesgo de leerse como tasa | «Personas fallecidas por cada 100 hechos registrados», unidad explícita |
| «Víctimas» como término general | Sugiere que se describe a todas las personas del hecho | «Personas involucradas», «personas registradas» |
| Cruzar edad × sexo × tipo de persona como tres recuentos de víctimas | Describen a la misma persona registrada | Un solo registro por bloque, siempre como hechos |
| Consecuencias junto a sexo o tipo de persona (aunque se etiqueten «en esos hechos») | Decisión aprobada en la Compuerta A: mantiene la asociación entre una categoría de persona y los fallecimientos del hecho | Las consecuencias viven solo en bloques de hecho: territorio, tiempo, tipo de evento, vialidad, intersección y vehículo |

## G. Contrato del tooltip

Todo tooltip de una cifra derivada muestra, en este orden:

1. **Valor** y unidad («3 997 hechos», «2,95 % de hechos»).
2. **Numerador y denominador** cuando exista proporción («118 de 3 997 hechos»).
3. **Base del cálculo** (alcaldía, tipo de evento, filtros activos).
4. **Cobertura del campo** cuando la métrica dependa de un registro de persona o
   vehículo («con edad registrada: 1 399 de 1 654 hechos del grupo»).
5. **Estado del dato**: publicado, cero, ausente («sin dato») o fuera de cobertura.

Las cuatro primeras líneas son obligatorias; la quinta solo cuando el valor no es un
conteo positivo.

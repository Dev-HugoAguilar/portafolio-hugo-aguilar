"""Genera el paquete de auditoría visual de «Clientes y campañas» (inventario, informe, galería y ZIP).

Requiere que antes se hayan ejecutado:
    node tools/auditar-visual.mjs   <carpeta_auditoria>
    node tools/medir-auditoria.mjs   <carpeta_auditoria>
    python tools/auditar_datos.py    <carpeta_auditoria>

No modifica la interfaz, los modelos ni los datos: solo lee artefactos, capturas y
mediciones ya generadas y escribe la documentación del paquete.

Uso:
    python tools/auditar_entrega.py <carpeta_auditoria> <carpeta_entregas>
"""
from __future__ import annotations

import csv
import json
import shutil
import sys
import zipfile
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
TABLERO = RAIZ / "dashboards" / "clientes-campanas"
NOMBRE_PAQUETE = "Clientes_y_campanas_auditoria_visual"

F = dict  # alias corto para legibilidad de las filas del inventario


def fila(**kwargs) -> dict:
    return kwargs


COMPONENTES = {
    "proyecto": "codigo/dashboard/src/ui/Proyecto.tsx",
    "perfiles": "codigo/dashboard/src/ui/Perfiles.tsx",
    "evolucion": "codigo/dashboard/src/ui/Evolucion.tsx",
    "campanas": "codigo/dashboard/src/ui/Campanas.tsx",
    "incrementalidad": "codigo/dashboard/src/ui/Incrementalidad.tsx",
    "experimento": "codigo/dashboard/src/ui/Experimento.tsx",
    "comunes": "codigo/dashboard/src/ui/comunes.tsx",
    "exportador": "codigo/exportador/export_dashboard_artifacts.py",
}

INVENTARIO = [
    # ---------------------------------------------------------------- 01 Proyecto
    fila(
        id="proyecto_kpi_pregunta",
        pantalla="Proyecto",
        ubicacion="cg-proyecto-pregunta",
        titulo="Qué pregunta responde y qué decide",
        pregunta="¿Sobre cuántos hogares y campañas se decide, y con qué unidades?",
        tipo="Indicadores (4 tarjetas KPI)",
        libreria="React + CSS propio (sin librería de gráficos)",
        variables="Hogares del corte; gasto acumulado (USD); canastas del conjunto filtrado; segmentos del corte; campañas en prueba",
        escalas="Conteos y unidades originales; porcentajes con denominador explícito en el pie",
        fuente="perfiles.json, evolucion.json, campanas.json y manifiesto.json (Complete Journey)",
        corte="Corte 2017-09-01 (90 días desde 3 jun 2017)",
        unidad="Hogar comprador del cohorte",
        filtros="Ninguno: cifras de resumen del corte activo",
        modelo="K-Means k=2 alineado por hogar entre cortes",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["proyecto"],
        estado="implementada",
        capturas="01_proyecto.png; 01a_indicadores_pregunta.png",
        datos="01_indicadores.csv",
        observaciones="El pie de cada cifra declara el conjunto; no hay interacción.",
    ),
    fila(
        id="proyecto_kpi_resultados",
        pantalla="Proyecto",
        ubicacion="cg-proyecto-resultados",
        titulo="Resultados principales",
        pregunta="¿Qué tan bien ordena el modelo, cuánto persiste la segmentación y qué haría falta para medir el efecto?",
        tipo="Indicadores (4 tarjetas KPI)",
        libreria="React + CSS propio",
        variables="Average precision del ranking; permanencia entre cortes; uplift en visitas (pp); muestra necesaria para 30 % de mejora",
        escalas="AP 0–1; permanencia 0–100 %; uplift en puntos porcentuales; hogares",
        fuente="campanas.json, evolucion.json, experimento.json",
        corte="Resume varios cortes: AP del corte activo de propensión, permanencia jul→ago, uplift del benchmark Criteo",
        unidad="Par hogar × campaña (AP), hogar (permanencia), usuario (uplift), hogar hipotético (potencia)",
        filtros="Ninguno",
        modelo="Regresión logística de propensión; Uplift S/T sobre Criteo; cálculo de potencia",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["proyecto"],
        estado="implementada",
        capturas="01b_indicadores_resultados.png",
        datos="01_indicadores.csv",
        observaciones="Mezcla a propósito cuatro módulos: el pie declara la fuente de cada cifra, pero no el corte exacto de cada una.",
    ),
    fila(
        id="proyecto_fuentes",
        pantalla="Proyecto",
        ubicacion="cg-proyecto-fuentes",
        titulo="Fuentes, unidad analítica y separación de módulos",
        pregunta="¿De dónde salen los datos y qué módulos no se pueden mezclar?",
        tipo="Bloque de texto estructurado en tres columnas",
        libreria="HTML/CSS",
        variables="Fuente, filas, unidad, ventana; módulos Complete Journey, Criteo y experimentación",
        escalas="No aplica",
        fuente="manifiesto.json",
        corte="Todos los cortes del paquete",
        unidad="Hogar comprador / usuario de Criteo / hogar del experimento",
        filtros="Ninguno",
        modelo="No aplica",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["proyecto"],
        estado="implementada",
        capturas="01c_fuentes_y_artefactos.png",
        datos="00_manifiesto_artefactos.json",
        observaciones="Es la pieza que sostiene la separación de poblaciones; no es una gráfica.",
    ),
    fila(
        id="proyecto_artefactos",
        pantalla="Proyecto",
        ubicacion="cg-proyecto-artefactos",
        titulo="Artefactos publicados",
        pregunta="¿Qué archivos alimentan cada bloque del tablero?",
        tipo="Tabla",
        libreria="HTML/CSS",
        variables="Archivo y contenido",
        escalas="No aplica",
        fuente="manifiesto.json → artefactos",
        corte="Versión 1 de los artefactos",
        unidad="Archivo de datos",
        filtros="Ninguno",
        modelo="No aplica",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["proyecto"],
        estado="implementada",
        capturas="01f_tabla_artefactos.png",
        datos="01f_artefactos.csv",
    ),
    fila(
        id="proyecto_proceso",
        pantalla="Proyecto",
        ubicacion="cg-proyecto-proceso",
        titulo="Proceso, decisiones y segmentos del corte",
        pregunta="¿Qué se hizo, en qué orden, y cómo se llaman los segmentos?",
        tipo="Lista de proceso + indicadores por segmento + leyenda",
        libreria="React + CSS propio",
        variables="Pasos del proceso; hogares y participación por segmento",
        escalas="Conteos y proporciones 0–100 %",
        fuente="perfiles.json (segmentos del corte)",
        corte="2017-09-01",
        unidad="Hogar comprador",
        filtros="Ninguno",
        modelo="K-Means k=2",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["proyecto"],
        estado="implementada",
        capturas="01d_proceso_y_segmentos.png",
        datos="02a2_medianas_datos_reales.csv",
    ),
    fila(
        id="proyecto_correcciones",
        pantalla="Proyecto",
        ubicacion="cg-proyecto-correcciones",
        titulo="Correcciones aplicadas antes de publicar",
        pregunta="¿Qué se corrigió y por qué?",
        tipo="Aviso + lista (sin representación gráfica)",
        libreria="HTML/CSS",
        variables="Correcciones registradas en el manifiesto",
        escalas="No aplica",
        fuente="manifiesto.json → correcciones",
        corte="Versión 1",
        unidad="No aplica",
        filtros="Ninguno",
        modelo="No aplica",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["proyecto"],
        estado="implementada",
        capturas="01e_correcciones.png",
        datos="00_manifiesto_artefactos.json",
    ),
    # ---------------------------------------------------------------- 02 Perfiles
    fila(
        id="perfiles_kpi_tamano",
        pantalla="Perfiles",
        ubicacion="cg-perfiles-tamano",
        titulo="Tamaño y perfil de los segmentos",
        pregunta="¿Cuántos hogares hay en cada segmento y cuánto gasto concentran?",
        tipo="Indicadores (3 tarjetas KPI)",
        libreria="React + CSS propio",
        variables="Hogares por segmento; participación en el universo; participación en el gasto",
        escalas="Conteos; proporciones 0–100 % con una decimal",
        fuente="perfiles.json → segmentos",
        corte="2017-09-01 (con selector de 1 jul / 1 ago / 1 sep)",
        unidad="Hogar comprador",
        filtros="Selector de corte de segmentación (afecta a toda la pantalla)",
        modelo="K-Means k=2 alineado por mediana de gasto",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["perfiles"],
        estado="implementada",
        capturas="02_perfiles.png; 02a_indicadores_tamano.png; 02a_indicadores_tamano_otro_corte.png",
        datos="02a_indicadores_tamano.csv; 02a_indicadores_tamano_otro_corte.csv",
    ),
    fila(
        id="perfiles_medianas",
        pantalla="Perfiles",
        ubicacion="cg-perfiles-medianas",
        titulo="Medianas por segmento (unidades originales)",
        pregunta="¿En qué se diferencian los segmentos en cada variable?",
        tipo="Tabla plegable",
        libreria="HTML/CSS",
        variables="Canastas, gasto, recencia, productos, canasta media, tasa de cupón, descuento por línea",
        escalas="Unidades originales por variable (días, USD, conteos, proporciones)",
        fuente="perfiles.json → segmentos[].medianas",
        corte="2017-09-01",
        unidad="Hogar comprador",
        filtros="Corte de segmentación",
        modelo="K-Means k=2",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["perfiles"],
        estado="implementada",
        capturas="02a2_medianas_por_segmento.png",
        datos="02a2_medianas_datos_reales.csv; 02a2_medianas_por_segmento.csv",
    ),
    fila(
        id="perfiles_beeswarm",
        pantalla="Perfiles",
        ubicacion="cg-perfiles-beeswarm",
        titulo="Distribución por segmento (enjambre de puntos)",
        pregunta="¿Cómo se reparte el gasto (u otra métrica) dentro de cada segmento?",
        tipo="Gráfico de puntos tipo enjambre (SVG) con banda de cuartiles y mediana",
        libreria="SVG propio generado en React (sin librería)",
        variables="Métrica seleccionable (gasto USD, canastas, recencia, productos, canasta media, tasa de cupón, descuento); eje X en unidades originales; puntos = hogares de la muestra",
        escalas="Eje X en unidades originales; un punto por hogar de muestra (hasta 320 por segmento); cuartiles y mediana del universo del corte",
        fuente="perfiles.json → muestra_beeswarm y distribuciones",
        corte="2017-09-01 por omisión",
        unidad="Hogar comprador (muestra visual)",
        filtros="Selector de métrica; filtro de segmento (Ambos / Menor / Mayor actividad); corte",
        modelo="K-Means k=2",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["perfiles"],
        estado="implementada",
        capturas="02b_distribucion_beeswarm.png; 02b_distribucion_beeswarm_canastas.png; 02b_distribucion_beeswarm_ambos_segmentos.png; 02b_distribucion_beeswarm_otro_corte.png",
        datos="02b_beeswarm_puntos.csv; 02b_beeswarm_estadisticas.csv; 02b_beeswarm_datos_reales.csv; 02b_beeswarm.json",
        observaciones="El eje X solo rotula los extremos; las etiquetas de segmento y mediana se dibujan dentro del área de puntos.",
    ),
    fila(
        id="perfiles_cuantiles",
        pantalla="Perfiles",
        ubicacion="cg-perfiles-cuantiles",
        titulo="Cuantiles del universo y de cada segmento",
        pregunta="¿Dónde caen los percentiles 10–90 de cada variable?",
        tipo="Tabla plegable",
        libreria="HTML/CSS",
        variables="p10, p25, p50, p75, p90 y media por métrica y grupo",
        escalas="Unidades originales de cada métrica",
        fuente="perfiles.json → distribuciones",
        corte="2017-09-01",
        unidad="Hogar comprador",
        filtros="Corte de segmentación",
        modelo="K-Means k=2",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["perfiles"],
        estado="implementada",
        capturas="02b2_cuantiles_universo.png",
        datos="02b2_cuantiles_datos_reales.csv; 02b2_cuantiles_universo.csv",
    ),
    fila(
        id="perfiles_paralelas",
        pantalla="Perfiles",
        ubicacion="cg-perfiles-paralelas",
        titulo="Coordenadas paralelas: recencia, frecuencia, gasto, diversidad y descuentos",
        pregunta="¿Qué combinaciones de variables separan a los hogares y dónde está un hogar concreto?",
        tipo="Coordenadas paralelas (SVG) con 5 ejes y selección de hogar",
        libreria="SVG propio generado en React",
        variables="Recencia (días), frecuencia (canastas), gasto (USD), diversidad (productos), líneas con cupón (0–0,5)",
        escalas="Ejes lineales recortados a p1–p99 (el rango se anota en cada eje); color por segmento; una línea por hogar dibujado (900 de 2 311)",
        fuente="perfiles.json → hogares (universo del corte)",
        corte="2017-09-01",
        unidad="Hogar comprador",
        filtros="Gasto mínimo, canastas mínimas, limpiar rangos, buscar hogar por identificador; corte",
        modelo="K-Means k=2",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["perfiles"],
        estado="implementada",
        capturas="02c_coordenadas_paralelas.png",
        datos="02c_paralelas_hogares.csv; 02c_paralelas_ejes.csv; 02c_paralelas.json; 02c2_hogares_datos_reales.csv",
        observaciones="La etiqueta del quinto eje se corta; la densidad de líneas (900) oculta la estructura interna.",
    ),
    fila(
        id="perfiles_tabla_hogares",
        pantalla="Perfiles",
        ubicacion="cg-perfiles-tabla-hogares",
        titulo="Hogares seleccionados en tabla",
        pregunta="¿Qué hogares cumplen los filtros y con qué valores?",
        tipo="Tabla plegable (200 primeras filas)",
        libreria="HTML/CSS",
        variables="Hogar, segmento, recencia, canastas, gasto, productos, canasta media, tasa de cupón",
        escalas="Unidades originales",
        fuente="perfiles.json → hogares filtrados por la interfaz",
        corte="2017-09-01",
        unidad="Hogar comprador",
        filtros="Gasto mínimo, canastas mínimas",
        modelo="K-Means k=2",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["perfiles"],
        estado="implementada",
        capturas="02c2_tabla_hogares.png",
        datos="02c2_tabla_hogares.csv; 02c2_hogares_datos_reales.csv",
    ),
    fila(
        id="perfiles_ficha_hogar",
        pantalla="Perfiles",
        ubicacion="cg-perfiles-ficha-hogar",
        titulo="Ficha del hogar seleccionado",
        pregunta="¿Cuáles son los valores reales (sin recorte p1–p99) del hogar elegido?",
        tipo="Ficha textual",
        libreria="HTML/CSS",
        variables="Todas las métricas del hogar en unidades originales, segmento y valores de eje",
        escalas="Unidades originales",
        fuente="perfiles.json → hogares",
        corte="2017-09-01",
        unidad="Hogar",
        filtros="Selección por clic en una línea o por identificador",
        modelo="K-Means k=2",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["perfiles"],
        estado="implementada",
        capturas="02c_coordenadas_paralelas.png",
        datos="02c2_hogares_datos_reales.csv",
        observaciones="Se captura dentro del panel de coordenadas paralelas; no tiene captura propia.",
    ),
    fila(
        id="perfiles_departamentos",
        pantalla="Perfiles",
        ubicacion="cg-perfiles-departamentos",
        titulo="Afinidad de departamentos por segmento (matriz de calor)",
        pregunta="¿En qué departamentos se concentra el gasto de cada segmento y con qué soporte?",
        tipo="Matriz de calor en tabla HTML (color + cifra + soporte)",
        libreria="HTML/CSS con color calculado en React",
        variables="Participación media del departamento en el gasto (0–100 %); hogares con compra (soporte)",
        escalas="Color = intensidad truncada al 90 % de la rampa (valor × 1,6), una rampa por segmento; cifras al 0,1 %",
        fuente="perfiles.json → segmentos[].departamentos",
        corte="2017-09-01",
        unidad="Hogar × departamento",
        filtros="Corte de segmentación",
        modelo="K-Means k=2",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["perfiles"],
        estado="implementada",
        capturas="02d_matriz_departamentos.png",
        datos="02d_departamentos.csv; 02d2_departamentos_datos_reales.csv",
        observaciones="La rampa se satura y no hay leyenda de intensidad; valores bajos quedan casi blancos.",
    ),
    fila(
        id="perfiles_tabla_departamentos",
        pantalla="Perfiles",
        ubicacion="cg-perfiles-tabla-departamentos",
        titulo="Mezcla de departamentos en tabla",
        pregunta="¿Cuál es la cifra exacta de participación y soporte por departamento?",
        tipo="Tabla plegable",
        libreria="HTML/CSS",
        variables="Departamento, participación (%) y hogares con compra por segmento",
        escalas="Porcentajes a dos decimales; conteos",
        fuente="perfiles.json → segmentos[].departamentos",
        corte="2017-09-01",
        unidad="Hogar × departamento",
        filtros="Corte de segmentación",
        modelo="K-Means k=2",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["perfiles"],
        estado="implementada",
        capturas="02d2_tabla_departamentos.png",
        datos="02d2_tabla_departamentos.csv; 02d2_departamentos_datos_reales.csv",
    ),
    fila(
        id="perfiles_diagnostico_k",
        pantalla="Perfiles",
        ubicacion="cg-perfiles-diagnostico-k",
        titulo="Diagnóstico de clustering (candidatos k)",
        pregunta="¿Qué soluciones de k se evaluaron y qué tan pequeño es su segmento menor?",
        tipo="Tabla plegable dentro de la nota de metodología",
        libreria="HTML/CSS",
        variables="k, tamaño del segmento más pequeño (%) y tamaños por segmento",
        escalas="Proporción del corte; conteos",
        fuente="perfiles.json → candidatos_k",
        corte="2017-09-01",
        unidad="Solución de clustering",
        filtros="Corte de segmentación",
        modelo="K-Means con regla de al menos 5 % por segmento",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["perfiles"],
        estado="implementada",
        capturas="02e_diagnostico_k.png",
        datos="02e_diagnostico_k.csv; 02e_diagnostico_k_datos_reales.csv",
        observaciones="Solo publica el tamaño mínimo; la silueta por k está en el informe de análisis, no aquí.",
    ),
    # ---------------------------------------------------------------- 03 Evolución
    fila(
        id="evolucion_kpi",
        pantalla="Evolución",
        ubicacion="cg-evolucion-alluvial",
        titulo="Indicadores del par de cortes",
        pregunta="¿Cuántos hogares son comparables, cuántos permanecen y cuánto coinciden las particiones?",
        tipo="Indicadores (4 tarjetas KPI)",
        libreria="React + CSS propio",
        variables="Hogares comparables; permanencia; entradas y salidas; ARI",
        escalas="Conteos; porcentajes; ARI −1 a 1",
        fuente="evolucion.json → pares",
        corte="Par activo (jul→ago por omisión)",
        unidad="Hogar comprador",
        filtros="Selector de par de cortes",
        modelo="K-Means k=2 alineado por hogar",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["evolucion"],
        estado="implementada",
        capturas="03_evolucion.png; 03a_alluvial_transiciones.png",
        datos="03a_indicadores.csv; 03a2_transiciones_datos_reales.csv",
    ),
    fila(
        id="evolucion_alluvial",
        pantalla="Evolución",
        ubicacion="cg-evolucion-alluvial",
        titulo="Migración de hogares entre segmentos (alluvial)",
        pregunta="¿Cuántos hogares cambian de segmento entre dos cortes y en qué dirección?",
        tipo="Diagrama de flujos (alluvial, SVG)",
        libreria="SVG propio generado en React",
        variables="Segmento de origen, segmento de destino, hogares por flujo; nodos Entradas y Salidas",
        escalas="Grosor = hogares del flujo; solo hogares presentes en ambos cortes; etiqueta del nodo = hogares del flujo",
        fuente="evolucion.json → pares[].flujos",
        corte="Par seleccionable (jul→ago, ago→sep)",
        unidad="Hogar comprador presente en ambos cortes",
        filtros="Selector de par de cortes; clic en una cinta abre la ficha del flujo",
        modelo="K-Means k=2 alineado por hogar",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["evolucion"],
        estado="implementada",
        capturas="03a_alluvial_transiciones.png; 03a_alluvial_otro_par.png; 03a_alluvial_flujo_seleccionado.png",
        datos="03a_alluvial_cintas.csv; 03a_alluvial_nodos.csv; 03a_alluvial_etiquetas.csv; 03a_alluvial.json; 03a_alluvial_cintas_otro_par.csv",
        observaciones="Las etiquetas de los nodos se cortan en ambos bordes y sus cifras (701 / 1 558) no coinciden con el tamaño del segmento del corte (740 / 1 560).",
    ),
    fila(
        id="evolucion_tabla_transiciones",
        pantalla="Evolución",
        ubicacion="cg-evolucion-tabla",
        titulo="Matriz de transiciones en tabla",
        pregunta="¿Cuáles son los conteos exactos y las proporciones de cada flujo?",
        tipo="Tabla plegable",
        libreria="HTML/CSS",
        variables="Origen, destino, hogares, proporción del origen",
        escalas="Conteos y proporciones 0–100 %",
        fuente="evolucion.json → pares[].flujos",
        corte="Par activo",
        unidad="Hogar comprador",
        filtros="Selector de par de cortes",
        modelo="K-Means k=2",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["evolucion"],
        estado="implementada",
        capturas="03a2_tabla_transiciones.png",
        datos="03a2_tabla_transiciones.csv; 03a2_transiciones_datos_reales.csv",
    ),
    fila(
        id="evolucion_estabilidad",
        pantalla="Evolución",
        ubicacion="cg-evolucion-estabilidad",
        titulo="Estabilidad de la segmentación",
        pregunta="¿Se reproduce la partición al cambiar de corte y es sensible a qué hogares entrenan el modelo?",
        tipo="Dos bloques de indicadores y notas (sin gráfico)",
        libreria="React + CSS propio",
        variables="ARI entre cortes; tamaño mínimo de segmento; estabilidad en submuestras (20 repeticiones del 80 %)",
        escalas="ARI −1 a 1; proporción; recuento de repeticiones",
        fuente="evolucion.json → estabilidad_submuestras; behavior_segments_validation.json",
        corte="2017-07-01",
        unidad="Partición de hogares",
        filtros="Ninguno (resumen del corte de referencia)",
        modelo="K-Means k=2",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["evolucion"],
        estado="implementada",
        capturas="03b_estabilidad_segmentacion.png",
        datos="03b_estabilidad_datos_reales.csv",
        observaciones="La silueta del corte se publica como no disponible (null) en el artefacto.",
    ),
    # ---------------------------------------------------------------- 04 Campañas
    fila(
        id="campanas_kpi",
        pantalla="Campañas",
        ubicacion="cg-campanas-resumen",
        titulo="Propensión a canje con holdout temporal",
        pregunta="¿Qué tan bien ordena el modelo los pares hogar × campaña que responderán?",
        tipo="Indicadores (4 tarjetas KPI)",
        libreria="React + CSS propio",
        variables="Average precision; ROC AUC (con Brier y log-loss); lift del decil superior; hogares sin exposición previa",
        escalas="AP y AUC 0–1; lift en veces; conteos",
        fuente="campanas.json → metricas",
        corte="Cortes 1 jul / 1 ago / 1 oct (selector)",
        unidad="Par hogar × campaña del holdout",
        filtros="Selector de corte de propensión (afecta a toda la pantalla)",
        modelo="Regresión logística con variables de 90 días y exposición previa",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["campanas"],
        estado="implementada",
        capturas="04_campanas.png; 04a_indicadores_propension.png; 04a_indicadores_propension_otro_corte.png",
        datos="04a_indicadores_propension.csv; 04a_indicadores_propension_otro_corte.csv; 04a2_metricas_datos_reales.csv",
        observaciones="Etiquetas mezclan inglés y español (AVERAGE PRECISION, ROC AUC) en una interfaz en español.",
    ),
    fila(
        id="campanas_metricas_tabla",
        pantalla="Campañas",
        ubicacion="cg-campanas-metricas-tabla",
        titulo="Métricas por grupo de exposición",
        pregunta="¿Cambia el desempeño entre hogares con y sin exposición previa?",
        tipo="Tabla plegable",
        libreria="HTML/CSS",
        variables="Filas, positivos, AP, ROC AUC, Brier, log-loss, hogares, campañas, tasa base, tasa y lift del decil superior",
        escalas="Métricas 0–1; lift en veces; conteos",
        fuente="campanas.json → metricas",
        corte="Corte activo",
        unidad="Par hogar × campaña",
        filtros="Corte de propensión",
        modelo="Regresión logística",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["campanas"],
        estado="implementada",
        capturas="04a2_tabla_metricas_grupo.png",
        datos="04a2_tabla_metricas_grupo.csv; 04a2_metricas_datos_reales.csv",
        observaciones="Plegada deja un hueco vacío de 134 px (medido) dentro del panel.",
    ),
    fila(
        id="campanas_targeting",
        pantalla="Campañas",
        ubicacion="cg-campanas-targeting",
        titulo="Curva de targeting: cuántas respuestas se capturan al contactar",
        pregunta="¿Cuánto se gana al contactar primero a los mejor puntuados?",
        tipo="Curvas de captura acumulada y precisión (SVG)",
        libreria="SVG propio generado en React",
        variables="Fracción contactada (0–100 %); respuestas acumuladas capturadas (%); precisión entre contactados (%); tasa base",
        escalas="Ambos ejes 0–100 %; solo se rotulan los extremos; 100 puntos por corte",
        fuente="campanas.json → targeting",
        corte="Corte activo (101 puntos)",
        unidad="Fracción de pares hogar × campaña ordenados por puntaje",
        filtros="Corte de propensión",
        modelo="Regresión logística (predicciones fuera de muestra)",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["campanas"],
        estado="implementada",
        capturas="04b_curva_targeting.png; 04b_curva_targeting_otro_corte.png",
        datos="04b_targeting_curvas.csv; 04b_targeting_puntos.csv; 04b_targeting.json; 04b_targeting_datos_reales.csv; 04b_targeting_curvas_otro_corte.csv",
        observaciones="La etiqueta de la tasa base se superpone a un punto; el rótulo del extremo derecho se corta.",
    ),
    fila(
        id="campanas_targeting_tabla",
        pantalla="Campañas",
        ubicacion="cg-campanas-targeting-tabla",
        titulo="Curva de targeting en tabla (cada 10 %)",
        pregunta="¿Qué captura y qué precisión hay en cada decil de contacto?",
        tipo="Tabla plegable",
        libreria="HTML/CSS",
        variables="Fracción, contactados, capturados, precisión, recall, lift",
        escalas="Proporciones y veces",
        fuente="campanas.json → targeting (muestreado cada 10 %)",
        corte="Corte activo",
        unidad="Fracción contactada",
        filtros="Corte de propensión",
        modelo="Regresión logística",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["campanas"],
        estado="implementada",
        capturas="04b2_tabla_targeting.png",
        datos="04b2_tabla_targeting.csv; 04b_targeting_datos_reales.csv",
    ),
    fila(
        id="campanas_calibracion",
        pantalla="Campañas",
        ubicacion="cg-campanas-calibracion",
        titulo="Calibración por decil del puntaje",
        pregunta="¿Coincide la probabilidad pronosticada con la tasa observada?",
        tipo="Gráfico de dispersión con diagonal de calibración perfecta (SVG)",
        libreria="SVG propio generado en React",
        variables="Probabilidad media pronosticada por decil (X); tasa observada (Y); 10 deciles",
        escalas="X 0–71 % rotulado solo en extremos; Y sin rótulos ni rejilla",
        fuente="campanas.json → calibracion",
        corte="Corte activo (10 deciles)",
        unidad="Decil del puntaje del holdout",
        filtros="Corte de propensión",
        modelo="Regresión logística",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["campanas"],
        estado="implementada",
        capturas="04c_calibracion_deciles.png",
        datos="04c_calibracion_deciles.csv; 04c_calibracion.json; 04c_calibracion_datos_reales.csv",
        observaciones="El eje Y no tiene ninguna etiqueta: la tasa observada no se puede leer sin la tabla.",
    ),
    fila(
        id="campanas_calibracion_tabla",
        pantalla="Campañas",
        ubicacion="cg-campanas-calibracion-tabla",
        titulo="Calibración por decil en tabla",
        pregunta="¿Cuáles son los valores exactos de probabilidad y tasa en cada decil?",
        tipo="Tabla plegable",
        libreria="HTML/CSS",
        variables="Decil, pares, probabilidad media, tasa observada, rango de puntaje",
        escalas="Proporciones; conteos",
        fuente="campanas.json → calibracion",
        corte="Corte activo",
        unidad="Decil del puntaje",
        filtros="Corte de propensión",
        modelo="Regresión logística",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["campanas"],
        estado="implementada",
        capturas="04c2_tabla_calibracion.png",
        datos="04c2_tabla_calibracion.csv; 04c_calibracion_datos_reales.csv",
    ),
    fila(
        id="campanas_lista",
        pantalla="Campañas",
        ubicacion="cg-campanas-lista",
        titulo="Campañas del periodo de prueba",
        pregunta="¿Qué campañas hubo y cuánto canjearon, con qué puntaje medio?",
        tipo="Tabla con fila activa y ficha",
        libreria="HTML/CSS + React",
        variables="Campaña, tipo, inicio, expuestos, canjes, tasa observada, puntaje medio",
        escalas="Conteos; tasa 0–100 %; puntaje 0–1",
        fuente="campanas.json → campanas",
        corte="Corte activo",
        unidad="Campaña del periodo de prueba",
        filtros="Corte de propensión; clic en fila abre la ficha",
        modelo="No aplica (observado, sin grupo de control)",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["campanas"],
        estado="implementada",
        capturas="04d_tabla_campanas.png; 04d_tabla_campanas_ficha.png",
        datos="04d_campanas.csv; 04d_campanas_datos_reales.csv",
    ),
    fila(
        id="campanas_ficha",
        pantalla="Campañas",
        ubicacion="cg-campanas-ficha",
        titulo="Ficha de la campaña seleccionada",
        pregunta="¿Cuál fue la ventana, el volumen y el puntaje medio de esa campaña?",
        tipo="Ficha textual",
        libreria="HTML/CSS",
        variables="Ventana, expuestos, canjes, tasa, puntaje medio; aviso de ROI no disponible",
        escalas="Conteos; proporciones",
        fuente="campanas.json → campanas",
        corte="Corte activo",
        unidad="Campaña",
        filtros="Selección de fila",
        modelo="No aplica",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["campanas"],
        estado="implementada",
        capturas="04d_tabla_campanas_ficha.png",
        datos="04d_campanas_datos_reales.csv",
    ),
    # ---------------------------------------------------------------- 05 Incrementalidad
    fila(
        id="incrementalidad_contexto",
        pantalla="Incrementalidad",
        ubicacion="cg-incrementalidad-contexto",
        titulo="Contexto: por qué Criteo es un módulo aparte",
        pregunta="¿Qué mide esta sección y con qué fuente independiente?",
        tipo="Aviso + indicadores (4 tarjetas KPI)",
        libreria="React + CSS propio",
        variables="Fuente, filas de la muestra, unidad, resultado modelado, semillas",
        escalas="Conteos de filas; tasas 0–100 %",
        fuente="incrementalidad.json → fuente y protocolo",
        corte="Muestra de 500 000 filas (semillas 111/222/333)",
        unidad="Usuario/impresión con tratamiento aleatorizado",
        filtros="Ninguno",
        modelo="S-learner, T-learner y propensión de respuesta",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["incrementalidad"],
        estado="implementada",
        capturas="05_incrementalidad.png; 05a_contexto_criteo.png",
        datos="05a_contexto_criteo.csv",
    ),
    fila(
        id="incrementalidad_modelos",
        pantalla="Incrementalidad",
        ubicacion="cg-incrementalidad-modelos",
        titulo="Comparación de modelos: AUUC por modelo y semilla",
        pregunta="¿Qué modelo ordena mejor los eventos incrementales?",
        tipo="Gráfico de puntos con rangos entre semillas (SVG)",
        libreria="SVG propio generado en React",
        variables="AUUC relativo por modelo (3) y semilla (3); uplift del decil superior en el título de cada punto",
        escalas="Eje X 0 a 0,011; eje Y categórico con 3 filas",
        fuente="incrementalidad.json → referencia_benchmark_completo.carreras",
        corte="Benchmark completo, 3 semillas de ajuste",
        unidad="Carrera modelo × semilla sobre usuarios de prueba",
        filtros="Selector de resultado: visitas / conversiones",
        modelo="S/T-learner y propensión de respuesta; referencia aleatoria",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["incrementalidad"],
        estado="implementada",
        capturas="05b_auuc_modelos_semillas.png; 05b_auuc_modelos_otro_resultado.png",
        datos="05b_auuc_puntos.csv; 05b_auuc_rangos.csv; 05b_auuc_etiquetas.csv; 05b_auuc_modelos.json; 05b_auuc_puntos_otro_resultado.csv",
        observaciones="Tres filas ocupan una caja de 340 px: dos tercios del área quedan vacíos y los puntos se apiñan en el 6 % derecho del eje.",
    ),
    fila(
        id="incrementalidad_tabla_carreras",
        pantalla="Incrementalidad",
        ubicacion="cg-incrementalidad-tabla",
        titulo="Comparación por modelo y semilla en tabla",
        pregunta="¿Cuál es el AUUC, el uplift del decil superior y el IC de cada carrera?",
        tipo="Tabla plegable (9 carreras del resultado activo)",
        libreria="HTML/CSS",
        variables="Modelo, semilla, AUUC relativo, uplift decil superior (pp), IC 95 % (pp), ATE",
        escalas="AUUC adimensional; pp; ATE proporción",
        fuente="incrementalidad.json → carreras",
        corte="Benchmark completo, resultado activo",
        unidad="Carrera modelo × semilla",
        filtros="Selector de resultado",
        modelo="S/T-learner y propensión",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["incrementalidad"],
        estado="implementada",
        capturas="05b2_tabla_carreras_benchmark.png",
        datos="05b2_tabla_carreras_benchmark.csv; 05b2_carreras_datos_reales.csv",
    ),
    fila(
        id="incrementalidad_resumen",
        pantalla="Incrementalidad",
        ubicacion="cg-incrementalidad-resumen",
        titulo="Resumen por resultado (media y rango entre semillas)",
        pregunta="¿Cuánto se mueve el AUUC al cambiar la semilla de ajuste?",
        tipo="Tabla plegable",
        libreria="HTML/CSS",
        variables="Modelo, AUUC medio, mínimo, máximo y uplift medio del decil superior",
        escalas="AUUC adimensional; pp",
        fuente="incrementalidad.json → resumen_por_resultado",
        corte="Benchmark completo, ambos resultados",
        unidad="Modelo",
        filtros="Ninguno",
        modelo="S/T-learner y propensión",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["incrementalidad"],
        estado="implementada",
        capturas="05b3_tabla_resumen_modelos.png",
        datos="05b3_tabla_resumen_modelos.csv; 05b3_resumen_datos_reales.csv",
    ),
    fila(
        id="incrementalidad_curvas",
        pantalla="Incrementalidad",
        ubicacion="cg-incrementalidad-curvas",
        titulo="Curvas de uplift frente al ranking aleatorio",
        pregunta="¿Cómo crece la ganancia acumulada al ampliar la fracción contactada?",
        tipo="Curvas de ganancia acumulada (SVG, 3 series)",
        libreria="SVG propio generado en React",
        variables="Fracción de audiencia contactada (X); ganancia acumulada por usuario (Y); modelo y referencia aleatoria",
        escalas="X 0–100 %; Y solo con los extremos rotulados (0,0000 a 0,0083); 100 puntos por serie",
        fuente="incrementalidad.json → curvas",
        corte="Muestra de 500 000 filas, resultado activo, semilla 111",
        unidad="Fracción de usuarios contactados",
        filtros="Selector de resultado (visitas / conversiones)",
        modelo="S/T-learner, propensión y ranking aleatorio",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["incrementalidad"],
        estado="implementada",
        capturas="05c_curvas_uplift.png",
        datos="05c_curvas_uplift.csv; 05c_curvas_uplift.json; 05c_curvas_leyenda.csv; 05c_curvas_datos_reales.csv",
        observaciones="El eje Y no tiene marcas intermedias y las tres curvas se separan poco.",
    ),
    fila(
        id="incrementalidad_curvas_tabla",
        pantalla="Incrementalidad",
        ubicacion="cg-incrementalidad-curvas-tabla",
        titulo="Curva cada 10 % en tabla",
        pregunta="¿Qué ganancia acumulada hay en cada decil de contacto?",
        tipo="Tabla plegable",
        libreria="HTML/CSS",
        variables="Fracción y ganancia por modelo",
        escalas="Adimensional",
        fuente="incrementalidad.json → curvas (punto más cercano a cada decil)",
        corte="Muestra de 500 000 filas",
        unidad="Fracción contactada",
        filtros="Selector de resultado",
        modelo="S/T-learner y aleatorio",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["incrementalidad"],
        estado="implementada",
        capturas="05c2_tabla_curvas_deciles.png",
        datos="05c2_tabla_curvas_deciles.csv; 05c_curvas_datos_reales.csv",
    ),
    fila(
        id="incrementalidad_rangos",
        pantalla="Incrementalidad",
        ubicacion="cg-incrementalidad-rangos",
        titulo="Sensibilidad por semilla",
        pregunta="¿Cuánto se mueve el AUUC entre semillas de muestra y de benchmark?",
        tipo="Tabla + límites declarados",
        libreria="HTML/CSS",
        variables="Rango mínimo y máximo del AUUC por modelo y resultado",
        escalas="AUUC adimensional; 3 semillas",
        fuente="incrementalidad.json → rangos_entre_semillas",
        corte="Muestra de 500 000 filas",
        unidad="Modelo × resultado",
        filtros="Ninguno",
        modelo="S/T-learner y propensión",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["incrementalidad"],
        estado="implementada",
        capturas="05d_rangos_semillas.png; 05d2_tabla_rangos.png",
        datos="05d2_tabla_rangos.csv; 05d2_rangos_datos_reales.csv",
    ),
    # ---------------------------------------------------------------- 06 Experimento
    fila(
        id="experimento_estado",
        pantalla="Experimento",
        ubicacion="cg-experimento-estado",
        titulo="Estado: experimento no ejecutado",
        pregunta="¿Hay resultados de campo en el paquete?",
        tipo="Aviso (sin gráfico)",
        libreria="HTML/CSS",
        variables="Estado del experimento y alcance",
        escalas="No aplica",
        fuente="experimento.json → estado",
        corte="Cohorte de agosto (2 317 hogares)",
        unidad="Hogar elegible hipotético",
        filtros="Ninguno",
        modelo="Diseño de 3 brazos por segmento (no ejecutado)",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["experimento"],
        estado="implementada",
        capturas="06_experimento.png; 06a_estado_experimento.png",
        datos="06e_capacidad_datos_reales.csv",
    ),
    fila(
        id="experimento_diseno",
        pantalla="Experimento",
        ubicacion="cg-experimento-diseno",
        titulo="Diseño del experimento",
        pregunta="¿Cómo se asignaría y qué se mediría?",
        tipo="Indicadores (4 tarjetas KPI) + explicación",
        libreria="React + CSS propio",
        variables="Brazos, comparación primaria, resultado primario, unidad de aleatorización",
        escalas="No aplica (definiciones)",
        fuente="experimento.json → diseño y supuestos",
        corte="Cohorte de agosto",
        unidad="Hogar",
        filtros="Ninguno",
        modelo="Diseño prospectivo de 3 brazos",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["experimento"],
        estado="implementada",
        capturas="06b_diseno_experimento.png",
        datos="06d_escenarios_datos_reales.csv",
    ),
    fila(
        id="experimento_calculadora",
        pantalla="Experimento",
        ubicacion="cg-experimento-calculadora",
        titulo="Calculadora de muestra y potencia",
        pregunta="¿Cuántos hogares por brazo hacen falta para detectar una mejora dada?",
        tipo="Controles + indicadores (3 tarjetas KPI) + tabla de contraste",
        libreria="React + CSS propio (fórmula normal aproximada y función inversa normal propia)",
        variables="MDE relativo, potencia, alfa por comparación; hogares por brazo y total necesario",
        escalas="Hogares; tasas 0–100 %",
        fuente="experimento.json → escenarios y supuestos",
        corte="Cohorte de agosto (2 317 hogares); escenarios publicados 20/30/50 %",
        unidad="Hogar hipotético por brazo y segmento",
        filtros="MDE, potencia, alfa (recalculan en vivo)",
        modelo="Diseño de 3 brazos; varianza agrupada",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["experimento"],
        estado="implementada",
        capturas="06c_calculadora_potencia.png; 06c_calculadora_otro_mde.png",
        datos="06c_calculadora.csv; 06c_calculadora_otro_mde.csv; 06c2_tabla_muestra_por_brazo.csv",
        observaciones="El recálculo difiere en 1–2 hogares del escenario publicado (6 151 vs 6 152; total 22 104 vs 22 107) y la tabla muestra la diferencia sin explicarla.",
    ),
    fila(
        id="experimento_escenarios",
        pantalla="Experimento",
        ubicacion="cg-experimento-escenarios",
        titulo="Escenarios de potencia publicados",
        pregunta="¿Qué tamaño de muestra exige cada mejora relativa?",
        tipo="Tabla",
        libreria="HTML/CSS",
        variables="Mejora a detectar, segmento, tasa base, hogares por brazo, total de tres brazos",
        escalas="Hogares; tasas 0–100 %",
        fuente="experimento.json → escenarios",
        corte="Cohorte de agosto",
        unidad="Hogar hipotético",
        filtros="Ninguno",
        modelo="Diseño de 3 brazos",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["experimento"],
        estado="implementada",
        capturas="06d_escenarios_potencia.png",
        datos="06d_escenarios_datos_reales.csv",
    ),
    fila(
        id="experimento_capacidad",
        pantalla="Experimento",
        ubicacion="cg-experimento-capacidad",
        titulo="Capacidad actual y decisión",
        pregunta="¿Alcanza el cohorte disponible para un efecto del 30 %?",
        tipo="Indicadores (3 tarjetas KPI) + límites",
        libreria="React + CSS propio",
        variables="Hogares del cohorte, respuesta sí/no, tamaños por segmento",
        escalas="Hogares; booleano",
        fuente="experimento.json → capacidad_actual",
        corte="Cohorte de agosto (90 días)",
        unidad="Hogar del cohorte",
        filtros="Ninguno",
        modelo="Diseño de 3 brazos",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["experimento"],
        estado="implementada",
        capturas="06e_capacidad_actual.png",
        datos="06e_capacidad.csv; 06e_capacidad_datos_reales.csv",
        observaciones="El motivo de la decisión se muestra en inglés dentro de una interfaz en español.",
    ),
    fila(
        id="experimento_herramientas",
        pantalla="Experimento",
        ubicacion="cg-experimento-herramientas",
        titulo="Aleatorizador y analizador (plantillas)",
        pregunta="¿Existen los scripts para ejecutar y analizar el experimento?",
        tipo="Lista de herramientas y requisitos (sin gráfico)",
        libreria="HTML/CSS",
        variables="Script, función y requisito de datos reales",
        escalas="No aplica",
        fuente="experimento.json → aleatorizador y analizador",
        corte="No aplica",
        unidad="No aplica",
        filtros="Ninguno",
        modelo="No aplica",
        generador=COMPONENTES["exportador"],
        componente=COMPONENTES["experimento"],
        estado="implementada",
        capturas="06f_plantillas.png",
        datos="00_manifiesto_artefactos.json",
    ),
    # ------------------------------------------------- solo en análisis (sin gráfica)
    fila(
        id="analisis_criteo_prototipo",
        pantalla="Solo en análisis",
        ubicacion="reports/criteo_uplift_prototype.json → metrics",
        titulo="Prototipo de uplift sobre la muestra de Criteo",
        pregunta="¿Los modelos de uplift superan al azar en la muestra pequeña?",
        tipo="Métricas tabulares (sin gráfica)",
        libreria="—",
        variables="Qini, AUUC y uplift@10 por modelo y brazo",
        escalas="Adimensional",
        fuente="reports/criteo_uplift_prototype.json",
        corte="Muestra de 500 000 filas, partición 350 k / 150 k",
        unidad="Usuario/impresión",
        filtros="No aplica (no hay interfaz)",
        modelo="T-learner, S-learner y propensión de tratamiento",
        generador="codigo/exportador/export_dashboard_artifacts.py",
        componente="—",
        estado="solo en análisis",
        capturas="",
        datos="procedencia_analisis.csv",
        observaciones="Sin código de dibujo en el repositorio (bloqueador para una captura): los datos están, la gráfica no existe.",
    ),
    fila(
        id="analisis_criteo_benchmark",
        pantalla="Solo en análisis",
        ubicacion="reports/criteo_full_benchmark.json → outcomes",
        titulo="Benchmark completo de Criteo (modelos y 20 sorteos aleatorios)",
        pregunta="¿Cuánto separa cada modelo del ranking aleatorio en la fuente completa?",
        tipo="Series de AUUC y sorteos aleatorios (sin gráfica)",
        libreria="—",
        variables="AUUC por modelo; uplift@10; 20 sorteos aleatorios de referencia",
        escalas="Adimensional",
        fuente="reports/criteo_full_benchmark.json",
        corte="Fuente completa 13 979 592 filas, holdout 20 % semilla 111",
        unidad="Usuario/impresión",
        filtros="No aplica",
        modelo="T-learner logístico y S-learner",
        generador="codigo/exportador/export_dashboard_artifacts.py",
        componente="—",
        estado="solo en análisis",
        capturas="",
        datos="procedencia_analisis.csv",
        observaciones="El tablero publica un resumen de estas carreras, pero no dibuja la distribución de los 20 sorteos aleatorios.",
    ),
    fila(
        id="analisis_criteo_semillas",
        pantalla="Solo en análisis",
        ubicacion="reports/criteo_seed_stability.json → runs",
        titulo="Estabilidad entre semillas de ajuste (Criteo)",
        pregunta="¿Cuánto cambia el resultado al repetir la partición?",
        tipo="Comparación de tres repeticiones (sin gráfica)",
        libreria="—",
        variables="AUUC y uplift@10 por semilla y resultado",
        escalas="Adimensional",
        fuente="reports/criteo_seed_stability.json",
        corte="Tres particiones de la fuente completa",
        unidad="Usuario/impresión",
        filtros="No aplica",
        modelo="T-learner y S-learner",
        generador="codigo/exportador/export_dashboard_artifacts.py",
        componente="—",
        estado="solo en análisis",
        capturas="",
        datos="procedencia_analisis.csv",
        observaciones="Sus cifras alimentan los rangos entre semillas del tablero; no hay gráfica propia.",
    ),
    fila(
        id="analisis_criteo_auditoria",
        pantalla="Solo en análisis",
        ubicacion="reports/criteo_uplift_audit.json",
        titulo="Auditoría del fichero fuente de Criteo",
        pregunta="¿El fichero tiene nulos, infinitos o filas inválidas?",
        tipo="Comprobaciones tabulares (sin gráfica)",
        libreria="—",
        variables="Esquema, filas, nulos, no finitos, proporción de tratamiento",
        escalas="Conteos y proporciones",
        fuente="reports/criteo_uplift_audit.json",
        corte="Fuente completa",
        unidad="Fila del fichero",
        filtros="No aplica",
        modelo="No aplica",
        generador="—",
        componente="—",
        estado="solo en análisis",
        capturas="",
        datos="procedencia_analisis.csv",
        observaciones="Es un control de calidad, no una visualización; se documenta para no confundirlo con evidencia gráfica.",
    ),
    fila(
        id="analisis_propension_bootstrap",
        pantalla="Solo en análisis",
        ubicacion="reports/robust_propensity_validation.json → campaign_cluster_bootstrap",
        titulo="Bootstrap por campaña del ranking de propensión",
        pregunta="¿Cuánto depende el AP de qué campañas caen en la prueba?",
        tipo="Distribución bootstrap (sin gráfica)",
        libreria="—",
        variables="AP remuestreado por campaña, en tres cortes",
        escalas="AP 0–1",
        fuente="reports/robust_propensity_validation.json",
        corte="Cortes 2017-06-01, 2017-08-01, 2017-10-01",
        unidad="Par hogar × campaña",
        filtros="No aplica",
        modelo="Regresión logística de propensión",
        generador="codigo/analisis/robust_propensity_validation.py",
        componente="—",
        estado="solo en análisis",
        capturas="",
        datos="procedencia_analisis.csv",
        observaciones="Serie completa disponible en el JSON, sin gráfica dibujada: bloqueador de captura declarado.",
    ),
    fila(
        id="analisis_propension_calibracion",
        pantalla="Solo en análisis",
        ubicacion="reports/robust_propensity_validation.json → cutoff_results[].calibration",
        titulo="Calibración por deciles en los tres cortes",
        pregunta="¿Se mantiene la sobreconfianza del puntaje en otros cortes?",
        tipo="Calibración por deciles (solo un corte llega al tablero)",
        libreria="—",
        variables="Probabilidad media y tasa observada por decil y corte",
        escalas="Proporciones",
        fuente="reports/robust_propensity_validation.json",
        corte="Tres cortes",
        unidad="Decil del puntaje",
        filtros="No aplica",
        modelo="Regresión logística",
        generador="codigo/analisis/robust_propensity_validation.py",
        componente="—",
        estado="solo en análisis",
        capturas="",
        datos="procedencia_analisis.csv",
        observaciones="El tablero dibuja solo el corte activo; los otros dos cortes no tienen gráfica ni captura.",
    ),
    fila(
        id="analisis_segmentos_candidatos_k",
        pantalla="Solo en análisis",
        ubicacion="reports/behavior_segments_validation.json → per_cutoff[].candidate_k",
        titulo="Candidatos de k con silueta y Davies-Bouldin",
        pregunta="¿Qué tan bueno es cada k comparado con el elegido?",
        tipo="Comparación de métricas por k (sin gráfica)",
        libreria="—",
        variables="k, silueta, Davies-Bouldin, tamaño mínimo",
        escalas="Adimensional",
        fuente="reports/behavior_segments_validation.json",
        corte="Tres cortes",
        unidad="Solución de clustering",
        filtros="No aplica",
        modelo="K-Means k=2…8",
        generador="codigo/analisis/validate_behavior_segments.py",
        componente="—",
        estado="solo en análisis",
        capturas="",
        datos="procedencia_analisis.csv",
        observaciones="El tablero solo publica el tamaño mínimo por k; la silueta queda fuera de la interfaz.",
    ),
    fila(
        id="analisis_segmentos_estabilidad",
        pantalla="Solo en análisis",
        ubicacion="reports/behavior_segments_validation.json → temporal_stability y selected_k_subsample_stability",
        titulo="ARI entre cortes y estabilidad en submuestras",
        pregunta="¿Se reproduce la partición entre cortes y en submuestras del 80 %?",
        tipo="Series de ARI por repetición (sin gráfica)",
        libreria="—",
        variables="ARI por par de cortes; ARI por repetición de submuestra (20 repeticiones)",
        escalas="ARI −1 a 1",
        fuente="reports/behavior_segments_validation.json",
        corte="Tres cortes",
        unidad="Partición de hogares",
        filtros="No aplica",
        modelo="K-Means k=2",
        generador="codigo/analisis/validate_behavior_segments.py",
        componente="—",
        estado="solo en análisis",
        capturas="",
        datos="procedencia_analisis.csv",
        observaciones="El tablero resume el resultado en texto; la distribución de repeticiones no se dibuja.",
    ),
    fila(
        id="analisis_temporal_sensibilidad",
        pantalla="Solo en análisis",
        ubicacion="reports/temporal_sensitivity.json",
        titulo="Sensibilidad temporal del decil superior y la cobertura",
        pregunta="¿Cuánto cambia el desempeño según el corte de evaluación?",
        tipo="Comparación de métricas entre cortes (sin gráfica)",
        libreria="—",
        variables="AP, ROC AUC, Brier, log-loss, tasa del decil superior, cobertura por corte",
        escalas="Métricas 0–1",
        fuente="reports/temporal_sensitivity.json",
        corte="Cortes 2017-06-01, 2017-08-01, 2017-10-01",
        unidad="Par hogar × campaña",
        filtros="No aplica",
        modelo="Regresión logística",
        generador="codigo/analisis/response_propensity.py",
        componente="—",
        estado="solo en análisis",
        capturas="",
        datos="procedencia_analisis.csv",
        observaciones="El tablero publica las métricas del corte activo; la comparación entre cortes no tiene gráfica.",
    ),
    fila(
        id="analisis_potencia_planes",
        pantalla="Solo en análisis",
        ubicacion="reports/segment_campaign_experiment_power.json",
        titulo="Plan de potencia del experimento (fuente del bloque de experimentación)",
        pregunta="¿Qué muestra exige cada mejora y qué alcanza el cohorte actual?",
        tipo="Escenarios y capacidad en JSON (el tablero los dibuja en 06)",
        libreria="—",
        variables="Escenarios por segmento, supuestos y capacidad del cohorte",
        escalas="Hogares; tasas",
        fuente="reports/segment_campaign_experiment_power.json",
        corte="Cohorte de agosto",
        unidad="Hogar hipotético",
        filtros="No aplica",
        modelo="Diseño de 3 brazos",
        generador="codigo/analisis/plan_segment_campaign_experiment.py",
        componente=COMPONENTES["experimento"],
        estado="solo en análisis",
        capturas="",
        datos="06d_escenarios_datos_reales.csv; procedencia_analisis.csv",
        observaciones="Es el origen del bloque de experimentación; su representación visual sí existe en la pantalla 06.",
    ),
    fila(
        id="fuera_alcance_clientes_en_movimiento",
        pantalla="Fuera de alcance",
        ubicacion="dist/dashboards/clientes-en-movimiento/index.html",
        titulo="«Clientes en movimiento» (otro tablero del portafolio)",
        pregunta="¿Es otra vista del mismo tablero?",
        tipo="Tablero independiente (scatter, corrientes, cohortes semanales)",
        libreria="HTML/SVG propio",
        variables="Cortes semanales, cohortes, recorridos de hogares",
        escalas="Según su propio contrato de datos",
        fuente="dashboard/data-v2.json (canastas semanales)",
        corte="Semanas 1–13 del periodo",
        unidad="Hogar × semana",
        filtros="Sus propios filtros de semana y cohorte",
        modelo="No aplica",
        generador="codigo/sitio/analisis/export_weekly_dashboard.py",
        componente="codigo/sitio/projects/clientes-en-movimiento.js",
        estado="otra interfaz",
        capturas="",
        datos="",
        observaciones="No se audita aquí: comparte la fuente Complete Journey pero usa otro pipeline y otras pantallas. Se documenta para no mezclar poblaciones.",
    ),
]


def escribir_inventario(salida: Path) -> None:
    encabezado = [
        "id",
        "pantalla",
        "ubicacion_testid",
        "titulo",
        "pregunta_negocio",
        "tipo_grafica",
        "libreria",
        "variables_y_unidades",
        "escalas_y_agregacion",
        "fuente_y_corte",
        "unidad_observacion",
        "filtros_e_interacciones",
        "modelo_o_experimento",
        "archivo_generador",
        "componente",
        "estado",
        "capturas",
        "datos",
        "observaciones",
    ]
    with (salida / "inventario_visualizaciones.csv").open("w", encoding="utf-8", newline="") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(encabezado)
        for item in INVENTARIO:
            escritor.writerow(
                [
                    item["id"],
                    item["pantalla"],
                    item["ubicacion"],
                    item["titulo"],
                    item["pregunta"],
                    item["tipo"],
                    item["libreria"],
                    item["variables"],
                    item["escalas"],
                    f"{item['fuente']} · {item['corte']}",
                    item["unidad"],
                    item["filtros"],
                    item["modelo"],
                    item["generador"],
                    item["componente"],
                    item["estado"],
                    item["capturas"],
                    item["datos"],
                    item.get("observaciones", ""),
                ]
            )


def leer_json(ruta: Path):
    with ruta.open(encoding="utf-8") as archivo:
        return json.load(archivo)


def resumen_mediciones(salida: Path) -> dict:
    return leer_json(salida / "datos_graficas" / "00_mediciones_layout.json")


def escribir_informe(salida: Path, manifiesto: dict, mediciones: dict) -> None:
    implementadas = [i for i in INVENTARIO if i["estado"] == "implementada"]
    analisis = [i for i in INVENTARIO if i["estado"] == "solo en análisis"]
    otras = [i for i in INVENTARIO if i["estado"] not in ("implementada", "solo en análisis")]

    def cortes(pantalla: str) -> str:
        filas = mediciones.get(pantalla, {}).get("cortados", [])
        if not filas:
            return "sin etiquetas cortadas"
        return "; ".join(
            f"{fila['panel']} «{fila['texto']}» ({max(fila['izquierda_px'], 0) + max(fila['derecha_px'], 0):.1f} px)"
            for fila in filas
        )

    cuenta = {pantalla: sum(1 for i in INVENTARIO if i['pantalla'] == pantalla) for pantalla in ['Proyecto', 'Perfiles', 'Evolución', 'Campañas', 'Incrementalidad', 'Experimento']}
    solapes_puntos = sum(len(datos.get("solapesPunto", [])) for datos in mediciones.values())
    huecos = [fila for datos in mediciones.values() for fila in datos.get("huecos", [])]

    texto = f"""# Auditoría visual de «Clientes y campañas»

Fecha de la auditoría: {date.today().isoformat()} · Capturas generadas: {manifiesto.get('generado', '')} · Artefactos: versión {leer_json(RAIZ / 'dist' / 'dashboards' / 'clientes-campanas' / 'data' / 'manifiesto.json')['version_artefactos'] if (RAIZ / 'dist' / 'dashboards' / 'clientes-campanas' / 'data' / 'manifiesto.json').exists() else 1}

Este informe **describe y mide** lo que existe. No se ha cambiado ningún modelo, métrica ni elemento de la interfaz, y no se ha publicado nada en remoto.

## 1. Qué se auditó y cómo

- Aplicación real servida en `http://127.0.0.1:8000/#/area/ciencia-de-datos/clientes-campanas`, con la sección activa fijada por `?cg_pantalla=<sección>`.
- Seis pantallas: Proyecto, Perfiles, Evolución, Campañas, Incrementalidad y Experimento.
- {len(implementadas)} visualizaciones con representación gráfica o tabular en la interfaz, más {len(analisis)} bloques de análisis que solo existen como datos en informes ({len(otras)} elemento fuera de alcance documentado).
- Instrumentos utilizados:
  1. capturas reales con Playwright, incluidos estados con filtros cambiados y vistas de 390 px;
  2. volcado de los datos que alimentan cada gráfica, tanto la geometría dibujada (SVG) como los artefactos de origen sin redondear;
  3. medición automática del DOM para etiquetas cortadas, solapes y espacios vacíos.

Ninguna cifra de este informe se ha inventado: cada afirmación remite a una captura de `capturas/` o a un archivo de `datos_graficas/`.

## 2. Mapa de visualizaciones

| Pantalla | Visualizaciones | Tipos principales |
|---|---|---|
| Proyecto | {cuenta['Proyecto']} | 2 bloques de KPI, tabla de artefactos, lista de proceso, aviso |
| Perfiles | {cuenta['Perfiles']} | KPI, enjambre de puntos, coordenadas paralelas, matriz de calor, 5 tablas, ficha |
| Evolución | {cuenta['Evolución']} | KPI, alluvial, tabla de transiciones, bloque de estabilidad |
| Campañas | {cuenta['Campañas']} | KPI, curvas de targeting, calibración, 4 tablas, ficha de campaña |
| Incrementalidad | {cuenta['Incrementalidad']} | KPI, puntos con rangos, curvas de uplift, 3 tablas |
| Experimento | {cuenta['Experimento']} | aviso, KPI de diseño, calculadora, tabla de escenarios, capacidad, plantillas |
| Solo en análisis | {len(analisis)} | métricas y series en JSON/MD, sin gráfica en el repositorio |

El detalle campo por campo está en `inventario_visualizaciones.csv`.

## 3. Poblaciones por módulo (no se mezclan)

| Módulo | Datos | Unidad | Cortes / periodos | Qué no es |
|---|---|---|---|---|
| Segmentación (Perfiles, Evolución) | Complete Journey, 1 469 307 transacciones, 2 469 hogares | Hogar comprador | 2017-07-01, 2017-08-01, 2017-09-01; ventana de 90 días | No es predicción: describe el corte |
| Propensión (Campañas) | Complete Journey, pares hogar × campaña | Par hogar × campaña expuesta | 2017-06-01, 2017-08-01, 2017-10-01; holdout hacia adelante | No es uplift ni efecto causal: no hay asignación aleatoria |
| Incrementalidad (Criteo) | Muestra de 500 000 filas; benchmark completo 13 979 592 | Usuario/impresión con tratamiento aleatorizado | Semillas 111/222/333 | No comparte hogares, segmentos ni campañas con Complete Journey |
| Experimentación | Cohortes del corte y escenarios de potencia | Hogar hipotético | Cohorte de agosto (2 317 hogares) | No hay experimento ejecutado: son números de dimensionamiento |

Observado, predicho y estimado aparecen separados en la interfaz y se mantienen separados aquí: los canjes de campaña son **observados**, el puntaje es **predicho**, el uplift de Criteo es **estimado** bajo aleatorización, y la potencia del experimento es **planificación**.

## 4. Problemas verificados

Cada punto tiene evidencia en `capturas/` y, cuando aplica, una medición en `datos_graficas/00_mediciones_layout.json`.

### 4.1 Etiquetas cortadas (5 gráficas, 9 etiquetas)

| Gráfica | Etiqueta | Desbordamiento medido | Captura |
|---|---|---|---|
| Alluvial (Evolución) | «Menor actividad · 701» y «Mayor actividad · 1 558» | 19,2 px y 30,3 px por la izquierda | `03a_alluvial_transiciones.png` |
| Alluvial (Evolución) | «Menor actividad · 702» y «Mayor actividad · 1 557» | 19,2 px y 30,3 px por la derecha | `03a_alluvial_transiciones.png` |
| Coordenadas paralelas (Perfiles) | «Líneas con cupón» y su rango «0.0000 – 0.5000» | 13,2 px y 11,5 px por la derecha | `02c_coordenadas_paralelas.png` |
| Targeting (Campañas) | «100 % contactado» | 3,9 px por la derecha | `04b_curva_targeting.png` |
| Calibración (Campañas) | «71 % pronosticado» | 7,0 px por la derecha | `04c_calibracion_deciles.png` |
| AUUC (Incrementalidad) | «AUUC relativo (semillas 111, 222, 333)» | 21,5 px por la derecha | `05b_auuc_modelos_semillas.png` |

Resumen medido por pantalla: perfiles → 2 cortes; evolución → 4; campañas → 2; incrementalidad → 1. Proyecto y Experimento: ninguno.

### 4.2 Texto sobre datos

- Enjambre (Perfiles): **65** etiquetas de texto tapan círculos del gráfico (rótulos «Mayor actividad · n=1 590» y «mediana …» dentro del área de puntos). Captura `02b_distribucion_beeswarm.png`.
- Targeting (Campañas): «tasa base 11,9 %» se superpone a un punto (6,2 px). Captura `04b_curva_targeting.png`.

### 4.3 Uso del espacio y escalas

- **AUUC (Incrementalidad)**: tres filas de puntos ocupan una caja de 340 px; todo el bloque inferior queda vacío y los valores (0,0088–0,0094) se apiñan en el 6 % derecho de un eje 0–0,011. Las tres semillas de cada modelo caen prácticamente en el mismo píxel. Captura `05b_auuc_modelos_semillas.png`.
- **Calibración (Campañas)**: el eje Y no tiene ninguna etiqueta ni rejilla; la tasa observada solo se puede leer en la tabla. Nueve de diez deciles se agrupan por debajo del 10 % del ancho, mientras el decil superior queda aislado a la derecha. Captura `04c_calibracion_deciles.png`.
- **Targeting (Campañas)**: ambos ejes se rotulan solo en los extremos (0 % / 100 %) y las dos series comparten una escala 0–100 % con significados distintos (captura acumulada frente a precisión). La precisión arranca cerca del 100 % con una fracción mínima contactada, sin nota de suavizado. Captura `04b_curva_targeting.png`.
- **Enjambre (Perfiles)**: eje X sin marcas intermedias (solo 0 y el máximo); la banda de cuartiles y la mediana se dibujan dentro de la nube de puntos. Captura `02b_distribucion_beeswarm.png`.
- **Curvas de uplift (Incrementalidad)**: el eje Y solo rotula los extremos (0,0000 y 0,0083) y las tres curvas se separan poco; la leyenda va debajo, lejos del trazo. Captura `05c_curvas_uplift.png`.
- **Matriz de departamentos (Perfiles)**: la intensidad de color se trunca al 90 % de la rampa (`min(0,9, valor × 1,6)`), de modo que cualquier participación superior al 56 % se ve igual de saturada; no hay leyenda de intensidad y los valores de 0,3–0,4 % quedan casi blancos. Captura `02d_matriz_departamentos.png`.

### 4.4 Coherencia de color

- El naranja `#e08b2c` identifica «Mayor actividad» en Perfiles y Evolución, y a la vez la curva de **propensión** en Incrementalidad; el azul `#3458f5` identifica «Menor actividad» y también los modelos T-learner y los puntos de la segmentación. El mismo tono cambia de significado entre pantallas. Capturas `02b_*`, `03a_*`, `05b_*`, `05c_*`.
- La referencia aleatoria cambia de tono según la gráfica: gris discontinuo en las curvas y gris en los puntos, sin una convención declarada.

### 4.5 Contenedores y jerarquía

- Campañas: la tabla «Métricas por grupo de exposición», plegada, deja un hueco vacío de **134 px** dentro del panel, visible en la captura `04a2_tabla_metricas_grupo.png` (el bloque gris vacío a la izquierda de «Diseño del corte»).

### 4.6 Consistencia de cifras y textos

- **Calculadora de potencia (Experimento)**: el recálculo en vivo da 6 151 hogares por brazo donde el escenario publicado dice 6 152, y un total de 22 104 frente a 22 107 (con MDE del 20 %: 13 265 y 47 733 frente a 47 739). La tabla muestra la columna «Diferencia = −1» sin explicar la regla de redondeo. Evidencia: `06c_calculadora_potencia.png`, `06c2_tabla_muestra_por_brazo.csv`, `06d_escenarios_datos_reales.csv`.
- **Alluvial (Evolución)**: las etiquetas de nodo dicen 701 y 1 558 hogares, mientras la leyenda y las tarjetas hablan de 740 y 1 560 para esos segmentos. La diferencia son los hogares que no están en ambos cortes, pero el gráfico no lo advierte junto a la etiqueta. Evidencia: `03a_alluvial_transiciones.png` y `03a2_transiciones_datos_reales.csv`.
- **Idioma**: en Campañas los KPI se rotulan «AVERAGE PRECISION (TODOS)» y «ROC AUC» en una interfaz en español (`04a_indicadores_propension.png`); en Experimento, el motivo de la decisión de capacidad se muestra en inglés (`06e_capacidad_actual.png`).

### 4.7 Vista móvil (390 px)

- Las seis pantallas conservan el orden y no pierden datos, pero la cabecera del tablero (título, subtítulo, unidades y párrafo de independencia) ocupa la primera pantalla completa antes de cualquier dato. Capturas `movil_01_proyecto.png` … `movil_06_experimento.png`.
- Las tablas anchas (matriz de departamentos, campañas) requieren desplazamiento horizontal dentro de su marco.

## 5. Sugerencias (no aplicadas)

Se listan separadas de los problemas porque implican decisiones de diseño, no correcciones objetivas:

1. Reservar el naranja para segmentos y usar una paleta distinta para modelos, o rotular siempre la leyenda con el dominio (segmento frente a modelo).
2. Sacar las etiquetas de nodo del área de dibujo (margen o leyenda) y añadir el matiz «solo hogares presentes en ambos cortes» junto a la cifra.
3. En el enjambre: banda de cuartiles fuera de la nube, ticks intermedios en X y rótulos de segmento en la cabecera del carril.
4. En AUUC: alto ligado al número de filas, eje con marcas intermedias y barras de rango por modelo en lugar de tres puntos superpuestos.
5. En calibración: rotular el eje Y, añadir rejilla y una vista ampliada del tramo 0–10 % (o escala logarítmica) para los deciles bajos.
6. En targeting: ticks cada 10 % y leyenda que separe «captura acumulada» de «precisión».
7. En la matriz de departamentos: una sola escala secuencial con leyenda de intensidad, o barras por segmento; ordenar por participación.
8. Alinear la fórmula de redondeo de la calculadora con la del informe (o explicar la diferencia junto a la columna «Diferencia»).
9. Traducir los rótulos de métricas y el motivo de capacidad al español, o declarar que son nombres técnicos.
10. Añadir descarga de datos junto a cada gráfica: hoy la tienen las tablas de perfiles, targeting y campañas, pero no la calibración ni las curvas de uplift.

## 6. Límites analíticos que el propio tablero declara

- La propensión **no** es uplift: no hay grupo de control en la fuente de campañas.
- La calibración es insuficiente para leer probabilidad exacta; el puntaje sirve para ordenar.
- Criteo es un benchmark independiente: sus cifras no se atribuyen a los hogares de Complete Journey.
- El experimento no se ejecutó: no hay resultados de campo.
- El ARI mide coincidencia de particiones y no reconstruye flujos.
- Los rangos entre semillas no son intervalos de confianza.

Este informe los respeta: ninguna comparación cruza módulos.

## 7. Comprobaciones automáticas frente a revisión visual

| Comprobación | Tipo | Resultado |
|---|---|---|
| Etiquetas que se salen del área del gráfico | automática (medición de rectángulos SVG) | 9 hallazgos en 5 gráficas |
| Texto que tapa puntos del gráfico | automática | {solapes_puntos} solapes (65 en el enjambre, 2 en targeting) |
| Contenedores plegados con hueco visible | automática | {len(huecos)} hallazgo (134 px en Campañas) |
| Área dibujada frente a área disponible | automática | AUUC: tres filas en 340 px; curvas y calibración con 14 % de alto sin usar |
| Capturas por pantalla, gráfica, estado y móvil | automática (Playwright) | {len(manifiesto.get('capturas', []))} capturas |
| Datos por gráfica exportados sin redondear | automática (exportador) | {len(list((salida / 'datos_graficas').glob('*')))} archivos |
| Densidad, jerarquía, color y lectura de ejes | revisión visual | descrito en las secciones 4.3–4.5 |

Lo que solo se puede ver mirando: la nube de puntos del enjambre resulta ilegible por densidad, el alluvial deja las cifras clave en los bordes, y la portada de cada pantalla empuja los datos fuera de la primera vista en móvil.

## 8. Reproducción

Ver `reproduccion/comandos.md`. En resumen:

```
python -m http.server 8000 --bind 127.0.0.1        # desde dist/
cd dashboards/clientes-campanas
npm ci && npm run build                            # reconstruye el tablero
node tools/auditar-visual.mjs   ../../evidencias/clientes-campanas/auditoria
node tools/medir-auditoria.mjs  ../../evidencias/clientes-campanas/auditoria
python tools/auditar_datos.py    ../../evidencias/clientes-campanas/auditoria
python tools/auditar_entrega.py  ../../evidencias/clientes-campanas/auditoria ../../entregas
```

## 9. Bloqueadores declarados

1. **{len(analisis)} bloques de análisis no tienen gráfica**: existen los datos (bootstrap, calibración de tres cortes, candidatos k, sensibilidad temporal, sorteos aleatorios del benchmark) pero no hay código de dibujo en el repositorio; se entregan como datos y no como capturas inventadas.
2. **Estados de hover completos**: los tooltips del enjambre y de las coordenadas paralelas se documentan con los títulos de los elementos SVG (`datos_graficas/*.json`), no con capturas, porque Playwright no puede fijar el cursor de forma fiable.
3. **Criteo completo**: las cifras del benchmark completo se toman de los informes existentes; no se reentrenó ningún modelo en esta auditoría.
4. **«Clientes en movimiento»**: queda fuera de alcance por ser otro pipeline y otro tablero; se documenta la separación en el inventario y en la sección 3.
"""
    (salida / "informe_auditoria.md").write_text(texto, encoding="utf-8")


GALERIA_CSS = """
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Inter", "Segoe UI", system-ui, sans-serif; background: #f7f8fc; color: #252d41; }
header.portada { padding: 40px clamp(18px, 5vw, 64px) 24px; background: #fff; border-bottom: 1px solid #dde2eb; }
header.portada p { margin: 0 0 8px; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: #6b7688; }
header.portada p.meta { margin: 0; font-size: 13px; letter-spacing: 0; text-transform: none; color: #4d5666; max-width: 78ch; line-height: 1.6; }
header.portada h1 { margin: 0 0 12px; font-size: clamp(24px, 3vw, 34px); line-height: 1.15; }
header.portada .meta { font-size: 13px; color: #4d5666; max-width: 70ch; line-height: 1.55; }
header.portada nav { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 8px; }
header.portada nav a { font-size: 12.5px; padding: 7px 12px; border-radius: 999px; background: #f4f6fa; border: 1px solid #dde2eb; color: #374151; text-decoration: none; }
header.portada nav a:hover, header.portada nav a:focus-visible { background: #e2e5ea; }
main { padding: 28px clamp(18px, 5vw, 64px) 64px; display: grid; gap: 34px; }
section { scroll-margin-top: 16px; }
section > h2 { font-size: 19px; margin: 0 0 6px; }
section > p.intro { margin: 0 0 18px; font-size: 13px; color: #4d5666; }
.rejilla { display: grid; gap: 18px; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); align-items: start; }
article { background: #fff; border: 1px solid #dde2eb; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
article img { width: 100%; height: auto; max-height: 360px; object-fit: contain; display: block; background: #f2f4fa; border-bottom: 1px solid #eef1f6; }
article .cuerpo { padding: 14px 16px 16px; display: grid; gap: 8px; }
article h3 { margin: 0; font-size: 14.5px; line-height: 1.3; }
article .etiqueta { font-size: 10.5px; letter-spacing: .09em; text-transform: uppercase; color: #6b7688; }
article p { margin: 0; font-size: 12px; line-height: 1.5; color: #3b4454; }
article dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; font-size: 11.5px; color: #4d5666; }
article dt { color: #6b7688; }
article dd { margin: 0; }
article .enlaces { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
article .enlaces a { font-size: 11px; padding: 5px 9px; border-radius: 7px; background: #eef1f7; color: #2b4bd0; text-decoration: none; }
article .enlaces a:hover, article .enlaces a:focus-visible { background: #dfe5f3; }
.sin-captura { background: #fbfcfe; border: 1px dashed #c8d0de; border-radius: 12px; padding: 18px; font-size: 12px; color: #4d5666; }
footer { padding: 22px clamp(18px, 5vw, 64px) 48px; font-size: 11.5px; color: #6b7688; }
"""


def construir_galeria(salida: Path, manifiesto: dict) -> None:
    disponibles = {captura for captura in manifiesto.get("capturas", [])}
    pantallas = ["Proyecto", "Perfiles", "Evolución", "Campañas", "Incrementalidad", "Experimento"]
    anclas = {
        "Proyecto": "proyecto",
        "Perfiles": "perfiles",
        "Evolución": "evolucion",
        "Campañas": "campanas",
        "Incrementalidad": "incrementalidad",
        "Experimento": "experimento",
    }
    intro = {
        "Proyecto": "Marco del proyecto: pregunta, fuentes, artefactos y correcciones. Es donde se declara la separación de módulos.",
        "Perfiles": "Segmentos del corte: tamaño, medianas, distribuciones, coordenadas paralelas y afinidad de departamentos.",
        "Evolución": "Transiciones de hogares entre dos cortes consecutivos y estabilidad de la segmentación.",
        "Campañas": "Propensión de respuesta con holdout temporal: ranking, curva de targeting y calibración.",
        "Incrementalidad": "Benchmark independiente de Criteo: AUUC por modelo y semilla, curvas de ganancia acumulada y rangos.",
        "Experimento": "Diseño prospectivo no ejecutado: potencia, escenarios y capacidad del cohorte actual.",
    }

    piezas = [f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Galería · Auditoría visual de Clientes y campañas</title>
<style>{GALERIA_CSS}</style>
</head>
<body>
<header class="portada">
  <p>Ciencia de datos · Customer Growth Intelligence</p>
  <h1>Galería de la auditoría visual de «Clientes y campañas»</h1>
  <p class="meta">Cada tarjeta muestra una captura real de la aplicación, la pregunta de negocio que intenta responder la visualización,
  su fuente y los enlaces relativos a los datos y al código que la generan. Las capturas se tomaron con la aplicación servida en
  <code>127.0.0.1:8000</code> el {manifiesto.get('generado', '')[:10]}; los datos se exportaron de los mismos artefactos sin redondear.</p>
  <nav>{''.join(f'<a href="#{anclas[p]}">{p}</a>' for p in pantallas)}<a href="#analisis">Solo en análisis</a></nav>
</header>
<main>"""]

    for pantalla in pantallas:
        piezas.append(f'<section id="{anclas[pantalla]}"><h2>{pantalla}</h2><p class="intro">{intro[pantalla]}</p><div class="rejilla">')
        for item in INVENTARIO:
            if item["pantalla"] != pantalla:
                continue
            capturas = [c.strip() for c in item["capturas"].split(";") if c.strip()]
            capturas = [c for c in capturas if c in disponibles]
            datos = [d.strip() for d in item["datos"].split(";") if d.strip()]
            datos = [d for d in datos if (salida / "datos_graficas" / d).exists()]
            codigo = item["componente"] if item["componente"] not in ("—", "") else ""
            if capturas:
                imagen = f'<img src="capturas/{capturas[0]}" alt="Captura de {item["titulo"]}" loading="lazy">'
            else:
                imagen = '<div class="sin-captura">Sin captura: ver bloqueador en el informe.</div>'
            enlaces = []
            for captura in capturas:
                enlaces.append(f'<a href="capturas/{captura}">{captura}</a>')
            for dato in datos:
                enlaces.append(f'<a href="datos_graficas/{dato}">{dato}</a>')
            if codigo:
                enlaces.append(f'<a href="{codigo}">{codigo.split("/")[-1]}</a>')
            piezas.append(
                f"""<article>
  {imagen}
  <div class="cuerpo">
    <span class="etiqueta">{item['tipo']} · {item['estado']}</span>
    <h3>{item['titulo']}</h3>
    <p><strong>Pregunta:</strong> {item['pregunta']}</p>
    <dl>
      <dt>Fuente</dt><dd>{item['fuente']}</dd>
      <dt>Corte</dt><dd>{item['corte']}</dd>
      <dt>Unidad</dt><dd>{item['unidad']}</dd>
      <dt>Filtros</dt><dd>{item['filtros']}</dd>
    </dl>
    <div class="enlaces">{''.join(enlaces)}</div>
  </div>
</article>"""
            )
        piezas.append("</div></section>")

    piezas.append('<section id="analisis"><h2>Solo en análisis (sin gráfica)</h2>'
                  '<p class="intro">Estos bloques existen como datos en informes del proyecto, no como gráficas. Se listan con su estado y su bloqueador; '
                  'los archivos de origen están en <code>datos_graficas/procedencia_analisis.csv</code>.</p><div class="rejilla">')
    for item in INVENTARIO:
        if item["pantalla"] in ("Fuera de alcance",) or item["estado"] != "solo en análisis":
            continue
        piezas.append(
            f"""<article>
  <div class="sin-captura">Sin gráfica en el repositorio: los datos existen en <code>{item['ubicacion']}</code>.</div>
  <div class="cuerpo">
    <span class="etiqueta">{item['tipo']} · {item['estado']}</span>
    <h3>{item['titulo']}</h3>
    <p><strong>Pregunta:</strong> {item['pregunta']}</p>
    <dl>
      <dt>Fuente</dt><dd>{item['fuente']}</dd>
      <dt>Corte</dt><dd>{item['corte']}</dd>
      <dt>Unidad</dt><dd>{item['unidad']}</dd>
    </dl>
    <p>{item.get('observaciones', '')}</p>
    <div class="enlaces"><a href="datos_graficas/procedencia_analisis.csv">procedencia_analisis.csv</a></div>
  </div>
</article>"""
        )
    piezas.append("</div></section></main>")
    piezas.append(
        '<footer>Paquete autónomo: las imágenes y los datos se abren desde esta misma carpeta, sin servidor ni conexión. '
        'Informe completo en <a href="informe_auditoria.md">informe_auditoria.md</a> · inventario en '
        '<a href="inventario_visualizaciones.csv">inventario_visualizaciones.csv</a>.</footer></body></html>'
    )
    (salida / "galeria.html").write_text("\n".join(piezas), encoding="utf-8")


def copiar_codigo(salida: Path) -> None:
    destino = salida / "codigo"
    if destino.exists():
        shutil.rmtree(destino)
    (destino / "dashboard" / "src" / "ui").mkdir(parents=True)
    (destino / "herramientas").mkdir(parents=True)
    (destino / "exportador").mkdir(parents=True)
    (destino / "sitio" / "projects").mkdir(parents=True)

    for archivo in ["App.tsx", "mount.tsx", "datos.ts", "estilos.css"]:
        shutil.copyfile(TABLERO / "src" / archivo, destino / "dashboard" / "src" / archivo)
    for archivo in sorted((TABLERO / "src" / "ui").glob("*.tsx")):
        shutil.copyfile(archivo, destino / "dashboard" / "src" / "ui" / archivo.name)
    shutil.copyfile(RAIZ / "marketing_customer_project" / "src" / "export_dashboard_artifacts.py", destino / "exportador" / "export_dashboard_artifacts.py")
    (destino / "analisis").mkdir(parents=True, exist_ok=True)
    for archivo in [
        "robust_propensity_validation.py",
        "validate_behavior_segments.py",
        "response_propensity.py",
        "plan_segment_campaign_experiment.py",
        "behavior_segments.py",
        "uplift_baseline.py",
        "criteo_full_reference_benchmark.py",
        "audit_criteo_uplift.py",
    ]:
        origen = RAIZ / "marketing_customer_project" / "src" / archivo
        if origen.exists():
            shutil.copyfile(origen, destino / "analisis" / archivo)
    (destino / "sitio" / "analisis").mkdir(parents=True, exist_ok=True)
    for archivo in ["export_weekly_dashboard.py", "export_dashboard.py"]:
        origen = RAIZ / "marketing_customer_project" / "src" / archivo
        if origen.exists():
            shutil.copyfile(origen, destino / "sitio" / "analisis" / archivo)
    montaje_semanal = RAIZ / "dist" / "projects" / "clientes-en-movimiento.js"
    if montaje_semanal.exists():
        shutil.copyfile(montaje_semanal, destino / "sitio" / "projects" / "clientes-en-movimiento.js")
    for herramienta in ["auditar-visual.mjs", "medir-auditoria.mjs", "auditar_datos.py", "auditar_entrega.py"]:
        shutil.copyfile(TABLERO / "tools" / herramienta, destino / "herramientas" / herramienta)
    montaje = RAIZ / "dist" / "projects" / "clientes-campanas.js"
    if montaje.exists():
        shutil.copyfile(montaje, destino / "sitio" / "projects" / "clientes-campanas.js")


def copiar_reproduccion(salida: Path) -> None:
    destino = salida / "reproduccion"
    destino.mkdir(parents=True, exist_ok=True)
    for archivo in ["package.json", "vite.config.ts", "tsconfig.json"]:
        shutil.copyfile(TABLERO / archivo, destino / archivo)
    (destino / "requirements.txt").write_text(
        "# Python 3.12 (probado en esta sesión)\n"
        "pandas==3.0.3\n"
        "numpy==2.2.6\n"
        "scikit-learn==1.9.0\n"
        "scipy==1.17.1\n"
        "pyreadr==0.5.9\n",
        encoding="utf-8",
    )
    (destino / "comandos.md").write_text(
        """# Cómo reproducir las capturas y los datos

Todo se ejecuta en local. Nada de esto publica en remoto.

## 1. Servir el portafolio

```powershell
cd D:\\Portafolio\\Portafolio_Hugo_Aguilar\\dist
python -m http.server 8000 --bind 127.0.0.1
```

Comprobar que responde `http://127.0.0.1:8000/index.html` y que los datos del tablero están en
`http://127.0.0.1:8000/dashboards/clientes-campanas/data/manifiesto.json`.

## 2. Reconstruir el tablero (opcional: el bundle ya está compilado)

```powershell
cd D:\\Portafolio\\Portafolio_Hugo_Aguilar\\dashboards\\clientes-campanas
npm ci
npm run build          # tsc --noEmit && vite build → dist/dashboards/clientes-campanas
```

## 3. Capturas (45+ imágenes, estados con filtros y vistas móviles)

```powershell
node tools/auditar-visual.mjs "D:\\Portafolio\\Portafolio_Hugo_Aguilar\\evidencias\\clientes-campanas\\auditoria"
```

Requiere Playwright: si no está en esta carpeta, se resuelve desde
`dashboards/atlas-comercial/node_modules` (el script lo intenta primero como dependencia local).

## 4. Mediciones de layout (etiquetas cortadas, solapes, huecos)

```powershell
node tools/medir-auditoria.mjs "D:\\Portafolio\\Portafolio_Hugo_Aguilar\\evidencias\\clientes-campanas\\auditoria"
```

## 5. Exportar los datos reales de cada gráfica

```powershell
python tools/auditar_datos.py "D:\\Portafolio\\Portafolio_Hugo_Aguilar\\evidencias\\clientes-campanas\\auditoria"
```

## 6. Regenerar el paquete (inventario, informe, galería y ZIP)

```powershell
python tools/auditar_entrega.py "D:\\Portafolio\\Portafolio_Hugo_Aguilar\\evidencias\\clientes-campanas\\auditoria" "D:\\Portafolio\\Portafolio_Hugo_Aguilar\\entregas"
```

## 7. Reconstruir los artefactos del tablero (solo si se parte de los datos crudos)

```powershell
cd D:\\Portafolio\\Portafolio_Hugo_Aguilar\\marketing_customer_project
python src/export_dashboard_artifacts.py
python -m pytest tests/test_artefactos.py -q     # 18 pruebas
```

## Notas de fidelidad

- Las capturas se toman con el tablero servido, no con maquetas: cualquier cambio de diseño cambia las imágenes.
- Los CSV de `datos_graficas/*_datos_reales.csv` salen de los artefactos sin redondear; los `*_puntos.csv` y
  `*_curvas.csv` conservan además la geometría dibujada en píxeles para poder comprobar que la captura coincide con los datos.
- `00_mediciones_layout.json` es la única fuente de las cifras de desbordamiento y solape del informe.
""",
        encoding="utf-8",
    )


def escribir_leeme(salida: Path, manifiesto: dict) -> None:
    texto = f"""# Clientes y campañas · auditoría visual

Paquete de auditoría del tablero **«Clientes y campañas»** (Customer Growth Intelligence) del portafolio.
No se ha rediseñado nada: el objetivo era documentar y medir lo que existe antes de proponer mejoras.

- Capturas reales: **{len(manifiesto.get('capturas', []))}** (6 pantallas, una por visualización, estados con filtros cambiados y vistas de 390 px).
- Visualizaciones inventariadas: **{len(INVENTARIO)}** ({len([i for i in INVENTARIO if i['estado'] == 'implementada'])} en la interfaz, {len([i for i in INVENTARIO if i['estado'] == 'solo en análisis'])} solo en análisis, {len([i for i in INVENTARIO if i['estado'] not in ('implementada', 'solo en análisis')])} fuera de alcance documentado).
- Datos exportados sin redondear: **{len(list((salida / 'datos_graficas').glob('*')))}** archivos en `datos_graficas/`.

## Qué abrir primero

1. `galeria.html` — recorrido visual: captura, pregunta de negocio, fuente y enlaces relativos a datos y código. Se abre con doble clic, sin servidor.
2. `informe_auditoria.md` — problemas verificados (con medición) y sugerencias separadas.
3. `inventario_visualizaciones.csv` — una fila por visualización con todas sus variables, escalas, fuente, filtros, componente y estado.

## Cómo está organizado

```
{ NOMBRE_PAQUETE }/
├── LEEME.md                       este archivo
├── inventario_visualizaciones.csv inventario completo
├── informe_auditoria.md           auditoría (verificado frente a sugerido)
├── galeria.html                   galería autónoma con enlaces relativos
├── capturas/                      capturas reales de la app servida
├── datos_graficas/                datos de cada gráfica (CSV/JSON) + diccionario + procedencia
├── codigo/                        código que genera las visualizaciones
└── reproduccion/                  comandos, dependencias y configuración exacta
```

## Cómo leer los datos

- `*_datos_reales.csv` → valores de los artefactos de origen, sin redondear (la unidad está en `datos_graficas/diccionario_campos.csv`).
- `*_puntos.csv`, `*_curvas.csv`, `*.json` → geometría dibujada en el SVG (píxeles) y textos tal como los pinta la interfaz; sirven para comprobar que la captura coincide con los datos.
- `00_mediciones_layout.json` → desbordamientos, solapes y huecos medidos en el DOM servido.
- `procedencia_datos.csv` → para cada archivo: origen, corte, filtros de la captura y unidad de observación.

Las curvas de propensión, calibración y uplift se entregan como **puntos reales** (101, 10 y 100 puntos por serie), no como reconstrucciones a partir de una métrica agregada.

## Límites

- Las cifras de Criteo provienen de los informes ya publicados del paquete; no se reentrenó ningún modelo.
- Los bloques de análisis que no tienen gráfica se entregan como datos con su bloqueador declarado, no como capturas inventadas.
- «Clientes en movimiento» es otro tablero (otro pipeline y otras pantallas) y queda fuera de alcance; se documenta la separación para no mezclar poblaciones.
"""
    (salida / "LEEME.md").write_text(texto, encoding="utf-8")


def empaquetar(salida: Path, entregas: Path) -> Path:
    entregas.mkdir(parents=True, exist_ok=True)
    destino = entregas / f"{NOMBRE_PAQUETE}.zip"
    if destino.exists():
        destino.unlink()
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as paquete:
        for ruta in sorted(salida.rglob("*")):
            if ruta.is_dir():
                continue
            relativa = ruta.relative_to(salida)
            paquete.write(ruta, f"{NOMBRE_PAQUETE}/{relativa.as_posix()}")
    return destino


def main(salida: Path, entregas: Path) -> int:
    manifiesto = leer_json(salida / "manifiesto_capturas.json")
    mediciones = resumen_mediciones(salida)
    escribir_inventario(salida)
    escribir_informe(salida, manifiesto, mediciones)
    construir_galeria(salida, manifiesto)
    copiar_codigo(salida)
    copiar_reproduccion(salida)
    escribir_leeme(salida, manifiesto)
    paquete = empaquetar(salida, entregas)
    print(f"inventario: {len(INVENTARIO)} filas")
    print(f"paquete: {paquete} ({paquete.stat().st_size / 1024 / 1024:.2f} MB)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("uso: python tools/auditar_entrega.py <carpeta_auditoria> [carpeta_entregas]")
    destino_salida = Path(sys.argv[1]).resolve()
    destino_entregas = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else RAIZ / "entregas"
    raise SystemExit(main(destino_salida, destino_entregas))

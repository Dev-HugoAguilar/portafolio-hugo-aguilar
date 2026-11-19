# Contrato de la API — Dashboard de rentabilidad comercial (dataset sintético)

> **Este contrato corresponde al dashboard de demostración con datos
> SINTÉTICOS** (`demo_rentabilidad_2024_2025`), marcado como exclusivo de
> desarrollo y pruebas: no se carga automáticamente ni se usa como respaldo de los
> endpoints con datos reales. El dashboard con **datos públicos reales** de la
> CNBV se documenta en
> [`CNBV-COMPARATIVO-BANCARIO.md`](./CNBV-COMPARATIVO-BANCARIO.md).

Documento de referencia para consumir la API desde el frontend del portafolio.
Describe **qué se mide**, **con qué convenciones** y **qué se recibe**, además de
ejemplos de consumo con JavaScript sin dependencias (el sitio es HTML/CSS/JS
estático, sin build).

* Base local: `http://127.0.0.1:8001/api/v1` (Docker Compose) o
  `http://127.0.0.1:8000/api/v1` (uvicorn directo).
* OpenAPI en vivo: `/api/docs` · esquema: `/api/openapi.json`
* Implementación y puesta en marcha: [`backend/README.md`](../backend/README.md)

---

## 1. Alcance

Un registro = **una línea de pedido** de venta. Sobre ese grano se calculan todas
las métricas. Todo se agrega en MongoDB; la API nunca descarga la colección.

Incluido: ventas (brutas y netas), descuentos, coste de ventas, margen bruto y
margen %, comparación entre periodos, desglose por región/canal/producto/cliente,
filtros interconectados, tabla de detalle paginada y exportación CSV.

**Fuera de alcance (y por tanto no se devuelve):** utilidad operativa o cualquier
margen que dependa de gastos operativos, impuestos, devoluciones, multimoneda,
compras/inventario, proyecciones y modelos predictivos.

---

## 2. Convenciones

| Tema | Regla |
|---|---|
| Dinero | Entero en **centavos**, campo con sufijo `_cent`. `1899900` = 18 999,00 MXN. |
| Moneda | Única: `MXN`, declarada en `dataset.moneda` y en `meta.moneda`. |
| Porcentajes | En **puntos** (0–100), 2 decimales, campo sin sufijo: `margen_pct: 26.34`. |
| Nulos | `margen_pct` es `null` cuando la venta neta es 0. Nunca se devuelve 0 "inventado". |
| Fechas | Días naturales en **UTC**, `AAAA-MM-DD`, inclusivos en ambos extremos. |
| Identificadores | Slugs en minúsculas: `^[a-z0-9][a-z0-9_-]{0,63}$`. |
| Versión | Cada respuesta incluye `dataset_version` para poder detectar recargas. |
| Orden de listas | Determinista: los desgloses van por venta neta descendente; las opciones por conteo descendente. |

### 2.1 Por qué centavos

Los importes se guardan como enteros y las sumas son exactas. El único redondeo
ocurre al calcular porcentajes (mitad hacia arriba, 2 decimales) y al calcular el
ticket medio. Un importe nunca se devuelve como `float`.

---

## 3. Definiciones de las métricas

Todas se calculan con las mismas fórmulas en todos los endpoints.

```
venta_bruta   = cantidad × precio_unitario
descuento     = descuento monetario de la línea
venta_neta    = venta_bruta − descuento
coste_ventas  = cantidad × coste_unitario
margen_bruto  = venta_neta − coste_ventas
margen_pct    = 100 × margen_bruto / venta_neta        (null si venta_neta = 0)
ticket_medio  = venta_neta total / número de pedidos   (null si no hay pedidos)
```

Reglas clave:

1. **Los porcentajes agregados salen de sumas**, nunca del promedio de los
   porcentajes de línea:
   `margen_pct_agregado = 100 · Σ margen_bruto / Σ venta_neta`.
2. **Un pedido** es un `pedido_id` distinto. Un cliente es un `cliente_id`
   distinto. Ambos son conteos de los datos filtrados.
3. **No se mezclan impuestos**: la venta neta no los incluye.
4. **Sin devoluciones** en esta versión: no hay líneas negativas.

### 3.1 Ejemplo verificable con la API

Datos del dashboard para `region=norte`, `channel=retail`, noviembre de 2025:

| Concepto | Valor (centavos) |
|---|---|
| `venta_bruta_cent` | 91 262 704 |
| `descuento_cent` | 5 511 440 |
| `venta_neta_cent` | 85 751 264 |
| `coste_cent` | 63 161 280 |
| `margen_cent` | 22 589 984 |
| `margen_pct` | 26.34 |

Comprobación:
`91 262 704 − 5 511 440 = 85 751 264` · `85 751 264 − 63 161 280 = 22 589 984` ·
`100 · 22 589 984 / 85 751 264 = 26,343… → 26.34`.

---

## 4. Periodo y comparación

* **Periodo actual**: el rango `date_from`–`date_to` solicitado (inclusivo).
  Si no se envían fechas, se usan los últimos `default_range_days` (365) días
  terminando en la última fecha del dataset.
* **Periodo anterior**: bloque de **igual número de días** inmediatamente
  anterior. Con `dias = date_to − date_from + 1`:
  `hasta_ant = date_from − 1 día`, `desde_ant = hasta_ant − (dias − 1)`.
  Así, un mes de 31 días se compara con los 31 días previos y un rango de 30 días
  con los 30 días previos.
* La comparación **conserva los filtros de negocio** y solo cambia las fechas.
* Si no se puede calcular, `variacion_*` es `null` y `comparacion.motivo` explica
  por qué:

| `motivo` | Significado |
|---|---|
| `sin_datos_actuales` | El periodo actual no tiene líneas. |
| `sin_cobertura_periodo_anterior` | El periodo anterior cae fuera del dataset. |
| `base_cero` | El periodo anterior no tiene datos o su venta neta es 0. |

Variaciones devueltas: `variacion_venta_neta_pct`, `variacion_margen_pct`
(relativas, en %) y `variacion_margen_pt` (diferencia en puntos porcentuales).

---

## 5. Filtros

Parámetros comunes a `summary`, `sales` y `sales.csv`:

| Parámetro | Tipo | Reglas |
|---|---|---|
| `dataset_id` | string | Slug. Opcional si solo hay un dataset cargado. |
| `date_from`, `date_to` | fecha `AAAA-MM-DD` | Dentro del periodo del dataset, `date_from ≤ date_to`, máximo 2.000 días. |
| `region` | lista | Multi-valor. Repetir el parámetro para varios valores. |
| `channel` | lista | Multi-valor. |
| `category` | lista | Multi-valor. |
| `product` | lista | Multi-valor (usa `producto_id`). |
| `customer` | lista | Multi-valor (usa `cliente_id`). |

Normalización aplicada antes de consultar: recorte de espacios, minúsculas,
eliminación de vacíos, deduplicación y orden alfabético. Máximo 50 valores por
dimensión. Ejemplo: `?region=Norte&region=sur` → `regions: ["norte","sur"]`.

Los filtros aplicados se devuelven normalizados en `filtros`, de modo que el
cliente puede sincronizar su estado con lo que realmente se consultó.

### 5.1 Opciones dependientes (`opciones_filtros`)

Para cada dimensión se calculan las opciones aplicando **el resto** de filtros y
excluyendo el de la propia dimensión:

```
opciones(región)   = todo lo filtrado por canal, categoría, producto y cliente
opciones(canal)    = todo lo filtrado por región, categoría, producto y cliente
opciones(categoría)= ...
```

Así el usuario nunca ve una combinación que lleve a 0 resultados "por sorpresa",
y cada `conteo` indica cuántas líneas quedarían al elegir ese valor.

Una **selección activa se mantiene siempre visible**, aunque con los filtros
actuales no tenga filas: aparecerá con `conteo: 0` y `seleccionado: true`, para
que el usuario pueda quitarla.

> `por_region` y `por_canal` son distintos: reflejan los datos **ya filtrados**
> (si filtras por `region=norte`, el desglose por región solo trae `norte`).

---

## 6. Endpoints

### 6.1 `GET /health/live`

```json
{ "status": "ok", "version": "1.0.0" }
```

No toca MongoDB. Sirve para saber si el proceso está vivo.

### 6.2 `GET /health/ready`

```json
{ "status": "ready", "mongo": "ok", "version": "1.0.0" }
```

Comprueba `ping` contra MongoDB. Si falla, responde **503** con
`{"status":"unavailable","mongo":"down","version":"1.0.0"}`. No expone
credenciales, hosts internos ni versiones de servidor.

### 6.3 `GET /datasets`

Catálogo de conjuntos de datos disponibles.

```json
[
  {
    "dataset_id": "demo_rentabilidad_2024_2025",
    "nombre": "Rentabilidad comercial 2024-2025 (sintético)",
    "descripcion": "Detalle de líneas de venta de una empresa ficticia de tecnología…",
    "origen": "sintetico",
    "moneda": "MXN",
    "dataset_version": 1,
    "esquema_version": "1.0.0",
    "periodo": { "desde": "2024-01-01", "hasta": "2025-12-31", "dias": 731 },
    "filas": 30000,
    "pedidos": 16052,
    "clientes": 120,
    "productos": 25,
    "semilla": 20260401,
    "generado_en": "2026-11-04T18:47:17.226000Z",
    "inmutable": true,
    "advertencia": "Datos sintéticos de demostración. No representan información real de ninguna empresa."
  }
]
```

`GET /datasets/{dataset_id}` devuelve el mismo objeto o **404**.

### 6.4 `GET /dashboards/profitability/summary`

Todo el resumen del dashboard en una sola llamada.

**Ejemplo**: `?region=norte&channel=retail&date_from=2025-11-01&date_to=2025-11-30`

```json
{
  "dataset": {
    "dataset_id": "demo_rentabilidad_2024_2025",
    "dataset_version": 1,
    "esquema_version": "1.0.0",
    "origen": "sintetico",
    "moneda": "MXN"
  },
  "dataset_version": 1,
  "filtros": {
    "dataset_id": "demo_rentabilidad_2024_2025",
    "date_from": "2025-11-01",
    "date_to": "2025-11-30",
    "regions": ["norte"],
    "channels": ["retail"],
    "categories": [],
    "products": [],
    "customers": []
  },
  "periodo": { "desde": "2025-11-01", "hasta": "2025-11-30", "dias": 30 },
  "kpis": {
    "lineas": 110,
    "pedidos": 59,
    "clientes": 17,
    "unidades": 174,
    "venta_bruta_cent": 91262704,
    "descuento_cent": 5511440,
    "venta_neta_cent": 85751264,
    "coste_cent": 63161280,
    "margen_cent": 22589984,
    "margen_pct": 26.34,
    "ticket_medio_cent": 1453411
  },
  "comparacion": {
    "periodo": { "desde": "2025-10-02", "hasta": "2025-10-31", "dias": 30 },
    "kpis": {
      "lineas": 99,
      "pedidos": 52,
      "clientes": 18,
      "unidades": 136,
      "venta_bruta_cent": 89680656,
      "descuento_cent": 3751662,
      "venta_neta_cent": 85928994,
      "coste_cent": 62649600,
      "margen_cent": 23279394,
      "margen_pct": 27.09,
      "ticket_medio_cent": 1652481
    },
    "variacion_venta_neta_pct": -0.21,
    "variacion_margen_pct": -2.96,
    "variacion_margen_pt": -0.75,
    "motivo": null
  },
  "serie": [
    {
      "periodo": "2025-11",
      "desde": "2025-11-01",
      "hasta": "2025-11-30",
      "lineas": 110,
      "venta_neta_cent": 85751264,
      "margen_cent": 22589984,
      "margen_pct": 26.34
    }
  ],
  "por_region": [
    {
      "valor": "norte",
      "etiqueta": "Norte",
      "lineas": 110,
      "venta_neta_cent": 85751264,
      "margen_cent": 22589984,
      "margen_pct": 26.34
    }
  ],
  "por_canal": [
    {
      "valor": "retail",
      "etiqueta": "Retail",
      "lineas": 110,
      "venta_neta_cent": 85751264,
      "margen_cent": 22589984,
      "margen_pct": 26.34
    }
  ],
  "productos_destacados": [
    {
      "producto_id": "prd_001",
      "nombre": "Laptop Nova 14",
      "categoria": "Cómputo",
      "lineas": 7,
      "unidades": 10,
      "venta_neta_cent": 18677354,
      "margen_cent": 4845354,
      "margen_pct": 25.94
    }
  ],
  "dispersion": [
    {
      "cliente_id": "cli_013",
      "cliente": "Grupo Mirador S. de R.L.",
      "venta_neta_cent": 15808149,
      "margen_cent": 4502309,
      "margen_pct": 28.48
    }
  ],
  "opciones_filtros": {
    "regiones": [
      { "valor": "norte", "etiqueta": "Norte", "conteo": 110, "seleccionado": true },
      { "valor": "centro", "etiqueta": "Centro", "conteo": 95, "seleccionado": false }
    ],
    "canales": [
      { "valor": "mayorista", "etiqueta": "Mayorista", "conteo": 119, "seleccionado": false },
      { "valor": "retail", "etiqueta": "Retail", "conteo": 110, "seleccionado": true }
    ],
    "categorias": [
      { "valor": "perifericos", "etiqueta": "Periféricos", "conteo": 37, "seleccionado": false }
    ],
    "productos": [
      { "valor": "prd_010", "etiqueta": "Dock USB-C 11 en 1", "conteo": 11, "seleccionado": false }
    ],
    "clientes": [
      { "valor": "cli_013", "etiqueta": "Grupo Mirador S. de R.L.", "conteo": 31, "seleccionado": false }
    ]
  },
  "meta": {
    "generado_en": "2026-11-04T19:09:10.398836Z",
    "moneda": "MXN",
    "granularidad": "mes",
    "moneda_nota": "Importes en centavos de MXN; dividir entre 100 para mostrar.",
    "advertencias": [
      "Datos sintéticos de demostración: no representan información real de ninguna empresa.",
      "No se incluyen devoluciones ni impuestos: la venta neta es la venta bruta menos el descuento de línea.",
      "No se calcula utilidad operativa porque no se modelan gastos operativos."
    ]
  }
}
```

Notas de uso:

* `serie` viene ordenada y agrupada por mes (`YYYY-MM`); `desde`/`hasta` están
  recortados al rango solicitado.
* `productos_destacados` trae los 8 productos con más venta neta; `dispersion`
  los 40 clientes con más venta neta (puntos para un gráfico venta vs margen).
* `meta.advertencias` debe mostrarse o registrarse: la UI nunca debe presentar
  estos datos como reales.

### 6.5 `GET /dashboards/profitability/sales`

Detalle paginado con las mismas métricas y filtros.

| Parámetro | Por defecto | Reglas |
|---|---|---|
| `page` | 1 | Entero ≥ 1. Si supera el total, `items` viene vacío. |
| `page_size` | 50 | 1–200. |
| `sort` | `fecha` | `fecha`, `venta_neta_cent`, `margen_cent`, `margen_pct`, `cantidad`, `producto`, `cliente`, `region`, `canal`. |
| `order` | `desc` | `asc` o `desc`. |

El orden es **estable**: siempre se desempata por `linea_id` ascendente, así que
paginar nunca duplica ni omite filas.

```json
{
  "items": [
    {
      "linea_id": "ln00022143",
      "pedido_id": "ped_011886",
      "fecha": "2025-06-17",
      "cliente_id": "cli_008",
      "cliente": "Grupo Roble S. de R.L.",
      "region": "Norte",
      "canal": "Mayorista",
      "producto_id": "prd_002",
      "producto": "Laptop Nova 16 Pro",
      "categoria": "Cómputo",
      "cantidad": 40,
      "precio_unitario_cent": 2911896,
      "descuento_cent": 9446191,
      "coste_unitario_cent": 2080000,
      "venta_bruta_cent": 116475840,
      "venta_neta_cent": 107029649,
      "coste_cent": 83200000,
      "margen_cent": 23829649,
      "margen_pct": 22.26,
      "moneda": "MXN"
    }
  ],
  "total": 15000,
  "page": 1,
  "page_size": 1,
  "pages": 15000,
  "orden": { "campo": "venta_neta_cent", "direccion": "desc" },
  "dataset": { "dataset_id": "demo_rentabilidad_2024_2025", "dataset_version": 1, "esquema_version": "1.0.0", "origen": "sintetico", "moneda": "MXN" },
  "dataset_version": 1,
  "filtros": { "…": "igual que en el resumen" },
  "meta": { "…": "igual que en el resumen" }
}
```

La coherencia con el resumen es exacta: sumando los importes de todas las
páginas se obtienen los KPIs del resumen con los mismos filtros (hay una prueba
automatizada que lo verifica).

### 6.6 `GET /dashboards/profitability/sales.csv`

Exportación del detalle con **los mismos filtros** y el mismo orden.

* Cabeceras HTTP: `X-Dataset-Id`, `X-Dataset-Version`, `X-Total-Filas`, `X-Moneda`
  y `Content-Disposition: attachment`.
* Codificación UTF-8 con BOM (Excel abre bien los acentos) y saltos `CRLF`.
* **Límite de filas** `max_export_rows` (50.000 por defecto). Si el filtro lo
  supera, responde **413** con un mensaje que pide acotar el rango; nunca trunca
  en silencio.
* Columnas, en orden:
  `linea_id, pedido_id, fecha, cliente_id, cliente, region, canal, producto_id,
  producto, categoria, cantidad, precio_unitario_cent, descuento_cent,
  coste_unitario_cent, venta_bruta_cent, venta_neta_cent, coste_cent,
  margen_cent, margen_pct, moneda`
* `margen_pct` vacío cuando no es calculable.
* **Protección contra inyección de fórmulas**: si una celda **de texto** empieza
  por `=`, `+`, `-`, `@`, tabulador o retorno de carro, se antepone un apóstrofo
  (`'=SUM(A1)` → `'=SUM(A1)`). Las celdas numéricas no se tocan, para que los
  importes negativos sigan siendo números.

---

## 7. Errores

Formato uniforme de FastAPI:

```json
{ "detail": "date_from no puede ser posterior a date_to." }
```

o, para errores de validación de parámetros:

```json
{ "detail": [ { "type": "value_error", "loc": ["regions"], "msg": "Value error, valor de filtro no válido: 'Norte!'", "input": ["Norte!"] } ] }
```

| Código | Cuándo |
|---|---|
| 200 | Correcto. |
| 404 | `dataset_id` inexistente. |
| 405 | Se intenta un método de escritura (la API es de solo lectura). |
| 413 | La exportación supera `max_export_rows`. |
| 422 | Fechas incoherentes o fuera del dataset, rango demasiado amplio, `page_size` excesivo, valores de filtro inválidos o más de 50 valores por dimensión. |
| 500 | Error no previsto (queda en el log del servidor, no en la respuesta). |
| 503 | `health/ready` con MongoDB caído. |

---

## 8. Ejemplos de consumo (JavaScript sin dependencias)

El sitio es HTML/CSS/JS estático: los ejemplos usan `fetch` y el DOM, sin build ni
frameworks.

### 8.1 Estado y construcción de la consulta

```js
const API = 'http://127.0.0.1:8001/api/v1';
const DIMENSIONES = ['region', 'channel', 'category', 'product', 'customer'];

const estado = {
  dataset_id: 'demo_rentabilidad_2024_2025',
  date_from: '2025-01-01',
  date_to: '2025-12-31',
  region: [], channel: [], category: [], product: [], customer: [],
  page: 1, page_size: 25, sort: 'venta_neta_cent', order: 'desc',
};

function aQuery(estado, { paginar = false } = {}) {
  const p = new URLSearchParams();
  p.set('dataset_id', estado.dataset_id);
  if (estado.date_from) p.set('date_from', estado.date_from);
  if (estado.date_to) p.set('date_to', estado.date_to);
  for (const dim of DIMENSIONES) {
    for (const valor of estado[dim] ?? []) p.append(dim, valor); // multi-valor
  }
  if (paginar) {
    p.set('page', estado.page);
    p.set('page_size', estado.page_size);
    p.set('sort', estado.sort);
    p.set('order', estado.order);
  }
  return p.toString();
}
```

### 8.2 Cargar el resumen

```js
async function cargarResumen(estado) {
  const url = `${API}/dashboards/profitability/summary?${aQuery(estado)}`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new Error(typeof cuerpo.detail === 'string' ? cuerpo.detail : 'Error al consultar el resumen');
  }
  return respuesta.json(); // ver §6.4
}
```

### 8.3 Formato de importes y porcentajes

```js
const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
});
const importe = (cent) => mxn.format((cent ?? 0) / 100);   // centavos -> MXN
const pct = (valor) => (valor == null ? '—' : `${valor.toFixed(2)} %`);
const compacto = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });
```

### 8.4 KPIs y comparación

```js
function pintarKpis(datos) {
  const { kpis, comparacion } = datos;
  document.querySelector('[data-kpi="venta-neta"]').textContent = importe(kpis.venta_neta_cent);
  document.querySelector('[data-kpi="margen"]').textContent = importe(kpis.margen_cent);
  document.querySelector('[data-kpi="margen-pct"]').textContent = pct(kpis.margen_pct);
  document.querySelector('[data-kpi="ticket"]').textContent = importe(kpis.ticket_medio_cent);

  const motivo = comparacion.motivo;
  const etiqueta = {
    sin_datos_actuales: 'Sin datos en el periodo',
    sin_cobertura_periodo_anterior: 'Sin periodo anterior comparable',
    base_cero: 'Periodo anterior sin venta neta',
  }[motivo];

  document.querySelector('[data-kpi="variacion"]').textContent =
    comparacion.variacion_venta_neta_pct == null
      ? (etiqueta ?? '—')
      : `${comparacion.variacion_venta_neta_pct > 0 ? '+' : ''}${comparacion.variacion_venta_neta_pct.toFixed(2)} % vs. periodo anterior`;
}
```

### 8.5 Filtros dependientes

```js
const ETIQUETAS = {
  region: 'regiones', channel: 'canales', category: 'categorias',
  product: 'productos', customer: 'clientes',
};

function pintarFiltros(opciones) {
  for (const [dim, campo] of Object.entries(ETIQUETAS)) {
    const contenedor = document.querySelector(`[data-filtro="${dim}"]`);
    contenedor.replaceChildren(
      ...opciones[campo].map((opcion) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = opcion.valor;
        input.checked = opcion.seleccionado;
        input.addEventListener('change', () => alternar(dim, opcion.valor, input.checked));
        const texto = document.createElement('span');
        // conteo 0 = selección activa que con los filtros actuales no tiene filas
        texto.textContent = `${opcion.etiqueta} (${opcion.conteo})`;
        if (opcion.conteo === 0) label.title = 'Sin filas con los filtros actuales';
        label.append(input, texto);
        return label;
      }),
    );
  }
}

function alternar(dim, valor, activo) {
  const lista = new Set(estado[dim]);
  activo ? lista.add(valor) : lista.delete(valor);
  estado[dim] = [...lista];
  estado.page = 1;
  actualizar(); // vuelve a pedir resumen + detalle con los nuevos filtros
}
```

### 8.6 Gráfico de barras con SVG en línea (ejemplo mínimo)

```js
function barras(contenedor, filas) {
  const ancho = 480, alto = 24 * filas.length, max = Math.max(...filas.map((f) => f.venta_neta_cent));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Venta neta por región');

  filas.forEach((fila, i) => {
    const largo = Math.max(2, (fila.venta_neta_cent / max) * (ancho - 140));
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', 100);
    rect.setAttribute('y', i * 24 + 4);
    rect.setAttribute('width', largo);
    rect.setAttribute('height', 16);
    rect.setAttribute('fill', '#2563eb');
    const texto = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    texto.setAttribute('x', 96);
    texto.setAttribute('y', i * 24 + 16);
    texto.setAttribute('text-anchor', 'end');
    texto.setAttribute('font-size', '11');
    texto.textContent = fila.etiqueta;
    svg.append(rect, texto);
  });
  contenedor.replaceChildren(svg);
}

barras(document.querySelector('[data-grafico="regiones"]'), datos.por_region);
```

### 8.7 Tabla de detalle con paginación

```js
async function cargarDetalle(estado) {
  const url = `${API}/dashboards/profitability/sales?${aQuery(estado, { paginar: true })}`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error('Error al consultar el detalle');
  return respuesta.json();
}

function pintarTabla(pagina) {
  const cuerpo = document.querySelector('[data-tabla="detalle"] tbody');
  cuerpo.replaceChildren(
    ...pagina.items.map((linea) => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${linea.fecha}</td>
        <td>${linea.cliente}</td>
        <td>${linea.producto}</td>
        <td>${linea.cantidad}</td>
        <td>${importe(linea.venta_neta_cent)}</td>
        <td>${importe(linea.margen_cent)}</td>
        <td>${pct(linea.margen_pct)}</td>`;
      return fila;
    }),
  );
  document.querySelector('[data-paginacion="resumen"]').textContent =
    `Página ${pagina.page} de ${pagina.pages} · ${pagina.total} líneas`;
}
```

### 8.8 Descargar el CSV

```js
function enlaceCsv(estado) {
  // El navegador descarga y respeta Content-Disposition.
  return `${API}/dashboards/profitability/sales.csv?${aQuery(estado, { paginar: true })}`;
}
document.querySelector('[data-accion="exportar"]').href = enlaceCsv(estado);
```

Si la exportación supera el límite, el `href` devolverá 413: conviene ofrecer un
botón que primero consulte `total` en `/sales?page_size=1` y avise al usuario.

### 8.9 Datos vacíos o no comparables

```js
if (datos.kpis.lineas === 0) {
  mostrar('Sin resultados para los filtros elegidos. Prueba a quitar alguno.');
}
if (datos.kpis.margen_pct === null) {
  mostrar('Margen no calculable: la venta neta del periodo es 0.');
}
```

Nunca se debe interpretar `null` como 0: significa "no calculable".

---

## 9. Rendimiento y consistencia

* Todas las agregaciones se ejecutan **en MongoDB** (`$match`, `$group`,
  `$project`, `$facet`) con `allowDiskUse` y `maxTimeMS`. La API no trae la
  colección a Python.
* Un único índice compuesto `sales(dataset_id, fecha)` cubre las consultas
  implementadas. Se verifica con `explain` que la consulta representativa use
  `IXSCAN` y no `COLLSCAN` (prueba automatizada).
* El resumen completo se resuelve en **una** agregación con `$facet` (totales,
  serie, regiones, canales, productos y clientes) más una segunda para las
  opciones de filtro y una tercera para el periodo anterior.
* Las etiquetas de una selección que se ha quedado sin filas se buscan **solo**
  para esos valores concretos, nunca recorriendo el dataset entero.
* Las ramas de un `$facet` **no** son una instantánea transaccional. Es
  aceptable porque el dataset es **inmutable**: no hay escrituras concurrentes.
  Si en el futuro se cargan datos en caliente, habrá que revisarlo.
* Toda respuesta incluye `dataset_version` y `filtros` ya normalizados, para que
  el cliente pueda detectar recargas o divergencias de estado.

### 9.1 Tiempos medidos

Medición local con 30.000 líneas (MongoDB 8.2 en el mismo equipo, cliente en
caliente, mejor de 5 ejecuciones):

| Petición | Tiempo | Tamaño |
|---|---|---|
| `summary` con 365 días (~15.800 líneas) | ~0,65 s | 25 KB |
| `summary` con 24 meses (30.000 líneas) | ~1,1 s | 27 KB |
| `summary` filtrado por región + canal + categoría | ~0,55 s | 17 KB |
| `summary` con un mes | ~0,27 s | 23 KB |
| `sales` con `page_size=50` | ~0,05 s | 24 KB |
| `sales` ordenado por margen, 200 filas | ~0,06 s | 95 KB |
| `sales.csv` de un mes | ~0,04 s | 229 KB |
| `sales.csv` de 24 meses (30.000 filas) | ~0,85 s | 5,4 MB |
| `health/live` | ~0,002 s | 33 B |

Desglose del `summary` de 365 días: `~215 ms` en el `$facet` del resumen,
`~230 ms` en el `$facet` de opciones, `~45 ms` en el periodo anterior y el resto
en serialización. El orden del detalle desempata siempre por `linea_id`, lo que
obliga a ordenar en memoria cuando el campo no es `fecha`: es el precio de que
paginar no duplique ni omita filas, y a este volumen sigue siendo decenas de
milisegundos.

Si el volumen crece, el siguiente paso es materializar agregados mensuales por
dataset y dimensión (y quizá un índice por dimensión), no añadir otro motor.


---

## 10. Qué falta para publicar (fuera de esta fase)

1. Autenticación de cliente y cuotas de consulta.
2. TLS en el borde y backend sin puerto publicado.
3. Límite de tasa y auditoría de consultas.
4. Gestión de secretos fuera del sistema de archivos (Vault, SSM, etc.).
5. Preagregados mensuales si el volumen crece mucho más allá de 30.000 líneas.
6. Multicurrency, impuestos y devoluciones, si el negocio lo pide.

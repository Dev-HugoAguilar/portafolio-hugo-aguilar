/* ==========================================================================
   ESCENAS DEL PORTAFOLIO — HUGO AGUILAR
   --------------------------------------------------------------------------
   Cinco ilustraciones animadas en SVG, una por área del portafolio.
   Son escenas CONCEPTUALES: explican la idea de cada especialidad con un
   ejemplo fijo. No representan datos reales, resultados medidos ni actividad
   de ningún proyecto publicado.

   API
     window.PORTFOLIO_SCENES.build(kind, host, options)
       kind    'dashboards' | 'modelos' | 'pipeline' | 'rag' | 'agentes'
       host    contenedor de la portada (.cover)
       options { label, reduced }   texto accesible y arranque sin movimiento
       devuelve {
         duration,          duración de la secuencia en ms (3–4.6 s)
         render(t),         dibuja el estado para t ms (0..duration)
         pointer(punto),    {x, y} en unidades del viewBox, o null
         focus(id),         id de una parada de teclado, o null
         hits,              paradas enfocables: [{ id, node }]
         reset()            vuelve al estado estable final
       }

     render(0)         composición inicial comprensible, sin movimiento
     render(duration)  resultado final; se mantiene al terminar

   Decisiones
     - Todo son SVG planos + requestAnimationFrame. Sin librerías, sin filtros
       y sin animaciones continuas: el reproductor de app.js decide cuándo.
     - Los datos de ejemplo son constantes escritas aquí; no se generan valores
       aleatorios en cada render.
     - Las máscaras, degradados y marcadores usan identificadores únicos.
     - Ninguna escena dibuja texto inventado que parezca una cifra real.
     ========================================================================== */

window.PORTFOLIO_SCENES = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /* Paleta aprobada: mismos valores que los tokens de style.css */
  var C = {
    ink: '#111318',
    secondary: '#596273',
    border: '#DDE2EB',
    primary: '#3458F5',
    purple: '#8066E8',
    teal: '#087F8C',
    surface: '#FFFFFF',
    bg: '#F7F8FC',
    grid: '#E4E8F0'
  };

  /* ---- utilidades compartidas ---- */

  var seq = 0;
  function uid(prefix) { seq += 1; return prefix + '-' + seq; }

  function el(tag, attrs) {
    var node = document.createElementNS(NS, tag);
    if (attrs) {
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, attrs[key]);
      }
    }
    return node;
  }

  function add(parent, tag, attrs) {
    var node = el(tag, attrs);
    parent.appendChild(node);
    return node;
  }

  /* Texto: la clase decide tipografía y tamaño (ver style.css) */
  function text(parent, x, y, content, options) {
    var opts = options || {};
    var node = add(parent, 'text', {
      x: x,
      y: y,
      'class': 'scene-' + (opts.cls || 'label'),
      fill: opts.fill || C.secondary,
      'text-anchor': opts.anchor || 'start'
    });
    if (opts.opacity != null) node.setAttribute('opacity', opts.opacity);
    node.textContent = content;
    return node;
  }

  function line(parent, x1, y1, x2, y2, options) {
    var opts = options || {};
    return add(parent, 'line', {
      x1: r(x1), y1: r(y1), x2: r(x2), y2: r(y2),
      stroke: opts.stroke || C.border,
      'stroke-width': opts.width == null ? 1 : opts.width,
      'stroke-linecap': opts.cap || 'round',
      'stroke-dasharray': opts.dash || 'none',
      'stroke-opacity': opts.opacity == null ? 1 : opts.opacity
    });
  }

  function rect(parent, x, y, w, h, options) {
    var opts = options || {};
    return add(parent, 'rect', {
      x: r(x), y: r(y), width: r(w), height: r(h),
      rx: opts.radius == null ? 4 : opts.radius,
      fill: opts.fill || C.surface,
      stroke: opts.stroke || 'none',
      'stroke-width': opts.width == null ? 1 : opts.width,
      'fill-opacity': opts.fillOpacity == null ? 1 : opts.fillOpacity,
      'stroke-opacity': opts.strokeOpacity == null ? 1 : opts.strokeOpacity
    });
  }

  function circle(parent, cx, cy, radius, options) {
    var opts = options || {};
    return add(parent, 'circle', {
      cx: r(cx), cy: r(cy), r: r(radius),
      fill: opts.fill || C.surface,
      stroke: opts.stroke || 'none',
      'stroke-width': opts.width == null ? 1 : opts.width,
      'fill-opacity': opts.fillOpacity == null ? 1 : opts.fillOpacity,
      'stroke-opacity': opts.strokeOpacity == null ? 1 : opts.strokeOpacity,
      'stroke-dasharray': opts.dash || 'none'
    });
  }

  function path(parent, d, options) {
    var opts = options || {};
    return add(parent, 'path', {
      d: d,
      fill: opts.fill || 'none',
      stroke: opts.stroke || 'none',
      'stroke-width': opts.width == null ? 1 : opts.width,
      'stroke-linecap': opts.cap || 'round',
      'stroke-linejoin': 'round',
      'fill-opacity': opts.fillOpacity == null ? 1 : opts.fillOpacity,
      'stroke-opacity': opts.strokeOpacity == null ? 1 : opts.strokeOpacity,
      'stroke-dasharray': opts.dash || 'none',
      'stroke-dashoffset': opts.dashOffset || 0,
      opacity: opts.opacity == null ? 1 : opts.opacity
    });
  }

  /* Parada enfocable: un grupo con nombre accesible y una zona invisible que
     app.js mide para responder al cursor. */
  function stop(parent, id, labelText) {
    var group = add(parent, 'g', {
      'class': 'scene-stop',
      tabindex: '0',
      role: 'group',
      'aria-label': labelText,
      'data-stop': id
    });
    return group;
  }

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function span(t, start, end) { return clamp((t - start) / (end - start)); }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function easeInOut(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function r(v) { return Math.round(v * 10) / 10; }

  function linePath(points) {
    var d = '';
    for (var i = 0; i < points.length; i++) {
      d += (i ? 'L' : 'M') + r(points[i].x) + ' ' + r(points[i].y);
    }
    return d;
  }

  /* Trazo que se dibuja solo: el path lleva pathLength="1" y se revela con
     stroke-dashoffset, sin medir longitudes en cada fotograma. */
  function drawable(node, progress) {
    node.setAttribute('stroke-dasharray', '1 1');
    node.setAttribute('stroke-dashoffset', r(1 - clamp(progress)));
  }

  function panel(parent, x, y, w, h) {
    return rect(parent, x, y, w, h, { radius: 6, fill: C.surface, stroke: C.border, width: 1 });
  }

  /* Tira explicativa al pie de la ilustración. Siempre reserva su altura: el
     texto que aparece al enfocar no mueve la tarjeta. */
  function noteStrip(parent, y, className) {
    var box = rect(parent, 22, y, 436, 32, {
      radius: 6, fill: C.bg, stroke: C.border, width: 1
    });
    var node = text(parent, 34, y + 21, '', { cls: className || 'label', fill: C.ink });
    return {
      box: box,
      node: node,
      set: function (message, accent) {
        if (node.textContent !== message) node.textContent = message;
        node.setAttribute('fill', accent ? C.primary : C.ink);
        box.setAttribute('stroke', accent ? C.primary : C.border);
      }
    };
  }

  /* ==========================================================================
     1. DASHBOARDS Y VISUALIZACIÓN
     Indicador, barras y serie temporal mirando al MISMO periodo. La serie se
     dibuja, un cursor vertical recorre sus observaciones y el indicador y las
     barras responden a cada una. Al terminar queda la última observación.
     Con el cursor encima, el recorrido se hace a mano.
     ========================================================================== */

  function sceneDashboards(svg) {
    var DURATION = 4000;
    var layer = add(svg, 'g', { 'class': 'scene-layer' });

    /* Datos de ejemplo: constantes, nunca aleatorias. Índice ilustrativo. */
    var serie = [38, 41, 39, 46, 44, 51, 49, 57, 54, 63, 61, 68];
    var baseBars = [0.42, 0.66, 0.34, 0.78, 0.52, 0.88];
    var LAST = serie.length - 1;

    function barAt(index, k) {
      var low = Math.floor(index);
      var high = Math.min(LAST, low + 1);
      var f = index - low;

      function valueAt(i) {
        var scale = 0.54 + 0.46 * (serie[i] - 38) / 30;
        var wave = 0.09 * Math.sin((i + 1) * (k + 2));
        return clamp(baseBars[k] * scale + wave * 0.5, 0.08, 1);
      }
      return lerp(valueAt(low), valueAt(high), f);
    }

    function serieAt(index) {
      var low = Math.floor(index);
      var high = Math.min(LAST, low + 1);
      return lerp(serie[low], serie[high], index - low);
    }

    /* --- indicador --- */
    panel(layer, 22, 24, 118, 84);
    text(layer, 34, 44, 'indicador', { fill: C.secondary });
    var kpiValue = text(layer, 34, 78, '68', { cls: 'value', fill: C.ink });
    var kpiPeriod = text(layer, 34, 96, 'periodo 12', { fill: C.secondary });

    /* --- barras del periodo --- */
    panel(layer, 150, 24, 308, 84);
    text(layer, 162, 44, 'barras · mismo periodo', { fill: C.secondary });

    var barBase = 96;
    var barTop = 54;
    var barMax = barBase - barTop;
    line(layer, 162, barBase, 446, barBase, { stroke: C.grid, width: 1 });

    var barPitch = 46;
    var barWidth = 26;
    var bars = [];
    for (var b = 0; b < baseBars.length; b++) {
      bars.push(rect(layer, 164 + b * barPitch, barBase, barWidth, 0, {
        radius: 2, fill: b === 5 ? C.primary : C.teal, fillOpacity: b === 5 ? 1 : 0.62
      }));
    }

    /* --- serie temporal --- */
    panel(layer, 22, 118, 436, 156);
    text(layer, 34, 138, 'serie temporal', { fill: C.secondary });
    var periodLabel = text(layer, 446, 138, 'periodo 12', { anchor: 'end', fill: C.ink });

    var plot = { x0: 44, x1: 440, y0: 156, y1: 250 };

    [0.25, 0.5, 0.75].forEach(function (level) {
      var y = plot.y1 - level * (plot.y1 - plot.y0);
      line(layer, plot.x0, y, plot.x1, y, { stroke: C.grid, width: 1, dash: '2 6' });
    });
    line(layer, plot.x0, plot.y1, plot.x1, plot.y1, { stroke: C.border, width: 1 });

    for (var k = 0; k < serie.length; k++) {
      if (k % 2 === 0) {
        var tx = lerp(plot.x0, plot.x1, k / LAST);
        line(layer, tx, plot.y1, tx, plot.y1 + 4, { stroke: C.border, width: 1 });
        text(layer, tx, plot.y1 + 16, String(k + 1), { cls: 'note', fill: C.secondary, anchor: 'middle' });
      }
    }

    var gradientId = uid('serie');
    var defs = add(svg, 'defs', {});
    var gradient = add(defs, 'linearGradient', {
      id: gradientId, x1: '0', y1: '0', x2: '0', y2: '1'
    });
    add(gradient, 'stop', { offset: '0', 'stop-color': C.primary, 'stop-opacity': '0.22' });
    add(gradient, 'stop', { offset: '1', 'stop-color': C.primary, 'stop-opacity': '0' });

    var area = path(layer, '', { fill: 'url(#' + gradientId + ')', fillOpacity: 0 });
    var serieLine = path(layer, '', {
      stroke: C.primary, width: 2.4, cap: 'round', strokeOpacity: 1
    });
    serieLine.setAttribute('pathLength', '1');

    var cursor = line(layer, plot.x0, plot.y0 - 4, plot.x0, plot.y1, {
      stroke: C.primary, width: 1.2, dash: '3 4', opacity: 0.75
    });
    var dotHalo = circle(layer, plot.x0, plot.y1, 7, {
      fill: C.primary, fillOpacity: 0.16, stroke: C.primary, width: 1, strokeOpacity: 0.35
    });
    var dot = circle(layer, plot.x0, plot.y1, 3.6, {
      fill: C.surface, stroke: C.primary, width: 2.2
    });

    text(layer, 34, 291, 'ejemplo ilustrativo', { cls: 'note', fill: C.secondary });

    var pointAt = function (index) {
      return {
        x: lerp(plot.x0, plot.x1, index / LAST),
        y: plot.y1 - ((serieAt(index) - 34) / (72 - 34)) * (plot.y1 - plot.y0)
      };
    };

    var points = [];
    for (var i = 0; i <= LAST; i++) points.push(pointAt(i));
    var curve = linePath(points);
    serieLine.setAttribute('d', curve);
    area.setAttribute('d', curve + 'L' + r(plot.x1) + ' ' + r(plot.y1) + 'L' + r(plot.x0) + ' ' + r(plot.y1) + 'Z');

    var scrub = null;
    var kpiText = '';

    function render(t) {
      var draw = easeOut(span(t, 120, 1250));
      var sweep = easeInOut(span(t, 1250, 2900));

      drawable(serieLine, draw);
      area.setAttribute('fill-opacity', r(easeInOut(span(t, 700, 1500)) * 0.9));

      var index = scrub != null ? scrub * LAST : lerp(0, LAST, sweep);
      var point = pointAt(index);
      var visible = t > 300 ? 1 : 0;

      cursor.setAttribute('x1', r(point.x));
      cursor.setAttribute('x2', r(point.x));
      cursor.setAttribute('opacity', visible * 0.75);
      dotHalo.setAttribute('cx', r(point.x));
      dotHalo.setAttribute('cy', r(point.y));
      dot.setAttribute('cx', r(point.x));
      dot.setAttribute('cy', r(point.y));

      for (var bar = 0; bar < bars.length; bar++) {
        var height = barAt(index, bar) * barMax;
        bars[bar].setAttribute('y', r(barBase - height));
        bars[bar].setAttribute('height', r(height));
      }

      var value = String(Math.round(serieAt(index)));
      if (value !== kpiText) {
        kpiText = value;
        kpiValue.textContent = value;
      }

      var period = 'periodo ' + (Math.round(index) + 1);
      if (kpiPeriod.textContent !== period) kpiPeriod.textContent = period;
      if (periodLabel.textContent !== period) periodLabel.textContent = period;
    }

    render(0);

    return {
      duration: DURATION,
      render: render,
      /* Sobre la ilustración el cursor recorre los periodos de izquierda a
         derecha, sin sacar al indicador de su rango. */
      pointer: function (point) {
        scrub = point ? clamp((point.x - plot.x0) / (plot.x1 - plot.x0)) : null;
      },
      focus: function () {},
      hits: [],
      reset: function () { scrub = null; }
    };
  }

  /* ==========================================================================
     2. CIENCIA DE DATOS Y MACHINE LEARNING
     Observaciones → recta de ajuste → banda de confianza → residuos.
     El ajuste es una regresión lineal por mínimos cuadrados sobre los puntos
     dibujados y la banda es el intervalo de confianza del 95 % para la media
     condicionada: se calcula aquí, no se dibuja a ojo.
     ========================================================================== */

  function sceneModelos(svg) {
    var DURATION = 4200;
    var layer = add(svg, 'g', { 'class': 'scene-layer' });

    var plot = { x0: 52, x1: 440, y0: 62, y1: 236 };

    /* 18 observaciones fijas: dependencia lineal con ruido pequeño. */
    var raw = [
      [0.05, 0.04], [0.11, -0.05], [0.17, 0.06], [0.22, 0.02], [0.28, -0.06],
      [0.33, 0.03], [0.39, -0.02], [0.44, 0.07], [0.50, -0.04], [0.56, 0.02],
      [0.61, -0.07], [0.67, 0.05], [0.72, 0.01], [0.78, -0.03], [0.83, 0.06],
      [0.89, -0.05], [0.94, 0.03], [0.99, -0.02]
    ];

    var obs = raw.map(function (pair) {
      var u = pair[0];
      var value = clamp(0.2 + 0.58 * u + pair[1], 0.02, 0.98);
      return {
        u: u,
        value: value,
        x: lerp(plot.x0 + 6, plot.x1 - 6, u),
        y: plot.y1 - value * (plot.y1 - plot.y0)
      };
    });

    /* Regresión lineal por mínimos cuadrados */
    var n = obs.length;
    var sumX = 0, sumY = 0;
    obs.forEach(function (o) { sumX += o.u; sumY += o.value; });
    var meanX = sumX / n;
    var meanY = sumY / n;
    var sxx = 0, sxy = 0, sst = 0;
    obs.forEach(function (o) {
      sxx += Math.pow(o.u - meanX, 2);
      sxy += (o.u - meanX) * (o.value - meanY);
    });
    var slope = sxy / sxx;
    var intercept = meanY - slope * meanX;

    var residuals = obs.map(function (o) {
      var fitted = intercept + slope * o.u;
      var residual = o.value - fitted;
      sst += Math.pow(o.value - meanY, 2);
      return residual;
    });

    var sse = 0;
    residuals.forEach(function (res) { sse += res * res; });
    var sigma = Math.sqrt(sse / (n - 2));

    /* t de Student al 95 % con n − 2 = 16 grados de libertad */
    var T95 = 2.12;

    function fitted(u) { return intercept + slope * u; }

    /* Semiancho del intervalo de confianza para la media en u */
    function bandHalf(u) {
      return T95 * sigma * Math.sqrt(1 / n + Math.pow(u - meanX, 2) / sxx);
    }

    /* --- ejes y rejilla --- */
    line(layer, plot.x0, plot.y0, plot.x0, plot.y1, { stroke: C.border, width: 1 });
    line(layer, plot.x0, plot.y1, plot.x1, plot.y1, { stroke: C.border, width: 1 });

    for (var g = 1; g <= 4; g++) {
      var gy = lerp(plot.y1, plot.y0, g / 5);
      line(layer, plot.x0, gy, plot.x1, gy, { stroke: C.grid, width: 1, dash: '2 6' });
      line(layer, plot.x0 - 4, gy, plot.x0, gy, { stroke: C.border, width: 1 });
    }

    /* --- leyenda --- */
    circle(layer, 52, 34, 3.2, { fill: C.secondary, fillOpacity: 0.85 });
    text(layer, 62, 37, 'observaciones', { cls: 'note', fill: C.secondary });
    line(layer, 158, 34, 178, 34, { stroke: C.primary, width: 2.2 });
    text(layer, 186, 37, 'ajuste lineal', { cls: 'note', fill: C.secondary });
    rect(layer, 274, 28, 16, 11, { radius: 2, fill: C.purple, fillOpacity: 0.22, stroke: C.purple, width: 1, strokeOpacity: 0.5 });
    text(layer, 298, 37, 'banda de confianza 95 %', { cls: 'note', fill: C.secondary });

    /* --- banda --- */
    var bandId = uid('banda');
    var defs = add(svg, 'defs', {});
    var bandGradient = add(defs, 'linearGradient', { id: bandId, x1: '0', y1: '0', x2: '1', y2: '0' });
    add(bandGradient, 'stop', { offset: '0', 'stop-color': C.purple, 'stop-opacity': '0.3' });
    add(bandGradient, 'stop', { offset: '0.5', 'stop-color': C.purple, 'stop-opacity': '0.18' });
    add(bandGradient, 'stop', { offset: '1', 'stop-color': C.purple, 'stop-opacity': '0.3' });

    var band = path(layer, '', { fill: 'url(#' + bandId + ')' });
    var bandEdgeTop = path(layer, '', { stroke: C.purple, width: 1.2, strokeOpacity: 0.5 });
    var bandEdgeBottom = path(layer, '', { stroke: C.purple, width: 1.2, strokeOpacity: 0.5 });

    /* --- recta de ajuste --- */
    var fitLine = path(layer, '', { stroke: C.primary, width: 2.4, cap: 'round' });
    fitLine.setAttribute('pathLength', '1');

    /* --- observaciones --- */
    var dots = obs.map(function (o) {
      return circle(layer, o.x, o.y, 2.8, { fill: C.secondary, fillOpacity: 0 });
    });

    /* --- residuos: segmentos verticales entre observación y ajuste --- */
    var residualIndexes = [2, 5, 8, 11, 14, 16];
    var residualEls = residualIndexes.map(function (index) {
      var o = obs[index];
      return {
        index: index,
        stem: line(layer, o.x, o.y, o.x, o.y, {
          stroke: C.purple, width: 1.6, opacity: 0
        }),
        tick: line(layer, o.x - 3, o.y, o.x + 3, o.y, {
          stroke: C.purple, width: 1.2, opacity: 0
        })
      };
    });
    var residualLabel = text(layer, 446, 254, 'residuos', { anchor: 'end', fill: C.purple, opacity: 0 });

    /* --- lectura del punto señalado --- */
    var tipGroup = add(layer, 'g', { opacity: 0 });
    var tipBox = rect(tipGroup, 0, 0, 74, 20, { radius: 4, fill: C.surface, stroke: C.purple, width: 1 });
    var tipText = text(tipGroup, 8, 14, '', { cls: 'note', fill: C.purple });

    var hover = null;

    function bandPathWeight(weight) {
      var top = '', bottom = '';
      var steps = 22;
      for (var k = 0; k <= steps; k++) {
        var u = k / steps;
        var x = lerp(plot.x0 + 6, plot.x1 - 6, u);
        var half = bandHalf(u) * weight;
        top += (k ? 'L' : 'M') + r(x) + ' ' + r(plot.y1 - (fitted(u) + half) * (plot.y1 - plot.y0));
      }
      for (var m = steps; m >= 0; m--) {
        var um = m / steps;
        var xm = lerp(plot.x0 + 6, plot.x1 - 6, um);
        var halfM = bandHalf(um) * weight;
        bottom += 'L' + r(xm) + ' ' + r(plot.y1 - (fitted(um) - halfM) * (plot.y1 - plot.y0));
      }
      return top + bottom + 'Z';
    }

    function edgePath(sign) {
      var points = [];
      for (var k = 0; k <= 22; k++) {
        var u = k / 22;
        points.push({
          x: lerp(plot.x0 + 6, plot.x1 - 6, u),
          y: plot.y1 - (fitted(u) + sign * bandHalf(u)) * (plot.y1 - plot.y0)
        });
      }
      return linePath(points);
    }

    var fitPath = linePath([
      { x: plot.x0 + 6, y: plot.y1 - fitted(0) * (plot.y1 - plot.y0) },
      { x: plot.x1 - 6, y: plot.y1 - fitted(1) * (plot.y1 - plot.y0) }
    ]);
    fitLine.setAttribute('d', fitPath);
    bandEdgeTop.setAttribute('d', edgePath(1));
    bandEdgeBottom.setAttribute('d', edgePath(-1));

    /* El residuo mayor queda señalado al final, para explicar la idea sin hover.
       Se elige entre los residuos dibujados, que son los que se pueden rotular. */
    var maxIndex = residualIndexes[0];
    residualIndexes.forEach(function (index) {
      if (Math.abs(residuals[index]) > Math.abs(residuals[maxIndex])) maxIndex = index;
    });
    var permanent = residualEls.filter(function (item) { return item.index === maxIndex; })[0];
    var permanentLast = text(layer, 0, 0, 'residuo', { cls: 'note', fill: C.purple, opacity: 0 });

    function residualText(index) {
      var value = residuals[index];
      var sign = value < 0 ? '−' : '+';
      return 'residuo ' + sign + Math.abs(value).toFixed(2).replace('.', ',');
    }

    function render(t) {
      var appear = function (index) {
        return easeOut(span(t, 100 + index * 34, 640 + index * 34));
      };

      for (var i = 0; i < dots.length; i++) {
        var grow = appear(i);
        dots[i].setAttribute('r', r(2.8 * grow));
        dots[i].setAttribute('fill-opacity', r(0.88 * grow));
      }

      drawable(fitLine, easeOut(span(t, 720, 1700)));

      var weight = easeInOut(span(t, 1700, 2450));
      band.setAttribute('d', weight > 0.001 ? bandPathWeight(weight) : '');
      bandEdgeTop.setAttribute('stroke-opacity', r(weight * 0.5));
      bandEdgeBottom.setAttribute('stroke-opacity', r(weight * 0.5));

      residualEls.forEach(function (item, index) {
        var o = obs[item.index];
        var fittedY = plot.y1 - fitted(o.u) * (plot.y1 - plot.y0);
        var grow = easeOut(span(t, 2400 + index * 80, 3000 + index * 80));
        var fade = 1 - easeInOut(span(t, 3300, 3750));
        var keep = item.index === maxIndex;
        var alpha = keep ? Math.max(grow, 0.55 * easeOut(span(t, 3300, 3700))) : grow * fade;
        item.stem.setAttribute('y2', r(lerp(o.y, fittedY, grow)));
        item.stem.setAttribute('opacity', r(alpha));
        item.tick.setAttribute('y1', r(fittedY));
        item.tick.setAttribute('y2', r(fittedY));
        item.tick.setAttribute('opacity', r(alpha));
      });

      residualLabel.setAttribute('opacity', r(easeOut(span(t, 2600, 3000)) * (1 - easeInOut(span(t, 3300, 3700)))));

      /* El residuo permanente se rotula junto al punto mayor, sin salirse del
         área de dibujo ni tapar la recta. */
      if (permanent) {
        var o = obs[permanent.index];
        var fittedY = plot.y1 - fitted(o.u) * (plot.y1 - plot.y0);
        var labelAlpha = easeOut(span(t, 3400, 3800));
        var above = o.y > fittedY;
        var toLeft = o.x > plot.x1 - 70;
        permanentLast.setAttribute('x', r(toLeft ? o.x - 8 : o.x + 8));
        permanentLast.setAttribute('y', r(above ? o.y - 8 : o.y + 13));
        permanentLast.setAttribute('text-anchor', toLeft ? 'end' : 'start');
        permanentLast.setAttribute('opacity', r(labelAlpha));
      }

      /* Punto señalado con el cursor: conserva sus coordenadas */
      if (hover != null) {
        var point = obs[hover];
        var targetY = plot.y1 - fitted(point.u) * (plot.y1 - plot.y0);
        dots[hover].setAttribute('r', 4.4);
        dots[hover].setAttribute('fill', C.purple);
        tipGroup.setAttribute('opacity', 1);
        tipText.textContent = residualText(hover);
        var boxX = Math.min(plot.x1 - 78, Math.max(plot.x0 + 4, point.x + 8));
        var boxY = Math.min(plot.y1 - 26, Math.max(plot.y0 + 2, point.y - 28));
        tipBox.setAttribute('x', r(boxX));
        tipBox.setAttribute('y', r(boxY));
        tipText.setAttribute('x', r(boxX + 8));
        tipText.setAttribute('y', r(boxY + 14));
        /* el segmento del residuo se marca mientras tanto */
        if (!residualEls.some(function (item) { return item.index === hover; })) {
          dots[hover].setAttribute('stroke', C.purple);
          dots[hover].setAttribute('stroke-width', 1.4);
        }
        var hoverLine = plot.y1 - fitted(point.u) * (plot.y1 - plot.y0);
        dots[hover].setAttribute('cy', point.y);
        tipBox.setAttribute('height', 20);
        /* el residuo se destaca con el mismo segmento del conjunto */
        residualEls.forEach(function (item) {
          if (item.index === hover) {
            item.stem.setAttribute('opacity', 1);
            item.tick.setAttribute('opacity', 1);
            item.stem.setAttribute('y2', r(hoverLine));
          }
        });
      } else {
        tipGroup.setAttribute('opacity', 0);
        for (var d = 0; d < dots.length; d++) {
          dots[d].setAttribute('fill', C.secondary);
          dots[d].setAttribute('stroke', 'none');
        }
      }
    }

    render(0);

    return {
      duration: DURATION,
      render: render,
      /* Destaca la observación más cercana al cursor, si está a menos de 26 u */
      pointer: function (point) {
        if (!point) {
          hover = null;
          return;
        }
        var best = null;
        var bestDistance = 26;
        for (var i = 0; i < obs.length; i++) {
          var dx = obs[i].x - point.x;
          var dy = obs[i].y - point.y;
          var distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = i;
          }
        }
        hover = best;
      },
      focus: function () {},
      hits: [],
      reset: function () { hover = null; }
    };
  }
  /* ==========================================================================
     3. INGENIERÍA DE DATOS
     Fuentes → transformación → validación → almacenamiento. Los registros
     recorren las conexiones; en transformación se ordenan y quedan uniformes;
     en validación pasan una comprobación visible; en almacenamiento entran en
     la tabla final. La línea inferior de trazabilidad se completa al ritmo.
     Al enfocar una etapa se destacan sus conexiones y una nota explica qué
     hace, sin mover la tarjeta.
     ========================================================================== */

  function scenePipeline(svg) {
    var DURATION = 4400;
    var layer = add(svg, 'g', { 'class': 'scene-layer' });

    var stageY = 40;
    var stageH = 104;
    var stageW = 88;
    var stageX = [22, 134, 246, 358];
    var midY = stageY + stageH / 2 + 4;
    var railY = 200;
    var stages = [
      { id: 'fuentes', name: 'fuentes', note: 'origen · archivos y tablas que llegan tal cual' },
      { id: 'transformacion', name: 'transformación', note: 'los registros se ordenan y quedan uniformes' },
      { id: 'validacion', name: 'validación', note: 'cada registro pasa una comprobación antes de seguir' },
      { id: 'almacenamiento', name: 'almacenamiento', note: 'los registros validados entran en la tabla final' }
    ];

    var panelEls = [];
    var tintEls = [];
    var stopGroups = [];
    var sourceRows = [];
    var transformRows = [];
    var checkRing = null;
    var checkMark = null;
    var scanLine = null;
    var tableRows = [];
    var packets = [];
    var railDots = [];

    stages.forEach(function (stage, index) {
      var x = stageX[index];
      var group = stop(layer, stage.id, 'Etapa ' + stage.name + ': ' + stage.note);
      stopGroups.push(group);

      rect(group, x, stageY, stageW, stageH, { radius: 6, fill: 'transparent', stroke: 'none' });
      panelEls.push(rect(group, x, stageY, stageW, stageH, {
        radius: 6, fill: C.surface, stroke: C.border, width: 1
      }));
      tintEls.push(rect(group, x, stageY, stageW, stageH, {
        radius: 6, fill: C.teal, fillOpacity: 0, stroke: 'none'
      }));

      text(group, x + stageW / 2, stageY + stageH + 20, stage.name, { anchor: 'middle', fill: C.ink });

      var gx = x + 14;
      var gy = stageY + 16;

      if (stage.id === 'fuentes') {
        rect(group, gx, gy, 15, 4, { radius: 1, fill: C.teal, fillOpacity: 0.5 });
        rect(group, gx, gy + 7, 21, 4, { radius: 1, fill: C.teal, fillOpacity: 0.5 });
        rect(group, gx, gy + 14, 12, 4, { radius: 1, fill: C.teal, fillOpacity: 0.5 });
        [0, 1, 2].forEach(function (k) {
          sourceRows.push(rect(group, x + 9 + [0, 4, 2][k], 88 + k * 16, [40, 56, 34][k], 10, {
            radius: 2, fill: C.teal, fillOpacity: 0, stroke: C.teal, width: 1, strokeOpacity: 0
          }));
        });
      } else if (stage.id === 'transformacion') {
        path(group, 'M' + (gx + 2) + ' ' + (gy + 2) + 'l-6 8 6 8M' + (gx + 12) + ' ' + (gy + 2) + 'l6 8-6 8', {
          stroke: C.teal, width: 1.6
        });
        [0, 1, 2].forEach(function (k) {
          transformRows.push(rect(group, x + 9, 80 + k * 16, 60, 10, {
            radius: 2, fill: C.teal, fillOpacity: 0, stroke: C.teal, width: 1, strokeOpacity: 0
          }));
        });
      } else if (stage.id === 'validacion') {
        [0, 1, 2].forEach(function (k) {
          rect(group, x + 9, 88 + k * 16, 68, 10, {
            radius: 2, fill: C.teal, fillOpacity: 0.14, stroke: C.teal, width: 1, strokeOpacity: 0.45
          });
        });
        checkRing = circle(group, x + stageW - 22, stageY + 22, 8, {
          fill: C.surface, stroke: C.teal, width: 1.4, strokeOpacity: 0.35
        });
        checkMark = path(group, 'M' + (x + stageW - 26) + ' ' + (stageY + 22) + 'l3 3.4 5.6-6.4', {
          stroke: C.teal, width: 1.8, strokeOpacity: 0
        });
        checkMark.setAttribute('pathLength', '1');
      } else {
        rect(group, x + 9, 78, 70, 48, { radius: 3, fill: C.surface, stroke: C.teal, width: 1, strokeOpacity: 0.45 });
        rect(group, x + 9, 78, 70, 12, { radius: 3, fill: C.teal, fillOpacity: 0.16, stroke: 'none' });
        [1, 2, 3].forEach(function (k) {
          line(group, x + 9, 78 + 12 * k, x + 79, 78 + 12 * k, { stroke: C.teal, width: 1, opacity: 0.4 });
        });
        [0, 1, 2].forEach(function (k) {
          tableRows.push(rect(group, x + 11, 90 + 12 * k, 66, 10, {
            radius: 1, fill: C.teal, fillOpacity: 0
          }));
        });
      }
    });

    /* conexiones entre etapas */
    var links = [];
    for (var s = 0; s < 3; s++) {
      var fromX = stageX[s] + stageW;
      var toX = stageX[s + 1];
      var base = line(layer, fromX, midY, toX, midY, { stroke: C.border, width: 1.6 });
      var head = path(layer, 'M' + (toX - 5) + ' ' + (midY - 3.6) + 'L' + toX + ' ' + midY + 'L' + (toX - 5) + ' ' + (midY + 3.6), {
        stroke: C.secondary, width: 1.4, strokeOpacity: 0.75
      });
      links.push({ base: base, head: head, from: fromX, to: toX });
    }

    /* paquetes: un registro cruzando cada conexión */
    [0, 1, 2].forEach(function () {
      packets.push(circle(layer, stageX[0] + stageW, midY, 4.4, {
        fill: C.teal, stroke: C.surface, width: 1.6, fillOpacity: 0
      }));
    });

    /* trazabilidad: raíl inferior con una parada por etapa */
    text(layer, 446, railY + 16, 'trazabilidad', { anchor: 'end', fill: C.secondary });
    line(layer, stageX[0] + stageW / 2, railY, stageX[3] + stageW / 2, railY, {
      stroke: C.border, width: 1, dash: '3 4'
    });
    var railFill = line(layer, stageX[0] + stageW / 2, railY, stageX[0] + stageW / 2, railY, {
      stroke: C.teal, width: 2
    });
    stages.forEach(function (stage, index) {
      var cx = stageX[index] + stageW / 2;
      line(layer, cx, stageY + stageH + 26, cx, railY, { stroke: C.border, width: 1, dash: '3 4' });
      railDots.push(circle(layer, cx, railY, 3.2, {
        fill: C.surface, stroke: C.border, width: 1.4
      }));
    });

    var strip = noteStrip(layer, 230, 'note');
    var baseNote = 'cada etapa deja rastro en la línea de trazabilidad';

    var hover = null;

    function stageName(id) {
      for (var i = 0; i < stages.length; i++) if (stages[i].id === id) return stages[i];
      return null;
    }

    function render(t) {
      /* fuentes: los registros aparecen tal cual llegan */
      sourceRows.forEach(function (node, k) {
        var grow = easeOut(span(t, 320 + k * 90, 760 + k * 90));
        node.setAttribute('fill-opacity', r(grow * 0.16));
        node.setAttribute('stroke-opacity', r(grow * 0.55));
      });

      /* transformación: los registros se ordenan y quedan uniformes */
      transformRows.forEach(function (node, k) {
        var appear = easeOut(span(t, 1080 + k * 70, 1340 + k * 70));
        var order = easeInOut(span(t, 1200 + k * 90, 1900 + k * 90));
        var startY = [100, 78, 108][k];
        var startW = [36, 54, 44][k];
        node.setAttribute('x', r(stageX[1] + 9));
        node.setAttribute('y', r(lerp(startY, 80 + k * 16, order)));
        node.setAttribute('width', r(lerp(startW, 68, order)));
        node.setAttribute('fill-opacity', r(appear * 0.16));
        node.setAttribute('stroke-opacity', r(appear * 0.55));
      });

      /* validación: un barrido y después la marca de comprobado */
      var scan = easeInOut(span(t, 2080, 2440));
      if (scan > 0 && scan < 1) {
        scanLine = scanLine || line(layer, stageX[2] + 9, 86, stageX[2] + 9, 136, {
          stroke: C.primary, width: 1.6, opacity: 0.9
        });
        var sx = lerp(stageX[2] + 11, stageX[2] + 75, scan);
        scanLine.setAttribute('x1', r(sx));
        scanLine.setAttribute('x2', r(sx));
        scanLine.setAttribute('opacity', 0.9);
      } else if (scanLine) {
        scanLine.setAttribute('opacity', 0);
      }
      drawable(checkMark, easeOut(span(t, 2480, 2760)));
      checkMark.setAttribute('stroke-opacity', r(span(t, 2480, 2600)));
      checkRing.setAttribute('stroke-opacity', r(0.35 + span(t, 2480, 2700) * 0.65));
      checkRing.setAttribute('stroke-width', r(1.4 + span(t, 2480, 2700) * 0.5));

      /* almacenamiento: los registros entran en la tabla */
      tableRows.forEach(function (node, k) {
        var grow = easeOut(span(t, 2900 + k * 130, 3260 + k * 130));
        node.setAttribute('fill-opacity', r(grow * 0.34));
      });

      /* paquetes y raíl */
      var hops = [
        { start: 900, end: 1180 },
        { start: 1960, end: 2240 },
        { start: 2820, end: 3100 }
      ];
      var completed = 0;
      packets.forEach(function (node, index) {
        var hop = hops[index];
        var progress = span(t, hop.start, hop.end);
        if (progress > 0 && progress < 1) {
          var p = easeInOut(progress);
          node.setAttribute('cx', r(lerp(links[index].from, links[index].to, p)));
          node.setAttribute('cy', midY);
          node.setAttribute('fill-opacity', 1);
        } else {
          node.setAttribute('fill-opacity', 0);
          if (progress >= 1) completed = index + 1;
        }
      });

      var railProgress = clamp(completed / 3);
      var railEnd = lerp(stageX[0] + stageW / 2, stageX[3] + stageW / 2, railProgress);
      railFill.setAttribute('x2', r(railEnd));
      railDots.forEach(function (node, index) {
        var reached = railProgress >= index / 3 - 0.001 && t > 320;
        node.setAttribute('fill', reached ? C.teal : C.surface);
        node.setAttribute('stroke', reached ? C.teal : C.border);
      });

      /* destacado de la etapa enfocada o señalada */
      stages.forEach(function (stage, index) {
        var active = hover === stage.id;
        tintEls[index].setAttribute('fill-opacity', active ? 0.07 : 0);
        panelEls[index].setAttribute('stroke', active ? C.teal : C.border);
        panelEls[index].setAttribute('stroke-width', r(active ? 1.8 : 1));
      });

      links.forEach(function (link, index) {
        var touching = hover === stages[index].id || hover === stages[index + 1].id;
        link.base.setAttribute('stroke', touching ? C.teal : C.border);
        link.base.setAttribute('stroke-width', r(touching ? 2.4 : 1.6));
        link.head.setAttribute('stroke', touching ? C.teal : C.secondary);
        link.head.setAttribute('stroke-opacity', r(touching ? 1 : 0.75));
      });

      var stage = hover ? stageName(hover) : null;
      if (stage) strip.set(stage.name + ' · ' + stage.note, true);
      else strip.set(baseNote, false);
    }

    render(0);

    return {
      duration: DURATION,
      render: render,
      pointer: function (point) {
        hover = point ? hitTest(point, stopGroups) : null;
      },
      focus: function (id) { hover = id || null; },
      hits: stopGroups.map(function (node, index) {
        return { id: stages[index].id, node: node };
      }),
      reset: function () { hover = null; }
    };
  }

  /* ¿Qué parada contiene el punto? Las paradas son los únicos rectángulos
     medibles que app.js no puede consultar por eventos: el enlace de la ficha
     cubre la ilustración. */
  function hitTest(point, groups) {
    for (var i = 0; i < groups.length; i++) {
      var box = groups[i].getBBox();
      var ctm = groups[i].getCTM();
      if (!box || !ctm) continue;
      var x = point.x;
      var y = point.y;
      if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
        return groups[i].getAttribute('data-stop');
      }
    }
    return null;
  }

  /* ==========================================================================
     4. IA GENERATIVA Y LLMS
     consulta → documentos → fragmentos → contexto → respuesta con referencias.
     Cada referencia numerada se conecta con su fragmento de origen. El texto es
     fijo y se lee sin hover. No se llama a ningún servicio: todo es local.
     ========================================================================== */

  function sceneRag(svg) {
    var DURATION = 4600;
    var layer = add(svg, 'g', { 'class': 'scene-layer' });

    var docs = [
      { y: 82, name: 'doc 1', related: true, fragment: 'origen' },
      { y: 124, name: 'doc 2', related: false, fragment: null },
      { y: 166, name: 'doc 3', related: true, fragment: 'cambio' }
    ];

    /* --- consulta --- */
    text(layer, 22, 16, 'consulta', { fill: C.secondary });
    var queryPill = rect(layer, 22, 22, 196, 32, {
      radius: 16, fill: C.surface, stroke: C.border, width: 1.2
    });
    var queryText = text(layer, 34, 42, '¿qué es la trazabilidad?', { fill: C.ink });

    /* --- documentos --- */
    text(layer, 22, 74, 'documentos', { fill: C.secondary });
    var docBoxes = [];
    var docTints = [];
    var fragmentBars = [];

    docs.forEach(function (doc) {
      docBoxes.push(rect(layer, 22, doc.y, 104, 38, {
        radius: 4, fill: C.surface, stroke: C.border, width: 1
      }));
      docTints.push(rect(layer, 22, doc.y, 104, 38, {
        radius: 4, fill: C.purple, fillOpacity: 0, stroke: 'none'
      }));
      text(layer, 32, doc.y + 15, doc.name, { fill: C.ink });
      line(layer, 32, doc.y + 24, 92, doc.y + 24, { stroke: C.secondary, width: 3, opacity: 0.18 });
      line(layer, 32, doc.y + 31, 76, doc.y + 31, { stroke: C.secondary, width: 3, opacity: 0.18 });

      if (doc.related) {
        fragmentBars.push(rect(layer, 28, doc.y + 19, 92, 9, {
          radius: 2, fill: C.purple, fillOpacity: 0, stroke: 'none'
        }));
      }
    });

    /* --- contexto con los fragmentos elegidos --- */
    text(layer, 140, 74, 'contexto', { fill: C.secondary });
    var contextBox = rect(layer, 138, 82, 150, 122, {
      radius: 6, fill: C.bg, stroke: C.border, width: 1.2, dash: '5 4'
    });

    var chips = [
      { y: 92, badge: '1', title: 'frag. 1', sub: 'origen' },
      { y: 148, badge: '2', title: 'frag. 2', sub: 'cambio' }
    ].map(function (def) {
      var group = add(layer, 'g', { opacity: 0 });
      var box = rect(group, 146, def.y, 134, 46, {
        radius: 5, fill: C.surface, stroke: C.border, width: 1
      });
      var badge = circle(group, 164, def.y + 23, 9, {
        fill: C.surface, stroke: C.purple, width: 1.2
      });
      var badgeText = text(group, 164, def.y + 27, def.badge, { cls: 'note', anchor: 'middle', fill: C.purple });
      var title = text(group, 178, def.y + 17, def.title, { cls: 'note', fill: C.ink });
      var sub = text(group, 178, def.y + 29, def.sub, { cls: 'note', fill: C.purple });
      line(group, 178, def.y + 37, 252, def.y + 37, { stroke: C.secondary, width: 3, opacity: 0.16 });
      return { group: group, box: box, badge: badge, badgeText: badgeText, title: title, sub: sub, y: def.y };
    });

    /* --- respuesta --- */
    text(layer, 298, 74, 'respuesta', { fill: C.secondary });
    var answerPanel = rect(layer, 298, 82, 160, 122, {
      radius: 6, fill: C.surface, stroke: C.border, width: 1
    });

    var answerLines = [
      { y: 106, text: 'Registra el origen' },
      { y: 124, text: 'y cada cambio del' },
      { y: 142, text: 'dato, paso a paso.' }
    ].map(function (def) {
      var node = text(layer, 310, def.y, def.text, { fill: C.ink, opacity: 0 });
      return node;
    });

    /* Fila de referencias: separada del texto para no taparlo nunca */
    line(layer, 310, 158, 446, 158, { stroke: C.border, width: 1 });
    text(layer, 310, 178, 'referencias', { cls: 'note', fill: C.secondary });

    /* --- referencias numeradas, enfocables --- */
    var citations = [
      { x: 382, y: 166, badge: '1', chip: 0, label: 'Referencia 1: fragmento del documento 1, el origen del dato' },
      { x: 406, y: 166, badge: '2', chip: 1, label: 'Referencia 2: fragmento del documento 3, el cambio del dato' }
    ].map(function (def) {
      var group = stop(layer, 'ref-' + def.badge, def.label);
      var box = rect(group, def.x, def.y, 15, 15, {
        radius: 3, fill: C.primary, fillOpacity: 0.12, stroke: C.primary, width: 1, opacity: 0
      });
      var mark = text(group, def.x + 7.5, def.y + 11, def.badge, {
        cls: 'note', anchor: 'middle', fill: C.primary, opacity: 0
      });
      return { group: group, box: box, mark: mark, chip: def.chip, badge: def.badge };
    });

    /* --- conectores: referencia → fragmento de origen --- */
    var connectors = [
      'M389.5 181C389.5 202 389.5 218 356 218L232 218C198 218 172 200 166 126',
      'M413.5 181C413.5 208 413.5 230 356 230L232 230C192 230 172 210 166 182'
    ].map(function (d) {
      var node = path(layer, d, { stroke: C.purple, width: 1.3, strokeOpacity: 0 });
      return node;
    });
    var connectorDots = [
      circle(layer, 166, 126, 2.6, { fill: C.purple, fillOpacity: 0 }),
      circle(layer, 166, 182, 2.6, { fill: C.purple, fillOpacity: 0 })
    ];

    text(layer, 458, 268, 'ejemplo ilustrativo', { cls: 'note', anchor: 'end', fill: C.secondary });

    var hover = null;

    function render(t) {
      var query = easeOut(span(t, 0, 500));
      queryPill.setAttribute('stroke', query > 0.5 ? C.primary : C.border);
      queryText.setAttribute('opacity', r(0.35 + query * 0.65));

      docs.forEach(function (doc, index) {
        var appear = easeOut(span(t, 480 + index * 110, 900 + index * 110));
        docBoxes[index].setAttribute('opacity', r(appear));
        var selected = easeInOut(span(t, 1180 + index * 90, 1600 + index * 90));
        docTints[index].setAttribute('fill-opacity', r(doc.related ? selected * 0.09 : 0));
        docBoxes[index].setAttribute('stroke', doc.related && selected > 0.4 ? C.purple : C.border);
      });

      fragmentBars.forEach(function (node, index) {
        node.setAttribute('fill-opacity', r(easeOut(span(t, 1300 + index * 140, 1750 + index * 140)) * 0.18));
      });

      chips.forEach(function (chip, index) {
        var appear = easeInOut(span(t, 1500 + index * 160, 2050 + index * 160));
        chip.group.setAttribute('opacity', r(appear));
        chip.group.setAttribute('transform', 'translate(' + r(lerp(-56, 0, appear)) + ' ' + r(lerp(6, 0, appear)) + ')');
      });

      var context = easeOut(span(t, 1900, 2350));
      contextBox.setAttribute('stroke', context > 0.5 ? C.purple : C.border);
      contextBox.setAttribute('stroke-dasharray', r(5 + context * 2) + ' 4');
      contextBox.setAttribute('opacity', r(0.6 + context * 0.4));

      answerLines.forEach(function (node, index) {
        node.setAttribute('opacity', r(easeOut(span(t, 2400 + index * 160, 2800 + index * 160))));
      });

      citations.forEach(function (citation, index) {
        var appear = easeOut(span(t, 3200 + index * 180, 3560 + index * 180));
        var active = hover === citation.badge;
        citation.box.setAttribute('opacity', r(appear));
        citation.mark.setAttribute('opacity', r(appear));
        citation.box.setAttribute('fill-opacity', r(0.12 + appear * 0.1 + (active ? 0.2 : 0)));
        citation.box.setAttribute('stroke-width', r(active ? 1.8 : 1));
      });

      connectors.forEach(function (node, index) {
        var progress = easeInOut(span(t, 3620 + index * 160, 4080 + index * 160));
        drawable(node, progress);
        var active = hover === citations[index].badge;
        node.setAttribute('stroke-opacity', r(progress * (active ? 1 : 0.55)));
        node.setAttribute('stroke-width', r(active ? 2.2 : 1.3));
        connectorDots[index].setAttribute('fill-opacity', r(progress));
        connectorDots[index].setAttribute('r', r(active ? 3.4 : 2.6));
      });

      chips.forEach(function (chip, index) {
        var active = hover === String(index + 1);
        chip.box.setAttribute('stroke', active ? C.purple : C.border);
        chip.box.setAttribute('stroke-width', r(active ? 1.8 : 1));
        chip.box.setAttribute('fill-opacity', 1);
        chip.title.setAttribute('fill', active ? C.purple : C.ink);
      });
    }

    render(0);

    return {
      duration: DURATION,
      render: render,
      pointer: function (point) {
        if (!point) { hover = null; return; }
        hover = null;
        for (var i = 0; i < citations.length; i++) {
          var box = citations[i].group.getBBox();
          if (point.x >= box.x - 6 && point.x <= box.x + box.width + 6 &&
              point.y >= box.y - 6 && point.y <= box.y + box.height + 6) {
            hover = citations[i].badge;
            return;
          }
        }
      },
      focus: function (id) {
        hover = id && id.indexOf('ref-') === 0 ? id.replace('ref-', '') : (id ? String(id) : null);
      },
      hits: citations.map(function (citation) {
        return { id: citation.badge, node: citation.group };
      }),
      reset: function () { hover = null; }
    };
  }

  /* ==========================================================================
     5. AGENTES Y SISTEMAS DE DECISIÓN
     Un coordinador recibe una tarea, llama a sus herramientas y reúne los
     resultados. La revisión humana queda PENDIENTE: nadie la aprueba sola.
     Al enfocar un nodo se destacan sus conexiones y su función.
     ========================================================================== */

  function sceneAgentes(svg) {
    var DURATION = 4400;
    var layer = add(svg, 'g', { 'class': 'scene-layer' });

    var hub = { x: 100, y: 132, r: 30 };
    var tools = [
      { id: 'consulta', x: 296, y: 54, r: 21, label: 'consulta', note: 'recupera los datos que faltan' },
      { id: 'calculo', x: 344, y: 132, r: 21, label: 'cálculo', note: 'aplica la operación sobre esos datos' },
      { id: 'grafico', x: 296, y: 210, r: 21, label: 'gráfico', note: 'convierte el resultado en una figura' }
    ];
    var review = { x: 100, y: 216, r: 17 };

    var hover = null;

    /* --- conexiones --- */
    var links = tools.map(function (tool) {
      var dx = tool.x - hub.x;
      var dy = tool.y - hub.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var ux = dx / distance;
      var uy = dy / distance;
      return {
        from: { x: hub.x + ux * (hub.r + 2), y: hub.y + uy * (hub.r + 2) },
        to: { x: tool.x - ux * (tool.r + 2), y: tool.y - uy * (tool.r + 2) }
      };
    });

    var linkEls = tools.map(function (tool, index) {
      var link = links[index];
      return line(layer, link.from.x, link.from.y, link.to.x, link.to.y, {
        stroke: C.border, width: 1.6
      });
    });

    /* --- coordinador --- */
    var hubGroup = stop(layer, 'coordinador', 'Coordinador: reparte la tarea y reúne los resultados');
    var hubHit = circle(hubGroup, hub.x, hub.y, hub.r, { fill: 'transparent', stroke: 'none' });
    var hubRingOuter = circle(hubGroup, hub.x, hub.y, hub.r, {
      fill: C.ink, stroke: C.primary, width: 2.4, strokeOpacity: 0
    });
    circle(hubGroup, hub.x, hub.y, 11, { fill: 'none', stroke: C.surface, width: 1.4 });
    [0, 1, 2].forEach(function (index) {
      var angle = -Math.PI / 2 + (index * Math.PI * 2) / 3;
      circle(hubGroup, hub.x + Math.cos(angle) * 11, hub.y + Math.sin(angle) * 11, 2.2, { fill: C.surface });
    });
    text(hubGroup, hub.x, hub.y - hub.r - 10, 'coordinador', { anchor: 'middle', fill: C.ink });

    /* --- herramientas --- */
    var toolGroups = [];
    var toolCircles = [];
    tools.forEach(function (tool, index) {
      var group = stop(layer, tool.id, 'Herramienta ' + tool.label + ': ' + tool.note);
      toolGroups.push(group);
      circle(group, tool.x, tool.y, tool.r, { fill: 'transparent', stroke: 'none' });
      toolCircles.push(circle(group, tool.x, tool.y, tool.r, {
        fill: C.surface, stroke: C.border, width: 1.5
      }));
      var tint = circle(group, tool.x, tool.y, tool.r, {
        fill: C.primary, fillOpacity: 0, stroke: C.primary, width: 0
      });
      tool.tint = tint;

      if (tool.id === 'consulta') {
        rect(group, tool.x - 9, tool.y - 7, 18, 14, { radius: 2, fill: 'none', stroke: C.teal, width: 1.4 });
        line(group, tool.x - 9, tool.y - 2, tool.x + 9, tool.y - 2, { stroke: C.teal, width: 1.2, opacity: 0.7 });
      } else if (tool.id === 'calculo') {
        line(group, tool.x - 7, tool.y - 5, tool.x + 7, tool.y - 5, { stroke: C.teal, width: 1.8 });
        line(group, tool.x - 7, tool.y, tool.x + 7, tool.y, { stroke: C.teal, width: 1.8 });
        line(group, tool.x - 7, tool.y + 5, tool.x + 7, tool.y + 5, { stroke: C.teal, width: 1.8 });
      } else {
        line(group, tool.x - 8, tool.y + 6, tool.x - 8, tool.y - 2, { stroke: C.teal, width: 2.4 });
        line(group, tool.x - 1, tool.y + 6, tool.x - 1, tool.y - 7, { stroke: C.teal, width: 2.4 });
        line(group, tool.x + 6, tool.y + 6, tool.x + 6, tool.y - 4, { stroke: C.teal, width: 2.4 });
      }

      text(group, tool.x + tool.r + 10, tool.y + 4, tool.label, { fill: C.ink });
    });

    /* --- revisión humana: espera, no aprueba --- */
    var reviewGroup = stop(layer, 'revision', 'Revisión humana: una persona decide; aquí queda pendiente');
    circle(reviewGroup, review.x, review.y, review.r, { fill: 'transparent', stroke: 'none' });
    var reviewLink = line(layer, hub.x, hub.y + hub.r + 2, review.x, review.y - review.r, {
      stroke: C.border, width: 1.6
    });
    var reviewRing = circle(reviewGroup, review.x, review.y, review.r, {
      fill: C.surface, stroke: C.purple, width: 1.5, dash: '4 3', strokeOpacity: 0.55
    });
    circle(reviewGroup, review.x, review.y - 4, 3.4, { fill: 'none', stroke: C.purple, width: 1.3, strokeOpacity: 0.75 });
    path(reviewGroup, 'M' + (review.x - 6) + ' ' + (review.y + 8) + 'a6 6 0 0 1 12 0', {
      stroke: C.purple, width: 1.3, strokeOpacity: 0.75
    });
    var reviewName = text(reviewGroup, review.x + review.r + 10, review.y - 2, 'revisión humana', { fill: C.ink });
    var reviewState = text(reviewGroup, review.x + review.r + 10, review.y + 12, 'pendiente', {
      cls: 'note', fill: C.purple, opacity: 0.6
    });

    /* --- señales --- */
    var taskToken = circle(layer, 24, hub.y, 4.6, { fill: C.primary, stroke: C.surface, width: 1.6, fillOpacity: 0 });
    line(layer, 24, hub.y, hub.x - hub.r - 6, hub.y, { stroke: C.border, width: 1.4, dash: '3 3' });
    path(layer, 'M' + (hub.x - hub.r - 12) + ' ' + (hub.y - 3.4) + 'L' + (hub.x - hub.r - 6) + ' ' + hub.y + 'L' + (hub.x - hub.r - 12) + ' ' + (hub.y + 3.4), {
      stroke: C.secondary, width: 1.4, strokeOpacity: 0.7
    });
    text(layer, 22, hub.y - 12, 'tarea', { cls: 'note', fill: C.secondary });

    var signals = tools.map(function () {
      return {
        request: circle(layer, hub.x, hub.y, 4.4, { fill: C.primary, stroke: C.surface, width: 1.4, fillOpacity: 0 }),
        reply: circle(layer, hub.x, hub.y, 4.4, { fill: C.teal, stroke: C.surface, width: 1.4, fillOpacity: 0 })
      };
    });
    var handoff = circle(layer, hub.x, hub.y, 4.6, { fill: C.primary, stroke: C.surface, width: 1.4, fillOpacity: 0 });

    var strip = noteStrip(layer, 246, 'note');
    var baseNote = 'azul: petición · verde azulado: resultado';

    var calls = [
      { out: 700, back: 1100, travel: 320 },
      { out: 1500, back: 1900, travel: 320 },
      { out: 2300, back: 2700, travel: 320 }
    ];

    function moveSignal(node, from, to, progress) {
      if (progress <= 0 || progress >= 1) {
        node.setAttribute('fill-opacity', 0);
        return;
      }
      var p = easeInOut(progress);
      node.setAttribute('cx', r(lerp(from.x, to.x, p)));
      node.setAttribute('cy', r(lerp(from.y, to.y, p)));
      node.setAttribute('fill-opacity', 1);
    }

    function render(t) {
      /* la tarea entra al coordinador */
      var arrive = easeInOut(span(t, 180, 640));
      if (arrive > 0 && arrive < 1) {
        taskToken.setAttribute('cx', r(lerp(24, hub.x - hub.r - 4, arrive)));
        taskToken.setAttribute('fill-opacity', 1);
      } else {
        taskToken.setAttribute('fill-opacity', 0);
      }

      var pulse = Math.max(
        span(t, 600, 760) * (1 - span(t, 900, 1150)),
        span(t, 1100, 1250) * (1 - span(t, 1400, 1650)),
        span(t, 1900, 2050) * (1 - span(t, 2200, 2450)),
        span(t, 2700, 2850) * (1 - span(t, 3000, 3250)),
        span(t, 3450, 3600) * (1 - span(t, 3750, 4000))
      );
      hubRingOuter.setAttribute('stroke-opacity', r(pulse * 0.9));

      calls.forEach(function (call, index) {
        var link = links[index];
        var request = span(t, call.out, call.out + call.travel);
        var reply = span(t, call.back, call.back + call.travel);
        moveSignal(signals[index].request, link.from, link.to, request);
        moveSignal(signals[index].reply, link.to, link.from, reply);

        var active = Math.max(
          request > 0 && request < 1 ? 1 : 0,
          span(t, call.out + call.travel - 60, call.out + call.travel + 60) * (1 - span(t, call.back, call.back + 60)),
          reply > 0 && reply < 1 ? 0.85 : 0
        );

        var tool = tools[index];
        toolCircles[index].setAttribute('stroke', active > 0.15 ? C.primary : C.border);
        toolCircles[index].setAttribute('stroke-width', r(1.5 + active * 1.3));
        tool.tint.setAttribute('fill-opacity', r(active * 0.1));
        linkEls[index].setAttribute('stroke', active > 0.15 ? C.primary : C.border);
        linkEls[index].setAttribute('stroke-width', r(1.6 + active * 1.2));
      });

      /* entrega a la revisión humana: se queda esperando */
      var handoffProgress = easeInOut(span(t, 3150, 3520));
      if (handoffProgress > 0 && handoffProgress < 1) {
        handoff.setAttribute('cx', r(hub.x));
        handoff.setAttribute('cy', r(lerp(hub.y + hub.r + 2, review.y - review.r - 2, handoffProgress)));
        handoff.setAttribute('fill-opacity', 1);
      } else {
        handoff.setAttribute('fill-opacity', 0);
      }

      var pending = span(t, 3520, 3900);
      reviewRing.setAttribute('stroke-opacity', r(0.55 + pending * 0.45));
      reviewRing.setAttribute('stroke-width', r(1.5 + pending * 0.6));
      reviewState.setAttribute('opacity', r(0.6 + pending * 0.4));
      reviewLink.setAttribute('stroke', pending > 0.3 ? C.purple : C.border);

      /* nodo enfocado o señalado */
      var focusId = hover;
      linkEls.forEach(function (node, index) {
        var touching = focusId === tools[index].id || focusId === 'coordinador';
        if (touching && (focusId === 'coordinador' || focusId === tools[index].id)) {
          node.setAttribute('stroke', C.purple);
          node.setAttribute('stroke-width', 2.2);
        }
      });
      if (focusId === 'revision') {
        reviewLink.setAttribute('stroke', C.purple);
        reviewLink.setAttribute('stroke-width', 2.2);
      }
      hubRingOuter.setAttribute('stroke', focusId === 'coordinador' ? C.purple : C.primary);
      if (focusId === 'coordinador') hubRingOuter.setAttribute('stroke-opacity', 0.9);

      var message = baseNote;
      var accent = false;
      if (focusId === 'coordinador') {
        message = 'coordinador · reparte la tarea y reúne los resultados';
        accent = true;
      } else if (focusId === 'revision') {
        message = 'revisión humana · una persona decide; aquí queda pendiente';
        accent = true;
      } else {
        for (var i = 0; i < tools.length; i++) {
          if (tools[i].id === focusId) {
            message = tools[i].label + ' · ' + tools[i].note;
            accent = true;
          }
        }
      }
      strip.set(message, accent);
    }

    render(0);

    return {
      duration: DURATION,
      render: render,
      pointer: function (point) {
        if (!point) { hover = null; return; }
        hover = null;
        var groups = [hubGroup].concat(toolGroups, [reviewGroup]);
        var ids = ['coordinador'].concat(tools.map(function (tool) { return tool.id; }), ['revision']);
        for (var i = 0; i < groups.length; i++) {
          var box = groups[i].getBBox();
          if (point.x >= box.x - 4 && point.x <= box.x + box.width + 4 &&
              point.y >= box.y - 4 && point.y <= box.y + box.height + 4) {
            hover = ids[i];
            return;
          }
        }
      },
      focus: function (id) { hover = id || null; },
      hits: [{ id: 'coordinador', node: hubGroup }]
        .concat(toolGroups.map(function (node, index) { return { id: tools[index].id, node: node }; }))
        .concat([{ id: 'revision', node: reviewGroup }]),
      reset: function () { hover = null; }
    };
  }

  /* ======== registro ======== */

  var SCENES = {
    dashboards: sceneDashboards,
    modelos: sceneModelos,
    pipeline: scenePipeline,
    rag: sceneRag,
    agentes: sceneAgentes
  };

  function build(kind, host, options) {
    var factory = SCENES[kind];
    if (!factory || !host) return null;

    var opts = options || {};
    var svg = el('svg', {
      'class': 'scene',
      viewBox: '0 0 480 300',
      preserveAspectRatio: 'xMidYMid meet',
      role: 'group',
      'aria-label': opts.label || 'Ilustración conceptual del área'
    });

    var scene = factory(svg);
    if (!scene) return null;

    /* Modo estático: composición final, sin reproductor. La ilustración queda
       como imagen de apoyo (decorativa), sin paradas de teclado internas. */
    if (opts.estatica) {
      scene.render(scene.duration);
      Array.prototype.forEach.call(svg.querySelectorAll('[data-stop]'), function (node) {
        node.removeAttribute('tabindex');
        node.removeAttribute('role');
        node.removeAttribute('aria-label');
        node.removeAttribute('data-stop');
      });
      svg.setAttribute('class', 'scene scene--estatica');
      svg.removeAttribute('role');
      svg.removeAttribute('aria-label');
      svg.setAttribute('aria-hidden', 'true');
    }

    host.appendChild(svg);
    scene.svg = svg;
    return scene;
  }

  return { build: build, kinds: Object.keys(SCENES) };
})();

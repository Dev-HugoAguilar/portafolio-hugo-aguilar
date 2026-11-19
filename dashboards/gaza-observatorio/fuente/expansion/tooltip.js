/* Tooltip compartido del observatorio de Gaza.
 *
 * Un solo componente para todas las gráficas: SVG con marcas, barras HTML y
 * lienzos que resuelven la marca por proximidad. Se engancha por delegación, así
 * que cualquier gráfica que se vuelva a pintar (cambio de filtro, de año, de
 * evaluación) queda cubierta sin registrar nada de nuevo.
 *
 * Protocolo de datos, en la marca o en su contenedor:
 *   data-tip-scope     contenedor consultable (sin él, las marcas no se enganchan)
 *   data-tip           detalle en texto; cada salto de línea es un párrafo
 *   data-tip-titulo    línea principal en negrita
 *   data-tip-serie     serie o categoría (antetítulo)
 *   data-tip-min/max   extremos de un intervalo: mínimo y máximo explícitos
 *   data-tip-src       fuente y corte; se hereda del contenedor
 *   data-tip-hint      ayuda breve al pie
 * Si una marca no define nada de esto se usan su <title> (que se retira para no
 * duplicar el globo nativo) y su aria-label.
 */
(function () {
  'use strict';

  var ID = 'gTip';
  var caja = null;
  var cuerpo = null;
  var pie = null;
  var live = null;
  var actual = null;
  var fijado = false;
  var ultimo = { x: 0, y: 0 };
  var temporizador = null;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function construir() {
    if (caja) return;
    caja = document.createElement('div');
    caja.id = ID;
    caja.className = 'gTip';
    caja.setAttribute('role', 'tooltip');
    caja.hidden = true;
    caja.innerHTML =
      '<button type="button" class="gTipClose" aria-label="Cerrar el detalle">✕</button>' +
      '<div class="gTipBody"></div>' +
      '<p class="gTipFoot"></p>';
    cuerpo = caja.querySelector('.gTipBody');
    pie = caja.querySelector('.gTipFoot');
    document.body.appendChild(caja);

    live = document.createElement('p');
    live.className = 'gTipLive';
    live.id = 'gTipLive';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);

    caja.querySelector('.gTipClose').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      ocultar(true);
      if (actual && actual.focus) actual.focus();
    });
  }

  /* ---------------------------------------------------------------- lectura */

  function tituloDe(el) {
    var t = el.getAttribute('data-tip-titulo');
    if (t) return t;
    var hijo = el.querySelector(':scope > title');
    if (hijo && hijo.textContent.trim()) {
      t = hijo.textContent.trim();
      hijo.remove();
      el.setAttribute('data-tip-titulo', t);
      return t;
    }
    // Marcas HTML: el título vive en el atributo `title`, que se retira para no
    // duplicar el globo nativo del navegador.
    var atributo = el.getAttribute('title');
    if (atributo && atributo.trim()) {
      t = atributo.trim();
      el.removeAttribute('title');
      el.setAttribute('data-tip-titulo', t);
      return t;
    }
    return '';
  }

  function detalleDe(el) {
    return el.getAttribute('data-tip') || '';
  }

  function textoPlano(el) {
    var partes = [];
    var t = tituloDe(el);
    if (t) partes.push(t);
    var d = detalleDe(el);
    if (d) partes.push(d);
    if (!partes.length) {
      var a = el.getAttribute('aria-label');
      if (a) partes.push(a);
    }
    return partes.join(' · ');
  }

  function fuenteDe(el) {
    var cont = el.closest('[data-tip-src]');
    return cont ? cont.getAttribute('data-tip-src') : '';
  }

  function marcaDe(nodo) {
    if (!nodo || nodo.nodeType !== 1) return null;
    var marca = nodo.closest('[data-tip],[data-tip-titulo],[data-tip-min],[data-tip-max]');
    if (marca) return marca;
    var ambito = nodo.closest('[data-tip-scope]');
    if (!ambito) return null;
    var dibujo = nodo.closest('svg circle, svg rect, svg path, svg line, svg polygon, svg g[role]');
    if (dibujo && dibujo.querySelector(':scope > title')) return dibujo;
    if (dibujo && dibujo.getAttribute('aria-label')) return dibujo;
    // Marcas HTML dentro de una gráfica: se prefiere la que declara su
    // aria-label o su propio data-tip (suele ser la franja completa) sobre el
    // `title` de una pieza interna.
    var conEtiqueta = nodo.closest('[aria-label],[data-tip],[data-tip-titulo]');
    if (conEtiqueta && conEtiqueta !== ambito && ambito.contains(conEtiqueta)) return conEtiqueta;
    var conTitulo = nodo.closest('[title]');
    if (conTitulo && conTitulo !== ambito && ambito.contains(conTitulo)) return conTitulo;
    return null;
  }

  /* --------------------------------------------------------------- pintado */

  function pintar(el) {
    var partes = [];
    var serie = el.getAttribute('data-tip-serie');
    if (serie) partes.push('<span class="gTipSerie">' + esc(serie) + '</span>');

    var titulo = tituloDe(el);
    var detalle = detalleDe(el);
    // Última red: marcas que solo declaran su aria-label (franjas, botones).
    if (!titulo && !detalle) {
      var aria = el.getAttribute('aria-label');
      if (aria && aria.trim()) titulo = aria.trim();
    }
    if (titulo) partes.push('<strong>' + esc(titulo) + '</strong>');

    if (detalle) {
      detalle.split('\n').forEach(function (linea) {
        if (linea.trim()) partes.push('<p>' + esc(linea) + '</p>');
      });
    }

    var min = el.getAttribute('data-tip-min');
    var max = el.getAttribute('data-tip-max');
    if (min !== null || max !== null) {
      var filas = '';
      if (min !== null) {
        filas +=
          '<span class="gTipRow"><span><i aria-hidden="true">●</i> Mínimo estimado</span>' +
          '<b class="gTipMin">' + esc(min) + '</b></span>';
      }
      if (max !== null) {
        filas +=
          '<span class="gTipRow"><span><i aria-hidden="true">●</i> Máximo estimado</span>' +
          '<b class="gTipMax">' + esc(max) + '</b></span>';
      }
      partes.push(filas);
    }

    if (!titulo && !detalle && !partes.length) return false;

    cuerpo.innerHTML = partes.join('');
    var fuente = fuenteDe(el);
    var pista = el.getAttribute('data-tip-hint') || '';
    if (fijado && !pista) pista = 'Toca fuera o usa ✕ para cerrarlo.';
    pie.innerHTML = (fuente ? esc(fuente) : '') + (pista ? (fuente ? '<br>' : '') + esc(pista) : '');
    pie.hidden = !pie.innerHTML;
    return true;
  }

  function colocar(x, y) {
    var margen = 10;
    var r = caja.getBoundingClientRect();
    var ancho = r.width;
    var alto = r.height;
    var izquierda = x + 16;
    var arriba = y - alto - 16;
    if (izquierda + ancho > window.innerWidth - margen) izquierda = x - ancho - 16;
    if (izquierda < margen) izquierda = margen;
    if (arriba < margen) arriba = y + 20;
    if (arriba + alto > window.innerHeight - margen) {
      arriba = Math.max(margen, window.innerHeight - alto - margen);
    }
    caja.style.left = Math.round(izquierda) + 'px';
    caja.style.top = Math.round(arriba) + 'px';
  }

  function centroDe(el) {
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { x: r.left + Math.min(r.width / 2, 180), y: r.top + r.height / 2 };
  }

  function mostrar(el, punto, opciones) {
    construir();
    var puntoFinal = punto || centroDe(el);
    if (!puntoFinal) return;
    ultimo = puntoFinal;
    actual = el;
    fijado = !!(opciones && opciones.fijar);
    if (!pintar(el)) {
      actual = null;
      return;
    }
    caja.dataset.pin = fijado ? 'true' : 'false';
    caja.querySelector('.gTipClose').hidden = !fijado;
    caja.hidden = false;
    caja.dataset.visible = 'true';
    colocar(ultimo.x, ultimo.y);
    if (live) live.textContent = textoPlano(el);
  }

  function ocultar(force) {
    if (!caja || (!actual && !force)) return;
    if (fijado && !force) return;
    fijado = false;
    actual = null;
    caja.dataset.visible = 'false';
    caja.dataset.pin = 'false';
    clearTimeout(temporizador);
    temporizador = setTimeout(function () {
      if (caja && caja.dataset.visible !== 'true') caja.hidden = true;
    }, 130);
    if (live) live.textContent = '';
  }

  /* --------------------------------------------------------------- eventos */

  document.addEventListener(
    'pointerover',
    function (e) {
      if (e.pointerType === 'touch') return;
      var marca = marcaDe(e.target);
      if (!marca || marca === actual) return;
      if (actual && fijado) return;
      mostrar(marca, { x: e.clientX, y: e.clientY });
    },
    true
  );

  document.addEventListener(
    'pointermove',
    function (e) {
      if (e.pointerType === 'touch' || !actual || fijado) return;
      ultimo = { x: e.clientX, y: e.clientY };
      colocar(ultimo.x, ultimo.y);
    },
    true
  );

  document.addEventListener(
    'pointerout',
    function (e) {
      if (e.pointerType === 'touch') return;
      var marca = marcaDe(e.target);
      if (!marca || marca !== actual) return;
      if (marca.contains(e.relatedTarget)) return;
      ocultar(false);
    },
    true
  );

  document.addEventListener(
    'pointerdown',
    function (e) {
      var marca = marcaDe(e.target);
      if (marca && e.pointerType === 'touch') {
        if (fijado && marca === actual) {
          ocultar(true);
        } else {
          mostrar(marca, { x: e.clientX, y: e.clientY }, { fijar: true });
        }
        return;
      }
      if (!marca && fijado) ocultar(true);
    },
    true
  );

  document.addEventListener('focusin', function (e) {
    var marca = marcaDe(e.target);
    if (!marca || marca === actual) return;
    mostrar(marca);
  });

  document.addEventListener('focusout', function (e) {
    var marca = marcaDe(e.target);
    if (!marca || marca !== actual) return;
    if (fijado) return;
    ocultar(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && actual) {
      var foco = actual;
      ocultar(true);
      if (foco.focus) foco.focus();
    }
  });

  document.addEventListener(
    'scroll',
    function () {
      if (!actual || fijado) return;
      // El desplazamiento suave del contenedor sigue emitiendo eventos después
      // de mostrar el globo: si el puntero no se movió de la marca, no se cierra.
      try {
        if (actual.matches && actual.matches(':hover')) return;
      } catch (err) {}
      if (document.activeElement === actual) return;
      ocultar(false);
    },
    true
  );

  window.addEventListener('resize', function () {
    if (actual && !fijado) ocultar(false);
  });

  /* API para gráficas que resuelven la marca por proximidad (lienzos, nubes de
     puntos): TIP.html({...}) y TIP.ocultar().
       {serie, titulo, detalle (HTML propio del llamador), fuente, punto, fijar}
     Permite escapar del protocolo de atributos cuando los valores se calculan
     en el momento (por ejemplo, el sitio más cercano a un puntero). */
  window.TIP = {
    ocultar: function () {
      ocultar(true);
    },
    html: function (opciones) {
      construir();
      var puntoFinal = (opciones && opciones.punto) || ultimo;
      ultimo = puntoFinal;
      actual = null;
      fijado = !!(opciones && opciones.fijar);
      cuerpo.innerHTML =
        (opciones && opciones.serie ? '<span class="gTipSerie">' + esc(opciones.serie) + '</span>' : '') +
        (opciones && opciones.titulo ? '<strong>' + esc(opciones.titulo) + '</strong>' : '') +
        ((opciones && opciones.detalle) || '');
      pie.innerHTML = opciones && opciones.fuente ? esc(opciones.fuente) : '';
      pie.hidden = !pie.innerHTML;
      caja.dataset.pin = fijado ? 'true' : 'false';
      caja.querySelector('.gTipClose').hidden = !fijado;
      caja.hidden = false;
      caja.dataset.visible = 'true';
      colocar(puntoFinal.x, puntoFinal.y);
    },
    visible: function () {
      return !!(caja && caja.dataset.visible === 'true');
    }
  };
})();

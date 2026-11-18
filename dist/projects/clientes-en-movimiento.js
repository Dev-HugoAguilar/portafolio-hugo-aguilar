/* ==========================================================================
   PROYECTO: Clientes en movimiento · Segmentación de hogares (Complete Journey)
   --------------------------------------------------------------------------
   El tablero aprobado es una página autónoma (HTML + CSS + SVG + datos
   incrustados) en `dist/dashboards/clientes-en-movimiento/index.html`. Para
   conservar el diseño, los cálculos y las interacciones sin reescribirlos, este
   módulo la sirve en un marco del mismo origen dentro de la ficha y ajusta su
   altura al contenido real.

   No hay backend: los datos viajan dentro del propio HTML aprobado y la página
   funciona sin conexión. Este módulo no modifica esa página.
   ========================================================================== */

(function () {
  'use strict';

  var PAGINA = 'dashboards/clientes-en-movimiento/index.html';
  var ALTO_MINIMO = 900;
  var ALTO_RESPALDO = 2600;

  /** Mide el contenido de la página embebida y ajusta el marco. */
  function ajustarAlto(marco) {
    var documento = null;
    try {
      documento = marco.contentDocument;
    } catch (error) {
      return; /* otro origen: se conserva la altura de respaldo */
    }
    if (!documento || !documento.body) return;
    var alto = Math.max(
      documento.body.scrollHeight,
      documento.documentElement ? documento.documentElement.scrollHeight : 0,
    );
    if (!alto) return;
    var nuevo = Math.max(ALTO_MINIMO, Math.ceil(alto) + 2);
    if (Math.abs(parseInt(marco.style.height || '0', 10) - nuevo) > 4) {
      marco.style.height = nuevo + 'px';
    }
  }

  window.PORTFOLIO_PROJECTS.register({
    id: 'clientes-en-movimiento',
    areaId: 'ciencia-de-datos',
    titulo: 'Clientes en movimiento — Segmentación de hogares compradores',

    mount: function (host, api) {
      var marco = document.createElement('iframe');
      var observador = null;
      var temporizador = null;
      var vivo = true;

      host.innerHTML = '';
      host.style.padding = '0';

      if (api && typeof api.el === 'function') {
        var espera = api.el('p', '', 'Cargando el tablero de segmentación…');
        espera.style.padding = '18px';
        espera.style.color = '#596273';
        espera.style.fontFamily = 'Inter, system-ui, sans-serif';
        host.appendChild(espera);
      }

      var limpiarEspera = function () {
        var aviso = host.querySelector('p');
        if (aviso && aviso !== marco) aviso.remove();
      };

      marco.src = new URL(PAGINA, document.baseURI).toString();
      marco.title = 'Clientes en movimiento · tablero de segmentación de hogares';
      marco.setAttribute('loading', 'eager');
      marco.style.width = '100%';
      marco.style.border = '0';
      marco.style.display = 'block';
      marco.style.height = ALTO_RESPALDO + 'px';
      marco.style.background = '#f2f4fa';

      marco.addEventListener('load', function () {
        if (!vivo) return;
        limpiarEspera();
        ajustarAlto(marco);
        /* El marco se reajusta cuando la página cambia de vista o filtra. */
        try {
          if ('ResizeObserver' in window && marco.contentDocument && marco.contentDocument.body) {
            observador = new ResizeObserver(function () {
              ajustarAlto(marco);
            });
            observador.observe(marco.contentDocument.body);
          }
        } catch (error) {
          observador = null;
        }
        /* Respaldo para navegadores sin ResizeObserver sobre el documento ajeno. */
        temporizador = window.setInterval(function () {
          if (!vivo) return;
          ajustarAlto(marco);
        }, 1200);
      });

      window.addEventListener('resize', function () {
        if (vivo) ajustarAlto(marco);
      });

      host.appendChild(marco);

      return {
        destroy: function () {
          vivo = false;
          if (temporizador) window.clearInterval(temporizador);
          if (observador) observador.disconnect();
          temporizador = null;
          observador = null;
          host.innerHTML = '';
        },
        onResize: function () {
          ajustarAlto(marco);
        },
      };
    },
  });
})();

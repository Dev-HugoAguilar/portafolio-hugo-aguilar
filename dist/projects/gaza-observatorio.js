/* ==========================================================================
   PROYECTO: Gaza · Vidas y territorio
   --------------------------------------------------------------------------
   El observatorio aprobado es una página autónoma (HTML + CSS + JavaScript +
   D3 + datos incrustados) en `dist/dashboards/gaza-observatorio/index.html`.
   Es una copia literal del artefacto aprobado `demo/index.html` del paquete de
   integración: conserva las diez pestañas, los controles y el contrato
   analítico sin reescribirlos.

   Se sirve en un marco del mismo origen dentro de la ficha, con ancho completo,
   título accesible y la altura ajustada al contenido real —el mismo mecanismo
   que usan «Clientes en movimiento» y «Clientes y campañas»—, de modo que el
   observatorio no queda reducido a una miniatura ni obliga a desplazarse dentro
   de una ventana pequeña.

   No hay backend: la página no hace peticiones externas, no descarga datos y no
   necesita credenciales. Este módulo no modifica la página aprobada.
   ========================================================================== */

(function () {
  'use strict';

  var PAGINA = 'dashboards/gaza-observatorio/index.html';
  var ALTO_MINIMO = 900;
  /* Altura de respaldo mientras se mide el contenido real (≈4 200 px a 1440). */
  var ALTO_RESPALDO = 4600;

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
    id: 'gaza-observatorio',
    areaId: 'ciencia-de-datos',
    titulo: 'Gaza · Vidas y territorio — observatorio del impacto humano y territorial',

    mount: function (host, api) {
      var marco = document.createElement('iframe');
      var observador = null;
      var temporizador = null;
      var vivo = true;

      host.innerHTML = '';
      host.style.padding = '0';

      if (api && typeof api.el === 'function') {
        var espera = api.el('p', '', 'Cargando el observatorio de Gaza…');
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
      marco.title = 'Gaza · Vidas y territorio — observatorio del impacto humano y territorial';
      marco.setAttribute('loading', 'eager');
      marco.style.width = '100%';
      marco.style.border = '0';
      marco.style.display = 'block';
      marco.style.height = ALTO_RESPALDO + 'px';
      marco.style.background = '#f6f7fb';

      marco.addEventListener('load', function () {
        if (!vivo) return;
        limpiarEspera();
        ajustarAlto(marco);
        /* El marco se reajusta cuando el observatorio cambia de pestaña o filtra. */
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

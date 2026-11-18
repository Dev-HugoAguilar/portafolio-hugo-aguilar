/* ==========================================================================
   PROYECTO: Vidas en tránsito — muertes, desapariciones y movilidad migrante
   --------------------------------------------------------------------------
   El observatorio es una página autónoma (HTML + CSS + JavaScript y dos JSON
   junto a ella) en `dist/dashboards/vidas-en-transito/index.html`. Se publica
   desde `dashboards/vidas-en-transito/runtime/` con
   `dashboards/vidas-en-transito/construir.py`, que verifica los hashes del
   MANIFEST del paquete: el archivo servido es exactamente el entregado.

   Se sirve en un marco del mismo origen dentro de la ficha —el mismo mecanismo
   que «Gaza · Vidas y territorio», «Clientes en movimiento» y «Clientes y
   campañas»— con ancho completo, título accesible y la altura ajustada al
   contenido real, de modo que el tablero no queda reducido a una miniatura ni
   obliga a un segundo desplazamiento dentro de una ventana pequeña.

   No hay backend: la página solo hace `fetch` de sus dos JSON relativos, no
   pide credenciales ni servicios externos. Este módulo no modifica la página
   aprobada.
   ========================================================================== */

(function () {
  'use strict';

  var PAGINA = 'dashboards/vidas-en-transito/index.html';
  /* Altura de respaldo mientras se mide el contenido real. */
  var ALTO_RESPALDO = 5200;

  function altoMinimo() {
    /* Al menos el 85 % de la ventana, como pide el diseño de la ficha. */
    return Math.max(760, Math.round((window.innerHeight || 900) * 0.85));
  }

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
    var nuevo = Math.max(altoMinimo(), Math.ceil(alto) + 2);
    if (Math.abs(parseInt(marco.style.height || '0', 10) - nuevo) > 4) {
      marco.style.height = nuevo + 'px';
    }
  }

  window.PORTFOLIO_PROJECTS.register({
    id: 'vidas-en-transito',
    areaId: 'dashboards',
    titulo: 'Vidas en tránsito — muertes, desapariciones y movilidad migrante',

    mount: function (host, api) {
      var marco = document.createElement('iframe');
      var observador = null;
      var temporizador = null;
      var vivo = true;

      host.innerHTML = '';
      host.style.padding = '0';

      if (api && typeof api.el === 'function') {
        var espera = api.el('p', '', 'Cargando el observatorio «Vidas en tránsito»…');
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
      marco.title = 'Vidas en tránsito — muertes, desapariciones y movilidad migrante';
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
        /* Respaldo para cuando el tablero cambia de pestaña o filtra. */
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

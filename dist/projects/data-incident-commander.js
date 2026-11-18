/* ==========================================================================
   PROYECTO · Data Incident Commander
   Área: Agentes y sistemas de decisión
   --------------------------------------------------------------------------
   La demo es una página autónoma en
   `dist/dashboards/data-incident-commander/index.html`: flujo determinista,
   Sankey de linaje, coordenadas paralelas, matriz de validaciones y traza.
   Se integra con un marco del mismo origen y altura ajustada al contenido.

   La API local conserva runs efímeros en memoria para aprobación/rechazo. Si no
   responde, la demo sigue funcionando en modo local y no escribe nada fuera del
   navegador.
   ========================================================================== */

(function () {
  'use strict';

  if (!window.PORTFOLIO_PROJECTS) return;

  var PAGINA = 'dashboards/data-incident-commander/index.html';
  var ALTO_MINIMO = 860;
  var ALTO_RESPALDO = 6000;

  function ajustarAlto(marco) {
    var documento = null;
    try {
      documento = marco.contentDocument;
    } catch (error) {
      return;
    }
    if (!documento || !documento.body) return;
    /* La demo usa `.app-shell { min-height: 100vh }`: si se mide el body, el
       marco nunca baja de su altura de respaldo. El workspace sí refleja el
       contenido real de la consola. */
    var contenido = documento.querySelector('.workspace') || documento.body;
    var alto = Math.max(
      contenido.scrollHeight,
      Math.ceil(contenido.getBoundingClientRect().height),
    );
    if (!alto) return;
    var nuevo = Math.max(ALTO_MINIMO, Math.ceil(alto) + 2);
    if (Math.abs(parseInt(marco.style.height || '0', 10) - nuevo) > 4) {
      marco.style.height = nuevo + 'px';
    }
  }

  window.PORTFOLIO_PROJECTS.register({
    id: 'data-incident-commander',
    areaId: 'agentes',
    titulo: 'Data Incident Commander',

    mount: function (host, api) {
      var marco = document.createElement('iframe');
      var observador = null;
      var temporizador = null;
      var vivo = true;

      host.innerHTML = '';
      host.style.padding = '0';

      if (api && typeof api.el === 'function') {
        var espera = api.el('p', '', 'Cargando el centro de incidentes…');
        espera.style.padding = '18px';
        espera.style.color = '#596273';
        espera.style.fontFamily = 'Inter, system-ui, sans-serif';
        host.appendChild(espera);
      }

      var limpiarEspera = function () {
        var aviso = host.querySelector('p');
        if (aviso && aviso !== marco) aviso.remove();
      };

      var alRedimensionar = function () {
        if (vivo) ajustarAlto(marco);
      };

      marco.src = new URL(PAGINA, document.baseURI).toString();
      marco.title = 'Data Incident Commander';
      marco.setAttribute('loading', 'eager');
      marco.style.width = '100%';
      marco.style.border = '0';
      marco.style.display = 'block';
      marco.style.height = ALTO_RESPALDO + 'px';
      marco.style.background = '#f2f4fb';

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
        temporizador = window.setInterval(function () {
          if (vivo) ajustarAlto(marco);
        }, 1200);
      });

      window.addEventListener('resize', alRedimensionar);

      host.appendChild(marco);

      return {
        destroy: function () {
          vivo = false;
          window.removeEventListener('resize', alRedimensionar);
          if (temporizador) window.clearInterval(temporizador);
          if (observador) observador.disconnect();
          temporizador = null;
          observador = null;
          host.innerHTML = '';
        },
        onResize: function () {
          ajustarAlto(marco);
        }
      };
    }
  });
})();

/* ==========================================================================
   PROYECTO · The Ripple Room
   Área: Agentes y sistemas de decisión
   --------------------------------------------------------------------------
   La demo es una página autónoma en
   `dist/dashboards/the-ripple-room/index.html`: HTML, CSS, JavaScript, D3,
   datos y geometría van embebidos, sin CDN ni API. Se integra con un marco del
   mismo origen y altura ajustada al contenido.
   ========================================================================== */

(function () {
  'use strict';

  if (!window.PORTFOLIO_PROJECTS) return;

  var PAGINA = 'dashboards/the-ripple-room/index.html';
  var ALTO_MINIMO = 820;
  var ALTO_RESPALDO = 5200;

  function ajustarAlto(marco) {
    var documento = null;
    try {
      documento = marco.contentDocument;
    } catch (error) {
      return;
    }
    if (!documento || !documento.body) return;
    var alto = Math.max(
      documento.body.scrollHeight,
      Math.ceil(documento.body.getBoundingClientRect().height),
    );
    if (!alto) return;
    var nuevo = Math.max(ALTO_MINIMO, Math.ceil(alto) + 2);
    if (Math.abs(parseInt(marco.style.height || '0', 10) - nuevo) > 4) {
      marco.style.height = nuevo + 'px';
    }
  }

  window.PORTFOLIO_PROJECTS.register({
    id: 'the-ripple-room',
    areaId: 'agentes',
    titulo: 'The Ripple Room',

    mount: function (host, api) {
      var marco = document.createElement('iframe');
      var observador = null;
      var temporizador = null;
      var vivo = true;

      host.innerHTML = '';
      host.style.padding = '0';

      if (api && typeof api.el === 'function') {
        var espera = api.el('p', '', 'Cargando The Ripple Room…');
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
      marco.title = 'The Ripple Room';
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

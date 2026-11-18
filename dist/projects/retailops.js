/* ==========================================================================
   PROYECTO · RetailOps Unified
   Área: Ciencia de datos y Machine Learning
   --------------------------------------------------------------------------
   El HTML autónomo se sirve como asset estático en
   `dist/dashboards/retailops/index.html`. Se monta en un iframe same-origin
   dentro de la ficha existente, sin backend ni dependencias de producción.
   La altura sigue el documento de la demo para evitar un segundo scroll.
   ========================================================================== */

(function () {
  'use strict';

  if (!window.PORTFOLIO_PROJECTS) return;

  var PAGINA = 'dashboards/retailops/index.html';
  var ALTO_MINIMO = 900;
  var ALTO_RESPALDO = 1800;

  function prepararEmbed(marco) {
    try {
      var documento = marco.contentDocument;
      if (!documento || !documento.head) return;
      if (documento.getElementById('retailops-embed-style')) return;
      var estilo = documento.createElement('style');
      estilo.id = 'retailops-embed-style';
      estilo.textContent =
        '.masthead{display:none!important}' +
        'html,body{scrollbar-width:none;-ms-overflow-style:none}' +
        'html::-webkit-scrollbar,body::-webkit-scrollbar{width:0;height:0;display:none}';
      documento.head.appendChild(estilo);
    } catch (error) {
      /* el documento aún no está disponible */
    }
  }

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
    id: 'retailops',
    areaId: 'ciencia-de-datos',
    titulo: 'RetailOps Unified',

    mount: function (host) {
      var marco = document.createElement('iframe');
      var observador = null;
      var temporizador = null;
      var vivo = true;

      host.innerHTML = '';
      host.style.padding = '0';

      marco.src = new URL(PAGINA, document.baseURI).toString();
      marco.title = 'RetailOps Unified: operación simulada y mapa de calor';
      marco.allow = 'fullscreen';
      marco.setAttribute('allowfullscreen', '');
      marco.setAttribute('loading', 'eager');
      marco.setAttribute('referrerpolicy', 'no-referrer');
      marco.setAttribute('scrolling', 'no');
      marco.style.cssText = 'display:block;width:100%;border:0;background:#f1f3fb;height:' + ALTO_RESPALDO + 'px;';
      marco.tabIndex = 0;

      marco.addEventListener('load', function () {
        if (!vivo) return;
        prepararEmbed(marco);
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
        }, 1000);
      });

      var alRedimensionar = function () {
        if (vivo) ajustarAlto(marco);
      };
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

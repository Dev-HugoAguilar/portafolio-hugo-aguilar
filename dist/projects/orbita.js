/* ==========================================================================
   PROYECTO · ORBITA
   Área: Dashboards y visualización
   --------------------------------------------------------------------------
   El artefacto UI 26 se sirve como recurso estático en
   `dist/dashboards/orbita/index.html`. No se importa al bundle: se carga en un
   iframe same-origin al abrir la ficha, con altura medida desde su documento.
   La ficha monta la demo directamente, sin barra superior ni CTA duplicada.
   ========================================================================== */

(function () {
  'use strict';

  if (!window.PORTFOLIO_PROJECTS) return;

  var PAGINA = 'dashboards/orbita/index.html';
  var ALTO_MINIMO = 900;
  var ALTO_RESPALDO = 6200;

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
    id: 'orbita',
    areaId: 'dashboards',
    titulo: 'ORBITA',

    mount: function (host) {
      var marco = document.createElement('iframe');
      var observador = null;
      var temporizador = null;
      var vivo = true;

      host.innerHTML = '';
      host.style.padding = '0';

      marco.src = new URL(PAGINA, document.baseURI).toString();
      marco.title = 'ORBITA · explorador orbital';
      marco.allow = 'fullscreen';
      marco.setAttribute('allowfullscreen', '');
      marco.setAttribute('loading', 'eager');
      marco.style.cssText = 'display:block;width:100%;border:0;background:#f1f3fb;height:' + ALTO_RESPALDO + 'px;';
      marco.tabIndex = 0;

      marco.addEventListener('load', function () {
        if (!vivo) return;
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

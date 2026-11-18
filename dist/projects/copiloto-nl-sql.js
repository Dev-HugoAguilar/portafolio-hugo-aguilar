/* ==========================================================================
   PROYECTO · Copiloto NL-to-SQL · indicadores económicos de México
   Área: IA generativa y LLMs
   --------------------------------------------------------------------------
   La demo es una página autónoma en
   `dist/dashboards/copiloto-nl-sql/index.html`: parser léxico, plantilla SQL
   parametrizada, snapshot WDI local y gráfica D3. Se integra en la ficha con un
   marco del mismo origen y altura ajustada al contenido.

   La API local es opcional: el navegador llama a
   /api/v1/copiloto-nl-sql y, si no responde, simula la misma plantilla sobre
   data.json. No hay claves ni URI de MongoDB en el cliente.
   ========================================================================== */

(function () {
  'use strict';

  if (!window.PORTFOLIO_PROJECTS) return;

  var PAGINA = 'dashboards/copiloto-nl-sql/index.html';
  var ALTO_MINIMO = 820;
  var ALTO_RESPALDO = 5000;

  function ajustarAlto(marco) {
    var documento = null;
    try {
      documento = marco.contentDocument;
    } catch (error) {
      return;
    }
    if (!documento || !documento.body) return;
    /* La altura real del cuerpo es la única medida fiable: el scrollHeight del
       documento nunca baja del alto del marco. */
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
    id: 'copiloto-nl-sql',
    areaId: 'ia-generativa',
    titulo: 'Copiloto NL-to-SQL · indicadores económicos de México',

    mount: function (host, api) {
      var marco = document.createElement('iframe');
      var observador = null;
      var temporizador = null;
      var vivo = true;

      host.innerHTML = '';
      host.style.padding = '0';

      if (api && typeof api.el === 'function') {
        var espera = api.el('p', '', 'Cargando el copiloto NL-to-SQL…');
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
      marco.title = 'Copiloto NL-to-SQL · indicadores económicos de México';
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

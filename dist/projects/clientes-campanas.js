/* ==========================================================================
   PROYECTO: Clientes y campañas · Customer Growth Intelligence
   --------------------------------------------------------------------------
   El tablero aprobado es una página autónoma (HTML + CSS + SVG + datos
   incrustados) en `dist/dashboards/clientes-campanas/index.html`, construida por
   `dashboards/clientes-campanas/integrado/tools/construir.py` a partir de los
   artefactos JSON de `dist/dashboards/clientes-campanas/data/`.

   Se sirve en un marco del mismo origen dentro de la ficha, con la altura
   ajustada al contenido real, igual que «Clientes en movimiento». Este módulo no
   reescribe la página: solo la mide y corrige la geometría del diálogo de
   ampliación, que dentro de un marco alto se centraría fuera de la ventana.
   ========================================================================== */

(function () {
  'use strict';

  var PAGINA = 'dashboards/clientes-campanas/index.html';
  var ALTO_MINIMO = 900;
  var ALTO_RESPALDO = 3200;
  var MARGEN_MODAL = 12;
  var VISTAS = ['proyecto', 'perfiles', 'evolucion', 'campanas', 'incrementalidad', 'experimento'];

  /** Vista pedida en la URL del portafolio (`?vista=perfiles`). */
  function vistaPedida() {
    try {
      var pedida = new URL(window.location.href).searchParams.get('vista');
      return VISTAS.indexOf(pedida) >= 0 ? pedida : '';
    } catch (error) {
      return '';
    }
  }

  /** Refleja en la barra de direcciones la vista activa del tablero. */
  function recordarVista(marco) {
    var vista = '';
    try {
      vista = (marco.contentWindow.location.hash || '').replace('#', '');
    } catch (error) {
      return;
    }
    if (VISTAS.indexOf(vista) < 0) return;
    var url = new URL(window.location.href);
    if (url.searchParams.get('vista') === vista) return;
    url.searchParams.set('vista', vista);
    history.replaceState(null, '', url.toString());
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
    var nuevo = Math.max(ALTO_MINIMO, Math.ceil(alto) + 2);
    if (Math.abs(parseInt(marco.style.height || '0', 10) - nuevo) > 4) {
      marco.style.height = nuevo + 'px';
    }
  }

  /**
   * Coloca el diálogo «Ampliar» dentro de la franja visible del marco.
   * `position: fixed` dentro del documento embebido se resuelve contra la caja
   * completa del marco (miles de píxeles), así que centrarlo con la hoja de
   * estilos lo dejaría fuera de la ventana. Aquí se calcula su posición con el
   * alto real del contenido y la parte del marco que se ve en pantalla.
   */
  function ajustarModal(marco, estado) {
    var documento = marco.contentDocument;
    if (!documento) return;
    var dialogo = documento.getElementById('expanded');
    if (!dialogo) return;

    if (!dialogo.open) {
      if (estado.abierto) {
        estado.abierto = false;
        document.body.style.overflow = estado.desborde;
        estado.desborde = '';
        ['position', 'top', 'left', 'right', 'bottom', 'margin', 'max-height'].forEach(function (propiedad) {
          dialogo.style.removeProperty(propiedad);
        });
        var cuerpo = documento.getElementById('expanded-body');
        if (cuerpo) cuerpo.style.removeProperty('max-height');
      }
      return;
    }

    if (!estado.desborde) estado.desborde = document.body.style.overflow;
    estado.abierto = true;
    document.body.style.overflow = 'hidden';

    var caja = marco.getBoundingClientRect();
    var ventana = window.innerHeight;
    /* Franja del marco que se ve ahora mismo, en coordenadas de su propio documento. */
    var arriba = Math.max(0, -caja.top);
    var abajo = Math.min(caja.height, ventana - caja.top);
    if (abajo - arriba < 240) {
      /* El marco no se ve: se usa la franja superior para no romper la medida. */
      arriba = 0;
      abajo = Math.max(240, Math.min(caja.height, ventana));
    }
    var altoMaximo = Math.max(240, abajo - arriba - MARGEN_MODAL * 2);

    dialogo.style.position = 'fixed';
    dialogo.style.left = '0';
    dialogo.style.right = '0';
    dialogo.style.bottom = 'auto';
    dialogo.style.margin = '0 auto';
    dialogo.style.maxHeight = altoMaximo + 'px';

    var cuerpoModal = documento.getElementById('expanded-body');
    if (cuerpoModal) cuerpoModal.style.maxHeight = Math.max(140, altoMaximo - 92) + 'px';

    var alto = Math.min(altoMaximo, dialogo.getBoundingClientRect().height || altoMaximo);
    var centro = (arriba + abajo) / 2;
    var arribaFinal = Math.max(arriba + MARGEN_MODAL, Math.min(centro - alto / 2, abajo - alto - MARGEN_MODAL));
    dialogo.style.top = Math.round(arribaFinal) + 'px';
  }

  /** Observa la apertura y el cierre del diálogo de ampliación. */
  function vigilarModal(marco) {
    var estado = { desborde: '', abierto: false };
    var documento = null;
    var observador = null;
    try {
      documento = marco.contentDocument;
    } catch (error) {
      return { destroy: function () {} };
    }
    var dialogo = documento && documento.getElementById('expanded');
    if (!dialogo) return { destroy: function () {} };

    var refrescar = function () {
      ajustarModal(marco, estado);
    };

    if ('MutationObserver' in window) {
      observador = new MutationObserver(refrescar);
      observador.observe(dialogo, { attributes: true, attributeFilter: ['open'] });
    }
    dialogo.addEventListener('close', refrescar);
    window.addEventListener('resize', refrescar);
    window.addEventListener('scroll', refrescar, { passive: true });

    return {
      destroy: function () {
        if (observador) observador.disconnect();
        dialogo.removeEventListener('close', refrescar);
        window.removeEventListener('resize', refrescar);
        window.removeEventListener('scroll', refrescar);
        if (estado.abierto) document.body.style.overflow = estado.desborde;
      },
    };
  }

  window.PORTFOLIO_PROJECTS.register({
    id: 'clientes-campanas',
    areaId: 'ciencia-de-datos',
    titulo: 'Clientes y campañas — Segmentación conductual, propensión e incrementalidad',

    mount: function (host, api) {
      var marco = document.createElement('iframe');
      var observador = null;
      var temporizador = null;
      var modal = null;
      var vivo = true;

      host.innerHTML = '';
      host.style.padding = '0';

      if (api && typeof api.el === 'function') {
        var espera = api.el('p', '', 'Cargando el tablero de clientes y campañas…');
        espera.style.padding = '18px';
        espera.style.color = '#596273';
        espera.style.fontFamily = 'Inter, system-ui, sans-serif';
        host.appendChild(espera);
      }

      var limpiarEspera = function () {
        var aviso = host.querySelector('p');
        if (aviso && aviso !== marco) aviso.remove();
      };

      marco.src = new URL(PAGINA, document.baseURI).toString() + (vistaPedida() ? '#' + vistaPedida() : '');
      marco.title = 'Clientes y campañas · tablero de segmentación, propensión e incrementalidad';
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
        if (modal) modal.destroy();
        modal = vigilarModal(marco);
        recordarVista(marco);
        try {
          /* La página escribe su pestaña con replaceState y redibuja la barra en
             el mismo clic, así que el destino se lee en fase de captura —antes de
             que la barra se vuelva a pintar— y con el temporizador de respaldo. */
          marco.contentDocument.addEventListener(
            'click',
            function (evento) {
              var destino = evento.target;
              if (!destino || typeof destino.closest !== 'function') return;
              if (!destino.closest('#tabs button')) return;
              window.setTimeout(function () {
                recordarVista(marco);
              }, 60);
            },
            true,
          );
          marco.contentWindow.addEventListener('hashchange', function () {
            recordarVista(marco);
          });
        } catch (error) {
          /* sin acceso al documento embebido se conserva solo la vista inicial */
        }
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
          recordarVista(marco);
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
          if (modal) modal.destroy();
          temporizador = null;
          observador = null;
          modal = null;
          host.innerHTML = '';
        },
        onResize: function () {
          ajustarAlto(marco);
        },
      };
    },
  });
})();
